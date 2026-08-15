import React, { useState, useEffect, useRef } from 'react';
import { STRIPE_PRICES } from '../config/constants';
import { db } from '../config/firebase'; 

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw'; 

// Importaciones de Material-UI
import { Box, TextField, Button, Menu, MenuItem, SvgIcon, Card, CardMedia, IconButton, Fade, Typography, CircularProgress, Dialog, DialogTitle, DialogContent, Tooltip, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper } from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';

// --- COMPONENTE DE ENLACES PARA EL MARKDOWN (Igual que en ChatInterface) ---
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
        const blockedKeywords = ['error:', 'could not be satisfied', 'cloudflare', 'attention required', 'access denied', '403 forbidden', 'not acceptable', 'security check'];
        if (blockedKeywords.some(kw => returnedTitle.includes(kw))) {
          setIsScrapeBlocked(true); 
        } else {
          setPreviewData(data.data);
        }
      } else {
        setIsScrapeBlocked(true);
      }
    } catch (e) {
      setIsScrapeBlocked(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchPreview(), 1500);
    return () => clearTimeout(timer);
  }, [href]);

  return (
    <Tooltip
      placement="top" arrow enterDelay={100} PopperProps={{ sx: { zIndex: 999999 } }}
      title={
        <Box sx={{ width: 380, p: 0.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} sx={{ color: '#60a5fa' }} /></Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <img src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`} alt="icon" style={{ width: 16, height: 16, borderRadius: '2px', backgroundColor: 'white' }} />
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>{hostname}</Typography>
              </Box>
              {!isScrapeBlocked && previewData ? (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', lineHeight: 1.3, color: 'white', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{previewData.title || "Fuente de información"}</Typography>
                  {previewData.description && (<Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#cbd5e1', mt: 0.5, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>{previewData.description}</Typography>)}
                </>
              ) : (
                <Typography variant="body2" sx={{ color: '#cbd5e1', mt: 0.5, fontSize: '0.8rem' }}>Documento Institucional Externo</Typography>
              )}
            </Box>
          )}
        </Box>
      }
      slotProps={{
        tooltip: { sx: { maxWidth: 420, maxHeight: 500, overflowY: 'auto', bgcolor: '#0f172a', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7)', borderRadius: '8px', border: '1px solid #334155' } },
        arrow: { sx: { color: '#0f172a' } }
      }}
    >
      <span style={{ display: 'inline' }}>
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--pida-primary)', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer' }} {...props}>{children}</a>
      </span>
    </Tooltip>
  );
}

// Configuración de Markdown
const markdownComponents = {
  a: ({ node, ...props }) => <PreviewLink href={props.href} {...props}>{props.children}</PreviewLink>,
  table: ({ node, ...props }) => (
    <TableContainer component={Paper} sx={{ my: 2, boxShadow: 'none', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
      <Table size="small" {...props} />
    </TableContainer>
  ),
  thead: ({ node, ...props }) => <TableHead sx={{ bgcolor: '#f1f5f9' }} {...props} />,
  tbody: ({ node, ...props }) => <TableBody {...props} />,
  tr: ({ node, ...props }) => <TableRow hover {...props} />,
  th: ({ node, ...props }) => (<TableCell sx={{ fontWeight: 'bold', color: 'var(--pida-primary)', borderBottom: '2px solid #cbd5e1', whiteSpace: 'nowrap' }} {...props} />),
  td: ({ node, ...props }) => (<TableCell sx={{ borderColor: '#e2e8f0', verticalAlign: 'top' }} {...props} />)
};


// --- NUEVO COMPONENTE: LEAD MAGNET (TRY BEFORE YOU BUY) ---
const LeadMagnetTeaser = ({ onOpenAuth, interval }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, streaming, done
  const [statusText, setStatusText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const getAnonId = () => {
    let anonId = localStorage.getItem('pida_anon_id');
    if (!anonId) {
      anonId = 'anon_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('pida_anon_id', anonId);
    }
    return anonId;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim() || status === 'loading' || status === 'streaming') return;

    setStatus('loading');
    setResponse('');
    setStatusText('Conectando con PIDA...');
    setModalOpen(true); // 👈 ABRE EL CUADRO ANCHO INMEDIATAMENTE

    try {
      const res = await fetch(`${import.meta.env.VITE_API_CHAT}/teaser-chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Anon-ID': getAnonId() 
        },
        body: JSON.stringify({ prompt: query })
      });

      if (!res.ok) {
        if (res.status === 429) {
           setStatus('idle');
           setStatusText('');
           alert("Has alcanzado el límite de pruebas anónimas. ¡Inicia tu prueba de 5 días para continuar!");
           handleUnlock(); 
           return;
        }
        throw new Error('Error de conexión');
      }

      setStatus('streaming');
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let streamBuffer = "";
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split('\n\n');
        streamBuffer = lines.pop(); 
        
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.event === 'status') {
                setStatusText(data.message);
              } else if (data.text) {
                setResponse((prev) => prev + data.text);
              } else if (data.event === 'done') {
                setStatus('done');
              }
            } catch (err) {}
          }
        }
      }
      setStatus('done');
    } catch (error) {
      console.error("Teaser error", error);
      setResponse("❌ Ocurrió un error al procesar la solicitud.");
      setStatus('done');
    }
  };

  const handleUnlock = (followUpQuery = null) => {
    sessionStorage.setItem('pida_pending_query', followUpQuery || query);
    sessionStorage.setItem('pida_pending_interval', interval);
    sessionStorage.setItem('pida_pending_plan', 'basico'); 
    setModalOpen(false);
    onOpenAuth('register');
  };

  useEffect(() => {
    if (modalOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [response, modalOpen, statusText]);

  // Lógica de Renderizado del Mensaje (Extraída de ChatInterface)
  const renderResponseContent = () => {
    let displayContent = response;

    displayContent = displayContent.split('\n').map(line => {
      const count = (line.match(/\*\*/g) || []).length;
      if (count % 2 !== 0) return line.replace(/\*\*/g, ''); 
      return line;
    }).join('\n');

    let questions = [];
    const tagStart = "<pida_questions>";
    const tagEnd = "</pida_questions>";

    if (displayContent.includes(tagStart)) {
      const parts = displayContent.split(tagStart);
      let textBeforeTags = parts[0];
      let textInsideAndAfter = parts[1] || "";
      let qString = "";
      let textAfterTags = ""; 

      if (textInsideAndAfter.includes(tagEnd)) {
        const subParts = textInsideAndAfter.split(tagEnd);
        qString = subParts[0]; 
        textAfterTags = subParts.slice(1).join(tagEnd); 
      } else {
        qString = "";
        textAfterTags = "";
      }

      displayContent = textBeforeTags + "\n" + textAfterTags;

      if (status === 'done' || textInsideAndAfter.includes(tagEnd)) {
        questions = qString.split('|').map(q => q.trim()).filter(q => q.length > 0);
      }
    }

    displayContent = displayContent.replace(/["']br["']/g, '<br />');

    if (displayContent.includes('## Fuentes y Jurisprudencia')) {
      const splitPoint = '## Fuentes y Jurisprudencia';
      const parts = displayContent.split(splitPoint);
      let fuentesText = parts[1];
      fuentesText = fuentesText.replace(/\|?\s*:?-{2,}:?\s*\|?/g, '');
      fuentesText = fuentesText.replace(/\|/g, ' • ');
      displayContent = parts[0] + splitPoint + fuentesText;
    }

    return (
      <>
        <div className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
            {displayContent}
          </ReactMarkdown>
          {status === 'streaming' && <span style={{ borderRight: '2px solid var(--pida-primary)', animation: 'blink 1s step-end infinite' }}>&nbsp;</span>}
        </div>
        
        {questions.length > 0 && (
          <div className="follow-up-section" style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
            <strong style={{ display: 'block', marginBottom: '10px', color: 'var(--pida-primary)' }}>
              Preguntas de seguimiento sugeridas:
            </strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {questions.map((q, i) => (
                <button 
                  key={i} 
                  className="follow-up-btn"
                  onClick={() => handleUnlock(q)}
                  style={{
                    textAlign: 'left', padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    backgroundColor: 'white', color: '#334155', fontSize: '0.9rem', cursor: 'pointer', transition: '0.2s'
                  }}
                  onMouseOver={e => { e.target.style.borderColor = 'var(--pida-primary)'; e.target.style.color = 'var(--pida-primary)'; }}
                  onMouseOut={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.color = '#334155'; }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <Card elevation={0} sx={{ width: '100%', maxWidth: '600px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--pida-border)', boxShadow: '0 20px 40px rgba(29, 53, 87, 0.1)' }}>
        <Box component="form" onSubmit={handleSearch} sx={{ p: 3, bgcolor: '#ffffff' }}>
          <Typography variant="subtitle2" sx={{ color: 'var(--navy)', mb: 2, fontWeight: 'bold' }}>Hazle una consulta jurídica a PIDA gratis:</Typography>
          <Box sx={{ display: 'flex', gap: 1, position: 'relative' }}>
            <TextField
              fullWidth
              placeholder="Ej: ¿Cuáles son los estándares de prisión preventiva en la Corte IDH?"
              variant="outlined"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ bgcolor: '#F8FAFC', '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
            <Button 
              type="submit" 
              variant="contained" 
              disabled={!query.trim()}
              sx={{ borderRadius: '12px', px: 3, bgcolor: 'var(--pida-primary)', '&:hover': { bgcolor: 'var(--pida-accent)' }, minWidth: '64px' }}
            >
              <AutoAwesomeIcon />
            </Button>
          </Box>
        </Box>
      </Card>

      {/* MODAL ANCHO PARA MOSTRAR LA RESPUESTA COMO EL CHAT */}
      <Dialog 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        maxWidth="md" 
        fullWidth 
        PaperProps={{ sx: { borderRadius: '16px', height: '85vh', maxHeight: '800px', backgroundColor: '#F8FAFC' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', bgcolor: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
             <AutoAwesomeIcon sx={{ color: 'var(--pida-primary)' }}/>
             <Typography variant="h6" fontWeight="bold" color="var(--navy)">Análisis de PIDA</Typography>
          </Box>
          <IconButton onClick={() => setModalOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
           <Box className="pida-view-content" sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, md: 4 }, pb: 10 }}>
              
              {/* Mensaje del Usuario */}
              <div className="pida-bubble user-message-bubble" style={{ alignSelf: 'flex-end', backgroundColor: '#E2E8F0', padding: '12px 18px', borderRadius: '16px 16px 0 16px', marginBottom: '20px', maxWidth: '85%' }}>
                 <Typography sx={{ color: '#334155' }}>{query}</Typography>
              </div>

              {/* Mensaje del Modelo */}
              {(status === 'loading' || response) && (
                <div className="pida-bubble pida-message-bubble" style={{ alignSelf: 'flex-start', backgroundColor: 'white', padding: '20px', borderRadius: '16px 16px 16px 0', border: '1px solid #e2e8f0', maxWidth: '100%', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                   {status === 'loading' && (
                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: '#475569' }}>
                        <CircularProgress size={20} sx={{ color: 'var(--pida-primary)' }} />
                        <Typography variant="body2" sx={{ fontWeight: 500, fontStyle: 'italic' }}>{statusText}</Typography>
                     </Box>
                   )}
                   {response && renderResponseContent()}
                </div>
              )}
              <div ref={messagesEndRef} style={{ height: '1px' }} />
           </Box>

           {/* BARRA INFERIOR / CALL TO ACTION */}
           <Box sx={{ p: 3, borderTop: '1px solid #e2e8f0', bgcolor: 'white', textAlign: 'center', boxShadow: '0 -10px 15px -3px rgba(0, 0, 0, 0.05)' }}>
              <Typography variant="body1" sx={{ mb: 1.5, color: 'var(--navy)', fontWeight: 'bold' }}>
                ¿Quieres profundizar en este caso o analizar otro documento?
              </Typography>
              <Button 
                variant="contained" 
                onClick={() => handleUnlock()} 
                sx={{ bgcolor: 'var(--red)', color: 'white', fontWeight: 'bold', textTransform: 'none', px: 4, py: 1.2, borderRadius: '8px', '&:hover': { bgcolor: '#be123c' } }}
              >
                 Iniciar prueba gratis de 5 días
              </Button>
           </Box>
        </DialogContent>
      </Dialog>
      <style>{`@keyframes blink { 50% { border-color: transparent; } }`}</style>
    </>
  );
};

export default function LandingPage({ onOpenAuth }) {
  const [interval, setInterval] = useState('monthly'); 
  const [currency, setCurrency] = useState('USD');     
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isUS, setIsUS] = useState(false);

  // ESTADO: Controla si el menú móvil está abierto
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [anchorEl, setAnchorEl] = useState(null);
  const openNewsletter = Boolean(anchorEl);

  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
      name: '', company: '', email: '', confirmEmail: '', countryCode: '+503', phone: '', message: ''
  });
  const [contactStatus, setContactStatus] = useState({ text: '', type: '', isSubmitting: false });

  useEffect(() => {
    const detectLocation = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        const data = await response.json();
        clearTimeout(timeoutId);
        
        if (data.country_code === 'US') {
          setIsUS(true); 
        } else if (data.country_code === 'MX') { 
          setCurrency('MXN'); 
        }
      } catch (e) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (/America\/(New_York|Chicago|Los_Angeles|Denver|Phoenix|Detroit|Boise|Anchorage)/i.test(tz)) {
          setIsUS(true);
        } else if (/Mexico|Monterrey|Chihuahua|Tijuana|Cancun/i.test(tz)) { 
          setCurrency('MXN'); 
        }
      }
    };
    detectLocation();
  }, []);

  const scrollToSection = (targetId) => {
    window.requestAnimationFrame(() => {
      const element = document.getElementById(targetId);
      if (element) {
        const headerOffset = 100; 
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    });
  };

  useEffect(() => {
    if (window.location.hash) {
      const targetId = window.location.hash.substring(1);
      setTimeout(() => { scrollToSection(targetId); }, 300);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3); 
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMenuOpen]);

  const handleNewsletterClick = (event) => { setAnchorEl(event.currentTarget); };
  const handleNewsletterClose = () => { setAnchorEl(null); };

  const handleSelectPlan = (planKey) => {
    sessionStorage.setItem('pida_pending_plan', planKey);
    sessionStorage.setItem('pida_pending_interval', interval);
    localStorage.setItem('pida_currency', currency);
    onOpenAuth('register');
  };

  const handleContactSubmit = async (e) => {
      e.preventDefault();
      if (contactForm.email !== contactForm.confirmEmail) {
          setContactStatus({ text: '❌ Los correos electrónicos no coinciden.', type: 'error', isSubmitting: false });
          return;
      }
      setContactStatus({ text: '', type: '', isSubmitting: true });
      const leadData = {
          name: contactForm.name, company: contactForm.company, email: contactForm.email,
          phone: `${contactForm.countryCode} ${contactForm.phone}`, message: contactForm.message,
          createdAt: new Date(), status: 'nuevo'
      };
      try {
          await db.collection('leads_corporativos').add(leadData);
          setContactStatus({ text: 'Datos recibidos. Te contactaremos pronto.', type: 'success', isSubmitting: false });
          setTimeout(() => {
              setIsContactOpen(false);
              setContactForm({ name: '', company: '', email: '', confirmEmail: '', countryCode: '+503', phone: '', message: '' });
              setContactStatus({ text: '', type: '', isSubmitting: false });
          }, 3000);
      } catch (error) {
          setContactStatus({ text: 'Error de conexión. Intenta de nuevo.', type: 'error', isSubmitting: false });
      }
  };

  const handleNavClick = (targetId) => {
    setIsMenuOpen(false);
    setTimeout(() => { scrollToSection(targetId); }, 100);
  };

  const muiPrimaryBtnStyle = {
    backgroundColor: 'var(--navy)',
    color: 'var(--white)',
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.95rem',
    borderRadius: '8px',
    padding: '6px 22px', 
    boxShadow: '0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14)', 
    fontFamily: 'var(--font-body)',
    transition: 'background-color 250ms ease, box-shadow 250ms ease, color 250ms ease',
    '&:hover': {
      backgroundColor: 'var(--pida-accent)',
      color: '#ffffff',
      boxShadow: '0px 4px 12px rgba(56, 189, 248, 0.35)', 
    }
  };

  const muiCorpBtnStyle = {
    backgroundColor: 'var(--white)',
    color: 'var(--pida-primary)',
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.95rem',
    borderRadius: '8px',
    padding: '6px 22px', 
    boxShadow: '0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14)', 
    fontFamily: 'var(--font-body)',
    transition: 'background-color 250ms ease, box-shadow 250ms ease, color 250ms ease',
    '&:hover': {
      backgroundColor: 'var(--white)',
      color: 'var(--pida-primary)',
      boxShadow: '0px 4px 12px rgba(56, 189, 248, 0.35)',
    }
  };

  const muiCardBaseStyle = {
    padding: '35px',
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
    overflow: 'visible', 
    backgroundColor: '#ffffff',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      transform: 'translateY(-8px)',
      boxShadow: '0 22px 45px rgba(29, 53, 87, 0.12)', 
    }
  };

  const muiFeaturedCardStyle = {
    ...muiCardBaseStyle,
    border: '2.5px solid var(--pida-primary)',
    boxShadow: '0 15px 30px rgba(29, 53, 87, 0.08)',
    position: 'relative',
    transform: { xs: 'none', md: 'scale(1.04)' },
    '&:hover': {
      transform: { xs: 'translateY(-8px)', md: 'scale(1.04) translateY(-8px)' },
      boxShadow: '0 25px 50px rgba(29, 53, 87, 0.18)',
    }
  };

  const muiGhostBtnStyle = {
    backgroundColor: 'white',
    color: 'var(--navy)',
    border: '2px solid var(--navy)',
    textTransform: 'none',
    fontWeight: 800,
    fontSize: '0.95rem',
    borderRadius: '8px',
    padding: '5px 21px', 
    fontFamily: 'var(--font-body)',
    transition: 'all 250ms ease',
    '&:hover': {
      backgroundColor: 'var(--navy)',
      color: 'white',
    }
  }

  return (
    <div id="landing-page-root">
      
      {isMenuOpen && (
        <div 
          onClick={() => setIsMenuOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(29, 53, 87, 0.5)', backdropFilter: 'blur(3px)',
            zIndex: 998
          }}
        ></div>
      )}

      <header className="nav" id="navbar" style={{ padding: '12px 0', zIndex: 1000 }}>
        <div className="wrapper nav-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <a href="/" style={{ display: 'flex', alignItems: 'center', flexShrink: 0, zIndex: 1001 }}>
            <img className="header-logo" src="/img/PIDA_logo-100-blue-red.webp" alt="Logo PIDA" style={{ height: '100px', width: 'auto', flexShrink: 0 }} />
          </a>

          <button 
            className="mobile-menu-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              display: 'none', background: 'none', border: 'none', color: 'var(--pida-primary)',
              cursor: 'pointer', zIndex: 1001, padding: '5px'
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {isMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              )}
            </svg>
          </button>

          <div className={`nav-right-container ${isMenuOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '22px' }}>
            
            <div className="social-links-row" style={{ display: 'flex', gap: '24px', paddingRight: '8px', alignItems: 'center' }}>
              <a href="https://www.facebook.com/ia.pida" target="_blank" rel="noreferrer" aria-label="Facebook PIDA" style={{ color: 'var(--pida-primary)', transition: 'color 0.2s', display: 'flex' }} onMouseOver={e => e.currentTarget.style.color = 'var(--pida-accent)'} onMouseOut={e => e.currentTarget.style.color = 'var(--pida-primary)'}>
                <FacebookIcon sx={{ fontSize: 36 }} />
              </a>
              <a href="https://www.instagram.com/pida.ia" target="_blank" rel="noreferrer" aria-label="Instagram PIDA" style={{ color: 'var(--pida-primary)', transition: 'color 0.2s', display: 'flex' }} onMouseOver={e => e.currentTarget.style.color = 'var(--pida-accent)'} onMouseOut={e => e.currentTarget.style.color = 'var(--pida-primary)'}>
                <InstagramIcon sx={{ fontSize: 36 }} />
              </a>
              <a href="https://www.tiktok.com/@pida.solucion" target="_blank" rel="noreferrer" aria-label="TikTok PIDA" style={{ color: 'var(--pida-primary)', transition: 'color 0.2s', display: 'flex' }} onMouseOver={e => e.currentTarget.style.color = 'var(--pida-accent)'} onMouseOut={e => e.currentTarget.style.color = 'var(--pida-primary)'}>
                <SvgIcon sx={{ fontSize: 36 }}>
                  <path d="M19.589 6.686a4.793 4.793 0 0 1-3.976-4.686h-3.868v11.52a4.11 4.11 0 1 1-4.11-4.111c.287 0 .565.031.834.084v-3.9a7.978 7.978 0 1 0 7.142 7.927V9.752a8.683 8.683 0 0 0 3.978 1.054V6.686z"/>
                </SvgIcon>
              </a>
            </div>

            <nav className="nav-menu" style={{ display: 'flex', alignItems: 'center' }}>
              <a href="#diferencia" onClick={(e) => { e.preventDefault(); handleNavClick('diferencia'); }} className="nav-link hide-on-mobile">Diferencia PIDA</a>
              <a href="#ecosistema" onClick={(e) => { e.preventDefault(); handleNavClick('ecosistema'); }} className="nav-link hide-on-mobile">Ecosistema</a>
              <a href="#planes" onClick={(e) => { e.preventDefault(); handleNavClick('planes'); }} className="nav-link hide-on-mobile">Planes</a>

              <div style={{ display: 'inline-block' }}>
                <Button
                  id="newsletter-button"
                  aria-controls={openNewsletter ? 'newsletter-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={openNewsletter ? 'true' : undefined}
                  onClick={handleNewsletterClick}
                  className="nav-link"
                  disableRipple
                  sx={{
                    textTransform: 'none',
                    backgroundColor: 'transparent',
                    p: 0,
                    minWidth: 'auto',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    color: '#64748B',
                    '&:hover': { backgroundColor: 'transparent' }
                  }}
                >
                  Newsletter <span style={{ fontSize: '0.7em', marginLeft: '5px' }}>▼</span>
                </Button>
                
                <Menu
                  id="newsletter-menu"
                  anchorEl={anchorEl}
                  open={openNewsletter}
                  onClose={handleNewsletterClose}
                  MenuListProps={{ 'aria-labelledby': 'newsletter-button' }}
                  PaperProps={{
                    sx: {
                      mt: 1,
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      minWidth: '160px'
                    }
                  }}
                >
                  <MenuItem onClick={handleNewsletterClose} component="a" href="/newsletter-001.pdf" target="_blank" rel="noreferrer" sx={{ color: 'var(--pida-primary)', fontSize: '0.85rem', py: 1.5 }}>📄 Enero 2026</MenuItem>
                  <MenuItem onClick={handleNewsletterClose} component="a" href="/newsletter-002.pdf" target="_blank" rel="noreferrer" sx={{ color: 'var(--pida-primary)', fontSize: '0.85rem', py: 1.5 }}>📄 Febrero 2026</MenuItem>
                  <MenuItem onClick={handleNewsletterClose} component="a" href="/newsletter-003.pdf" target="_blank" rel="noreferrer" sx={{ color: 'var(--pida-primary)', fontSize: '0.85rem', py: 1.5 }}>📄 Marzo 2026</MenuItem>
                  <MenuItem onClick={handleNewsletterClose} component="a" href="/newsletter-004.pdf" target="_blank" rel="noreferrer" sx={{ color: 'var(--pida-primary)', fontSize: '0.85rem', py: 1.5 }}>📄 Abril 2026</MenuItem>
                </Menu>
              </div>

              <Button 
                onClick={() => { setIsMenuOpen(false); onOpenAuth('login'); }}
                sx={{
                  ...muiGhostBtnStyle,
                  padding: { xs: '8px', sm: '4px 16px' },
                  width: { xs: '100%', sm: 'auto' },
                  mt: { xs: '15px', sm: '0' },
                  ml: { xs: '0', sm: '15px' },
                }}
              >
                Iniciar Sesión
              </Button>
            </nav>
          </div>
        </div>

        <style>
          {`
            @media (max-width: 1024px) {
              .header-logo { height: 60px !important; }
              .mobile-menu-toggle { display: block !important; }
              .hide-on-mobile { display: block !important; }
              .nav-right-container {
                position: fixed; top: 0; right: -100%; width: 260px; height: 100vh;
                background-color: #ffffff; box-shadow: -5px 0 25px rgba(0,0,0,0.15);
                display: flex !important; flex-direction: column; align-items: flex-start !important;
                padding: 90px 25px 20px 25px; transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 999; gap: 25px !important;
              }
              .nav-right-container.open { right: 0; }
              .nav-right-container .nav-menu { flex-direction: column; align-items: flex-start !important; width: 100%; gap: 20px; }
              .nav-right-container .nav-link {
                font-size: 1.1rem !important; font-weight: 600 !important; color: var(--pida-primary) !important;
                width: 100%; padding: 5px 0; border-bottom: 1px solid #f1f5f9; justify-content: flex-start;
              }
              .social-links-row { width: 100%; justify-content: flex-start; padding-bottom: 15px; border-bottom: 2px solid #e2e8f0; }
              #pida { padding: 10px 0 !important; }
            }
          `}
        </style>
      </header>

      <main>
        <section id="pida"></section>
        
        <section className="bg-circuitos" style={{ paddingTop: '0px' }}>
          <div className="wrapper hero-grid" style={{ backgroundColor: 'var(--white)', padding: '60px 20px 30px 20px' }}>
            <div className="hero-content">
              <h1 style={{ fontSize: '3.0rem', lineHeight: '1.15', marginBottom: '15px', marginTop: '15px' }}>
                Inteligencia Aumentada para la Defensa de los <br />
                <span className="text-gradient">Derechos Humanos</span>
              </h1>
              <p className="hero-desc">
                Los asistentes de Inteligencia Artificial genéricos son un océano de información, pero sin un ancla, pueden llevarte a la deriva con datos imprecisos.
              </p>
              
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                <Button 
                  onClick={() => scrollToSection('planes')}
                  sx={muiPrimaryBtnStyle}
                >
                  Suscríbete
                </Button>
              </div>
            </div>
            
            {/* --- COMPONENTE LEAD MAGNET (TRY BEFORE YOU BUY) --- */}
            <div className="hero-visual-column" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <LeadMagnetTeaser onOpenAuth={onOpenAuth} interval={interval} />
            </div>

          </div>
        </section>

        <section id="diferencia" className="bg-ai-mesh" style={{ padding: '80px 0 40px 0' }}>
            <div className="wrapper">
                <div className="section-intro">
                    <h2 style={{color: 'var(--white)'}}>¿Cuál es la gran diferencia de PIDA?</h2>
                    <p style={{ fontSize: '1.2rem', color: 'var(--white)', maxWidth: '900px', margin: '0 auto' }}>PIDA no improvisa buscando en el caos de internet. Su punto de partida es la biblioteca del <strong>IIRESODH</strong>, una institución referente con más de 30 años de experiencia en Litigio Estratégico Internacional.</p>
                    <p style={{ fontSize: '1.2rem', color: 'var(--white)', maxWidth: '900px', margin: '0 auto' }}>Primero, PIDA consulta este acervo validado por personas expertas en Derechos Humanos para obtener el fundamento correcto. Luego, usa la IA para construir tu respuesta. Así obtienes la velocidad de la tecnología, pero con la <strong>autoridad y el rigor técnico</strong> que solo el <strong>IIRESODH</strong> puede garantizar.</p>
                </div>
            </div>
        </section>

        <section id="bondades" className="bg-circuitos">
            <div className="section-intro" style={{background: 'var(--white)', padding: '40px 20px 40px 20px' }}>
                <h2 style={{ marginBottom: '40px', textAlign: 'center' }}>Bondades únicas de PIDA</h2>
                <div className="bento-grid">
                    <div className="bento-card" style={{ backgroundColor: '#ffffff' }}>
                        <h3 className="bento-title">Respuestas Ancladas, no Adivinanzas</h3>
                        <p style={{color: '#555555' }}>Cada respuesta está fundamentada y prioriza el conocimiento alojado en nuestra biblioteca privada y curada. Esto le da un nivel de fiabilidad y precisión que las IAs genéricas no pueden ofrecer, minimizando el riesgo de información incorrecta.</p>
                    </div>
                    <div className="bento-card" style={{ backgroundColor: '#ffffff' }}>
                        <h3 className="bento-title">Lo Mejor de Dos Mundos</h3>
                        <p style={{color: '#555555' }}>Combina el conocimiento especializado con la capacidad de razonamiento y redacción de un modelo la Inteligencia Artificial de frontera. Obtienes respuestas con calidad de experto, no solo texto genérico.</p>
                    </div>
                    <div className="bento-card" style={{ backgroundColor: '#ffffff' }}>
                        <h3 className="bento-title">Eficiencia Acelerada</h3>
                        <p style={{color: '#555555' }}>El “Analizador de Documentos” sigue siendo tu experto incansable, capaz de procesar tus archivos y extraer información clave en minutos, liberándote para la estrategia y la acción.</p>
                    </div>
                </div>
            </div>
        </section>

        <section id="ecosistema" className="bg-ai-mesh" style={{ padding: '80px 0' }}>
            <div className="wrapper" style={{ position: 'relative', zIndex: 1 }}>
                <div className="section-intro" style={{ marginBottom: '60px' }}>
                    <h2 style={{ color: '#FFFFFF', fontSize: '2.8rem', marginBottom: '15px' }}>El Ecosistema PIDA</h2>
                    <p style={{ fontSize: '1.2rem', color: 'var(--white)', maxWidth: '900px', margin: '0 auto' }}>
                        PIDA integra tres motores especializados que trabajan en conjunto para cubrir el ciclo completo de la defensa legal: investigación, análisis documental y evaluación de casos.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px', maxWidth: '900px', margin: '0 auto' }}>
                    
                    <div className="glass-card">
                        <h3 style={{ color: '#FFFFFF', fontSize: '1.5rem', marginBottom: '10px' }}>
                            1. Experto en Derechos Humanos
                            <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--red)', fontWeight: '700', marginTop: '8px', letterSpacing: '1px' }}>TU CONSULTOR FUNDAMENTADO</span>
                        </h3>
                        <p style={{ fontSize: '1.05rem', color: '#E2E8F0', lineHeight: '1.7', marginBottom: '15px' }}>
                            Este motor redefine la investigación jurídica. A diferencia de los chats genéricos que improvisan respuestas, PIDA actúa como un consultor senior conectado directamente a la <strong style={{ color: '#FFFFFF' }}>biblioteca privada y curada del IIRESODH</strong>.
                        </p>
                        <p style={{ fontSize: '1rem', color: '#94A3B8', lineHeight: '1.6' }}>
                            <strong style={{ color: '#F8FAFC' }}>Aplicación Práctica:</strong> Utilízalo para resolver dudas complejas sobre control de convencionalidad, buscar jurisprudencia específica de la Corte IDH o redactar argumentos sólidos para tus demandas. Cada respuesta está respaldada por una base de conocimiento autorizada, garantizando rigor técnico y reduciendo el riesgo de imprecisiones.
                        </p>
                    </div>

                    <div className="glass-card">
                        <h3 style={{ color: '#FFFFFF', fontSize: '1.5rem', marginBottom: '10px' }}>
                            2. Analizador de Documentos
                            <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--red)', fontWeight: '700', marginTop: '8px', letterSpacing: '1px' }}>TU ESTRATEGA PROCESAL</span>
                        </h3>
                        <p style={{ fontSize: '1.05rem', color: '#E2E8F0', lineHeight: '1.7', marginBottom: '15px' }}>
                            Capacidad de procesamiento masivo para el abogado moderno. Esta herramienta lee, comprende y procesa archivos voluminosos (PDF, Word) en segundos, actuando como un asistente analítico incansable.
                        </p>
                        <p style={{ fontSize: '1rem', color: '#94A3B8', lineHeight: '1.6' }}>
                            <strong style={{ color: '#F8FAFC' }}>Aplicación Práctica:</strong> Carga una sentencia extensa y pídele que encuentre contradicciones lógicas, extraiga los hechos probados para armar tu apelación o elabore una <strong style={{ color: '#FFFFFF' }}>Teoría del Caso</strong> basada en las pruebas del expediente. Además, puedes instruirle para que redacte borradores de escritos legales utilizando estrictamente la información del documento subido.
                        </p>
                    </div>

                    <div className="glass-card">
                        <h3 style={{ color: '#FFFFFF', fontSize: '1.5rem', marginBottom: '10px' }}>
                            3. Evaluador Legal
                            <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--red)', fontWeight: '700', marginTop: '8px', letterSpacing: '1px' }}>TU DIAGNÓSTICO INMEDIATO</span>
                        </h3>
                        <p style={{ fontSize: '1.05rem', color: '#E2E8F0', lineHeight: '1.7', marginBottom: '15px' }}>
                            Una herramienta de encuadre jurídico diseñada para la etapa inicial de cualquier caso. Funciona como un puente inteligente entre los hechos fácticos y la tipificación legal.
                        </p>
                        <p style={{ fontSize: '1rem', color: '#94A3B8', lineHeight: '1.6' }}>
                            <strong style={{ color: '#F8FAFC' }}>Aplicación Práctica:</strong> Ideal para la primera entrevista con el cliente. Simplemente narra los hechos del caso y el sistema realizará un análisis preliminar instantáneo para identificar posibles <strong style={{ color: '#FFFFFF' }}>delitos penales</strong> y <strong style={{ color: '#FFFFFF' }}>violaciones a Derechos Humanos</strong> conforme a estándares internacionales. Esto te permite trazar una ruta de defensa clara desde el primer minuto.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <section id="planes" className="bg-circuitos" style={{ padding: '40px 0' }}>
          <div className="wrapper" style={{ background: 'var(--white)', padding: '40px 20px', width: '92%', borderRadius: '24px', margin: '0 auto' }}>
            <div className="section-intro">
              <h2>Planes Flexibles</h2>
              <p style={{ marginBottom: '10px' }}>Selecciona el plan que mejor se adapte a tu nivel de investigación.</p>
              <p style={{ color: 'var(--red)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '20px' }}>
                Todos los planes incluyen 5 días de prueba ¡Gratis!
              </p>
            </div>

            {isUS ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: '#FEF2F2', borderRadius: '12px', border: '1px solid #FECACA', color: '#991B1B', maxWidth: '650px', margin: '0 auto 50px auto' }}>
                <h3 style={{ marginBottom: '15px', color: '#991B1B', fontSize: '1.4rem' }}>Servicio no disponible en su región</h3>
                <p style={{ fontWeight: '500', lineHeight: '1.6' }}>
                  Por políticas regulatorias y de privacidad corporativa, la comercialización de suscripciones de PIDA no se encuentra disponible actualmente para usuarios o entidades ubicadas dentro del territorio de los Estados Unidos.
                </p>
              </div>
            ) : (
              <>
                <div className="billing-toggle-wrapper">
                  <div className="billing-toggle-controls">
                    <span className={`billing-label ${interval === 'monthly' ? 'active' : 'inactive'}`}>Mensual</span>
                    <label className="switch">
                      <input type="checkbox" checked={interval === 'annual'} onChange={(e) => setInterval(e.target.checked ? 'annual' : 'monthly')} />
                      <span className="slider round"></span>
                    </label>
                    <span className={`billing-label ${interval === 'annual' ? 'active' : 'inactive'}`}>Anual</span>
                  </div>
                  <div className="discount-tooltip-container">
                    {interval === 'annual' && <span className="discount-tooltip">¡Dos meses gratis!</span>}
                  </div>
                </div>

                <div className="pricing-grid">
                  <Card elevation={0} sx={muiCardBaseStyle}>
                    <h3>Básico</h3>
                    <div className="price-container">
                      <span className="price-val">{STRIPE_PRICES.basico[interval][currency].text}</span>
                      <span className="price-period">{interval === 'monthly' ? '/ mes' : '/ año'}</span>
                    </div>
                    <ul className="plan-features">
                      <li>✅ <strong>¡5 días de prueba Gratis!</strong></li>
                      <li>✅ Consultas con chat experto</li>
                      <li>✅ Análisis de documentos</li>
                      <li>✅ 30 Mb por archivo</li>
                      <li>✅ Evaluador legal</li>
                    </ul>
                    <Button 
                      onClick={() => handleSelectPlan('basico')}
                      sx={{ ...muiPrimaryBtnStyle, width: '100%', mt: 'auto' }}
                    >
                      Elegir Básico
                    </Button>
                  </Card>

                  <Card elevation={0} sx={muiFeaturedCardStyle}>
                    <div className="card-badge">Más Popular</div>
                    <h3>Avanzado</h3>
                    <div className="price-container">
                      <span className="price-val">{STRIPE_PRICES.avanzado[interval][currency].text}</span>
                      <span className="price-period">{interval === 'monthly' ? '/ mes' : '/ año'}</span>
                    </div>
                    <ul className="plan-features">
                      <li>✅ <strong>¡5 días de prueba Gratis!</strong></li>
                      <li>✅ 4x más consultas con chat experto</li>
                      <li>✅ Más análisis de documentos</li>
                      <li>✅ 3 archivos por análisis</li>
                      <li>✅ 100 Mb por archivo</li>
                      <li>✅ Evaluaciones legales</li>
                    </ul>
                    <Button 
                      onClick={() => handleSelectPlan('avanzado')}
                      sx={{ ...muiPrimaryBtnStyle, width: '100%', mt: 'auto' }}
                    >
                      Elegir Avanzado
                    </Button>
                  </Card>

                  <Card elevation={0} sx={muiCardBaseStyle}>
                    <h3>Premium</h3>
                    <div className="price-container">
                      <span className="price-val">{STRIPE_PRICES.premium[interval][currency].text}</span>
                      <span className="price-period">{interval === 'monthly' ? '/ mes' : '/ año'}</span>
                    </div>
                    <ul className="plan-features">
                      <li>✅ <strong>¡5 días de prueba Gratis!</strong></li>
                      <li>✅ 20x más consultas con chat experto</li>
                      <li>✅ Aún más análisis de documentos</li>
                      <li>✅ 5 archivos por análisis</li>
                      <li>✅ 100 Mb por archivo</li>
                      <li>✅ Más evaluaciones legales</li>
                    </ul>
                    <Button 
                      onClick={() => handleSelectPlan('premium')}
                      sx={{ ...muiPrimaryBtnStyle, width: '100%', mt: 'auto' }}
                    >
                      Elegir Premium
                    </Button>
                  </Card>
                </div>
              </>
            )}
          </div>
        </section>

        <section id="info-corporativa" className="bg-ai-mesh" style={{ marginTop: '60px', padding: '60px 20px', textAlign: 'center' }}>
            <div className="wrapper" style={{ maxWidth: '900px', margin: '0 auto' }}>
                <h3 style={{ color: 'var(--white)', fontSize: '2rem', marginBottom: '20px' }}>¿Necesitas PIDA para tu Organización o Institución?</h3>
                <p style={{ color: 'var(--white)', fontSize: '1.15rem', lineHeight: '1.7', marginBottom: '35px' }}>
                    PIDA está diseñado para escalar con las necesidades de grandes equipos de litigio que requieren de mucha investigación y redacción. Si representas a una firma legal, una organización de defensa de derechos humanos, una fiscalía o formas parte de cualquier órgano de gobierno o bien, perteneces a una institución académica, ofrecemos esquemas de licenciamiento por volumen. 
                    <br /><br />
                    Nuestros planes corporativos incluyen costos unitarios preferenciales, facturación institucional centralizada y soporte técnico prioritario.
                </p>
                <Button 
                  onClick={() => setIsContactOpen(true)}
                  sx={muiCorpBtnStyle}
                >
                  Contactar con Soporte Corporativo
                </Button>
            </div>
        </section>

        <section id="testimonios" className="bg-circuitos">
            <div className="wrapper" style={{background: 'var(--white)', padding: '40px 20px 40px 20px' }}>
                <div className="section-intro" style={{ marginBottom: '10px' }}>
                    <h2>Lo que dicen nuestros usuarios</h2>
                </div>
                <div className="carousel-container" style={{ overflow: 'hidden' }}>
                    <div className="carousel-track" id="carouselTrack" style={{ display: 'flex', transform: `translateX(-${currentSlide * 100}%)`, transition: 'transform 0.5s ease-in-out' }}>
                        
                        <div className="testimonial-slide" style={{ minWidth: '100%' }}>
                            <div className="testimonial-card">
                                <span className="quote-icon">“</span>
                                <p className="testimonial-text">PIDA me dio respuestas mucho más completas y técnicas de lo que yo andaba buscando, me da mucha confianza.</p>
                                <span className="testimonial-author">Carlos Urquilla</span>
                            </div>
                        </div>
                        
                        <div className="testimonial-slide" style={{ minWidth: '100%' }}>
                            <div className="testimonial-card">
                                <span className="quote-icon">“</span>
                                <p className="testimonial-text">Este sistema PIDA me ha gustado mucho por la calidad de información que proporciona. He realizado varias consultas y han satisfecho mis expectativas.</p>
                                <span className="testimonial-author">Alexandra Esquivel</span>
                            </div>
                        </div>
                        
                        <div className="testimonial-slide" style={{ minWidth: '100%' }}>
                            <div className="testimonial-card">
                                <span className="quote-icon">“</span>
                                <p className="testimonial-text">Creo que la limitante de creer en la IA es que uno no entiende cómo funciona. Cuando comprendes que la IA no sustituye la inteligencia humana sino que la complementa, entonces empezarás a trabajar en otro nivel, recuperando tiempo valiosísimo para otras cosas.</p>
                                <span className="testimonial-author">Fabiola Galaviz</span>
                            </div>
                        </div>

                    </div>
                    <div className="carousel-dots" id="carouselDots">
                        <button className={`dot-btn ${currentSlide === 0 ? 'active' : ''}`} onClick={() => setCurrentSlide(0)}></button>
                        <button className={`dot-btn ${currentSlide === 1 ? 'active' : ''}`} onClick={() => setCurrentSlide(1)}></button>
                        <button className={`dot-btn ${currentSlide === 2 ? 'active' : ''}`} onClick={() => setCurrentSlide(2)}></button>
                    </div>
                </div>
            </div>
        </section>

        <div style={{ background: 'var(--pida-primary)', padding: '12px 20px' }}>                  
            <div 
                className="wrapper-footer" 
                style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    gap: '40px', 
                    maxWidth: '1200px',
                    margin: '0 auto',
                    borderTop: 'none'
                }}
            >
                <span style={{ color: 'var(--white)' }}>&copy; 2026 IIRESODH PAYMENTS, LLC.</span>
                <a href="/terminos.html" target="_blank" rel="noreferrer" style={{ color: 'var(--white)', textDecoration: 'none' }}>Términos de uso</a>
                <a href="/privacidad.html" target="_blank" rel="noreferrer" style={{ color: 'var(--white)', textDecoration: 'none' }}>Política de privacidad</a>
                <a href="mailto:contacto@pida-ai.com" style={{ color: 'var(--white)', textDecoration: 'none' }}>contacto@pida-ai.com</a>
            </div>
        </div>
      </main>

      {isContactOpen && (
        <div className="modal-backdrop">
            <div className="modal-card">
                <button className="modal-close-btn" onClick={() => setIsContactOpen(false)}>×</button>
                <img src="/img/PIDA_logo-100-blue-red.webp" alt="PIDA Logo" style={{ width: '140px', marginBottom: '20px', margin: '0 auto' }} />
                <p className="modal-subtitle">Déjanos tus datos y un asesor se pondrá en contacto contigo para diseñar un plan a la medida de tu organización.</p>

                <form onSubmit={handleContactSubmit} style={{ textAlign: 'left' }}>
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                        <TextField 
                            label="Nombre completo" 
                            variant="outlined" 
                            size="small" 
                            fullWidth 
                            required 
                            value={contactForm.name} 
                            onChange={e => setContactForm({...contactForm, name: e.target.value})} 
                            sx={{ bgcolor: '#FAFAFA' }} 
                        />
                        <TextField 
                            label="Organización / Empresa" 
                            variant="outlined" 
                            size="small" 
                            fullWidth 
                            required 
                            value={contactForm.company} 
                            onChange={e => setContactForm({...contactForm, company: e.target.value})} 
                            sx={{ bgcolor: '#FAFAFA' }} 
                        />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                        <TextField 
                            type="email" 
                            label="Correo electrónico" 
                            variant="outlined" 
                            size="small" 
                            fullWidth 
                            required 
                            value={contactForm.email} 
                            onChange={e => setContactForm({...contactForm, email: e.target.value})} 
                            sx={{ bgcolor: '#FAFAFA' }} 
                        />
                        <TextField 
                            type="email" 
                            label="Confirmar correo" 
                            variant="outlined" 
                            size="small" 
                            fullWidth 
                            required 
                            value={contactForm.confirmEmail} 
                            onChange={e => setContactForm({...contactForm, confirmEmail: e.target.value})} 
                            sx={{ bgcolor: '#FAFAFA' }} 
                        />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                        <TextField 
                            label="Cód. (Ej: +503)" 
                            variant="outlined" 
                            size="small" 
                            required 
                            value={contactForm.countryCode} 
                            onChange={e => setContactForm({...contactForm, countryCode: e.target.value})} 
                            sx={{ bgcolor: '#FAFAFA', width: { xs: '100%', sm: '120px' } }} 
                        />
                        <TextField 
                            type="tel" 
                            label="Número de teléfono" 
                            variant="outlined" 
                            size="small" 
                            fullWidth 
                            required 
                            value={contactForm.phone} 
                            onChange={e => setContactForm({...contactForm, phone: e.target.value})} 
                            sx={{ bgcolor: '#FAFAFA' }} 
                        />
                    </Box>

                    <TextField
                        label="Cuéntanos un poco sobre las necesidades de tu equipo..."
                        multiline
                        minRows={3}
                        maxRows={5}
                        fullWidth
                        required
                        value={contactForm.message}
                        onChange={e => setContactForm({...contactForm, message: e.target.value})}
                        sx={{ mb: 2, bgcolor: '#FAFAFA' }}
                    />

                    {contactStatus.text && (
                        <div className={`status-msg ${contactStatus.type}`}>
                            {contactStatus.text}
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        fullWidth
                        disabled={contactStatus.isSubmitting}
                        sx={{ py: 1.5, fontSize: '1rem', fontWeight: 'bold', borderRadius: 2, bgcolor: 'var(--pida-primary)', '&:hover': { bgcolor: 'var(--pida-accent)' } }}
                    >
                        {contactStatus.isSubmitting ? 'Enviando información...' : 'Enviar Solicitud'}
                    </Button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}