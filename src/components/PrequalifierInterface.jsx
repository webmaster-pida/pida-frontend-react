import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw'; 
import { Exporter, getTimestampedName } from '../utils/exporter';

// Importaciones de Material-UI
import { Box, TextField, Button, ButtonGroup, Fab, MenuItem, Tooltip, CircularProgress, Typography } from '@mui/material';

const API_PRE = "https://precalifier-v20-perplexity-465781488910.us-central1.run.app";

// =========================================================================
// COMPONENTE DE VISTA PREVIA (MICROLINK) CON FILTRO DE ERRORES
// =========================================================================
const PreviewLink = ({ href, children, node, title, ...props }) => {
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchedUrl, setFetchedUrl] = useState(null);
  const [isScrapeBlocked, setIsScrapeBlocked] = useState(false);

  const MICROLINK_API_KEY = import.meta.env.VITE_MICROLINK_KEY || "";

  let hostname = "";
  try { hostname = new URL(href).hostname.replace('www.', ''); } catch (e) {}

  const fetchPreview = async () => {
    if (!href || !href.startsWith('http') || fetchedUrl === href) return;
    
    setFetchedUrl(href); 
    setLoading(true);
    setIsScrapeBlocked(false);

    try {
      const cleanHref = href.replace(/[\.\)]+$/, '');
      const res = await fetch(`https://pro.microlink.io?url=${encodeURIComponent(cleanHref)}`, {
        headers: MICROLINK_API_KEY ? { 'x-api-key': MICROLINK_API_KEY } : {}
      });
      
      const data = await res.json();

      if (data.status === 'success') {
        const returnedTitle = (data.data.title || '').toLowerCase();
        // Lista de keywords que indican que el sitio bloqueó la lectura
        const blockedKeywords = ['error:', 'could not be satisfied', 'cloudflare', 'attention required', 'access denied', '403 forbidden', 'not acceptable', 'security check'];

        if (blockedKeywords.some(kw => returnedTitle.includes(kw))) {
          setIsScrapeBlocked(true); // Bloqueo detectado, no mostraremos el texto de error
        } else {
          setPreviewData(data.data);
        }
      } else {
        setIsScrapeBlocked(true);
      }
    } catch (e) {
      console.error("Error cargando preview:", e);
      setIsScrapeBlocked(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPreview();
    }, 1500);
    return () => clearTimeout(timer);
  }, [href]);

  return (
    <Tooltip
      placement="top"
      arrow
      enterDelay={100} 
      PopperProps={{ sx: { zIndex: 999999 } }}
      title={
        <Box sx={{ width: 380, p: 0.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} sx={{ color: '#60a5fa' }} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <img 
                  src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`} 
                  alt="icon" 
                  style={{ width: 16, height: 16, borderRadius: '2px', backgroundColor: 'white' }} 
                />
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                  {hostname}
                </Typography>
              </Box>

              {/* Solo mostramos contenido si NO hay error y hay datos válidos */}
              {!isScrapeBlocked && previewData ? (
                <>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      fontWeight: 'bold', lineHeight: 1.3, color: 'white',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }}
                  >
                    {previewData.title || "Fuente de información"}
                  </Typography>
                  {previewData.description && (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontSize: '0.8rem', color: '#cbd5e1', mt: 0.5,
                        display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4
                      }}
                    >
                      {previewData.description}
                    </Typography>
                  )}
                </>
              ) : (
                /* Fallback silencioso: Solo el aviso institucional sin mostrar el error técnico */
                <Typography variant="body2" sx={{ color: '#cbd5e1', mt: 0.5, fontSize: '0.8rem' }}>
                  Documento Institucional Externo
                </Typography>
              )}
            </Box>
          )}
        </Box>
      }
      slotProps={{
        tooltip: {
          sx: {
            maxWidth: 420, maxHeight: 500, overflowY: 'auto',
            bgcolor: '#0f172a', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7)',
            borderRadius: '8px', border: '1px solid #334155', p: 1.5,
            '&::-webkit-scrollbar': { width: '4px' },
            '&::-webkit-scrollbar-thumb': { backgroundColor: '#334155', borderRadius: '10px' }
          }
        },
        arrow: { sx: { color: '#0f172a' } }
      }}
    >
      <span style={{ display: 'inline' }}>
        <a 
          href={href} target="_blank" rel="noopener noreferrer" 
          style={{ color: 'var(--pida-primary)', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer' }}
          {...props}
        >
          {children}
        </a>
      </span>
    </Tooltip>
  );
};

export default function PrequalifierInterface({ user, resetSignal, loadPreData }) {
  const [title, setTitle] = useState('');
  const [country, setCountry] = useState('');
  const [facts, setFacts] = useState('');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Analizando delitos y violaciones a DDHH...');
  const [resultText, setResultText] = useState('');
  const [error, setError] = useState('');

  const resultEndRef = useRef(null);
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
    resultEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [resultText, isAnalyzing]);

  const markdownComponents = {
    a: ({ node, ...props }) => <PreviewLink href={props.href} {...props}>{props.children}</PreviewLink>
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
                  <p style={{ color: 'var(--text)'}}>Ingresa los hechos de tu caso. PIDA realizará un análisis preliminar para identificar <strong>posibles delitos penales</strong> y <strong>violaciones a derechos humanos</strong> conforme a estándares nacionales e internacionales.</p>
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
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeRaw]} 
                components={markdownComponents}
              >
                {formatMarkdown(resultText)}
              </ReactMarkdown>
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
              MenuProps: { style: { zIndex: 999999 } }
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
            type="button" 
            variant="contained" 
            color="primary" 
            onClick={handleAnalyze} 
            disabled={isAnalyzing}
            sx={{ width: 220, py: 1.2, borderRadius: 2, fontWeight: 600, bgcolor: 'var(--pida-accent)', '&:hover': { bgcolor: '#004494' } }}
          >
            Precalificar Caso
          </Button>
        </Box>
      </div>
    </div>
  );
}