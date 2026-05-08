import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Typography, Button, TextField, Paper, CircularProgress, 
  Alert, Stack, Divider, LinearProgress, Tooltip, Chip 
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SendIcon from '@mui/icons-material/Send';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

// Importaciones de Firebase Storage
import { getStorage, ref, uploadBytes, getDownloadURL, StringFormat, uploadString } from 'firebase/storage';
import { useAuth } from '../AuthContext';

export default function Ingesta() {
  const { userRole } = useAuth();
  
  // Estado que almacena la lista de documentos y sus ciclos de vida individuales
  const [docs, setDocs] = useState([]);
  // Índice del documento que estamos viendo actualmente en el editor
  const [activeIndex, setActiveIndex] = useState(0);

  const [globalError, setGlobalError] = useState(null);
  const [globalSuccess, setGlobalSuccess] = useState(null);

  // Referencia para controlar múltiples pollings simultáneos
  const pollingRefs = useRef({});

  useEffect(() => {
    // Limpieza de todos los temporizadores al desmontar
    return () => {
      Object.values(pollingRefs.current).forEach(clearTimeout);
    };
  }, []);

  // Función para actualizar una propiedad específica de un documento en el arreglo
  const updateDoc = (id, updates) => {
    setDocs(prev => prev.map(doc => doc.id === id ? { ...doc, ...updates } : doc));
  };

  const handleFileChange = (e) => {
    if (userRole === 'lector') return;

    if (e.target.files && e.target.files.length > 0) {
      // Limitamos a 5 documentos por lote
      const selectedFiles = Array.from(e.target.files).slice(0, 5);
      
      const newDocs = selectedFiles.map(file => ({
        id: file.name,
        file: file,
        status: 'idle', // idle, uploading, processing, ready, indexed, error
        statusText: 'Pendiente de subida',
        markdownContent: '',
        title: '',
        author: '',
        error: null
      }));

      // Cancelamos cualquier polling anterior
      Object.values(pollingRefs.current).forEach(clearTimeout);
      pollingRefs.current = {};

      setDocs(newDocs);
      setActiveIndex(0);
      setGlobalError(null);
      setGlobalSuccess(null);
    }
  };

  // =========================================================================
  // PASO 1: SUBIR TODOS LOS PDFS EN PARALELO
  // =========================================================================
  const handleUploadAll = async () => {
    if (userRole === 'lector') return;
    setGlobalError(null);

    const docsToUpload = docs.filter(d => d.status === 'idle' || d.status === 'error');
    if (docsToUpload.length === 0) return;

    const storagePdfs = getStorage(undefined, import.meta.env.VITE_BUCKET_PDFS);

    // Iteramos e iniciamos la subida de todos al mismo tiempo
    docsToUpload.forEach(async (doc) => {
      const pdfRef = ref(storagePdfs, doc.file.name);
      updateDoc(doc.id, { status: 'uploading', statusText: 'Subiendo PDF...', error: null });

      try {
        await uploadBytes(pdfRef, doc.file);
        updateDoc(doc.id, { status: 'processing', statusText: 'Extrayendo texto (PIDA trabajando)...' });

        const expectedMdName = doc.file.name.replace(/\.[^/.]+$/, "") + ".md";
        pollForMarkdown(doc.id, expectedMdName);
      } catch (err) {
        updateDoc(doc.id, { status: 'error', statusText: 'Fallo al subir', error: err.message });
      }
    });
  };

  const pollForMarkdown = async (docId, mdFileName, attempt = 1) => {
    const maxAttempts = 60; // 5 mins x 60 intentos = hasta 5 horas (útil para PDFs inmensos en paralelo)
    const storage = getStorage();
    const mdRef = ref(storage, `${import.meta.env.VITE_BUCKET_PENDIENTES}/${mdFileName}`);

    try {
      const url = await getDownloadURL(mdRef);
      const response = await fetch(url);
      const text = await response.text();
      
      let extractedTitle = '';
      let extractedAuthor = '';
      let cleanText = text;

      const titleMatch = cleanText.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        extractedTitle = titleMatch[1].trim();
        cleanText = cleanText.replace(/^#\s+.+$/m, '');
      }

      const authorMatch = cleanText.match(/\*\*Autor:\*\*\s*(.+)$/m);
      if (authorMatch) {
        extractedAuthor = authorMatch[1].trim();
        cleanText = cleanText.replace(/\*\*Autor:\*\*\s*.+$/m, '');
      }

      cleanText = cleanText.trimStart();

      updateDoc(docId, { 
        status: 'ready', 
        statusText: '¡Listo para revisión!',
        title: extractedTitle, 
        author: extractedAuthor, 
        markdownContent: cleanText 
      });

    } catch (err) {
      if (err.code === 'storage/object-not-found') {
        if (attempt >= maxAttempts) {
          updateDoc(docId, { status: 'error', statusText: 'Timeout', error: 'Tardó demasiado.' });
          return;
        }
        updateDoc(docId, { statusText: `Procesando... (Intento ${attempt}/${maxAttempts})` });
        pollingRefs.current[docId] = setTimeout(() => pollForMarkdown(docId, mdFileName, attempt + 1), 300000);
      } else {
        updateDoc(docId, { status: 'error', statusText: 'Error', error: err.message });
      }
    }
  };

  // =========================================================================
  // PASO 2: INYECTAR METADATOS Y ENVIAR AL VECTORIZADOR
  // =========================================================================
  const handleIndex = async () => {
    if (userRole === 'lector') return;
    const activeDoc = docs[activeIndex];

    if (!activeDoc.title.trim() || !activeDoc.author.trim() || !activeDoc.markdownContent.trim()) {
      setGlobalError(`Faltan metadatos o texto para el documento: ${activeDoc.id}`);
      return;
    }
    
    updateDoc(activeDoc.id, { status: 'indexing', statusText: 'Enviando al vectorizador...' });
    setGlobalError(null);

    const finalMarkdown = `# ${activeDoc.title.trim()}\n**Autor:** ${activeDoc.author.trim()}\n\n${activeDoc.markdownContent}`;
    const safeTitle = activeDoc.title.replace(/[^a-zA-Z0-9]/g, '_');
    const finalFileName = `${safeTitle}_${Date.now()}.md`;

    const storageListos = getStorage(undefined, import.meta.env.VITE_BUCKET_LISTOS);
    const readyRef = ref(storageListos, finalFileName);

    try {
      await uploadString(readyRef, finalMarkdown, StringFormat.RAW, { contentType: 'text/markdown' });
      updateDoc(activeDoc.id, { status: 'indexed', statusText: 'Indexado exitosamente' });
      setGlobalSuccess(`¡"${activeDoc.title}" indexado!`);

      // Pasar automáticamente al siguiente documento "listo" si lo hay
      const nextIndex = docs.findIndex((d, idx) => idx !== activeIndex && d.status === 'ready');
      if (nextIndex !== -1) setActiveIndex(nextIndex);

    } catch (err) {
      updateDoc(activeDoc.id, { status: 'error', statusText: 'Fallo al indexar', error: err.message });
    }
  };

  // Funciones de ayuda para UI
  const getChipColor = (status) => {
    switch(status) {
      case 'ready': return 'success';
      case 'indexed': return 'primary';
      case 'processing': return 'warning';
      case 'uploading': case 'indexing': return 'info';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getChipIcon = (status) => {
    switch(status) {
      case 'ready': return <CheckCircleIcon />;
      case 'indexed': return <SendIcon />;
      case 'processing': case 'uploading': case 'indexing': return <AutorenewIcon className="spin" />;
      case 'error': return <ErrorIcon />;
      default: return null;
    }
  };

  const activeDoc = docs[activeIndex];
  const allIdle = docs.every(d => d.status === 'idle' || d.status === 'error');

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <style>
        {`.spin { animation: spin 2s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}
      </style>
      
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        Ingesta de Documentos Lote (Máx. 5)
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Sube hasta 5 PDFs simultáneamente. Navega entre ellos para revisar el texto extraído y aprueba su indexación uno por uno.
      </Typography>

      {globalError && <Alert severity="error" sx={{ mb: 3 }}>{globalError}</Alert>}
      {globalSuccess && <Alert severity="success" sx={{ mb: 3 }}>{globalSuccess}</Alert>}

      <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 2 }}>
        
        {/* SECCIÓN 1: Selección y Subida */}
        <Typography variant="h6" gutterBottom fontWeight="bold">1. Selección de Archivos</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
          <Button 
            variant="outlined" 
            component="label" 
            startIcon={<CloudUploadIcon />} 
            sx={{ flexGrow: 1, textTransform: 'none' }}
            disabled={userRole === 'lector'}
          >
            {docs.length > 0 ? `${docs.length} archivos seleccionados` : 'Seleccionar PDFs (Máx. 5)'}
            <input 
              type="file" 
              hidden 
              multiple
              accept="application/pdf" 
              onChange={handleFileChange} 
              disabled={userRole === 'lector'} 
            />
          </Button>
          
          <Button 
            variant="contained" 
            onClick={handleUploadAll} 
            disabled={docs.length === 0 || !allIdle || userRole === 'lector'}
            sx={{ minWidth: 200 }}
          >
            Procesar Lote
          </Button>
        </Stack>

        {/* Navegador de Documentos */}
        {docs.length > 0 && (
          <Box sx={{ mb: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>Documentos en cola:</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {docs.map((doc, idx) => (
                <Chip 
                  key={doc.id}
                  label={doc.id}
                  color={getChipColor(doc.status)}
                  variant={activeIndex === idx ? "filled" : "outlined"}
                  onClick={() => setActiveIndex(idx)}
                  icon={getChipIcon(doc.status)}
                  sx={{ mb: 1, fontWeight: activeIndex === idx ? 'bold' : 'normal' }}
                />
              ))}
            </Stack>
          </Box>
        )}

        <Divider sx={{ my: 4 }} />

        {/* ÁREA DE TRABAJO DEL DOCUMENTO ACTIVO */}
        {activeDoc && (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Trabajando en: {activeDoc.id}
            </Typography>
            
            {/* Estado particular del archivo activo */}
            {['processing', 'uploading', 'indexing'].includes(activeDoc.status) && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Estado: {activeDoc.statusText}
                </Typography>
                <LinearProgress />
              </Box>
            )}
            
            {activeDoc.error && (
              <Alert severity="error" sx={{ mb: 3 }}>{activeDoc.error}</Alert>
            )}

            {/* SECCIÓN 2: Editor */}
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">2. Intervención Humana</Typography>
            <TextField
              label={`Editor Markdown - ${activeDoc.id}`}
              multiline
              rows={12}
              fullWidth
              variant="outlined"
              value={activeDoc.markdownContent}
              onChange={(e) => updateDoc(activeDoc.id, { markdownContent: e.target.value })}
              disabled={activeDoc.status !== 'ready' || userRole === 'lector'}
              sx={{ mb: 4 }}
              InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.9rem' } }}
              placeholder={activeDoc.status === 'ready' ? "El texto extraído está vacío..." : "Esperando extracción..."}
            />

            {/* SECCIÓN 3: Metadatos y Envío */}
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">3. Metadatos e Indexación</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} mb={3}>
              <TextField
                label="Título del Documento"
                fullWidth
                required
                value={activeDoc.title}
                onChange={(e) => updateDoc(activeDoc.id, { title: e.target.value })}
                disabled={activeDoc.status !== 'ready' || userRole === 'lector'}
              />
              <TextField
                label="Autor Principal"
                fullWidth
                required
                value={activeDoc.author}
                onChange={(e) => updateDoc(activeDoc.id, { author: e.target.value })}
                disabled={activeDoc.status !== 'ready' || userRole === 'lector'}
              />
            </Stack>

            <Box display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                color="success"
                size="large"
                endIcon={<SendIcon />}
                onClick={handleIndex}
                disabled={activeDoc.status !== 'ready' || userRole === 'lector'}
                sx={{ px: 4, py: 1.5 }}
              >
                Aprobar e Indexar
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}