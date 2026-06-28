import React, { useState, useEffect, useRef } from 'react';
import { STRIPE_PRICES } from '../config/constants';
import { db } from '../config/firebase'; 

// Importaciones de Material-UI
import { Box, TextField, Button, Menu, MenuItem, SvgIcon, Card, CardMedia, IconButton, Fade } from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';

export default function LandingPage({ onOpenAuth }) {
  const [interval, setInterval] = useState('monthly'); 
  const [currency, setCurrency] = useState('USD');     
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isUS, setIsUS] = useState(false);

  // ESTADO: Controla si el menú móvil está abierto
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ESTADOS Y REF PARA EL VIDEO
  const videoRef = useRef(null);
  const [hasStarted, setHasStarted] = useState(false); 

  const handlePlayVideo = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setHasStarted(true); 
    }
  };

  // ESTADOS MUI: Controlan el menú desplegable del Newsletter
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

  // --- FUNCIÓN OPTIMIZADA PARA EVITAR FORCED REFLOW ---
  const scrollToSection = (targetId) => {
    // Usamos requestAnimationFrame para sincronizarnos con el motor de dibujado del navegador
    window.requestAnimationFrame(() => {
      const element = document.getElementById(targetId);
      if (element) {
        // En lugar de forzar al navegador a medir el navbar (offsetHeight), 
        // usamos un valor fijo estimado (100px) que es lo que mide tu header.
        const headerOffset = 100; 
        
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  };

  useEffect(() => {
    if (window.location.hash) {
      const targetId = window.location.hash.substring(1);
      setTimeout(() => {
        scrollToSection(targetId);
      }, 300);
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

  const handleNewsletterClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleNewsletterClose = () => {
    setAnchorEl(null);
  };

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
    setTimeout(() => {
      scrollToSection(targetId);
    }, 100);
  };

  const muiPrimaryBtnStyle = {
    backgroundColor: 'var(--navy)', // Azul más vivo y corporativo
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
      backgroundColor: 'var(--pida-accent)', // Nuevo color al pasar el cursor
      color: '#ffffff',
      boxShadow: '0px 4px 12px rgba(56, 189, 248, 0.35)', // Resplandor acorde al nuevo color
    }
  };

  const muiCorpBtnStyle = {
    backgroundColor: 'var(--white)', // Azul más vivo y corporativo
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
      backgroundColor: 'var(--white)', // Nuevo color al pasar el cursor
      color: 'var(--pida-primary)',
      boxShadow: '0px 4px 12px rgba(56, 189, 248, 0.35)', // Resplandor acorde al nuevo color
    }
  };

  const muiCardBaseStyle = {
    padding: '35px',
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
    overflow: 'visible', // Fundamental para que el badge "Más Popular" no se corte
    backgroundColor: '#ffffff',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      transform: 'translateY(-8px)',
      boxShadow: '0 22px 45px rgba(29, 53, 87, 0.12)', // Sombra elegante al levantar
    }
  };

  const muiFeaturedCardStyle = {
    ...muiCardBaseStyle,
    border: '2.5px solid var(--pida-primary)',
    boxShadow: '0 15px 30px rgba(29, 53, 87, 0.08)',
    position: 'relative',
    transform: { xs: 'none', md: 'scale(1.04)' }, // Ligeramente más grande en PC
    '&:hover': {
      transform: { xs: 'translateY(-8px)', md: 'scale(1.04) translateY(-8px)' },
      boxShadow: '0 25px 50px rgba(29, 53, 87, 0.18)', // Sombra más pronunciada
    }
  };

  const muiGhostBtnStyle = {
    backgroundColor: 'white',
    color: 'var(--navy)', // Texto en azul vibrante
    border: '2px solid var(--navy)', // Borde en azul vibrante
    textTransform: 'none',
    fontWeight: 800,
    fontSize: '0.95rem',
    borderRadius: '8px',
    padding: '5px 21px', 
    fontFamily: 'var(--font-body)',
    transition: 'all 250ms ease',
    '&:hover': {
      backgroundColor: 'var(--navy)', // Se rellena del color vibrante al pasar el mouse
      color: 'white', // El texto pasa a blanco para contrastar
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

              {/* Botón LOGIN */}
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
                Login
              </Button>
            </nav>
          </div>
        </div>

        {/* ESTILOS EN LÍNEA CORREGIDOS SOLO PARA EL MENÚ MÓVIL */}
        <style>
          {`
            @media (max-width: 1024px) {
              .header-logo {
                height: 60px !important;
              }
              .mobile-menu-toggle {
                display: block !important;
              }
              .hide-on-mobile { display: block !important; }
              
              .nav-right-container {
                position: fixed;
                top: 0;
                right: -100%;
                width: 260px;
                height: 100vh;
                background-color: #ffffff;
                box-shadow: -5px 0 25px rgba(0,0,0,0.15);
                display: flex !important;
                flex-direction: column;
                align-items: flex-start !important;
                padding: 90px 25px 20px 25px;
                transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 999;
                gap: 25px !important;
              }
              .nav-right-container.open {
                right: 0;
              }
              .nav-right-container .nav-menu {
                flex-direction: column;
                align-items: flex-start !important;
                width: 100%;
                gap: 20px;
              }
              .nav-right-container .nav-link {
                font-size: 1.1rem !important;
                font-weight: 600 !important;
                color: var(--pida-primary) !important; /* <--- De vuelta al original */
                width: 100%;
                padding: 5px 0;
                border-bottom: 1px solid #f1f5f9;
                justify-content: flex-start;
              }
              .social-links-row {
                width: 100%;
                justify-content: flex-start;
                padding-bottom: 15px;
                border-bottom: 2px solid #e2e8f0;
              }
              @media (max-width: 1024px) {
              #pida {
                padding: 10px 0 !important; /* Ajusta el 10px al tamaño que prefieras */
              }
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
            
            <div className="hero-visual-column" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Card 
                elevation={0}
                sx={{
                  width: '100%',
                  maxWidth: '500px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 20px 40px rgba(29, 53, 87, 0.1)',
                  border: '1px solid var(--pida-border)',
                  position: 'relative', 
                  backgroundColor: '#FFFFFF'
                }}
              >
                {/* Capa superpuesta: Desaparece permanentemente al darle Play */}
                <Fade in={!hasStarted}>
                  <Box
                    onClick={handlePlayVideo}
                    sx={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'flex-end', 
                      p: 2.5,
                      backgroundColor: 'transparent', 
                      zIndex: 2,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': { 
                        '& .play-button': { 
                          transform: 'scale(1.15)',
                          backgroundColor: '#FFFFFF'
                        } 
                      }
                    }}
                  >
                    <IconButton 
                      className="play-button"
                      sx={{ 
                        color: 'var(--pida-primary)', 
                        backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <PlayCircleIcon sx={{ fontSize: '3rem' }} />
                    </IconButton>
                  </Box>
                </Fade>

                <CardMedia
                  component="video"
                  ref={videoRef}
                  controls={hasStarted} 
                  preload="metadata"
                  poster="/img/video-portada.webp" 
                  src="https://storage.googleapis.com/img-pida/PIDA.mp4"
                  sx={{
                    display: 'block',
                    aspectRatio: '16/9',
                    objectFit: 'contain',
                    backgroundColor: '#FFFFFF',
                    width: '100%'
                  }}
                />
              </Card>
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
                        <p style={{color: '#555555' }}>Cada respuesta está fundamentada y prioriza el conocimiento del IIRESODH. Esto le da un nivel de fiabilidad y precisión que las IAs genéricas no pueden ofrecer, minimizando el riesgo de información incorrecta.</p>
                    </div>
                    <div className="bento-card" style={{ backgroundColor: '#ffffff' }}>
                        <h3 className="bento-title">Lo Mejor de Dos Mundos</h3>
                        <p style={{color: '#555555' }}>Combina la sabiduría especializada del IIRESODH con la capacidad de razonamiento y redacción de un modelo de IA de vanguardia. Obtienes respuestas con calidad de experto, no solo texto genérico.</p>
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
                        PIDA integra tres motores especializados que trabajan en conjunto para cubrir el ciclo completo de la defensa legal: investigación, análisis documental y diagnóstico de casos.
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
                            3. Precalificador de Conductas
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
                      <li>✅ Newsletter mensual</li>
                      <li>✅ 5 consultas diarias</li>
                      <li>✅ 3 análisis de documentos</li>
                      <li>✅ 1 archivo por análisis</li>
                      <li>✅ 30 Mb por archivo</li>
                      <li>❌ Sin precalificador</li>
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
                      <li>✅ Newsletter mensual</li>
                      <li>✅ 20 consultas diarias</li>
                      <li>✅ 15 análisis de documentos</li>
                      <li>✅ 3 archivos por análisis</li>
                      <li>✅ 100 Mb por archivo</li>
                      <li>✅ 20 precalificaciones diarias</li>
                      <li>✅ Descuentos en productos IIRESODH</li>
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
                      <li>✅ Newsletter mensual</li>
                      <li>✅ 100 consultas diarias</li>
                      <li>✅ 25 análisis de documentos</li>
                      <li>✅ 5 archivos por análisis</li>
                      <li>✅ 100 Mb por archivo</li>
                      <li>✅ 100 precalificaciones diarias</li>
                      <li>✅ Descuentos en productos IIRESODH</li>
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
                {/* BOTÓN CORPORATIVO - Actualizado a MUI */}
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
                    borderTop: 'none' /* <-- ¡Esto anula la línea blanca del CSS! */
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