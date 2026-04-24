import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Exporter, getTimestampedName } from '../utils/exporter';

import { Box, TextField, Button, ButtonGroup, Fab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Typography } from '@mui/material';

const API_ANA = "https://analize-v20-genai-465781488910.us-central1.run.app";

// Componente React que dibuja la línea de tiempo nativa basada en JSON
const TimelineChart = ({ dataString }) => {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('Todas');
  const [phases, setPhases] = useState([]);

  useEffect(() => {
    try {
      let cleanJson = dataString.replace(/\x60{3}(?:json-timeline|json)?/gi, '').replace(/\x60{3}/g, '').trim();
      if (!cleanJson) return;
      const parsedData = JSON.parse(cleanJson);
      
      if (Array.isArray(parsedData)) {
        setEvents(parsedData);
        const uniquePhases = [...new Set(parsedData.map(item => item.phase || 'General'))];
        setPhases(['Todas', ...uniquePhases]);
      }
    } catch (e) {
      // Silencioso mientras carga
    }
  }, [dataString]);

  if (!Array.isArray(events) || events.length === 0) {
     return (
       <div style={{ margin: '25px 0', padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
         <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>⏳</span> Generando línea de tiempo...
       </div>
     );
  }

  const filteredEvents = filter === 'Todas' ? events : events.filter(e => e.phase === filter);

  return (
    <div style={{ margin: '25px 0', width: '100%', background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
        {phases.map(p => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            style={{
              padding: '6px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer',
              background: filter === p ? 'var(--pida-primary)' : '#f1f5f9',
              color: filter === p ? 'white' : '#475569',
              border: 'none', transition: 'all 0.2s'
            }}
          >
            {p}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
        <div style={{ position: 'absolute', left: '16px', top: '10px', bottom: '10px', width: '2px', background: '#cbd5e1', zIndex: 0 }}></div>

        {filteredEvents.map((ev, i) => (
          <div key={i} style={{ display: 'flex', gap: '20px', position: 'relative', zIndex: 1 }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'white', border: '3px solid var(--pida-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '4px' }}>
               <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--pida-accent)' }}></div>
            </div>
            
            <div style={{ flex: 1, background: '#f8fafc', padding: '15px 20px', borderRadius: '8px', borderLeft: '4px solid var(--pida-primary)', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '1rem' }}>{ev.date}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--pida-primary)', background: '#e0e7ff', padding: '3px 8px', borderRadius: '4px' }}>
                  {ev.phase}
                </span>
              </div>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: '1.5', wordBreak: 'break-word' }}>{ev.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente React que dibuja un Diagrama de Flujo / Proceso basado en JSON
const FlowChart = ({ dataString }) => {
  const [steps, setSteps] = useState([]);

  useEffect(() => {
    try {
      let cleanJson = dataString.replace(/\x60{3}(?:json-flow|json)?/gi, '').replace(/\x60{3}/g, '').trim();
      if (!cleanJson) return;
      const parsedData = JSON.parse(cleanJson);
      
      if (Array.isArray(parsedData)) setSteps(parsedData);
    } catch (e) {
      // Silencioso mientras carga
    }
  }, [dataString]);

  if (!Array.isArray(steps) || steps.length === 0) {
     return (
       <div style={{ margin: '25px 0', padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
         <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>⏳</span> Generando diagrama de flujo...
       </div>
     );
  }

  return (
    <div style={{ margin: '25px 0', width: '100%', background: '#F1F5F9', padding: '25px', borderRadius: '12px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div style={{ 
              width: '100%', maxWidth: '450px', background: 'white', padding: '15px 20px', 
              borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              position: 'relative', textAlign: 'center'
            }}>
              <div style={{ 
                position: 'absolute', left: '-12px', top: '50%', transform: 'translateY(-50%)',
                background: 'var(--pida-primary)', color: 'white', width: '24px', height: '24px',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 'bold', zIndex: 2
              }}>
                {i + 1}
              </div>
              <div style={{ fontWeight: '800', color: 'var(--pida-primary)', marginBottom: '5px', fontSize: '0.95rem', textTransform: 'uppercase' }}>{s.step}</div>
              {s.requirement && <div style={{ fontSize: '0.75rem', color: '#B91C1C', fontWeight: 'bold', marginBottom: '8px' }}>⚠️ {s.requirement}</div>}
              <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.4' }}>{s.action}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ height: '20px', width: '2px', background: '#94A3B8', margin: '2px 0' }}></div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const markdownComponents = {
  a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />,

  code: ({ node, inline, className, children, ...props }) => {
    // 👇 CAMBIO AQUÍ: Agregamos el guion dentro de los corchetes [\w-] 👇
    const match = /language-([\w-]+)/.exec(className || '');
    
    if (!inline && match && match[1] === 'json-timeline') {
      return <TimelineChart dataString={String(children)} />;
    }
    
    if (!inline && match && match[1] === 'json-flow') {
      return <FlowChart dataString={String(children)} />;
    }
    
    return (
      <code 
        className={className} 
        style={{ 
          backgroundColor: '#f1f5f9', 
          padding: '2px 4px', 
          borderRadius: '4px', 
          fontSize: '0.9em',
          whiteSpace: 'pre-wrap', 
          wordBreak: 'break-all'
        }} 
        {...props}
      >
        {children}
      </code>
    );
  },

  pre: ({ node, children, ...props }) => (
    <pre style={{ 
      whiteSpace: 'pre-wrap', 
      wordBreak: 'break-all', 
      overflowX: 'hidden', 
      maxWidth: '100%', 
      backgroundColor: '#f1f5f9', 
      padding: '10px', 
      borderRadius: '8px' 
    }} {...props}>
      {children}
    </pre>
  ),
  
  table: ({ node, ...props }) => (
    <div style={{ display: 'block', width: '100%', maxWidth: '100%', overflowX: 'auto' }}>
      <TableContainer component={Paper} sx={{ width: '100%', mb: 2, boxShadow: 'none', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <Table size="small" sx={{ minWidth: 600 }} {...props} />
      </TableContainer>
    </div>
  ),
  thead: ({ node, ...props }) => <TableHead sx={{ bgcolor: '#f1f5f9' }} {...props} />,
  tbody: ({ node, ...props }) => <TableBody {...props} />,
  tr: ({ node, ...props }) => <TableRow hover {...props} />,
  th: ({ node, ...props }) => (
    <TableCell
      sx={{
        fontWeight: 'bold',
        color: 'var(--pida-primary)',
        borderBottom: '2px solid #cbd5e1',
        whiteSpace: 'normal',
        lineHeight: 1.3
      }}
      {...props}
    />
  ),
  td: ({ node, ...props }) => (
    <TableCell
      sx={{
        borderColor: '#e2e8f0',
        verticalAlign: 'top',
        whiteSpace: 'normal',
        wordBreak: 'break-word'
      }}
      {...props}
    />
  )
};

const translateFileError = (errMsg, currentFiles = []) => {
  if (!errMsg) return { title: "Error Desconocido", message: "Ocurrió un error desconocido al procesar el archivo." };

  const lowerMsg = errMsg.toLowerCase();

  if (lowerMsg.includes('unterminated') || lowerMsg.includes('json') || lowerMsg.includes('parse')) {
    return { title: "Interrupción de Red", message: "La respuesta del servidor se cortó o llegó incompleta debido a una interrupción temporal en la conexión.\n\nPor favor, presiona el botón **'Analizar'** nuevamente para reintentarlo." };
  }

  if (lowerMsg.includes('password') || lowerMsg.includes('encrypt') || lowerMsg.includes('protegido') || lowerMsg.includes('contraseña')) {
    return { title: "Documento Protegido", message: "El documento tiene una **contraseña de apertura** o restricciones de lectura.\n\nPor favor, retira la protección de seguridad y vuelve a subir el archivo para que la Inteligencia Artificial pueda analizarlo." };
  }
  
  if (lowerMsg.includes('corrupt') || lowerMsg.includes('eof') || lowerMsg.includes('bad zip') || lowerMsg.includes('unreadable') || lowerMsg.includes('dañado') || lowerMsg.includes('mupdf') || lowerMsg.includes('syntax error')) {
    return { title: "Archivo Corrupto o Dañado", message: "No fue posible leer el documento porque su estructura interna está **dañada** o malformada.\n\n**Solución rápida:** Abre el documento en tu computadora, selecciona la opción **'Imprimir'**, elige **'Guardar como PDF'** y vuelve a subir esta nueva versión." };
  }
  
  if (lowerMsg.includes('empty') || lowerMsg.includes('vacío') || lowerMsg.includes('no text')) {
    return { title: "Documento Vacío o en Blanco", message: "El archivo parece estar **completamente vacío** o contiene solo páginas en blanco.\n\nVerifica que el archivo original contenga información visible antes de intentar subirlo nuevamente." };
  }
  
  if (lowerMsg.includes('excede_tamano') || lowerMsg.includes('tamaño') || lowerMsg.includes('pesa') || lowerMsg.includes('size') || lowerMsg.includes('large') || lowerMsg.includes('413')) {
    return { title: "Límite de Tamaño Excedido", message: "El documento supera el peso máximo permitido por tu plan actual.\n\nPor favor, revisa tu nivel de suscripción o divide el documento en partes más pequeñas para proceder con el análisis." };
  }
  
  if (lowerMsg.includes('invalid argument') || lowerMsg.includes('400 request contains') || lowerMsg.includes('400')) {
    let totalSizeMB = 0;
    if (currentFiles && currentFiles.length > 0) {
        totalSizeMB = currentFiles.reduce((acc, file) => acc + ((file.size || 0) / (1024 * 1024)), 0);
    }
    
    if (currentFiles && currentFiles.length > 0 && totalSizeMB < 10) {
        return {
            title: "Archivo Corrupto o Dañado",
            message: "El motor de Inteligencia Artificial no pudo procesar el documento porque presenta **corrupción oculta en su estructura interna**.\n\n**Solución rápida:** Abre el documento en tu computadora, selecciona la opción **'Imprimir'**, elige **'Guardar como PDF'** y vuelve a subir esta nueva versión generada."
        };
    } else {
        return {
            title: "Error de Lectura o Complejidad",
            message: "El motor de análisis rechazó el documento. Esto suele ocurrir por dos motivos:\n\n1. El archivo presenta **corrupción en su estructura interna**.\n2. El documento supera la **capacidad máxima de procesamiento** (ej. exceso de resolución visual o miles de páginas).\n\n**Solución:** Verifica que el archivo sea válido. Si el problema persiste, intenta comprimirlo, dividirlo en secciones o guardarlo nuevamente como PDF ('Imprimir > Guardar como PDF')."
        };
    }
  }

  if (lowerMsg.includes('format') || lowerMsg.includes('support') || lowerMsg.includes('formato')) {
    return { title: "Formato no Soportado", message: "El formato del archivo no es compatible con el motor de análisis.\n\nAsegúrate de subir únicamente archivos en formato **PDF** (`.pdf`) o documentos de **Word** (`.docx`)." };
  }
  if (lowerMsg.includes('timeout') || lowerMsg.includes('tiempo')) {
    return { title: "Tiempo de Espera Agotado", message: "El documento es demasiado complejo y el servidor tardó más de lo esperado en procesarlo.\n\nEsto suele ocurrir con archivos extremadamente largos. Intenta procesarlo por partes." };
  }
  if (lowerMsg.includes('límite') || lowerMsg.includes('suscripción') || lowerMsg.includes('402') || lowerMsg.includes('403') || lowerMsg.includes('429')) {
    return { title: "Límite de Suscripción Alcanzado", message: "Has alcanzado el límite de análisis diarios de tu plan o tu suscripción no se encuentra activa.\n\nRevisa el estado de tu cuenta en el panel principal para continuar utilizando el servicio." };
  }

  return { title: "Error de Análisis", message: `Ocurrió un problema técnico durante el proceso:\n\n\`${errMsg}\`` };
};

export default function AnalyzerInterface({ user, resetSignal, loadAnaId }) {
  const [files, setFiles] = useState([]);
  const [instructions, setInstructions] = useState('');
  
  const [messages, setMessages] = useState([]);
  const [currentAnaId, setCurrentAnaId] = useState(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusText, setStatusText] = useState('');
  
  const [errorModal, setErrorModal] = useState({ show: false, title: '', message: '' });
  const [showMissingFileModal, setShowMissingFileModal] = useState(false);
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;
      setIsAtBottom(distanceToBottom < 80);
    }
  };

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAnalyzing]);

  useEffect(() => {
    if (resetSignal > 0) {
      handleClear();
    }
  }, [resetSignal]);

  useEffect(() => {
    if (loadAnaId) {
      const loadPastAna = async () => {
        setIsAnalyzing(true);
        setStatusText('Cargando historial...');
        setErrorModal({ show: false, title: '', message: '' });
        setMessages([]);
        setCurrentAnaId(null);
        setIsAtBottom(true);
        
        try {
          const token = await user.getIdToken();
          const res = await fetch(`${API_ANA}/analysis-history/${loadAnaId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!res.ok) throw new Error("Error del servidor al cargar el historial.");
          
          const data = await res.json();
          
          try {
            const parsed = JSON.parse(data.analysis);
            if (Array.isArray(parsed)) {
                setMessages(parsed);
            } else {
                setMessages([
                    { role: 'user', content: data.instructions },
                    { role: 'model', content: data.analysis }
                ]);
            }
          } catch(e) {
            setMessages([
                { role: 'user', content: data.instructions },
                { role: 'model', content: data.analysis }
            ]);
          }
          
          setCurrentAnaId(loadAnaId);
          setFiles([]);
          setTimeout(() => scrollToBottom('auto'), 100);
        } catch (err) {
          const mappedError = translateFileError(err.message, []);
          setErrorModal({ show: true, ...mappedError });
        } finally {
          setIsAnalyzing(false);
          setStatusText('');
        }
      };
      loadPastAna();
    }
  }, [loadAnaId, user]);

  const handleFileChange = (e) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = [];
      
      selectedFiles.forEach(file => {
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > 50) {
          setErrorModal({
            show: true,
            title: "Archivo excede el límite máximo",
            message: `El archivo **${file.name}** pesa ${fileSizeMB.toFixed(2)} MB.\n\nEl límite máximo absoluto permitido en la plataforma es de **50 MB** por documento para garantizar el rendimiento del sistema. Por favor, divide tu archivo antes de subirlo.`
          });
        } else {
          validFiles.push(file);
        }
      });

      if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles]);
        setErrorModal({ show: false, title: '', message: '' });
      }
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const handleClear = () => {
    setFiles([]);
    setInstructions('');
    setMessages([]);
    setCurrentAnaId(null);
    setErrorModal({ show: false, title: '', message: '' });
    setStatusText('');
    setIsAtBottom(true);
  };

  const handleBackendDownload = async (format) => {
    if (messages.length === 0) {
      alert("Por favor, interactúa en el analizador antes de descargarlo.");
      return;
    }
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      
      formData.append("history_json", JSON.stringify(messages));
      formData.append("file_format", format);
      if (currentAnaId) formData.append("analysis_id", currentAnaId);

      const res = await fetch(`${API_ANA}/download-analysis`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error("Error en el servidor al generar el documento.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${getTimestampedName("Analisis_PIDA")}.${format}`; 
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Hubo un problema descargando el archivo.");
    }
  };

  const handleAnalyze = async (eOrInstruction = null) => {
    if (eOrInstruction && eOrInstruction.preventDefault) {
      eOrInstruction.preventDefault();
    }

    const currentInstruction = typeof eOrInstruction === 'string' ? eOrInstruction : instructions;

    if (files.length === 0 && !currentAnaId) {
      alert("Por favor, selecciona al menos un documento para comenzar el análisis.");
      return;
    }

    setIsAnalyzing(true);
    setIsAtBottom(true);
    setTimeout(() => scrollToBottom(), 50);

    setErrorModal({ show: false, title: '', message: '' });
    
    const newMessages = [...messages, { role: 'user', content: currentInstruction }];
    setMessages(newMessages);
    setInstructions('');

    let promptToSend = currentInstruction;

    try {
      const token = await user.getIdToken();
      let uploadedFilesData = [];

      // Procesamos TODOS los archivos directamente hacia Cloud Storage
      if (files.length > 0) {
        setStatusText('Autenticando y preparando documentos...');
        
        // 1. Pedimos las URLs firmadas para todos los archivos seleccionados
        const fileMetadata = files.map(f => ({ name: f.name, type: f.type || 'application/pdf' }));
        const urlRes = await fetch(`${API_ANA}/generate-upload-urls`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ files: fileMetadata })
        });

        if (!urlRes.ok) {
           const errData = await urlRes.json().catch(() => ({}));
           throw new Error(errData.detail || "Error al obtener permisos de almacenamiento.");
        }

        const urlData = await urlRes.json();
        const { urls } = urlData;

        setStatusText('Cargando documentos en el servidor seguro...');
        
        // 2. Subimos los archivos DIRECTO a Google usando el método PUT
        const uploadPromises = files.map((file, i) => {
          return fetch(urls[i].upload_url, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type || 'application/pdf' }
          });
        });

        await Promise.all(uploadPromises);

        // 3. Guardamos los URIs que nos devolvió el servidor para pasárselos al Analizador
        urls.forEach(u => {
          uploadedFilesData.push({ gs_uri: u.gs_uri, filename: u.filename, mime_type: u.mime_type });
        });
      }

      setStatusText('Procesando información con el motor de IA...');
      const fd = new FormData();
      
      fd.append('files_data', JSON.stringify(uploadedFilesData)); 
      fd.append('instructions', promptToSend);
      if (currentAnaId) fd.append('analysis_id', currentAnaId); 

      const res = await fetch(`${API_ANA}/analyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, 
        body: fd
      });

      if (!res.ok) {
        if (res.status === 403 || res.status === 402 || res.status === 429) {
          throw new Error("Has excedido el límite de tu suscripción activa.");
        }
        const errorJson = await res.json().catch(() => null);
        throw new Error(errorJson?.detail || `Error del servidor (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullText = "";
      
      let streamBuffer = ""; 
      
      setStatusText(''); 

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        streamBuffer += decoder.decode(value, { stream: true });
        const chunks = streamBuffer.split('\n\n');
        streamBuffer = chunks.pop();
        
        for (const chunk of chunks) {
          if (chunk.startsWith('data:')) {
            try {
              const jsonStr = chunk.replace(/^data:\s*/, '');
              const d = JSON.parse(jsonStr);
              
              if (d.error) throw new Error(d.error); 

              if (d.status) {
                setStatusText(d.status);
              }
              
              if (d.text) {
                const chars = d.text;
                const step = 2; // <-- Pintar de 1 en 1 (o máximo 2) para mayor fluidez
                for (let i = 0; i < chars.length; i += step) {
                  fullText += chars.substring(i, i + step);
                  
                  setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === 'model') {
                        return [...prev.slice(0, -1), { ...lastMsg, content: fullText }];
                    } else {
                        return [...prev, { role: 'model', content: fullText }];
                    }
                  });
                  
                  // Esto simula la velocidad real de tipeo (aprox 60-100 caracteres por segundo)
                  await new Promise(resolve => setTimeout(resolve, 12)); 
                }
              }
              
              if (d.analysis_id) {
                  setCurrentAnaId(d.analysis_id);
              }
              
            } catch (e) {
              if (e.message && !e.message.includes('JSON')) {
                 throw e; 
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error en Análisis:", err);
      
      const errMsg = err.message ? err.message.toLowerCase() : "";
      
      // Si estamos en un follow-up (currentAnaId existe) y Google nos dice que el archivo no existe o no hay acceso
      const isExpiredFile = currentAnaId && (
        errMsg.includes('not exist') || 
        errMsg.includes('not found') || 
        errMsg.includes('no existe') || 
        errMsg.includes('permission') ||
        errMsg.includes('no encontrado')
      );

      if (isExpiredFile) {
        // Disparamos el modal que ya tienes maquetado
        setShowMissingFileModal(true);
      } else {
        // Si es otro error (tamaño, internet, etc.), usamos tu lógica normal
        const mappedError = translateFileError(err.message, files);
        setErrorModal({ show: true, ...mappedError });
      }
      
      // Eliminamos la pregunta fallida del chat, pero ¡la devolvemos al input! 
      // Así el usuario no tiene que volver a escribir su pregunta tras subir el documento.
      setMessages(prev => {
        if(prev.length > 0 && prev[prev.length - 1].role === 'user') {
          setInstructions(prev[prev.length - 1].content); 
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsAnalyzing(false);
      setStatusText('');
    }
  };

  const handleTXTDownload = () => {
    if (messages.length === 0) {
      alert("Por favor, interactúa en el analizador antes de descargarlo.");
      return;
    }

    const cleanMessages = messages.map(msg => {
      if (msg.role !== 'model') return msg;
      
      let content = msg.content;

      // Transformar bloque TIMELINE en texto plano
      content = content.replace(/\[TIMELINE_START\]([\s\S]*?)\[TIMELINE_END\]/gi, (match, rawJson) => {
        try {
          const cleanJson = rawJson.replace(/\x60{3}(?:json-timeline|json)?/gi, '').replace(/\x60{3}/g, '').trim();
          const data = JSON.parse(cleanJson);
          let textRep = "\n=== LÍNEA DE TIEMPO ===\n\n";
          data.forEach(item => {
            textRep += `• FECHA: ${item.date}\n`;
            textRep += `  FASE: ${item.phase}\n`;
            textRep += `  DESCRIPCIÓN: ${item.description}\n\n`;
          });
          return textRep + "=======================\n";
        } catch(e) {
          return match; 
        }
      });

      // Transformar bloque FLOW en texto plano
      content = content.replace(/\[FLOW_START\]([\s\S]*?)\[FLOW_END\]/gi, (match, rawJson) => {
        try {
          const cleanJson = rawJson.replace(/\x60{3}(?:json-flow|json)?/gi, '').replace(/\x60{3}/g, '').trim();
          const data = JSON.parse(cleanJson);
          let textRep = "\n=== DIAGRAMA DE PROCESO ===\n\n";
          data.forEach((item, i) => {
            textRep += `${i + 1}. PASO: ${item.step}\n`;
            if (item.requirement) textRep += `   REQUISITO: ${item.requirement}\n`;
            textRep += `   ACCIÓN: ${item.action}\n\n`;
          });
          return textRep + "===========================\n";
        } catch(e) {
          return match;
        }
      });

      // Quitar la palabra [INVESTIGADOR] o similares si hay ruido, 
      // aunque el Exporter.downloadTXT suele encargarse del formato general.
      
      return { ...msg, content };
    });

    Exporter.downloadTXT(getTimestampedName("Analisis-PIDA"), "Análisis de Documentos", cleanMessages);
  };

  const formatMarkdown = (text) => {
    if (!text) return "";
    let clean = text;
    clean = clean.replace(/([^\n])\s*\n*(#{1,6}\s+)/g, '$1\n\n$2');
    clean = clean.replace(/^\s*\*\*\s*$/gm, '');
    return clean;
  };

  const handleFollowUpClick = (question) => {
    setInstructions(question);
    handleAnalyze(question);
  };

  const renderAnalysisContent = (text, idx) => {
    if (!text) return null;
    
    const isCurrentlyTypingThis = isAnalyzing && idx === messages.length - 1; 
    const separatorRegex = /(?:---PREGUNTAS---|(?:\n|^)(?:#{2,4}\s*|\*\*\s*)?(?:Preguntas de Seguimiento|¿Quieres profundizar en este documento\?)(?:\s*\*\*|:)?\s*\n?)/i;
    
    // REEMPLAZO EN TIEMPO REAL: Transformamos tus etiquetas al vuelo.
    let processedText = text.replace(/\[TIMELINE_START\]([\s\S]*?)(?:\[TIMELINE_END\]|$)/gi, (match, jsonContent) => {
        const cleanContent = jsonContent.replace(/\x60{3}(?:json)?/gi, '').replace(/\x60{3}/g, '').trim();
        return `\n\x60\x60\x60json-timeline\n${cleanContent}\n\x60\x60\x60\n`;
    });
    
    processedText = processedText.replace(/\[FLOW_START\]([\s\S]*?)(?:\[FLOW_END\]|$)/gi, (match, jsonContent) => {
        const cleanContent = jsonContent.replace(/\x60{3}(?:json)?/gi, '').replace(/\x60{3}/g, '').trim();
        return `\n\x60\x60\x60json-flow\n${cleanContent}\n\x60\x60\x60\n`;
    });

    const parts = processedText.split(separatorRegex);
    let mainContent = parts[0];

    if (parts.length > 1 && !isCurrentlyTypingThis) {
      const questionsPart = parts.slice(1).join('\n');
      const lines = questionsPart.split('\n');
      const questions = [];
      const sources = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue; 
        const isListItem = /^([-*•]|\d+[.)])\s*/.test(trimmed);
        const isLinkOrSource = /\[.*\]\(http|\bhttps?:\/\//i.test(trimmed) || trimmed.toLowerCase().includes('fuente:');

        if (isListItem && questions.length < 3 && !isLinkOrSource && trimmed.length > 5) {
          questions.push(trimmed.replace(/^[-*•0-9.)]+\s*/, '').replace(/["*]/g, '').trim());
        } else if (isLinkOrSource) {
          sources.push(line);
        }
      }

      return (
        <>
          <div className="markdown-content" style={{ display: 'block', width: '100%', maxWidth: '100%', overflowX: 'hidden', wordBreak: 'break-word', boxSizing: 'border-box' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
              {formatMarkdown(mainContent)}
            </ReactMarkdown>
          </div>
          
          {questions.length > 0 && (
            <div className="follow-up-section" style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid #E5E7EB' }}>
              <strong style={{ display: 'block', marginBottom: '12px', color: 'var(--pida-primary)', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ¿Quieres profundizar en este documento?
              </strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {questions.map((q, i) => (
                  <button key={i} className="follow-up-btn" onClick={() => handleFollowUpClick(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sources.length > 0 && (
            <div className="markdown-content" style={{ marginTop: '20px', display: 'block', width: '100%', maxWidth: '100%', overflowX: 'auto', wordBreak: 'break-word', boxSizing: 'border-box' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                {sources.join('\n')}
              </ReactMarkdown>
            </div>
          )}
        </>
      );
    }

    return (
        <div className="markdown-content" style={{ display: 'block', width: '100%', maxWidth: '100%', overflowX: 'hidden', wordBreak: 'break-word', boxSizing: 'border-box' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
              {formatMarkdown(mainContent)}
            </ReactMarkdown>
        </div>
    );
  };

  return (
    <div className="pida-view" style={{ position: 'relative', maxWidth: '100%', overflowX: 'hidden' }}>
      
      <div className="pida-view-content" ref={chatContainerRef} onScroll={handleScroll} style={{ overflowX: 'hidden' }}>
        <div id="pida-chat-box" style={{ maxWidth: '100%', overflowX: 'hidden' }}> 
          
          {messages.length === 0 && !isAnalyzing && (
            <div className="pida-bubble pida-message-bubble">
              <div className="pida-welcome-content">
                <div className="pida-welcome-text">
                  <h3>Analizador de Documentos</h3>
                  <p style={{ color: 'var(--text)' }}>Sube tus archivos (PDF, DOCX) y escribe una instrucción clara. PIDA leerá, resumirá y sistematizará el documento por ti. Podrás continuar haciendo preguntas de seguimiento.</p>
                  <p style={{ marginTop: '15px', fontWeight: 'bold', color: 'var(--navy)' }}>Ejemplos de lo que puedes pedir:</p>
                  <ul style={{ margin: '8px 0 0 0', padding: 0, listStyleType: 'none', color: 'var(--text)' }}>
                    <li style={{ marginBottom: '6px' }}>"Haz un resumen ejecutivo de este documento."</li>
                    <li style={{ marginBottom: '6px' }}>"Identifica las cláusulas de rescisión y sus penalizaciones."</li>
                    <li style={{ marginBottom: '6px' }}>"Extrae una lista cronológica de los hechos."</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`pida-bubble ${msg.role === 'user' ? 'user-message-bubble' : 'pida-message-bubble'}`}
              style={{ 
                maxWidth: '100%', 
                minWidth: 0, 
                display: 'flex', 
                flexDirection: 'column', 
                boxSizing: 'border-box',
                overflowX: 'hidden',
                overflowWrap: 'anywhere'
              }}
            >
                {msg.role === 'user' 
                  ? <div className="markdown-content" style={{ display: 'block', width: '100%', maxWidth: '100%', overflowX: 'auto', wordBreak: 'break-word', boxSizing: 'border-box' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  : renderAnalysisContent(msg.content, idx)}
            </div>
          ))}

          {isAnalyzing && (!messages.length || messages[messages.length - 1].role === 'user') && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, gap: 2 }}>
              <CircularProgress sx={{ color: 'var(--pida-primary)' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                {statusText || "Procesando solicitud..."}
              </Typography>
            </Box>
          )}

          <div ref={messagesEndRef} style={{ height: '1px' }} />
        </div>
      </div>

      {!isAtBottom && messages.length > 0 && (
        <Fab
          color="primary"
          size="medium"
          onClick={(e) => {
            e.preventDefault();
            setIsAtBottom(true);
            scrollToBottom();
          }}
          sx={{
            position: 'absolute',
            bottom: '180px', 
            right: '25px',
            zIndex: 900,
            opacity: 0.9,
            backgroundColor: 'var(--pida-primary)',
            '&:hover': { backgroundColor: 'var(--pida-accent)', opacity: 1 }
          }}
          title="Ir al último mensaje"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="19 12 12 19 5 12"></polyline>
          </svg>
        </Fab>
      )}

      <form className="pida-view-form" onSubmit={(e) => handleAnalyze(e)} style={{ maxWidth: '100%' }}>
        {/* --- BLOQUE DE SUGERENCIAS RÁPIDAS --- */}
        {files.length > 0 && messages.length === 0 && !isAnalyzing && (
          <div style={{ marginBottom: '15px', padding: '15px', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
            <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--pida-primary)', marginBottom: '10px', textTransform: 'uppercase' }}>Sugerencias rápidas:</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" className="pida-button-secondary" style={{ background: 'white', border: '1px solid var(--pida-border)', padding: '6px 12px', fontSize: '0.85rem', borderRadius: '20px', cursor: 'pointer' }} onClick={() => handleAnalyze("Elabora un resumen ejecutivo destacando los puntos más importantes de este documento.")}>
                ⚡ Resumen Ejecutivo
              </button>
              <button type="button" className="pida-button-secondary" style={{ background: 'white', border: '1px solid var(--pida-border)', padding: '6px 12px', fontSize: '0.85rem', borderRadius: '20px', cursor: 'pointer' }} onClick={() => handleAnalyze("Identifica posibles riesgos, vacíos legales o posibles contradicciones en los argumentos planteados.")}>
                ⚖️ Riesgos y Contradicciones
              </button>
              <button type="button" className="pida-button-secondary" style={{ background: 'white', border: '1px solid var(--pida-border)', padding: '6px 12px', fontSize: '0.85rem', borderRadius: '20px', cursor: 'pointer' }} onClick={() => handleAnalyze("Extrae una línea de tiempo con los hechos, fechas y plazos clave mencionados.")}>
                📅 Línea de Tiempo
              </button>
            </div>
          </div>
        )}

        <input 
          type="file" 
          multiple 
          accept=".pdf,.doc,.docx" 
          style={{ display: 'none' }} 
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        <Box sx={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          mb: 1.5,
          mt: messages.length > 0 ? -1.5 : 0, // Sube la fila para alinearla con el Chat
          position: 'relative', zIndex: 1
        }}>
          <button 
            type="button"
            className="pida-header-btn primary" 
            style={{ width: 'auto' }}
            onClick={() => fileInputRef.current.click()}
            disabled={isAnalyzing}
          >
            + Seleccionar Archivos
          </button>

          {messages.length > 0 && (
            <ButtonGroup size="small" variant="outlined" color="inherit" sx={{ borderColor: '#e2e8f0', bgcolor: 'white' }}>
              <Button sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }} onClick={handleTXTDownload}>TXT</Button>
              <Button sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }} onClick={() => handleBackendDownload('docx')}>DOCX</Button>
              <Button sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }} onClick={() => handleBackendDownload('pdf')}>PDF</Button>
            </ButtonGroup>
          )}
        </Box>

        {files.length > 0 && (
          <div id="active-files-area" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {files.map((file, idx) => (
              <div key={idx} className="active-file-chip">
                <span>{file.name}</span> 
                <button type="button" onClick={() => removeFile(idx)} disabled={isAnalyzing}>×</button>
              </div>
            ))}
          </div>
        )}

        <TextField 
          id="user-instructions"
          multiline
          minRows={2}
          maxRows={5}
          fullWidth
          placeholder="Instrucciones para el análisis..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleAnalyze(e); }}
          disabled={isAnalyzing}
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { backgroundColor: '#FAFAFA', borderRadius: 2 } }}
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button 
            variant="text" 
            onClick={handleClear} 
            disabled={isAnalyzing}
            sx={{ color: 'text.secondary', fontWeight: 500, '&:hover': { textDecoration: 'underline', backgroundColor: 'transparent' } }}
          >
            Limpiar
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            disabled={isAnalyzing}
            sx={{ width: 220, py: 1.2, borderRadius: 2, fontWeight: 600, bgcolor: 'var(--pida-primary)', '&:hover': { bgcolor: 'var(--pida-accent)' } }}
          >
            Analizar
          </Button>
        </Box>
      </form>

      {showMissingFileModal && (
        <div className="modal-backdrop" style={{ zIndex: 999999 }} onClick={() => setShowMissingFileModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ padding: '40px 30px', maxWidth: '420px', borderRadius: '16px' }}>
            <button className="modal-close-btn" onClick={() => setShowMissingFileModal(false)}>×</button>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0056B3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <h2 className="modal-title" style={{ fontSize: '1.4rem', marginBottom: '15px' }}>Documento Requerido</h2>
            <p className="modal-subtitle" style={{ fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '30px', color: '#4B5563' }}>Estás continuando un análisis antiguo. Por políticas de privacidad y seguridad, <strong>no guardamos tus archivos</strong> en nuestros servidores.<br /><br />Para hacer preguntas de seguimiento, por favor vuelve a adjuntar el documento original.</p>
            <button className="form-submit-btn" onClick={() => { setShowMissingFileModal(false); fileInputRef.current?.click(); }}>Subir documento</button>
          </div>
        </div>
      )}

      {errorModal.show && (
        <div className="modal-backdrop" style={{ zIndex: 999999 }} onClick={() => setErrorModal({ show: false, title: '', message: '' })}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ padding: '40px 30px', maxWidth: '440px', borderRadius: '16px', border: '1px solid #FECACA' }}>
            <button className="modal-close-btn" onClick={() => setErrorModal({ show: false, title: '', message: '' })}>×</button>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h2 className="modal-title" style={{ fontSize: '1.3rem', marginBottom: '15px', color: '#B91C1C' }}>{errorModal.title}</h2>
            <div className="modal-subtitle markdown-content" style={{ fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '30px', color: '#4B5563', textAlign: 'left' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                {errorModal.message}
              </ReactMarkdown>
            </div>
            <button className="form-submit-btn" style={{ backgroundColor: '#EF4444', border: 'none' }} onClick={() => setErrorModal({ show: false, title: '', message: '' })}>Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}