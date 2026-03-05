import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Exporter, getTimestampedName } from '../utils/exporter';

const API_ANA = "https://analize-v20-stripe-elements-465781488910.us-central1.run.app";

export default function AnalyzerInterface({ user, resetSignal, loadAnaId }) {
  const [files, setFiles] = useState([]);
  const [instructions, setInstructions] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resultText, setResultText] = useState('');
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);
  const resultEndRef = useRef(null); // Para hacer auto-scroll como en el chat

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

  // Auto-scroll para que siga el texto mientras se genera
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

  const handleAnalyze = async () => {
    if (files.length === 0) {
      alert("Sube al menos un documento.");
      return;
    }

    setIsAnalyzing(true);
    setResultText('');
    setError('');

    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    fd.append('instructions', instructions.trim() || "Realizar un análisis jurídico detallado de estos documentos, identificando puntos clave, riesgos y conclusiones.");

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
                
                // MÁQUINA DE ESCRIBIR IDÉNTICA AL CHAT: 10 letras cada 2ms
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

  return (
    <div className="pida-view">
      <div className="pida-view-content">
        <div id="pida-chat-box"> {/* Añadido para mantener los márgenes del chat */}
          
          {/* Pantalla de Bienvenida */}
          {!isAnalyzing && !resultText && !error && (
            <div className="pida-bubble pida-message-bubble" style={{ margin: '0 auto' }}>
              <div className="pida-welcome-content">
                <div className="pida-welcome-text" style={{ paddingLeft: 0 }}>
                  <h3>Analizador de Documentos</h3>
                  <p>Sube tus archivos (PDF, DOCX) y escribe una instrucción clara. PIDA leerá, resumirá y sistematizará el documento por ti.</p>
                  <p style={{ marginTop: '15px', fontWeight: 'bold', color: '#1D3557' }}>Ejemplos de lo que puedes pedir:</p>
                  <ul style={{ margin: '8px 0 0 20px', padding: 0, listStyleType: 'disc', color: '#374151' }}>
                    <li style={{ marginBottom: '6px' }}>"Haz un resumen ejecutivo de este documento."</li>
                    <li style={{ marginBottom: '6px' }}>"Identifica las cláusulas de rescisión y sus penalizaciones."</li>
                    <li style={{ marginBottom: '6px' }}>"Extrae una lista cronológica de los hechos."</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Resultados del Análisis en formato Burbuja de PIDA */}
          {resultText && (
            <div className="pida-bubble pida-message-bubble" style={{ marginTop: '20px', maxWidth: '100%' }}>
              <div className="markdown-content">
                <ReactMarkdown>{resultText}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Tres Puntos Pensando idénticos al chat (desaparecen si ya hay texto) */}
          {isAnalyzing && !resultText && (
            <div className="pida-bubble pida-message-bubble" style={{ marginTop: '20px' }}>
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}

          {/* Mensaje de Error */}
          {error && (
            <div className="pida-bubble pida-message-bubble" style={{ marginTop: '20px' }}>
              <div style={{ color: '#EF4444', fontWeight: 'bold' }}>{error}</div>
            </div>
          )}

          <div ref={resultEndRef} />
        </div>
      </div>

      {/* Formulario Inferior */}
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