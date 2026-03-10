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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resultText, setResultText] = useState('');
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);
  const resultEndRef = useRef(null);

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
        setResultText('');
        try {
          const token = await user.getIdToken();
          const res = await fetch(`${API_ANA}/analysis-history/${loadAnaId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!res.ok) throw new Error("Error del servidor");
          
          const data = await res.json();
          setResultText(data.analysis);
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
    resultEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [resultText, isAnalyzing]);

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
    setResultText('');
    setError('');
  };

  const handleAnalyze = async (eOrInstruction = null) => {
    // Evitar recarga si viene de un formulario (Enter)
    if (eOrInstruction && eOrInstruction.preventDefault) {
      eOrInstruction.preventDefault();
    }

    // Determinar si la instrucción viene del input manual o de un botón de seguimiento
    const currentInstruction = typeof eOrInstruction === 'string' ? eOrInstruction : instructions;

    if (files.length === 0) {
      alert("Sube al menos un documento para poder realizar el análisis.");
      return;
    }

    setIsAnalyzing(true);
    setResultText('');
    setError('');

    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    fd.append('instructions', currentInstruction.trim() || "Realizar un análisis jurídico detallado de estos documentos, identificando puntos clave, riesgos y conclusiones.");

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
                  setResultText(fullText);
                  await new Promise(resolve => setTimeout(resolve, 2));
                }

              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError(`❌ Ocurrió un problema: ${err.message}`);
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

  // Función para manejar el click en una pregunta sugerida
  const handleFollowUpClick = (question) => {
    setInstructions(question);
    if (files.length > 0) {
      handleAnalyze(question);
    } else {
      alert("Estás viendo un análisis antiguo. Para profundizar con esta pregunta, por favor vuelve a subir el documento original aquí abajo y haz clic en Analizar.");
    }
  };

  // Renderizado Inteligente que separa botones de seguimiento
  const renderAnalysisContent = (text) => {
    if (!text) return null;
    let formattedText = formatMarkdown(text);
    
    const regex = /(?:#{2,3}\s*|\*\*\s*)?Preguntas de Seguimiento\s*(?:\*\*|:)?/i;
    const match = formattedText.match(regex);
    const isCurrentlyTypingThis = isAnalyzing; // No mostrar botones mientras escribe

    if (match && !isCurrentlyTypingThis) {
      const mainContent = formattedText.substring(0, match.index);
      const afterHeading = formattedText.substring(match.index + match[0].length);

      const lines = afterHeading.split('\n');
      const questions = [];
      const leftoverLines = [];

      for (const line of lines) {
        const trimmed = line.trim();
        const isListItem = /^([-*•]|\d+[.)])\s*/.test(trimmed);
        const isLinkOrSource = /\[.*\]\(http|\bhttps?:\/\//i.test(trimmed) || trimmed.toLowerCase().includes('fuente:');

        if (isListItem && questions.length < 3 && !isLinkOrSource && trimmed.length > 5) {
          questions.push(trimmed.replace(/^[-*•0-9.)]+\s*/, '').replace(/["*]/g, '').trim());
        } else {
          leftoverLines.push(line);
        }
      }

      let textAfterQuestions = leftoverLines.join('\n').trim();

      return (
        <>
          <ReactMarkdown components={markdownComponents}>{mainContent}</ReactMarkdown>
          
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

          {textAfterQuestions && (
            <div style={{ marginTop: '20px' }}>
              <ReactMarkdown components={markdownComponents}>{textAfterQuestions}</ReactMarkdown>
            </div>
          )}
        </>
      );
    }

    return <ReactMarkdown components={markdownComponents}>{formattedText}</ReactMarkdown>;
  };

  return (
    <div className="pida-view">
      <div className="pida-view-content">
        <div id="pida-chat-box"> 
          
          {/* Bienvenida Uniforme con el Robot */}
          {!isAnalyzing && !resultText && !error && (
            <div className="pida-bubble pida-message-bubble">
              <div className="pida-welcome-content">
                <div className="pida-welcome-text">
                  <h3>Analizador de Documentos</h3>
                  <p>Sube tus archivos (PDF, DOCX) y escribe una instrucción clara. PIDA leerá, resumirá y sistematizará el documento por ti.</p>
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

          {isAnalyzing && !resultText && (
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <div className="loader"></div>
              <p style={{ color: 'var(--pida-text-muted)', marginTop: '15px' }}>Analizando documentos...</p>
            </div>
          )}

          {resultText && (
            <div id="analyzer-analysis-result" className="pida-bubble pida-message-bubble markdown-content" style={{ marginTop: '20px', maxWidth: '100%', padding: '20px' }}>
              {renderAnalysisContent(resultText)}
            </div>
          )}

          {error && (
            <div className="pida-bubble pida-message-bubble" style={{ marginTop: '20px' }}>
              <div style={{ color: '#EF4444', fontWeight: 'bold' }}>{error}</div>
            </div>
          )}

          <div ref={resultEndRef} />
        </div>
      </div>

      <div className="pida-view-form">
        
        {resultText && (
          <div className="pida-download-controls" style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px', marginBottom: '8px' }}>
            <button type="button" className="pida-header-btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => Exporter.downloadTXT(getTimestampedName("Analisis-PIDA"), "Análisis de Documentos", resultText)}>TXT</button>
            <button type="button" className="pida-header-btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => Exporter.downloadDOCX(getTimestampedName("Analisis-PIDA"), "Análisis de Documentos", resultText)}>DOCX</button>
            <button type="button" className="pida-header-btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => Exporter.downloadPDF(getTimestampedName("Analisis-PIDA"), "Análisis de Documentos", resultText)}>PDF</button>
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
    </div>
  );
}