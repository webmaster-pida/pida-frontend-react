import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  Paper, 
  CircularProgress, 
  Alert, 
  Stack, 
  Divider, 
  LinearProgress,
  Tooltip
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SendIcon from '@mui/icons-material/Send';
import AutorenewIcon from '@mui/icons-material/Autorenew';

// Importaciones de Firebase Storage
import { getStorage, ref, uploadBytes, getDownloadURL, StringFormat, uploadString } from 'firebase/storage';
import { useAuth } from '../AuthContext';

export default function Ingesta() {
  const { userRole } = useAuth();
  
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');

  // Estados de la Interfaz (UI)
  const [statusText, setStatusText] = useState('');
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [waitingForMd, setWaitingForMd] = useState(false);
  const [loadingIdx, setLoadingIdx] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Referencia para controlar y limpiar el polling (preguntas al servidor)
  const pollingRef = useRef(null);

  // Limpiar el temporizador si el usuario desmonta/cierra el componente
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, []);

  // Manejo del selector de archivos
  const handleFileChange = (e) => {
    if (userRole === 'lector') return; // Bloqueo de seguridad

    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      // Reiniciamos los estados si elige un nuevo archivo
      setMarkdownContent('');
      setTitle('');
      setAuthor('');
      setError(null);
      setSuccess(null);
      setStatusText('');
    }
  };

  // =========================================================================
  // PASO 1: SUBIR PDF Y ESPERAR EL MARKDOWN DEL EXTRACTOR
  // =========================================================================
  const handleUploadAndListen = async () => {
    if (userRole === 'lector') return; // Bloqueo de seguridad a nivel función

    if (!file) {
      setError('Por favor, selecciona un PDF primero.');
      return;
    }
    setError(null);
    setSuccess(null);
    setLoadingPdf(true);

    // Conectamos al bucket de entrada
    const storagePdfs = getStorage(undefined, import.meta.env.VITE_BUCKET_PDFS);
    const pdfRef = ref(storagePdfs, file.name);

    try {
      setStatusText('Subiendo PDF a la plataforma...');
      await uploadBytes(pdfRef, file);
      
      setLoadingPdf(false);
      setWaitingForMd(true);
      setStatusText('PDF subido. Gemini está extrayendo el texto (esto puede tardar varios minutos)...');
      
      // Predecimos el nombre del archivo Markdown resultante (reemplaza .pdf o .PDF por .md)
      const expectedMdName = file.name.replace(/\.[^/.]+$/, "") + ".md";
      
      // Iniciamos el proceso de búsqueda en la sala de espera
      pollForMarkdown(expectedMdName);

    } catch (err) {
      console.error("Error subiendo PDF:", err);
      setError('Error al subir el PDF: ' + err.message);
      setLoadingPdf(false);
    }
  };

  // Polling: Preguntar al bucket "pendientes" si ya está el archivo
  const pollForMarkdown = async (mdFileName, attempt = 1) => {
    const maxAttempts = 60; // 60 intentos x 30 segundos = 30 minutos de espera máxima
    
    // NOTA: Asegúrate de usar la inicialización correcta de tu storage según tu código actual
    const storage = getStorage();
    const mdRef = ref(storage, `${import.meta.env.VITE_BUCKET_PENDIENTES}/${mdFileName}`);

    try {
      const url = await getDownloadURL(mdRef);
      const response = await fetch(url);
      const text = await response.text();
      
      // =========================================================================
      // LÓGICA NUEVA: AUTO-LLENADO DE METADATOS MEDIANTE REGEX
      // =========================================================================
      let extractedTitle = '';
      let extractedAuthor = '';
      let cleanText = text;

      // 1. Extraer Título (Línea que empieza con un "#" seguido de un espacio)
      const titleMatch = cleanText.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        extractedTitle = titleMatch[1].trim();
        // Borramos esa línea del editor para evitar duplicarla al indexar
        cleanText = cleanText.replace(/^#\s+.+$/m, '');
      }

      // 2. Extraer Autor (Línea que contiene "**Autor:**")
      const authorMatch = cleanText.match(/\*\*Autor:\*\*\s*(.+)$/m);
      if (authorMatch) {
        extractedAuthor = authorMatch[1].trim();
        // Borramos esa línea del editor
        cleanText = cleanText.replace(/\*\*Autor:\*\*\s*.+$/m, '');
      }

      // Limpiamos los saltos de línea en blanco que quedaron al inicio
      cleanText = cleanText.trimStart();

      // Rellenamos las cajas automáticamente si encontramos datos
      if (extractedTitle) setTitle(extractedTitle);
      if (extractedAuthor) setAuthor(extractedAuthor);
      
      // Colocamos el texto limpio en el editor
      setMarkdownContent(cleanText);
      // =========================================================================

      setWaitingForMd(false);
      setSuccess('¡Texto extraído exitosamente! Gemini ha sugerido el Título y Autor (verifícalos abajo).');
      setStatusText('');
    } catch (err) {
      if (err.code === 'storage/object-not-found') {
        if (attempt >= maxAttempts) {
          setWaitingForMd(false);
          setError('Tiempo de espera agotado. El archivo tardó demasiado en procesarse.');
          return;
        }
        
        // AQUÍ CAMBIAMOS EL TIEMPO: 300000 milisegundos = 5 minutos
        setStatusText(`Gemini procesando... Por favor, no cierres esta ventana, puede durar unos minutos.`);
        pollingRef.current = setTimeout(() => pollForMarkdown(mdFileName, attempt + 1), 300000);
      } else {
        setWaitingForMd(false);
        setError('Error buscando el Markdown: ' + err.message);
      }
    }
  };

  // =========================================================================
  // PASO 2: INYECTAR METADATOS Y ENVIAR AL VECTORIZADOR (FLASK)
  // =========================================================================
  const handleIndex = async () => {
    if (userRole === 'lector') return; // Bloqueo de seguridad a nivel función

    if (!title.trim() || !author.trim() || !markdownContent.trim()) {
      setError('Faltan metadatos (Título/Autor) o el texto Markdown está vacío.');
      return;
    }
    
    setLoadingIdx(true);
    setError(null);
    setStatusText('Enviando documento al servicio vectorizador...');

    // Inyectamos Título y Autor al inicio exacto del documento para que
    // el prompt del "Bibliotecario" en tu backend Flask lo extraiga 100% bien.
    const finalMarkdown = `# ${title.trim()}\n**Autor:** ${author.trim()}\n\n${markdownContent}`;
    
    // Generamos un nombre de archivo seguro para el bucket final
    const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
    const finalFileName = `${safeTitle}_${Date.now()}.md`;

    // Conectamos al bucket que dispara el Servicio 2 (Flask)
    const storageListos = getStorage(undefined, import.meta.env.VITE_BUCKET_LISTOS);
    const readyRef = ref(storageListos, finalFileName);

    try {
      // Subimos el string directamente como un archivo de texto plano (.md)
      await uploadString(readyRef, finalMarkdown, StringFormat.RAW, {
        contentType: 'text/markdown',
      });

      setSuccess(`¡Éxito! El libro "${title}" ha sido enviado a la colección pida_kb_genai-v20.`);
      
      // Limpiamos el formulario para la siguiente ingesta
      setFile(null);
      setMarkdownContent('');
      setTitle('');
      setAuthor('');
      setStatusText('');
    } catch (err) {
      console.error("Error en indexación:", err);
      setError('Error al enviar a indexación: ' + err.message);
    } finally {
      setLoadingIdx(false);
    }
  };

  // =========================================================================
  // INTERFAZ DE USUARIO (RENDER)
  // =========================================================================
  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        Ingesta de Documentos (Human-in-the-loop)
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Sube un documento PDF, revisa el texto extraído por la IA para corregir errores, 
        agrega los metadatos y envíalo para su vectorización final en la base de datos.
      </Typography>

      {/* Alertas de Error y Éxito */}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 2 }}>
        
        {/* SECCIÓN 1: Subida de PDF */}
        <Typography variant="h6" gutterBottom fontWeight="bold">
          1. Subir PDF para Extracción
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
          <Tooltip title={userRole === 'lector' ? "No tienes permisos para subir documentos" : ""}>
            <span style={{ display: 'flex', flexGrow: 1 }}>
              <Button 
                variant="outlined" 
                component="label" 
                startIcon={<CloudUploadIcon />} 
                sx={{ flexGrow: 1, textTransform: 'none', justifyContent: 'flex-start', px: 3 }}
                color={file ? "success" : "primary"}
                disabled={userRole === 'lector'}
              >
                {file ? file.name : 'Seleccionar archivo PDF'}
                <input 
                  type="file" 
                  hidden 
                  accept="application/pdf" 
                  onChange={handleFileChange} 
                  disabled={userRole === 'lector'} 
                />
              </Button>
            </span>
          </Tooltip>
          
          <Tooltip title={userRole === 'lector' ? "No tienes permisos para extraer texto" : ""}>
            <span>
              <Button 
                variant="contained" 
                onClick={handleUploadAndListen} 
                disabled={!file || loadingPdf || waitingForMd || userRole === 'lector'}
                sx={{ minWidth: 200, height: '100%' }}
              >
                {loadingPdf ? <CircularProgress size={24} color="inherit" /> : 'Extraer a Markdown'}
              </Button>
            </span>
          </Tooltip>
        </Stack>

        {/* Indicadores Visuales de Polling (Espera del Servidor) */}
        {waitingForMd && (
          <Box sx={{ my: 4, textAlign: 'center', p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
            <AutorenewIcon sx={{ animation: 'spin 2s linear infinite', fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="body1" fontWeight="medium" color="text.primary">
              {statusText}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
              Gemini está procesando el documento página por página.
            </Typography>
            <LinearProgress sx={{ height: 6, borderRadius: 3 }} />
            <style>
              {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
            </style>
          </Box>
        )}

        <Divider sx={{ my: 4 }} />

        {/* SECCIÓN 2: Editor (Human-in-the-loop) */}
        <Typography variant="h6" gutterBottom fontWeight="bold">
          2. Intervención Humana (Limpieza de Formato)
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Revisa el texto extraído. Corrige saltos de línea erróneos, caracteres extraños o elimina texto basura antes de indexar.
        </Typography>
        <TextField
          label="Editor Markdown"
          multiline
          rows={15}
          fullWidth
          variant="outlined"
          value={markdownContent}
          onChange={(e) => setMarkdownContent(e.target.value)}
          disabled={loadingPdf || waitingForMd || userRole === 'lector'}
          sx={{ mb: 4, fontFamily: 'monospace' }}
          InputProps={{
            sx: { fontFamily: 'monospace', fontSize: '0.9rem' }
          }}
          placeholder="El texto extraído aparecerá aquí..."
        />

        <Divider sx={{ my: 4 }} />

        {/* SECCIÓN 3: Metadatos y Envío Final */}
        <Typography variant="h6" gutterBottom fontWeight="bold">
          3. Metadatos e Indexación
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} mb={4}>
          <TextField
            label="Título del Documento"
            fullWidth
            required
            variant="outlined"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loadingIdx || userRole === 'lector'}
          />
          <TextField
            label="Autor Principal"
            fullWidth
            required
            variant="outlined"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            disabled={loadingIdx || userRole === 'lector'}
          />
        </Stack>

        <Box display="flex" justifyContent="flex-end" alignItems="center">
          {loadingIdx && (
            <Typography variant="body2" sx={{ mr: 3 }} color="text.secondary">
              {statusText}
            </Typography>
          )}
          <Tooltip title={userRole === 'lector' ? "Modo de solo lectura activado" : ""}>
            <span>
              <Button
                variant="contained"
                color="success"
                size="large"
                endIcon={<SendIcon />}
                onClick={handleIndex}
                disabled={!markdownContent || !title || !author || loadingIdx || userRole === 'lector'}
                sx={{ px: 4, py: 1.5 }}
              >
                {loadingIdx ? <CircularProgress size={24} color="inherit" /> : 'Aprobar e Indexar Libro'}
              </Button>
            </span>
          </Tooltip>
        </Box>

      </Paper>
    </Box>
  );
}