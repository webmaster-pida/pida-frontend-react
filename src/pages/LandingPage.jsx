import React, { useState, useEffect } from 'react';
import { STRIPE_PRICES } from '../config/constants';
import { db } from '../config/firebase'; 

// Importaciones de Material-UI
import { 
  Box, 
  Typography, 
  Button, 
  Menu, 
  MenuItem, 
  IconButton,
  Switch,
  Dialog,
  DialogContent,
  TextField,
  Alert,
  Stack
} from '@mui/material';
import { 
  Facebook, 
  Instagram, 
  Email,
  Close as CloseIcon,
  Menu as MenuIcon
} from '@mui/icons-material';

export default function LandingPage({ onOpenAuth }) {
  const [interval, setInterval] = useState('monthly'); 
  const [currency, setCurrency] = useState('USD');     
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isUS, setIsUS] = useState(false);

  // ESTADOS PARA UI
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const openNewsletter = Boolean(anchorEl);

  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
      name: '', company: '', email: '', confirmEmail: '', countryCode: '+503', phone: '', message: ''
  });
  const [contactStatus, setContactStatus] = useState({ text: '', type: '', isSubmitting: false });

  // --- LÓGICA DE NEGOCIO (PRESERVADA AL 100%) ---
  useEffect(() => {
    const detectLocation = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        const data = await response.json();
        clearTimeout(timeoutId);
        if (data.country_code === 'US') setIsUS(true); 
        else if (data.country_code === 'MX') setCurrency('MXN'); 
      } catch (e) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (/America\/(New_York|Chicago|Los_Angeles|Denver|Phoenix|Detroit|Boise|Anchorage)/i.test(tz)) setIsUS(true);
        else if (/Mexico|Monterrey|Chihuahua|Tijuana|Cancun/i.test(tz)) setCurrency('MXN'); 
      }
    };
    detectLocation();
  }, []);

  useEffect(() => {
    if (window.location.hash) {
      const targetId = window.location.hash.substring(1);
      setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    document.body.style.overflow = isMenuOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMenuOpen]);

  // --- MANEJADORES ---
  const handleNewsletterClick = (event) => setAnchorEl(event.currentTarget);
  const handleNewsletterClose = () => setAnchorEl(null);

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
      try {
          await db.collection('leads_corporativos').add({
              name: contactForm.name, company: contactForm.company, email: contactForm.email,
              phone: `${contactForm.countryCode} ${contactForm.phone}`, message: contactForm.message,
              createdAt: new Date(), status: 'nuevo'
          });
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
      const element = document.getElementById(targetId);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <Box id="landing-page-root">
      {/* OVERLAY MÓVIL */}
      {isMenuOpen && (
        <Box onClick={() => setIsMenuOpen(false)} sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(29, 53, 87, 0.5)', backdropFilter: 'blur(3px)', zIndex: 998 }} />
      )}

      {/* NAVBAR (Clases originales preservadas) */}
      <Box component="header" className="nav" id="navbar" sx={{ transition: 'top 0.3s ease' }}>
        <div className="wrapper nav-inner">
          <a href="/" style={{ display: 'flex', alignItems: 'center', zIndex: 1001 }}>
            <img src="/img/PIDA_logo-576.png" alt="Logo PIDA" style={{ height: '65px' }} />
          </a>

          <IconButton 
            className="mobile-menu-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            sx={{ display: 'none', color: '#1D3557', zIndex: 1001 }}
          >
            {isMenuOpen ? <CloseIcon fontSize="large" /> : <MenuIcon fontSize="large" />}
          </IconButton>

          <div className={`nav-right-container ${isMenuOpen ? 'open' : ''}`}>
            <div className="social-links-row">
              <IconButton href="https://www.facebook.com/ia.pida" target="_blank" color="primary" sx={{ p: 0.5 }}><Facebook /></IconButton>
              <IconButton href="https://www.instagram.com/pida.ia" target="_blank" color="primary" sx={{ p: 0.5 }}><Instagram /></IconButton>
              <a href="https://www.tiktok.com/@pida.solucion" target="_blank" rel="noreferrer" className="nav-link" style={{ display: 'flex', alignItems: 'center' }}>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.976-4.686h-3.868v11.52a4.11 4.11 0 1 1-4.11-4.111c.287 0 .565.031.834.084v-3.9a7.978 7.978 0 1 0 7.142 7.927V9.752a8.683 8.683 0 0 0 3.978 1.054V6.686z"/></svg>
              </a>
            </div>

            <nav className="nav-menu">
              <a href="#diferencia" onClick={(e) => { e.preventDefault(); handleNavClick('diferencia'); }} className="nav-link hide-on-mobile">Diferencia PIDA</a>
              <a href="#ecosistema" onClick={(e) => { e.preventDefault(); handleNavClick('ecosistema'); }} className="nav-link hide-on-mobile">Ecosistema</a>
              <a href="#planes" onClick={(e) => { e.preventDefault(); handleNavClick('planes'); }} className="nav-link hide-on-mobile">Planes</a>

              <Box sx={{ display: 'inline-block' }}>
                <Button onClick={handleNewsletterClick} color="inherit" className="nav-link" sx={{ textTransform: 'none', p: 0, minWidth: 'auto', fontWeight: 500, fontFamily: 'inherit' }}>
                  Newsletter <span style={{ fontSize: '0.7em', marginLeft: '5px' }}>▼</span>
                </Button>
                <Menu anchorEl={anchorEl} open={openNewsletter} onClose={handleNewsletterClose} PaperProps={{ sx: { mt: 1, boxShadow: 3 } }}>
                  <MenuItem onClick={handleNewsletterClose} component="a" href="/newsletter-001.pdf" target="_blank">📄 Enero 2026</MenuItem>
                  <MenuItem onClick={handleNewsletterClose} component="a" href="/newsletter-002.pdf" target="_blank">📄 Febrero 2026</MenuItem>
                  <MenuItem onClick={handleNewsletterClose} component="a" href="/newsletter-003.pdf" target="_blank">📄 Marzo 2026</MenuItem>
                </Menu>
              </Box>

              <Button variant="outlined" onClick={() => onOpenAuth('login')} sx={{ ml: { sm: 2 }, borderRadius: '8px', textTransform: 'none', fontWeight: 700, borderColor: '#1D3557', color: '#1D3557' }}>
                Login
              </Button>
            </nav>
          </div>
        </div>
      </Box>

      <main style={{ marginTop: '80px' }}>
        {/* HERO SECTION */}
        <section className="hero">
          <div className="wrapper hero-grid">
            <div className="hero-content">
              <Typography variant="h1" sx={{ fontSize: 'inherit', lineHeight: 'inherit', margin: 'inherit' }}>
                Inteligencia Aumentada para la Defensa de los <br />
                <span className="text-gradient">Derechos Humanos</span>
              </Typography>
              <Typography className="hero-desc">
                Los asistentes de Inteligencia Artificial genéricos son un océano de información, pero sin un ancla, pueden llevarte a la deriva con datos imprecisos.
              </Typography>
              
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <Button variant="contained" onClick={() => handleNavClick('planes')} sx={{ bgcolor: '#1D3557', borderRadius: '8px', px: 4, py: 1.5, fontWeight: 700, textTransform: 'none' }}>
                  Ver Planes
                </Button>
                <Button variant="outlined" onClick={() => onOpenAuth('login')} sx={{ color: '#1D3557', borderColor: '#1D3557', borderRadius: '8px', px: 4, py: 1.5, fontWeight: 700, textTransform: 'none' }}>
                  Login PIDA
                </Button>
              </div>
            </div>
            
            <div className="hero-visual">
              <Box sx={{ width: '100%', maxWidth: '500px', bgcolor: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(29, 53, 87, 0.1)', border: '1px solid #E5E7EB' }}>
                <video controls poster="/img/PIDA-MASCOTA-576-trans.png" style={{ width: '100%', display: 'block' }}>
                  <source src="https://storage.googleapis.com/img-pida/PIDA.mp4" type="video/mp4" />
                </video>
              </Box>
            </div>
          </div>
        </section>

        {/* DIFERENCIA SECTION */}
        <section id="diferencia" style={{ backgroundColor: '#FFFFFF', padding: '40px 0' }}>
            <div className="wrapper">
                <div className="section-intro">
                    <Typography variant="h2">¿Cuál es la gran diferencia de PIDA?</Typography>
                    <Typography component="p">PIDA no improvisa buscando en el caos de internet. Su punto de partida es la biblioteca del <strong>IIRESODH</strong>, una institución referente con más de 30 años de experiencia en Litigio Estratégico Internacional.</Typography>
                    <Typography component="p">Primero, PIDA consulta este acervo validado por personas expertas en Derechos Humanos para obtener el fundamento correcto. Luego, usa la IA para construir tu respuesta. Así obtienes la velocidad de la tecnología, pero con la <strong>autoridad y el rigor técnico</strong> que solo el IIRESODH puede garantizar.</Typography>
                </div>
            </div>
        </section>

        {/* BONDADES SECTION */}
        <section id="bondades" style={{ background: '#FAFAFA', padding: '60px 0' }}>
            <div className="wrapper">
                <Typography variant="h2" align="center" sx={{ mb: 6 }}>Bondades únicas de PIDA</Typography>
                <div className="bento-grid">
                    <div className="bento-card">
                        <Typography variant="h3" className="bento-title">Respuestas Ancladas, no Adivinanzas</Typography>
                        <Typography component="p">Cada respuesta está fundamentada y prioriza el conocimiento del IIRESODH. Esto le da un nivel de fiabilidad y precisión que las IAs genéricas no pueden ofrecer, minimizando el riesgo de información incorrecta.</Typography>
                    </div>
                    <div className="bento-card">
                        <Typography variant="h3" className="bento-title">Lo Mejor de Dos Mundos</Typography>
                        <Typography component="p">Combina la sabiduría especializada del IIRESODH con la capacidad de razonamiento y redacción de un modelo de IA de vanguardia. Obtienes respuestas con calidad de experto, no solo texto genérico.</Typography>
                    </div>
                    <div className="bento-card">
                        <Typography variant="h3" className="bento-title">Eficiencia Acelerada</Typography>
                        <Typography component="p">El “Analizador de Documentos” sigue siendo tu experto incansable, capaz de procesar tus archivos y extraer información clave en minutos, liberándote para la estrategia y la acción.</Typography>
                    </div>
                </div>
            </div>
        </section>

        {/* ECOSISTEMA SECTION */}
        <section id="ecosistema" style={{ backgroundColor: '#FFFFFF', padding: '80px 0' }}>
            <div className="wrapper">
                <div className="section-intro">
                    <Typography variant="h2">El Ecosistema PIDA</Typography>
                    <Typography sx={{ fontSize: '1.2rem', color: '#4B5563' }}>
                        PIDA integra tres motores especializados que trabajan en conjunto para cubrir el ciclo completo de la defensa legal: investigación, análisis documental y diagnóstico de casos.
                    </Typography>
                </div>

                <Stack spacing={6} sx={{ maxWidth: '900px', mx: 'auto' }}>
                    <Box sx={{ borderLeft: '4px solid #0284C7', pl: 4 }}>
                        <Typography variant="h3" sx={{ fontSize: '1.5rem', mb: 1 }}>1. Experto en Derechos Humanos</Typography>
                        <Typography color="secondary" sx={{ fontWeight: 800, mb: 2, fontSize: '0.8rem', letterSpacing: 1 }}>TU CONSULTOR FUNDAMENTADO</Typography>
                        <Typography sx={{ mb: 2 }}>Este motor redefine la investigación jurídica. A diferencia de los chats genéricos que improvisan respuestas, PIDA actúa como un consultor senior conectado directamente a la biblioteca privada y curada del IIRESODH.</Typography>
                        <Typography variant="body2" color="text.secondary"><strong>Aplicación Práctica:</strong> Utilízalo para resolver dudas complejas sobre control de convencionalidad, buscar jurisprudencia específica de la Corte IDH o redactar argumentos sólidos para tus demandas.</Typography>
                    </Box>

                    <Box sx={{ borderLeft: '4px solid #B92F32', pl: 4 }}>
                        <Typography variant="h3" sx={{ fontSize: '1.5rem', mb: 1 }}>2. Analizador de Documentos</Typography>
                        <Typography color="error" sx={{ fontWeight: 800, mb: 2, fontSize: '0.8rem', letterSpacing: 1 }}>TU ESTRATEGA PROCESAL</Typography>
                        <Typography sx={{ mb: 2 }}>Capacidad de procesamiento masivo para el abogado moderno. Esta herramienta lee, comprende y procesa archivos voluminosos (PDF, Word) en segundos.</Typography>
                        <Typography variant="body2" color="text.secondary"><strong>Aplicación Práctica:</strong> Carga una sentencia extensa y pídele que encuentre contradicciones lógicas, extraiga los hechos probados o elabore una Teoría del Caso.</Typography>
                    </Box>

                    <Box sx={{ borderLeft: '4px solid #1D3557', pl: 4 }}>
                        <Typography variant="h3" sx={{ fontSize: '1.5rem', mb: 1 }}>3. Precalificador de Conductas</Typography>
                        <Typography sx={{ fontWeight: 800, mb: 2, fontSize: '0.8rem', letterSpacing: 1, color: '#1D3557' }}>TU DIAGNÓSTICO INMEDIATO</Typography>
                        <Typography sx={{ mb: 2 }}>Una herramienta de encuadre jurídico diseñada para la etapa inicial de cualquier caso. Funciona como un puente inteligente entre los hechos fácticos y la tipificación legal.</Typography>
                        <Typography variant="body2" color="text.secondary"><strong>Aplicación Práctica:</strong> Ideal para la primera entrevista. Narra los hechos y el sistema identificará posibles delitos penales y violaciones a DDHH.</Typography>
                    </Box>
                </Stack>
            </div>
        </section>

        {/* PLANES SECTION */}
        <section id="planes" style={{ padding: '80px 0', background: '#F9FAFB' }}>
          <div className="wrapper">
            <div className="section-intro">
              <Typography variant="h2">Planes Flexibles</Typography>
              <Typography sx={{ mb: 4 }}>Selecciona el plan que mejor se adapte a tu nivel de investigación.</Typography>
              <Typography color="primary" sx={{ fontWeight: 800, fontSize: '1.2rem', mb: 5 }}>Todos los planes incluyen 5 días de prueba sin costo</Typography>
            </div>

            {isUS ? (
              <Alert severity="error" sx={{ maxWidth: '650px', mx: 'auto', borderRadius: '12px' }}>
                <Typography variant="h6" fontWeight={800}>Servicio no disponible en su región</Typography>
                Por políticas regulatorias, PIDA no está disponible actualmente en los Estados Unidos.
              </Alert>
            ) : (
              <Box>
                <div className="billing-toggle-wrapper">
                  <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ mb: 4 }}>
                    <Typography sx={{ opacity: interval === 'monthly' ? 1 : 0.5, fontWeight: 700 }}>Mensual</Typography>
                    <Switch checked={interval === 'annual'} onChange={(e) => setInterval(e.target.checked ? 'annual' : 'monthly')} color="primary" />
                    <Typography sx={{ opacity: interval === 'annual' ? 1 : 0.5, fontWeight: 700 }}>Anual</Typography>
                    {interval === 'annual' && <Chip label="Ahorra 20%" color="success" size="small" sx={{ fontWeight: 800 }} />}
                  </Stack>
                </div>

                <div className="pricing-grid">
                  {['basico', 'avanzado', 'premium'].map((pKey) => {
                    const plan = STRIPE_PRICES[pKey][interval][currency];
                    const isFav = pKey === 'avanzado';
                    return (
                      <div key={pKey} className={`pricing-card ${isFav ? 'featured' : ''}`}>
                        {isFav && <div className="card-badge">Más Popular</div>}
                        <Typography variant="h3" sx={{ textTransform: 'capitalize' }}>{pKey === 'basico' ? 'Básico' : pKey}</Typography>
                        <div className="price-container">
                          <span className="price-val">{plan.text}</span>
                          <span className="price-period">{interval === 'monthly' ? '/ mes' : '/ año'}</span>
                        </div>
                        <ul className="plan-features">
                          <li>✅ Newsletter mensual</li>
                          <li>✅ {pKey === 'basico' ? '5' : pKey === 'avanzado' ? '20' : '100'} consultas diarias</li>
                          <li>✅ {pKey === 'basico' ? '3' : pKey === 'avanzado' ? '15' : '25'} análisis de docs</li>
                          <li>✅ {pKey === 'basico' ? '15' : '40'} Mb por archivo</li>
                          <li>{pKey === 'basico' ? '❌ Sin precalificador' : '✅ Precalificador incluido'}</li>
                        </ul>
                        <Button 
                          variant={isFav ? "contained" : "outlined"} 
                          fullWidth 
                          onClick={() => handleSelectPlan(pKey)}
                          sx={{ mt: 'auto', py: 1.5, borderRadius: '8px', fontWeight: 700, bgcolor: isFav ? '#1D3557' : 'transparent', color: isFav ? 'white' : '#1D3557' }}
                        >
                          Elegir {pKey}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </Box>
            )}
          </div>
        </section>

        {/* CORPORATIVO SECTION */}
        <section id="info-corporativa" className="wrapper" style={{ margin: '60px auto', padding: '60px 20px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
            <Typography variant="h3" sx={{ mb: 3 }}>¿PIDA para tu Organización o Institución?</Typography>
            <Typography sx={{ mb: 5, maxWidth: '800px', mx: 'auto', color: '#6B7280' }}>
                Ofrecemos esquemas de licenciamiento por volumen para firmas legales, ONGs y entidades gubernamentales. Incluye facturación centralizada y soporte prioritario.
            </Typography>
            <Button variant="contained" onClick={() => setIsContactOpen(true)} sx={{ bgcolor: '#1D3557', borderRadius: '30px', px: 6, py: 2, fontWeight: 700 }}>
                Contactar Soporte Corporativo
            </Button>
        </section>

        {/* TESTIMONIOS */}
        <section id="testimonios">
            <div className="wrapper">
                <Typography variant="h2" align="center" sx={{ mb: 4 }}>Lo que dicen nuestros usuarios</Typography>
                <div className="carousel-container">
                    <div className="carousel-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                        <div className="testimonial-slide"><div className="testimonial-card"><span className="quote-icon">“</span><p className="testimonial-text">PIDA me dio respuestas mucho más completas y técnicas de lo que yo andaba buscando.</p><span className="testimonial-author">Carlos Urquilla</span></div></div>
                        <div className="testimonial-slide"><div className="testimonial-card"><span className="quote-icon">“</span><p className="testimonial-text">Este sistema PIDA me ha gustado mucho por la calidad de información que proporciona.</p><span className="testimonial-author">Alexandra Esquivel</span></div></div>
                        <div className="testimonial-slide"><div className="testimonial-card"><span className="quote-icon">“</span><p className="testimonial-text">Cuando comprendes que la IA complementa la inteligencia humana, trabajarás en otro nivel.</p><span className="testimonial-author">Fabiola Galaviz</span></div></div>
                    </div>
                </div>
            </div>
        </section>

        <footer className="footer">
            <div className="wrapper">
                <div className="copyright">
                    <span>&copy; 2025 IIRESODH PAYMENTS, LLC.</span>
                    <Stack direction="row" spacing={3}>
                        <a href="/terminos.html" target="_blank" className="nav-link">Términos</a>
                        <a href="/privacidad.html" target="_blank" className="nav-link">Privacidad</a>
                        <a href="mailto:contacto@pida-ai.com" className="nav-link">Soporte</a>
                    </Stack>
                </div>
            </div>
        </footer>
      </main>

      {/* MODAL DE CONTACTO (Refactorizado con Dialog) */}
      <Dialog open={isContactOpen} onClose={() => setIsContactOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px', p: 2 } }}>
        <Box sx={{ textAlign: 'center', p: 2 }}>
            <img src="/img/PIDA_logo-576.png" style={{ width: '120px', marginBottom: '20px' }} />
            <Typography variant="h5" fontWeight={800} gutterBottom>Contacto Corporativo</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Diseñaremos un plan a la medida de tu equipo legal o académico.</Typography>
            
            <form onSubmit={handleContactSubmit}>
                <Stack spacing={2}>
                    <Stack direction={{ sm: 'row' }} spacing={2}>
                        <TextField fullWidth label="Nombre" size="small" required value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} />
                        <TextField fullWidth label="Empresa" size="small" required value={contactForm.company} onChange={e => setContactForm({...contactForm, company: e.target.value})} />
                    </Stack>
                    <TextField fullWidth label="Email" type="email" size="small" required value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} />
                    <Stack direction="row" spacing={2}>
                        <TextField sx={{ width: '100px' }} label="Cód." size="small" value={contactForm.countryCode} onChange={e => setContactForm({...contactForm, countryCode: e.target.value})} />
                        <TextField fullWidth label="Teléfono" size="small" value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} />
                    </Stack>
                    <TextField fullWidth multiline rows={3} label="Mensaje" required value={contactForm.message} onChange={e => setContactForm({...contactForm, message: e.target.value})} />
                    {contactStatus.text && <Alert severity={contactStatus.type}>{contactStatus.text}</Alert>}
                    <Button type="submit" variant="contained" fullWidth disabled={contactStatus.isSubmitting} sx={{ bgcolor: '#1D3557', py: 1.5, borderRadius: '8px', fontWeight: 700 }}>
                        {contactStatus.isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
                    </Button>
                </Stack>
            </form>
        </Box>
      </Dialog>
    </Box>
  );
}