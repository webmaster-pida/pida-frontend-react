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
  
  // Referencia para ocultar el input real de archivos
  const fileInputRef = useRef(null);

  // 1. Escuchar la señal desde la barra superior para limpiar pantalla
  useEffect(() => {
    if (resetSignal > 0) {
      handleClear();
    }
  }, [resetSignal]);

  // 2. Escuchar cuando el usuario hace clic en el historial del Dashboard
  useEffect(() => {
    if (loadAnaId) {
      const loadPastAna = async () => {
        setIsAnalyzing(true);
        setError('');
        try {
          const token = await user.getIdToken();
          const res = await fetch(`${API_ANA}/analysis-history/${loadAnaId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!res.ok) throw new Error("Error del servidor");
          
          const data = await res.json();
          setResultText(data.analysis);
          setFiles([]); // Vaciamos los chips de archivos locales
        } catch (err) {
          setError("❌ Error cargando el análisis guardado.");
        } finally {
          setIsAnalyzing(false);
        }
      };
      loadPastAna();
    }
  }, [loadAnaId, user]);

  // Manejar selección de archivos
  const handleFileChange = (e) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  // Quitar un archivo de la lista
  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  // Limpiar todo
  const handleClear = () => {
    setFiles([]);
    setInstructions('');
    setResultText('');
    setError('');
  };

  // Enviar a analizar
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
                fullText += d.text;
                setResultText(fullText);
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

        {/* Loader Animado */}
        {isAnalyzing && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <div className="loader"></div>
            <p style={{ color: 'var(--pida-text-muted)' }}>Analizando documentos...</p>
          </div>
        )}

        {/* Resultados del Análisis */}
        {resultText && (
          <div id="analyzer-analysis-result">
            <ReactMarkdown>{resultText}</ReactMarkdown>
          </div>
        )}

        {/* Mensaje de Error */}
        {error && (
          <div id="analyzer-analysis-result">
            <div style={{ color: '#EF4444', padding: '20px', fontWeight: 'bold' }}>{error}</div>
          </div>
        )}

      </div>

      {/* Formulario Inferior */}
      <div className="pida-view-form">
        
        {/* Botones de Descarga (Solo si hay resultados) */}
        {resultText && (
          <div className="pida-download-controls" style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px', marginBottom: '8px' }}>
            <button type="button" className="pida-header-btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => Exporter.downloadTXT(getTimestampedName("Analisis-PIDA"), "Análisis de Documentos", resultText)}>TXT</button>
            <button type="button" className="pida-header-btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => Exporter.downloadDOCX(getTimestampedName("Analisis-PIDA"), "Análisis de Documentos", resultText)}>DOCX</button>
            <button type="button" className="pida-header-btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => Exporter.downloadPDF(getTimestampedName("Analisis-PIDA"), "Análisis de Documentos", resultText)}>PDF</button>
          </div>
        )}

        {/* Botón oculto para subir archivos */}
        <input 
          type="file" 
          multiple 
          accept=".pdf,.doc,.docx" 
          style={{ display: 'none' }} 
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        {/* Fila de botón de subir */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <button 
            className="pida-header-btn primary" 
            style={{ width: 'auto' }}
            onClick={() => fileInputRef.current.click()}
          >
            + Seleccionar Archivos
          </button>
        </div>

        {/* Chips de Archivos Seleccionados */}
        {files.length > 0 && (
          <div id="active-files-area" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {files.map((file, idx) => (
              <div key={idx} className="active-file-chip">
                <span>{file.name}</span> 
                <button onClick={() => removeFile(idx)}>×</button>
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
        />
        
        <div className="pida-form-actions">
          <button type="button" className="pida-button-secondary" onClick={handleClear}>Limpiar</button>
          <button type="button" className="pida-button-primary" onClick={handleAnalyze} disabled={isAnalyzing}>
            Analizar
          </button>
        </div>
      </div>
    </div>
  );
}