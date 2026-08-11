import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Typography, Button, TextField, Paper, 
  Alert, Stack, Divider, LinearProgress, Chip 
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SendIcon from '@mui/icons-material/Send';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

import { getStorage, ref, uploadBytes, getDownloadURL, uploadString, StringFormat } from 'firebase/storage';
import { useAuth } from '../AuthContext';

export default function Ingesta() {
  const { userRole } = useAuth();
  
  const [docs, setDocs] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [globalError, setGlobalError] = useState(null);
  const [globalSuccess, setGlobalSuccess] = useState(null);

  const pollingRefs = useRef({});

  useEffect(() => {
    return () => {
      Object.values(pollingRefs.current).forEach(clearTimeout);
    };
  }, []);

  const updateDoc = (id, updates) => {
    setDocs(prev => prev.map(doc => doc.id === id ? { ...doc, ...updates } : doc));
  };

  const handleFileChange = (e) => {
    if (userRole === 'lector') return;

    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files).slice(0, 5);
      
      const newDocs = selectedFiles.map(file => ({
        id: file.name,
        file: file,
        status: 'idle',
        statusText: 'Pendiente de subida',
        markdownContent: '',
        title: '',
        author: '',
        docType: 'doctrina_general',
        error: null
      }));

      Object.values(pollingRefs.current).forEach(clearTimeout);
      pollingRefs.current = {};

      setDocs(newDocs);
      setActiveIndex(0);
      setGlobalError(null);
      setGlobalSuccess(null);
    }
  };

  const handleUploadAll = async () => {
    if (userRole === 'lector') return;
    setGlobalError(null);

    const docsToUpload = docs.filter(d => d.status === 'idle' || d.status === 'error');
    if (docsToUpload.length === 0) return;

    const storagePdfs = getStorage(undefined, import.meta.env.VITE_BUCKET_PDFS);

    docsToUpload.forEach(async (doc) => {
      const pdfRef = ref(storagePdfs, doc.file.name);
      updateDoc(doc.id, { status: 'uploading', statusText: 'Subiendo PDF...', error: null });

      try {
        await uploadBytes(pdfRef, doc.file);
        updateDoc(doc.id, { status: 'processing', statusText: 'Extrayendo y limpiando texto...' });

        const expectedJsonName = doc.file.name.replace(/\.[^/.]+$/, "") + ".json";
        pollForJson(doc.id, expectedJsonName);
      } catch (err) {
        updateDoc(doc.id, { status: 'error', statusText: 'Fallo al subir', error: err.message });
      }
    });
  };

  const pollForJson = async (docId, jsonFileName, attempt = 1) => {
    const maxAttempts = 120;
    const storage = getStorage();
    const jsonRef = ref(storage, `${import.meta.env.VITE_BUCKET_PENDIENTES}/${jsonFileName}`);

    try {
      const url = await getDownloadURL(jsonRef);
      const response = await fetch(url);
      const docData = await response.json(); 

      updateDoc(docId, { 
        status: 'ready', 
        statusText: '¡Listo para revisión!',
        title: docData.titulo_extraido || docId.replace(".pdf", ""), 
        author: docData.autor_extraido || "Desconocido", 
        docType: docData.tipo_documento || "doctrina_general",
        markdownContent: docData.full_markdown || "" 
      });

    } catch (err) {
      if (err.code === 'storage/object-not-found') {
        if (attempt >= maxAttempts) {
          updateDoc(docId, { status: 'error', statusText: 'Timeout', error: 'El servidor tardó demasiado.' });
          return;
        }
        updateDoc(docId, { statusText: `Procesando... (Intento ${attempt}/${maxAttempts})` });
        pollingRefs.current[docId] = setTimeout(() => pollForJson(docId, jsonFileName, attempt + 1), 15000);
      } else {
        updateDoc(docId, { status: 'error', statusText: 'Error', error: err.message });
      }
    }
  };

  // Helper para re-segmentar el Markdown si el usuario hizo ediciones manuales
  const rechunkMarkdown = (markdownText, docId, docType) => {
    const secciones = markdownText.split(/\n(?=#+\s)/);
    return secciones.filter(s => s.trim()).map((sec, idx) => {
      const firstLine = sec.split('\n')[0] || '';
      const h1Match = firstLine.match(/^#\s+(.+)$/);
      
      return {
        chunk_id: `${docId.replace('.pdf', '')}_c${idx + 1}`,
        texto: sec.trim(),
        metadatos: {
          archivo_origen: docId,
          tipo_documento: docType,
          seccion_h1: h1Match ? h1Match[1] : "Sección",
          orden_chunk: idx + 1
        }
      };
    });
  };

  const handleIndex = async () => {
    if (userRole === 'lector') return;
    const activeDoc = docs[activeIndex];

    if (!activeDoc.title.trim() || !activeDoc.author.trim() || !activeDoc.markdownContent.trim()) {
      setGlobalError(`Faltan metadatos o texto para el documento: ${activeDoc.id}`);
      return;
    }
    
    updateDoc(activeDoc.id, { status: 'indexing', statusText: 'Generando JSON para DB Vectorial...' });
    setGlobalError(null);

    // 1. Re-segmentar el Markdown editado
    const updatedChunks = rechunkMarkdown(activeDoc.markdownContent, activeDoc.id, activeDoc.docType);

    // 2. Crear payload JSON que consumirá el Pipeline Vectorial
    const finalVectorPackage = {
      archivo_origen: activeDoc.id,
      titulo: activeDoc.title.trim(),
      autor: activeDoc.author.trim(),
      tipo_documento: activeDoc.docType,
      full_markdown: activeDoc.markdownContent,
      total_chunks: updatedChunks.length,
      chunks: updatedChunks
    };

    const safeTitle = activeDoc.title.replace(/[^a-zA-Z0-9]/g, '_');
    const finalFileName = `${safeTitle}_${Date.now()}.json`;

    const storageListos = getStorage(undefined, import.meta.env.VITE_BUCKET_LISTOS);
    const readyRef = ref(storageListos, finalFileName);

    try {
      await uploadString(
        readyRef, 
        JSON.stringify(finalVectorPackage, null, 2), 
        StringFormat.RAW, 
        { contentType: 'application/json; charset=utf-8' }
      );
      
      updateDoc(activeDoc.id, { status: 'indexed', statusText: 'Indexado exitosamente' });
      setGlobalSuccess(`¡"${activeDoc.title}" empaquetado para DB Vectorial!`);

      const nextIndex = docs.findIndex((d, idx) => idx !== activeIndex && d.status === 'ready');
      if (nextIndex !== -1) setActiveIndex(nextIndex);

    } catch (err) {
      updateDoc(activeDoc.id, { status: 'error', statusText: 'Fallo al indexar', error: err.message });
    }
  };

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
        Sube hasta 5 PDFs simultáneamente. Revisa el Markdown limpio y aprueba el empaquetado para la DB Vectorial.
      </Typography>

      {globalError && <Alert severity="error" sx={{ mb: 3 }}>{globalError}</Alert>}
      {globalSuccess && <Alert severity="success" sx={{ mb: 3 }}>{globalSuccess}</Alert>}

      <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 2 }}>
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

        {activeDoc && (
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Trabajando en: {activeDoc.id}
            </Typography>
            
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

            <Typography variant="subtitle1" gutterBottom fontWeight="bold">2. Editor Markdown</Typography>
            <TextField
              label={`Markdown Limpio - ${activeDoc.id}`}
              multiline
              rows={14}
              fullWidth
              variant="outlined"
              value={activeDoc.markdownContent}
              onChange={(e) => updateDoc(activeDoc.id, { markdownContent: e.target.value })}
              disabled={activeDoc.status !== 'ready' || userRole === 'lector'}
              sx={{ mb: 4 }}
              InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.9rem' } }}
              placeholder={activeDoc.status === 'ready' ? "El texto extraído está vacío..." : "Esperando extracción..."}
            />

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
                Aprobar e Indexar en DB Vectorial
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}