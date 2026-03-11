import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Exporter, getTimestampedName } from '../utils/exporter';

const API_ANA = "https://analize-v20-stripe-elements-465781488910.us-central1.run.app";

const markdownComponents = {
  a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />
};

export default function AnalyzerInterface({ user, resetSignal, loadAnaId }) {
  const [files, setFiles] = useState([]);
  const [instructions, setInstructions] = useState('');
  
  const [messages, setMessages] = useState([]);
  const [currentAnaId, setCurrentAnaId] = useState(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  
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
        setError('');
        setMessages([]);
        setCurrentAnaId(null);
        
        try {
          const token = await user.getIdToken();
          const res = await fetch(`${API_ANA}/analysis-history/${loadAnaId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!res.ok) throw new Error("Error del servidor");
          
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
          setError("❌ Error cargando el análisis guardado.");
        } finally {
          setIsAnalyzing(false);
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
      setFiles(prev => [...prev, ...selectedFiles]);
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
    setError('');
  };

  const handleAnalyze = async (eOrInstruction = null) => {
    if (eOrInstruction && eOrInstruction.preventDefault) {
      eOrInstruction.preventDefault();
    }

    const currentInstruction = typeof eOrInstruction === 'string' ? eOrInstruction : instructions;

    if (files.length === 0 && messages.length === 0) {
      alert("Sube al menos un documento para poder realizar el análisis.");
      return;
    }
    
    if (files.length === 0 && messages.length > 0) {
      setShowMissingFileModal(true);
      return;
    }

    setIsAnalyzing(true);
    setError('');
    
    const newMessages = [...messages, { role: 'user', content: currentInstruction }];
    setMessages(newMessages);
    setInstructions('');

    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    
    // =========================================================================
    // OVERRIDE DE PROMPT PARA PREGUNTAS DE SEGUIMIENTO
    // Si hay mensajes previos, obligamos a la IA a ir directo al grano.
    // =========================================================================
    let promptToSend = currentInstruction;
    if (messages.length > 0) {
       const historyText = messages.map(m => `${m.role === 'user' ? 'Instrucción previa' : 'Análisis previo'}:\n${m.content}`).join('\n\n');
       promptToSend = `[INSTRUCCIÓN DE SEGUIMIENTO]:\nEl usuario está haciendo una pregunta sobre el documento ya analizado.\n\nREGLAS PARA ESTA RESPUESTA:\n1. NO repitas el análisis inicial. IGNORA por completo el formato de "Resumen Ejecutivo", "Análisis Detallado", etc.\n2. Ve directo al grano y responde ÚNICA Y EXHAUSTIVAMENTE a la NUEVA PREGUNTA del usuario.\n3. Recuerda que al final SIEMPRE debes incluir el delimitador ---PREGUNTAS--- con 3 nuevas sugerencias de seguimiento.\n\n[CONTEXTO PREVIO]\n${historyText}\n\n[NUEVA PREGUNTA DEL USUARIO]\n${currentInstruction}`;
    }

    fd.append('instructions', promptToSend);
    if (currentAnaId) fd.append('analysis_id', currentAnaId);
    fd.append('history_json', JSON.stringify(newMessages)); 

    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_ANA}/analyze/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, 
        body: fd
      });

      if (!res.ok) {
        if (res.status === 403 || res.status === 402 || res.status === 429) {
          throw new Error("Has alcanzado tu límite de análisis diarios o tu suscripción no está activa.");
        }
        throw new Error(`Error del servidor (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

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
              
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError(`❌ Ocurrió un problema: ${err.message}`);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsAnalyzing(false);
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
          
          {messages.length === 0 && !isAnalyzing && !error && (
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
              <p style={{ color: 'var(--pida-text-muted)', marginTop: '15px' }}>Analizando documentos...</p>
            </div>
          )}

          {error && (
            <div className="pida-bubble pida-message-bubble" style={{ marginTop: '20px' }}>
              <div style={{ color: '#EF4444', fontWeight: 'bold' }}>{error}</div>
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

      {showMissingFileModal && (
        <div className="modal-backdrop" style={{ zIndex: 999999 }} onClick={() => setShowMissingFileModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ padding: '40px 30px', maxWidth: '420px', borderRadius: '16px' }}>
            <button className="modal-close-btn" onClick={() => setShowMissingFileModal(false)}>×</button>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ background: '#EFF6FF', color: 'var(--pida-accent)', width: '65px', height: '65px', borderRadius: '50%', display: 'flex', alignContent: 'center', justifyContent: 'center', fontSize: '2rem', alignItems: 'center' }}>
                📄
              </div>
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
    </div>
  );
}