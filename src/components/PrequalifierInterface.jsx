import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Exporter, getTimestampedName } from '../utils/exporter';

const API_PRE = "https://precalifier-v20-stripe-elements-465781488910.us-central1.run.app";

export default function PrequalifierInterface({ user, resetSignal, loadPreData }) {
  const [title, setTitle] = useState('');
  const [country, setCountry] = useState('');
  const [facts, setFacts] = useState('');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Analizando delitos y violaciones a DDHH...');
  const [resultText, setResultText] = useState('');
  const [error, setError] = useState('');

  const resultEndRef = useRef(null);

  useEffect(() => {
    resultEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [resultText, isAnalyzing]);

  const handleClear = () => {
    setTitle('');
    setCountry('');
    setFacts('');
    setResultText('');
    setError('');
    setStatusMsg('Analizando delitos y violaciones a DDHH...');
  };

  useEffect(() => {
    if (resetSignal > 0) {
      handleClear();
    }
  }, [resetSignal]);

  useEffect(() => {
    if (loadPreData) {
      setTitle(loadPreData.title || '');
      setCountry(loadPreData.country_code || '');
      setFacts(loadPreData.facts || '');
      setResultText(loadPreData.analysis || '');
      setError('');
    }
  }, [loadPreData]);

  const handleAnalyze = async () => {
    const trimmedFacts = facts.trim();
    if (!trimmedFacts) {
      alert("Narra los hechos detalladamente.");
      return;
    }

    setIsAnalyzing(true);
    setResultText('');
    setError('');
    setStatusMsg('Conectando con PIDA...');

    const finalTitle = title.trim() || `Caso ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_PRE}/analyze`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
            title: finalTitle, 
            facts: trimmedFacts, 
            country_code: country || null 
        })
      });

      if (!response.ok) {
        throw new Error(`Error del servidor (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.replace("data: ", "").trim());
              
              if (data.event === "status") { 
                  setStatusMsg(data.message); 
              } else if (data.text) {
                  const chars = data.text;
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
      setError("❌ Ocurrió un error de conexión o el servidor rechazó la solicitud (CORS).");
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

  return (
    <div className="pida-view">
      <div className="pida-view-content">
        <div id="pida-chat-box">
          
          {/* Bienvenida Uniforme con el Robot */}
          {!isAnalyzing && !resultText && !error && (
            <div className="pida-bubble pida-message-bubble">
              <div className="pida-welcome-content">
                <img src="/img/PIDA-Productos_Stripe.png" alt="PIDA Robot" className="pida-welcome-robot" />
                <div className="pida-welcome-text">
                  <h3>Precalificador Penal y de Derechos Humanos</h3>
                  <p>
                    Ingresa los hechos de tu caso. PIDA realizará un análisis preliminar para identificar <strong>posibles delitos penales</strong> y <strong>violaciones a derechos humanos</strong> conforme a estándares nacionales e internacionales.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isAnalyzing && !resultText && (
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <div className="loader"></div>
              <p style={{ color: 'var(--pida-text-muted)', marginTop: '15px' }}>{statusMsg}</p>
            </div>
          )}

          {resultText && (
            <div className="pida-bubble pida-message-bubble markdown-content" style={{ marginTop: '20px', maxWidth: '100%', padding: '20px' }}>
              <ReactMarkdown>{formatMarkdown(resultText)}</ReactMarkdown>
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
          <div className="pida-download-controls" style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px', marginBottom: '10px' }}>
            <button type="button" className="pida-header-btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => Exporter.downloadTXT(getTimestampedName("Precalificador-PIDA"), "Precalificación de Caso", resultText)}>TXT</button>
            <button type="button" className="pida-header-btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => Exporter.downloadDOCX(getTimestampedName("Precalificador-PIDA"), "Precalificación de Caso", resultText)}>DOCX</button>
            <button type="button" className="pida-header-btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => Exporter.downloadPDF(getTimestampedName("Precalificador-PIDA"), "Precalificación de Caso", resultText)}>PDF</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input 
            type="text" 
            className="pida-textarea" 
            placeholder="Título del caso (Opcional)" 
            style={{ flex: 1, height: '45px', marginBottom: 0, padding: '0 10px' }}
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={isAnalyzing}
          />
          
          <select 
            className="pida-textarea" 
            style={{ flex: 1, height: '45px', padding: '0 10px', width: 'auto' }}
            value={country}
            onChange={e => setCountry(e.target.value)}
            disabled={isAnalyzing}
          >
            <option value="" disabled>País (Código Penal)</option>
            <option value="AR">Argentina</option>
            <option value="BO">Bolivia</option>
            <option value="CL">Chile</option>
            <option value="CO">Colombia</option>
            <option value="CR">Costa Rica</option>
            <option value="CU">Cuba</option>
            <option value="EC">Ecuador</option>
            <option value="SV">El Salvador</option>
            <option value="GT">Guatemala</option>
            <option value="HN">Honduras</option>
            <option value="MX">México</option>
            <option value="NI">Nicaragua</option>
            <option value="PA">Panamá</option>
            <option value="PY">Paraguay</option>
            <option value="PE">Perú</option>
            <option value="DO">Rep. Dominicana</option>
            <option value="UY">Uruguay</option>
            <option value="VE">Venezuela</option>
            <option value="">Otro / Internacional</option>
          </select>
        </div>

        {/* Soporte de Enter añadido aquí (con shift+enter para saltos de línea) */}
        <textarea 
          rows="4" 
          className="pida-textarea" 
          placeholder="Narra los hechos detalladamente para identificar posibles delitos y violaciones..."
          value={facts}
          onChange={e => setFacts(e.target.value)}
          onKeyDown={(e) => { 
            if (e.key === 'Enter' && !e.shiftKey) { 
              e.preventDefault(); 
              handleAnalyze(); 
            } 
          }}
          disabled={isAnalyzing}
        />

        <div className="pida-form-actions">
          <button type="button" className="pida-button-secondary" onClick={handleClear} disabled={isAnalyzing}>Limpiar</button>
          <button type="button" className="pida-button-primary" onClick={handleAnalyze} disabled={isAnalyzing}>
            Precalificar Caso
          </button>
        </div>
      </div>
    </div>
  );
}