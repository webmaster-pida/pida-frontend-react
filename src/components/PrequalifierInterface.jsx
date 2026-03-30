import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Exporter, getTimestampedName } from '../utils/exporter';

// Importaciones de Material-UI añadidas
import { Box, TextField, Button, ButtonGroup, Fab, MenuItem } from '@mui/material';

const API_PRE = "https://precalifier-v20-stripe-elements-465781488910.us-central1.run.app";

export default function PrequalifierInterface({ user, resetSignal, loadPreData }) {
  const [title, setTitle] = useState('');
  const [country, setCountry] = useState('');
  const [facts, setFacts] = useState('');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Analizando delitos y violaciones a DDHH...');
  const [resultText, setResultText] = useState('');
  const [error, setError] = useState('');

  // =========================================================================
  // REFS Y ESTADOS PARA EL SMART SCROLLING
  // =========================================================================
  const resultEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Escucha el evento de scroll del usuario
  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;
      setIsAtBottom(distanceToBottom < 80);
    }
  };

  const scrollToBottom = (behavior = 'smooth') => {
    resultEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [resultText, isAnalyzing]);

  const markdownComponents = {
    a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />
  };

  const handleClear = () => {
    setTitle('');
    setCountry('');
    setFacts('');
    setResultText('');
    setError('');
    setStatusMsg('Analizando delitos y violaciones a DDHH...');
    setIsAtBottom(true);
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
      setIsAtBottom(true);
      setTimeout(() => scrollToBottom('auto'), 100);
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
    
    setIsAtBottom(true);
    setTimeout(() => scrollToBottom(), 50);

    const finalTitle = title.trim() || `Caso ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    const finalCountry = (country === 'OTRO' || country === '') ? null : country;

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
            country_code: finalCountry 
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
    <div className="pida-view" style={{ position: 'relative' }}>
      
      <div className="pida-view-content" ref={chatContainerRef} onScroll={handleScroll}>
        <div id="pida-chat-box">
          
          {!isAnalyzing && !resultText && !error && (
            <div className="pida-bubble pida-message-bubble">
              <div className="pida-welcome-content">
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
              <ReactMarkdown components={markdownComponents}>{formatMarkdown(resultText)}</ReactMarkdown>
            </div>
          )}

          {error && (
            <div className="pida-bubble pida-message-bubble" style={{ marginTop: '20px' }}>
              <div style={{ color: '#EF4444', fontWeight: 'bold' }}>{error}</div>
            </div>
          )}

          <div ref={resultEndRef} style={{ height: '1px' }} />

        </div>
      </div>

      {!isAtBottom && resultText && (
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
            bottom: '240px',
            right: '25px',
            zIndex: 900,
            opacity: 0.9,
            backgroundColor: '#0056B3',
            '&:hover': { backgroundColor: '#004494', opacity: 1 }
          }}
          title="Ir al final del análisis"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="19 12 12 19 5 12"></polyline>
          </svg>
        </Fab>
      )}

      <div className="pida-view-form">
        
        {resultText && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
            <ButtonGroup size="small" variant="outlined" color="inherit" sx={{ borderColor: '#e2e8f0', bgcolor: 'white' }}>
              <Button sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }} onClick={() => Exporter.downloadTXT(getTimestampedName("Precalificador-PIDA"), "Precalificación de Caso", resultText)}>TXT</Button>
              <Button sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }} onClick={() => Exporter.downloadDOCX(getTimestampedName("Precalificador-PIDA"), "Precalificación de Caso", resultText)}>DOCX</Button>
              <Button sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }} onClick={() => Exporter.downloadPDF(getTimestampedName("Precalificador-PIDA"), "Precalificación de Caso", resultText)}>PDF</Button>
            </ButtonGroup>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
          <TextField 
            label="Título del caso (Opcional)"
            variant="outlined"
            size="small"
            fullWidth
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={isAnalyzing}
            sx={{ bgcolor: '#FAFAFA' }}
            InputLabelProps={{ shrink: true }}
          />
          
          {/* FIX AQUÍ: InputLabelProps añadido para evitar sobreposición visual */}
          <TextField
            select
            label="País (Código Penal)"
            variant="outlined"
            size="small"
            value={country}
            onChange={e => setCountry(e.target.value)}
            disabled={isAnalyzing}
            sx={{ bgcolor: '#FAFAFA', minWidth: { xs: '100%', sm: '220px' } }}
            InputLabelProps={{ shrink: true }}
            SelectProps={{ 
              displayEmpty: true,
              MenuProps: { style: { zIndex: 999999 } } // Refuerzo para asegurar que despliegue
            }}
          >
            <MenuItem value="" disabled><em>Selecciona un país...</em></MenuItem>
            <MenuItem value="AR">Argentina</MenuItem>
            <MenuItem value="BO">Bolivia</MenuItem>
            <MenuItem value="CL">Chile</MenuItem>
            <MenuItem value="CO">Colombia</MenuItem>
            <MenuItem value="CR">Costa Rica</MenuItem>
            <MenuItem value="CU">Cuba</MenuItem>
            <MenuItem value="EC">Ecuador</MenuItem>
            <MenuItem value="SV">El Salvador</MenuItem>
            <MenuItem value="GT">Guatemala</MenuItem>
            <MenuItem value="HN">Honduras</MenuItem>
            <MenuItem value="MX">México</MenuItem>
            <MenuItem value="NI">Nicaragua</MenuItem>
            <MenuItem value="PA">Panamá</MenuItem>
            <MenuItem value="PY">Paraguay</MenuItem>
            <MenuItem value="PE">Perú</MenuItem>
            <MenuItem value="DO">Rep. Dominicana</MenuItem>
            <MenuItem value="UY">Uruguay</MenuItem>
            <MenuItem value="VE">Venezuela</MenuItem>
            <MenuItem value="OTRO">Otro / Internacional</MenuItem>
          </TextField>
        </Box>

        <TextField 
          multiline
          minRows={3}
          maxRows={8}
          fullWidth
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
          sx={{ 
            mb: 2, 
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#FAFAFA',
              borderRadius: 2,
            }
          }}
        />

        <Box className="pida-form-actions" sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button 
            variant="text" 
            onClick={handleClear} 
            disabled={isAnalyzing}
            sx={{ color: 'text.secondary', fontWeight: 500, '&:hover': { textDecoration: 'underline', backgroundColor: 'transparent' } }}
          >
            Limpiar
          </Button>
          <Button 
            type="button" 
            variant="contained" 
            color="primary" 
            onClick={handleAnalyze} 
            disabled={isAnalyzing}
            sx={{ px: 4, py: 1.2, borderRadius: 2, fontWeight: 600, bgcolor: 'var(--pida-accent)', '&:hover': { bgcolor: '#004494' } }}
          >
            Precalificar Caso
          </Button>
        </Box>
      </div>
    </div>
  );
}