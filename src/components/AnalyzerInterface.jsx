import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Exporter, getTimestampedName } from '../utils/exporter';

const API_ANA = "https://analize-v20-strong-465781488910.us-central1.run.app";

const markdownComponents = {
  a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />
};

// =========================================================================
// MAPEO DE ERRORES UI/UX (SIN EMOJIS)
// =========================================================================
const translateFileError = (errMsg) => {
  if (!errMsg) return { title: "Error Desconocido", message: "Ocurrió un error desconocido al procesar el archivo." };

  const lowerMsg = errMsg.toLowerCase();

  if (lowerMsg.includes('password') || lowerMsg.includes('encrypt') || lowerMsg.includes('protegido') || lowerMsg.includes('contraseña')) {
    return { title: "Documento Protegido", message: "El documento tiene una **contraseña de apertura** o restricciones de lectura.\n\nPor favor, retira la protección de seguridad y vuelve a subir el archivo para que la Inteligencia Artificial pueda analizarlo." };
  }
  if (lowerMsg.includes('corrupt') || lowerMsg.includes('eof') || lowerMsg.includes('bad zip') || lowerMsg.includes('unreadable') || lowerMsg.includes('dañado')) {
    return { title: "Archivo Corrupto", message: "No fue posible leer el documento. Es probable que esté **dañado** o su descarga haya sido incompleta.\n\nTe sugerimos guardarlo nuevamente o exportarlo a PDF/DOCX desde tu procesador de texto original." };
  }
  if (lowerMsg.includes('empty') || lowerMsg.includes('vacío') || lowerMsg.includes('no text')) {
    return { title: "Documento Vacío o en Blanco", message: "El archivo parece estar **completamente vacío** o contiene solo páginas en blanco.\n\nVerifica que el archivo original contenga información visible antes de intentar subirlo nuevamente." };
  }
  // 👇 AQUÍ ESTÁ LA MAGIA: Esto se atrapa ANTES de que lea la palabra "límite" sola.
  if (lowerMsg.includes('excede_tamano') || lowerMsg.includes('tamaño') || lowerMsg.includes('pesa') || lowerMsg.includes('size') || lowerMsg.includes('large') || lowerMsg.includes('413')) {
    return { title: "Límite de Tamaño Excedido", message: "El documento supera el peso máximo permitido por tu plan actual.\n\nPor favor, revisa tu nivel de suscripción o divide el documento en partes más pequeñas para proceder con el análisis." };
  }
  if (lowerMsg.includes('invalid argument') || lowerMsg.includes('400 request contains') || lowerMsg.includes('400')) {
    return { title: "Error de Lectura o Complejidad", message: "El motor de análisis rechazó el documento. Esto suele ocurrir por dos motivos principales:\n\n1. El archivo presenta **corrupción en su estructura interna**.\n2. El documento supera la **capacidad máxima de procesamiento** (ej. más de 1,000 páginas o exceso de resolución visual).\n\n**Solución:** Verifica que el archivo sea válido y legible. Si el problema persiste, divídelo en secciones más cortas." };
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
        } catch (err) {
          const mappedError = translateFileError(err.message);
          setErrorModal({ show: true, ...mappedError });
        } finally {
          setIsAnalyzing(false);
          setStatusText('');
        }
      };
      loadPastAna();
    }
  }, [loadAnaId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAnalyzing]);

  const handleFileChange = (e) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = [];
      
      selectedFiles.forEach(file => {
        const fileSizeMB = file.size / (1024 * 1024);
        // Protegemos a la plataforma de archivos superiores al hard-limit de 50MB
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
  };

  const handleAnalyze = async (eOrInstruction = null) => {
    if (eOrInstruction && eOrInstruction.preventDefault) {
      eOrInstruction.preventDefault();
    }

    const currentInstruction = typeof eOrInstruction === 'string' ? eOrInstruction : instructions;

    if (files.length === 0 && messages.length === 0) {
      alert("Por favor, selecciona al menos un documento para analizar.");
      return;
    }
    
    if (files.length === 0 && messages.length > 0) {
      setShowMissingFileModal(true);
      return;
    }

    setIsAnalyzing(true);
    setErrorModal({ show: false, title: '', message: '' });
    
    const newMessages = [...messages, { role: 'user', content: currentInstruction }];
    setMessages(newMessages);
    setInstructions('');

    let promptToSend = currentInstruction;
    if (messages.length > 0) {
       const historyText = messages.map(m => `${m.role === 'user' ? 'Instrucción previa' : 'Análisis previo'}:\n${m.content}`).join('\n\n');
       promptToSend = `[INSTRUCCIÓN DE SEGUIMIENTO]:\nEl usuario está haciendo una pregunta sobre el documento ya analizado.\n\nREGLAS PARA ESTA RESPUESTA:\n1. NO repitas el análisis inicial. IGNORA por completo el formato de "Resumen Ejecutivo", "Análisis Detallado", etc.\n2. Ve directo al grano y responde ÚNICA Y EXHAUSTIVAMENTE a la NUEVA PREGUNTA del usuario.\n3. Recuerda que al final SIEMPRE debes incluir el delimitador ---PREGUNTAS--- con 3 nuevas sugerencias de seguimiento.\n\n[CONTEXTO PREVIO]\n${historyText}\n\n[NUEVA PREGUNTA DEL USUARIO]\n${currentInstruction}`;
    }

    try {
      const token = await user.getIdToken();
      let uploadedFilesData = [];

      // =========================================================================
      // CLASIFICACIÓN DE ARCHIVOS PARA OPTIMIZACIÓN INTELIGENTE
      // =========================================================================
      const smallFiles = [];
      const largeFiles = [];

      files.forEach(f => {
          const sizeMB = f.size / (1024 * 1024);
          // Si el archivo pesa entre 10MB y 50MB y es un PDF, lo mandamos a comprimir al backend
          if (sizeMB > 10 && sizeMB <= 50 && f.type === 'application/pdf') {
              largeFiles.push(f);
          } else {
              smallFiles.push(f);
          }
      });

      // 1. FLUJO ARCHIVOS NORMALES (< 10 MB o DOCX) - Subida directa GCS
      if (smallFiles.length > 0) {
        setStatusText('Autenticando y preparando documentos...');
        
        const fileMetadata = smallFiles.map(f => ({ name: f.name, type: f.type || 'application/pdf' }));
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
        const uploadPromises = smallFiles.map((file, i) => {
          return fetch(urls[i].upload_url, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type || 'application/pdf' }
          });
        });

        await Promise.all(uploadPromises);

        urls.forEach(u => {
          uploadedFilesData.push({ gs_uri: u.gs_uri, filename: u.filename, mime_type: u.mime_type });
        });
      }

      // 2. FLUJO ARCHIVOS PESADOS (10 MB - 50 MB) - Compresión en Backend
      if (largeFiles.length > 0) {
        setStatusText('Optimizando archivos pesados (reduciendo resolución para la IA)...');
        
        const optimizePromises = largeFiles.map(async (file) => {
            const formData = new FormData();
            formData.append('file', file);

            const optRes = await fetch(`${API_ANA}/compress-and-upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!optRes.ok) {
                const errData = await optRes.json().catch(() => ({}));
                throw new Error(errData.detail || `Fallo al optimizar el archivo: ${file.name}`);
            }

            return await optRes.json();
        });

        const optimizedResults = await Promise.all(optimizePromises);
        optimizedResults.forEach(res => {
            uploadedFilesData.push({
                gs_uri: res.gs_uri,
                filename: res.filename,
                mime_type: res.mime_type
            });
        });
      }

      // =========================================================================
      // 3. INICIAR ANÁLISIS EN VERTEX AI
      // =========================================================================
      setStatusText('Procesando información con el motor de IA...');
      const fd = new FormData();
      
      fd.append('files_data', JSON.stringify(uploadedFilesData)); 
      fd.append('instructions', promptToSend);
      if (currentAnaId) fd.append('analysis_id', currentAnaId);
      fd.append('history_json', JSON.stringify(newMessages)); 

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
      const decoder = new TextDecoder();
      let fullText = "";
      setStatusText(''); 

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const d = JSON.parse(line.substring(6));
              
              if (d.error) throw new Error(d.error); 
              
              if (d.text) {
                const chars = d.text;
                const step = 10; 
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

                  await new Promise(resolve => setTimeout(resolve, 2));
                }
              }
              
              if (d.analysis_id) {
                  setCurrentAnaId(d.analysis_id);
              }
              
            } catch (e) {
              if(e.message) throw e;
            }
          }
        }
      }
    } catch (err) {
      console.error("Error en Análisis:", err);
      const mappedError = translateFileError(err.message);
      setErrorModal({ show: true, ...mappedError });
      
      setMessages(prev => {
        if(prev.length > 0 && prev[prev.length - 1].role === 'user') {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsAnalyzing(false);
      setStatusText('');
    }
  };

  const formatMarkdown = (text) => {
    if (!text) return "";
    let clean = text;
    clean = clean.replace(/([^\n])\s*\n*(#{1,6}\s+)/g, '$1\n\n$2');
    clean = clean.replace(/^\s*\*\*\s*$/gm, '');

    const lines = clean.split('\n');
    const fixedLines = lines.map(line => {
      const count = (line.match(/\*\*/g) || []).length;
      if (count % 2 !== 0) {
        if (line.trim().startsWith('**')) return line.replace(/^\s*\*\*/, '');
        if (line.trim().endsWith('**')) return line.replace(/\*\*\s*$/, '');
      }
      return line;
    });
    
    clean = fixedLines.join('\n');
    return clean;
  };

  const handleFollowUpClick = (question) => {
    setInstructions(question);
    handleAnalyze(question);
  };

  const renderAnalysisContent = (text, idx) => {
    if (!text) return null;
    
    const separatorRegex = /(?:---PREGUNTAS---|(?:\n|^)(?:#{2,4}\s*|\*\*\s*)?Preguntas de Seguimiento(?:\s*\*\*|:)?\s*\n)/i;
    
    const parts = text.split(separatorRegex);
    const isCurrentlyTypingThis = isAnalyzing && idx === messages.length - 1; 

    if (parts.length > 1 && !isCurrentlyTypingThis) {
      const mainContent = parts[0];
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
          <div className="markdown-content">
            <ReactMarkdown components={markdownComponents}>{formatMarkdown(mainContent)}</ReactMarkdown>
          </div>
          
          {questions.length > 0 && (
            <div className="follow-up-section" style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid #E5E7EB' }}>
              <strong style={{ display: 'block', marginBottom: '12px', color: 'var(--pida-primary)', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ¿Quieres profundizar en este documento?
              </strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {questions.map((q, i) => (
                  <button 
                    key={i} 
                    className="follow-up-btn"
                    onClick={() => handleFollowUpClick(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sources.length > 0 && (
            <div className="markdown-content" style={{ marginTop: '20px' }}>
              <ReactMarkdown components={markdownComponents}>{sources.join('\n')}</ReactMarkdown>
            </div>
          )}
        </>
      );
    }

    return (
        <div className="markdown-content">
            <ReactMarkdown components={markdownComponents}>{formatMarkdown(text)}</ReactMarkdown>
        </div>
    );
  };

  return (
    <div className="pida-view">
      <div className="pida-view-content">
        <div id="pida-chat-box"> 
          
          {messages.length === 0 && !isAnalyzing && (
            <div className="pida-bubble pida-message-bubble">
              <div className="pida-welcome-content">
                <div className="pida-welcome-text">
                  <h3>Analizador de Documentos</h3>
                  <p>Sube tus archivos (PDF, DOCX) y escribe una instrucción clara. PIDA leerá, resumirá y sistematizará el documento por ti. Podrás continuar haciendo preguntas de seguimiento.</p>
                  <p style={{ marginTop: '15px', fontWeight: 'bold', color: '#1D3557' }}>Ejemplos de lo que puedes pedir:</p>
                  <ul style={{ margin: '8px 0 0 0', padding: 0, listStyleType: 'none', color: '#374151' }}>
                    <li style={{ marginBottom: '6px' }}>"Haz un resumen ejecutivo de este documento."</li>
                    <li style={{ marginBottom: '6px' }}>"Identifica las cláusulas de rescisión y sus penalizaciones."</li>
                    <li style={{ marginBottom: '6px' }}>"Extrae una lista cronológica de los hechos."</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`pida-bubble ${msg.role === 'user' ? 'user-message-bubble' : 'pida-message-bubble'}`}>
                {msg.role === 'user' 
                    ? <div className="markdown-content"><ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown></div>
                    : renderAnalysisContent(msg.content, idx)}
            </div>
          ))}

          {isAnalyzing && (!messages.length || messages[messages.length - 1].role === 'user') && (
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <div className="loader"></div>
              <p style={{ color: 'var(--pida-text-muted)', marginTop: '15px' }}>
                {statusText || "Procesando solicitud..."}
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="pida-view-form">
        
        {messages.length > 0 && (
          <div className="pida-download-controls" style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px', marginBottom: '8px' }}>
            <button type="button" className="pida-header-btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => Exporter.downloadTXT(getTimestampedName("Analisis-PIDA"), "Análisis de Documentos", messages)}>TXT</button>
            <button type="button" className="pida-header-btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => Exporter.downloadDOCX(getTimestampedName("Analisis-PIDA"), "Análisis de Documentos", messages)}>DOCX</button>
            <button type="button" className="pida-header-btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => Exporter.downloadPDF(getTimestampedName("Analisis-PIDA"), "Análisis de Documentos", messages)}>PDF</button>
          </div>
        )}

        {files.length > 0 && messages.length === 0 && !isAnalyzing && (
          <div style={{ marginBottom: '15px', padding: '15px', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
            <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--pida-primary)', marginBottom: '10px', textTransform: 'uppercase' }}>Sugerencias rápidas:</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" className="pida-button-secondary" style={{ background: 'white', border: '1px solid var(--pida-border)', padding: '6px 12px', fontSize: '0.85rem', borderRadius: '20px' }} onClick={() => handleAnalyze("Elabora un resumen ejecutivo destacando los puntos más importantes de este documento.")}>
                ⚡ Resumen Ejecutivo
              </button>
              <button type="button" className="pida-button-secondary" style={{ background: 'white', border: '1px solid var(--pida-border)', padding: '6px 12px', fontSize: '0.85rem', borderRadius: '20px' }} onClick={() => handleAnalyze("Identifica posibles riesgos, vacíos legales o posibles contradicciones en los argumentos planteados.")}>
                ⚖️ Riesgos y Contradicciones
              </button>
              <button type="button" className="pida-button-secondary" style={{ background: 'white', border: '1px solid var(--pida-border)', padding: '6px 12px', fontSize: '0.85rem', borderRadius: '20px' }} onClick={() => handleAnalyze("Extrae una línea de tiempo con los hechos, fechas y plazos clave mencionados.")}>
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

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <button 
            className="pida-header-btn primary" 
            style={{ width: 'auto' }}
            onClick={() => fileInputRef.current.click()}
            disabled={isAnalyzing}
          >
            + Seleccionar Archivos
          </button>
        </div>

        {files.length > 0 && (
          <div id="active-files-area" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {files.map((file, idx) => (
              <div key={idx} className="active-file-chip">
                <span>{file.name}</span> 
                <button onClick={() => removeFile(idx)} disabled={isAnalyzing}>×</button>
              </div>
            ))}
          </div>
        )}

        <textarea 
          id="user-instructions" 
          rows="2" 
          className="pida-textarea" 
          placeholder="Instrucciones para el análisis..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleAnalyze(e); }}
          disabled={isAnalyzing}
        />
        
        <div className="pida-form-actions">
          <button type="button" className="pida-button-secondary" onClick={handleClear} disabled={isAnalyzing}>Limpiar</button>
          <button type="button" className="pida-button-primary" onClick={handleAnalyze} disabled={isAnalyzing}>
            Analizar
          </button>
        </div>
      </div>

      {/* MODAL DE ADVERTENCIA: FALTA DOCUMENTO ORIGINAL */}
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
            <p className="modal-subtitle" style={{ fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '30px', color: '#4B5563' }}>
              Estás continuando un análisis antiguo. Por políticas de privacidad y seguridad, <strong>no guardamos tus archivos</strong> en nuestros servidores.
              <br /><br />
              Para hacer preguntas de seguimiento, por favor vuelve a adjuntar el documento original.
            </p>
            
            <button 
              className="form-submit-btn" 
              onClick={() => {
                setShowMissingFileModal(false);
                fileInputRef.current?.click();
              }}
            >
              Subir documento
            </button>
          </div>
        </div>
      )}

      {/* MODAL PROFESIONAL DE MANEJO DE ERRORES */}
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
              <ReactMarkdown components={markdownComponents}>{errorModal.message}</ReactMarkdown>
            </div>

            <button 
              className="form-submit-btn" 
              style={{ backgroundColor: '#EF4444', border: 'none' }}
              onClick={() => setErrorModal({ show: false, title: '', message: '' })}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
}