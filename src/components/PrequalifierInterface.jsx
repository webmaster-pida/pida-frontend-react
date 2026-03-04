import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const API_PRE = "https://precalifier-v20-stripe-elements-465781488910.us-central1.run.app";

export default function PrequalifierInterface({ user }) {
  // Estados para los inputs del usuario
  const [title, setTitle] = useState('');
  const [country, setCountry] = useState('');
  const [facts, setFacts] = useState('');
  
  // Estados para controlar la interfaz
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Analizando delitos y violaciones a DDHH...');
  const [resultText, setResultText] = useState('');
  const [error, setError] = useState('');

  // Limpiar el formulario
  const handleClear = () => {
    setTitle('');
    setCountry('');
    setFacts('');
    setResultText('');
    setError('');
    setStatusMsg('Analizando delitos y violaciones a DDHH...');
  };

  // Enviar a analizar
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

    // Si el usuario no pone título, generamos uno por defecto
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
              // Limpiamos el texto para poder parsear el JSON
              const data = JSON.parse(line.replace("data: ", "").trim());
              
              // El backend de Precalificador tiene eventos especiales
              if (data.event === "status") { 
                  setStatusMsg(data.message); 
              } else if (data.text) {
                  fullText += data.text;
                  setResultText(fullText);
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

  return (
    <div className="pida-view">
      <div className="pida-view-content">
        
        {/* Bienvenida */}
        {!isAnalyzing && !resultText && !error && (
          <div id="pre-welcome" style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
            <div className="pida-bubble pida-message-bubble pre-welcome-card" style={{ maxWidth: '650px' }}>
              <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚖️ Precalificador Penal y de Derechos Humanos
              </h3>
              <p style={{ marginBottom: 0 }}>
                Ingresa los hechos de tu caso. PIDA realizará un análisis preliminar para identificar <strong>posibles delitos penales</strong> y <strong>violaciones a derechos humanos</strong> conforme a estándares nacionales e internacionales.
              </p>
            </div>
          </div>
        )}

        {/* Loader con mensajes dinámicos */}
        {isAnalyzing && !resultText && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <div className="loader"></div>
            <p style={{ color: 'var(--pida-text-muted)' }}>{statusMsg}</p>
          </div>
        )}

        {/* Resultados */}
        {resultText && (
          <div id="pre-analysis-result">
            <ReactMarkdown>{resultText}</ReactMarkdown>
          </div>
        )}

        {/* Errores */}
        {error && (
          <div id="pre-analysis-result">
            <div style={{ color: '#EF4444', padding: '20px', fontWeight: 'bold' }}>{error}</div>
          </div>
        )}

      </div>

      {/* Formulario */}
      <div className="pida-view-form">
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input 
            type="text" 
            className="pida-textarea" 
            placeholder="Título del caso (Opcional)" 
            style={{ flex: 1, height: '45px', marginBottom: 0, padding: '0 10px' }}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          
          <select 
            className="pida-textarea" 
            style={{ flex: 1, height: '45px', padding: '0 10px', width: 'auto' }}
            value={country}
            onChange={e => setCountry(e.target.value)}
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

        <textarea 
          rows="4" 
          className="pida-textarea" 
          placeholder="Narra los hechos detalladamente para identificar posibles delitos y violaciones..."
          value={facts}
          onChange={e => setFacts(e.target.value)}
        />

        <div className="pida-form-actions">
          <button type="button" className="pida-button-secondary" onClick={handleClear}>Limpiar</button>
          <button type="button" className="pida-button-primary" onClick={handleAnalyze} disabled={isAnalyzing}>
            Precalificar Caso
          </button>
        </div>
      </div>
    </div>
  );
}