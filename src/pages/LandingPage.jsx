import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Menu, 
  MenuItem, 
  TextField, 
  Grid, 
  Card, 
  CardContent, 
  Divider, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemText,
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Switch, 
  FormControlLabel,
  Stack,
  useTheme, 
  useMediaQuery,
  Alert,
  Chip
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Close as CloseIcon, 
  Facebook, 
  Instagram, 
  Email,
  ArrowForward,
  PlayArrow,
  CheckCircle,
  Business,
  Phone
} from '@mui/icons-material';

import { STRIPE_PRICES } from '../config/constants';
import { db } from '../config/firebase'; 

/**
 * LANDING PAGE - VERSIÓN PRODUCCIÓN MUI
 * Preserva íntegramente la lógica de suscripción, detección de moneda
 * y contenido institucional de PIDA.
 */
export default function LandingPage({ onOpenAuth }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // --- ESTADOS ORIGINALES ---
  const [interval, setInterval] = useState('monthly'); 
  const [currency, setCurrency] = useState('USD');     
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isUS, setIsUS] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const openNewsletter = Boolean(anchorEl);

  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
      name: '', company: '', email: '', confirmEmail: '', countryCode: '+503', phone: '', message: ''
  });
  const [contactStatus, setContactStatus] = useState({ text: '', type: '', isSubmitting: false });

  // --- LÓGICA DE NEGOCIO: DETECCIÓN DE UBICACIÓN Y MONEDA ---
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

  // --- LÓGICA DE NAVEGACIÓN POR HASH ---
  useEffect(() => {
    if (window.location.hash) {
      const targetId = window.location.hash.substring(1);
      setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, []);

  // --- TIMER DEL CARRUSEL DE TESTIMONIOS ---
  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3); 
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

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
    const element = document.getElementById(targetId);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // --- ESTILOS DE BOTONES MUI ---
  const muiPrimaryBtnStyle = {
    bgcolor: '#1D3557', color: 'white', textTransform: 'none', fontWeight: 700,
    borderRadius: '8px', px: 3, py: 1.2, boxShadow: '0 2px 10px rgba(29, 53, 87, 0.2)',
    '&:hover': { bgcolor: '#0056B3', transform: 'translateY(-2px)', boxShadow: '0 5px 20px rgba(0, 195, 255, 0.3)' },
    transition: 'all 0.3s ease'
  };

  const muiGhostBtnStyle = {
    bgcolor: 'transparent', color: '#1D3557', border: '2px solid #1D3557',
    textTransform: 'none', fontWeight: 700, borderRadius: '8px', px: 3, py: 1,
    '&:hover': { bgcolor: 'rgba(29, 53, 87, 0.05)', borderColor: '#1D3557' }
  };

  return (
    <Box sx={{ bgcolor: 'white', minHeight: '100vh' }}>
      
      {/* NAVBAR */}
      <Box component="header" sx={{ 
        position: 'fixed', top: 0, width: '100%', zIndex: 1100, py: 1,
        bgcolor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.05)'
      }}>
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box component="a" href="/" sx={{ display: 'flex', alignItems: 'center' }}>
              <Box component="img" src="/img/PIDA_logo-576.png" alt="Logo PIDA" sx={{ height: { xs: 50, md: 65 } }} />
            </Box>

            {/* Desktop Menu */}
            {!isMobile && (
              <Stack direction="row" spacing={3} alignItems="center">
                <Button color="inherit" onClick={() => handleNavClick('diferencia')} sx={{ fontWeight: 600 }}>Diferencia PIDA</Button>
                <Button color="inherit" onClick={() => handleNavClick('ecosistema')} sx={{ fontWeight: 600 }}>Ecosistema</Button>
                <Button color="inherit" onClick={() => handleNavClick('planes')} sx={{ fontWeight: 600 }}>Planes</Button>
                
                <Box>
                  <Button onClick={handleNewsletterClick} color="inherit" sx={{ fontWeight: 600 }}>
                    Newsletter ▼
                  </Button>
                  <Menu anchorEl={anchorEl} open={openNewsletter} onClose={handleNewsletterClose} PaperProps={{ sx: { borderRadius: 2, mt: 1, boxShadow: 4 } }}>
                    <MenuItem component="a" href="/newsletter-001.pdf" target="_blank" sx={{ py: 1.5 }}>📄 Enero 2026</MenuItem>
                    <MenuItem component="a" href="/newsletter-002.pdf" target="_blank" sx={{ py: 1.5 }}>📄 Febrero 2026</MenuItem>
                    <MenuItem component="a" href="/newsletter-003.pdf" target="_blank" sx={{ py: 1.5 }}>📄 Marzo 2026</MenuItem>
                  </Menu>
                </Box>

                <Stack direction="row" spacing={1} sx={{ ml: 2 }}>
                  <IconButton href="https://www.facebook.com/ia.pida" target="_blank" color="primary"><Facebook /></IconButton>
                  <IconButton href="https://www.instagram.com/pida.ia" target="_blank" color="primary"><Instagram /></IconButton>
                </Stack>

                <Button variant="outlined" sx={muiGhostBtnStyle} onClick={() => onOpenAuth('login')}>Login</Button>
              </Stack>
            )}

            {isMobile && (
              <IconButton onClick={() => setIsMenuOpen(true)} color="primary"><MenuIcon fontSize="large" /></IconButton>
            )}
          </Stack>
        </Container>
      </Box>

      {/* MOBILE DRAWER */}
      <Drawer anchor="right" open={isMenuOpen} onClose={() => setIsMenuOpen(false)}>
        <Box sx={{ width: 280, p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
            <img src="/img/PIDA_logo-576.png" style={{ height: 40 }} />
            <IconButton onClick={() => setIsMenuOpen(false)}><CloseIcon /></IconButton>
          </Stack>
          <List>
            {['Diferencia', 'Ecosistema', 'Planes'].map((text) => (
              <ListItem button key={text} onClick={() => handleNavClick(text.toLowerCase())} sx={{ borderRadius: 2, mb: 1 }}>
                <ListItemText primary={text} primaryTypographyProps={{ fontWeight: 700, color: '#1D3557' }} />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
          <Button variant="contained" fullWidth sx={muiPrimaryBtnStyle} onClick={() => onOpenAuth('login')}>Login</Button>
        </Box>
      </Drawer>

      <main>
        {/* HERO SECTION */}
        <Box component="section" sx={{ pt: { xs: 12, md: 18 }, pb: 8 }}>
          <Container maxWidth="lg">
            <Grid container spacing={6} alignItems="center">
              <Grid item xs={12} md={7}>
                <Typography variant="h2" component="h1" sx={{ 
                  fontWeight: 800, lineHeight: 1.15, mb: 3, fontSize: { xs: '2.5rem', md: '3.5rem' }
                }}>
                  Inteligencia Aumentada para la Defensa de los <br />
                  <Box component="span" sx={{ 
                    background: 'linear-gradient(135deg, #1D3557 0%, #B92F32 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                  }}>Derechos Humanos</Box>
                </Typography>
                <Typography variant="h6" sx={{ color: '#4B5563', mb: 5, fontWeight: 400, lineHeight: 1.6 }}>
                  Los asistentes de Inteligencia Artificial genéricos son un océano de información, pero sin un ancla, pueden llevarte a la deriva con datos imprecisos.
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ gap: 2 }}>
                  <Button sx={muiPrimaryBtnStyle} onClick={() => handleNavClick('planes')}>Ver Planes</Button>
                  <Button sx={muiGhostBtnStyle} onClick={() => onOpenAuth('login')}>Login PIDA</Button>
                </Stack>
              </Grid>
              <Grid item xs={12} md={5}>
                <Box sx={{ 
                  borderRadius: 6, overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.12)',
                  border: '1px solid #E5E7EB', bgcolor: 'white'
                }}>
                  <video controls poster="/img/PIDA-MASCOTA-576-trans.png" style={{ width: '100%', display: 'block', aspectRatio: '16/9', objectFit: 'cover' }}>
                    <source src="https://storage.googleapis.com/img-pida/PIDA.mp4" type="video/mp4" />
                  </video>
                </Box>
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* DIFERENCIA SECTION */}
        <Box component="section" id="diferencia" sx={{ py: 10, bgcolor: 'white' }}>
          <Container maxWidth="md">
            <Box textAlign="center" sx={{ mb: 4 }}>
              <Typography variant="h3" fontWeight={800} gutterBottom>¿Cuál es la gran diferencia de PIDA?</Typography>
            </Box>
            <Typography variant="body1" sx={{ fontSize: '1.2rem', mb: 4, color: '#374151', textAlign: 'center', lineHeight: 1.8 }}>
              PIDA no improvisa buscando en el caos de internet. Su punto de partida es la biblioteca del <strong>IIRESODH</strong>, una institución referente con más de 30 años de experiencia en Litigio Estratégico Internacional.
            </Typography>
            <Typography variant="body1" sx={{ fontSize: '1.2rem', color: '#374151', textAlign: 'center', lineHeight: 1.8 }}>
              Primero, PIDA consulta este acervo validado por personas expertas en Derechos Humanos para obtener el fundamento correcto. Luego, usa la IA para construir tu respuesta. Así obtienes la velocidad de la tecnología, pero con la <strong>autoridad y el rigor técnico</strong> que solo el IIRESODH puede garantizar.
            </Typography>
          </Container>
        </Box>

        {/* BONDADES SECTION */}
        <Box component="section" sx={{ py: 10, bgcolor: '#F9FAFB' }}>
          <Container maxWidth="lg">
            <Typography variant="h4" align="center" fontWeight={800} sx={{ mb: 8 }}>Bondades únicas de PIDA</Typography>
            <Grid container spacing={4}>
              {[
                { title: "Respuestas Ancladas, no Adivinanzas", desc: "Cada respuesta está fundamentada y prioriza el conocimiento del IIRESODH. Esto le da un nivel de fiabilidad y precisión que las IAs genéricas no pueden ofrecer, minimizando el riesgo de información incorrecta." },
                { title: "Lo Mejor de Dos Mundos", desc: "Combina la sabiduría especializada del IIRESODH con la capacidad de razonamiento y redacción de un modelo de IA de vanguardia. Obtienes respuestas con calidad de experto, no solo texto genérico." },
                { title: "Eficiencia Acelerada", desc: "El “Analizador de Documentos” sigue siendo tu experto incansable, capaz de procesar tus archivos y extraer información clave en minutos, liberándote para la estrategia y la acción." }
              ].map((item, i) => (
                <Grid item xs={12} md={4} key={i}>
                  <Card elevation={2} sx={{ height: '100%', borderRadius: 4, transition: '0.3s', '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 } }}>
                    <CardContent sx={{ p: 4 }}>
                      <CheckCircle sx={{ color: '#0284C7', mb: 2, fontSize: 40 }} />
                      <Typography variant="h5" fontWeight={800} gutterBottom color="#1D3557">{item.title}</Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>{item.desc}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* ECOSISTEMA SECTION */}
        <Box component="section" id="ecosistema" sx={{ py: 12 }}>
          <Container maxWidth="lg">
            <Box textAlign="center" sx={{ mb: 10 }}>
              <Typography variant="h3" fontWeight={800} gutterBottom>El Ecosistema PIDA</Typography>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 850, mx: 'auto', fontWeight: 400 }}>
                PIDA integra tres motores especializados que trabajan en conjunto para cubrir el ciclo completo de la defensa legal: investigación, análisis documental y diagnóstico de casos.
              </Typography>
            </Box>

            <Stack spacing={8} sx={{ maxWidth: 950, mx: 'auto' }}>
              <Box sx={{ borderLeft: '6px solid #0284C7', pl: { xs: 3, md: 6 }, position: 'relative' }}>
                <Typography variant="h4" fontWeight={800} color="#1D3557">1. Experto en Derechos Humanos</Typography>
                <Typography variant="subtitle1" sx={{ color: '#0284C7', fontWeight: 800, mt: 1, mb: 3, letterSpacing: 1.5 }}>TU CONSULTOR FUNDAMENTADO</Typography>
                <Typography variant="body1" sx={{ fontSize: '1.15rem', mb: 3, lineHeight: 1.8 }}>
                  Este motor redefine la investigación jurídica. A diferencia de los chats genéricos que improvisan respuestas, PIDA actúa como un consultor senior conectado directamente a la <strong>biblioteca privada y curada del IIRESODH</strong>.
                </Typography>
                <Alert icon={false} sx={{ bgcolor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 3 }}>
                  <Typography variant="body1" color="#1D3557">
                    <strong>Aplicación Práctica:</strong> Utilízalo para resolver dudas complejas sobre control de convencionalidad, buscar jurisprudencia específica de la Corte IDH o redactar argumentos sólidos para tus demandas. Cada respuesta está respaldada por una base de conocimiento autorizada, garantizando rigor técnico y reduciendo el riesgo de imprecisiones.
                  </Typography>
                </Alert>
              </Box>

              <Box sx={{ borderLeft: '6px solid #B92F32', pl: { xs: 3, md: 6 } }}>
                <Typography variant="h4" fontWeight={800} color="#1D3557">2. Analizador de Documentos</Typography>
                <Typography variant="subtitle1" sx={{ color: '#B92F32', fontWeight: 800, mt: 1, mb: 3, letterSpacing: 1.5 }}>TU ESTRATEGA PROCESAL</Typography>
                <Typography variant="body1" sx={{ fontSize: '1.15rem', mb: 3, lineHeight: 1.8 }}>
                  Capacidad de procesamiento masivo para el abogado moderno. Esta herramienta lee, comprende y procesa archivos voluminosos (PDF, Word) en segundos, actuando como un asistente analítico incansable.
                </Typography>
                <Alert icon={false} sx={{ bgcolor: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 3 }}>
                  <Typography variant="body1" color="#1D3557">
                    <strong>Aplicación Práctica:</strong> Carga una sentencia extensa y pídele que encuentre contradicciones lógicas, extraiga los hechos probados para armar tu apelación o elabore una <strong>Teoría del Caso</strong> basada en las pruebas del expediente. Además, puedes instruirle para que redacte borradores de escritos legales utilizando estrictamente la información del documento subido.
                  </Typography>
                </Alert>
              </Box>

              <Box sx={{ borderLeft: '6px solid #1D3557', pl: { xs: 3, md: 6 } }}>
                <Typography variant="h4" fontWeight={800} color="#1D3557">3. Precalificador de Conductas</Typography>
                <Typography variant="subtitle1" sx={{ color: '#1D3557', fontWeight: 800, mt: 1, mb: 3, letterSpacing: 1.5 }}>TU DIAGNÓSTICO INMEDIATO</Typography>
                <Typography variant="body1" sx={{ fontSize: '1.15rem', mb: 3, lineHeight: 1.8 }}>
                  Una herramienta de encuadre jurídico diseñada para la etapa inicial de cualquier caso. Funciona como un puente inteligente entre los hechos fácticos y la tipificación legal.
                </Typography>
                <Alert icon={false} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 3 }}>
                  <Typography variant="body1" color="#1D3557">
                    <strong>Aplicación Práctica:</strong> Ideal para la primera entrevista con el cliente. Simplemente narra los hechos del caso y el sistema realizará un análisis preliminar instantáneo para identificar posibles <strong>delitos penales</strong> y <strong>violaciones a Derechos Humanos</strong> conforme a estándares internacionales. Esto te permite trazar una ruta de defensa clara desde el primer minuto.
                  </Typography>
                </Alert>
              </Box>
            </Stack>
          </Container>
        </Box>

        {/* PLANES SECTION */}
        <Box component="section" id="planes" sx={{ py: 12, bgcolor: '#F9FAFB' }}>
          <Container maxWidth="lg">
            <Box textAlign="center" sx={{ mb: 8 }}>
              <Typography variant="h3" fontWeight={800} gutterBottom>Planes Flexibles</Typography>
              <Typography variant="h6" sx={{ color: '#6B7280', mb: 2, fontWeight: 500 }}>Selecciona el plan que mejor se adapte a tu nivel de investigación.</Typography>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 800 }}>Todos los planes incluyen 5 días de prueba sin costo</Typography>
            </Box>

            {isUS ? (
              <Alert severity="error" variant="outlined" sx={{ maxWidth: 700, mx: 'auto', borderRadius: 4, bgcolor: '#FEF2F2', p: 4 }}>
                <Typography variant="h5" fontWeight={800} gutterBottom>Servicio no disponible en su región</Typography>
                Por políticas regulatorias y de privacidad corporativa, la comercialización de suscripciones de PIDA no se encuentra disponible actualmente para usuarios o entidades ubicadas dentro del territorio de los Estados Unidos.
              </Alert>
            ) : (
              <>
                <Stack direction="row" spacing={3} justifyContent="center" alignItems="center" sx={{ mb: 8 }}>
                  <Typography fontWeight={interval === 'monthly' ? 800 : 400}>Pago Mensual</Typography>
                  <Switch color="primary" checked={interval === 'annual'} onChange={(e) => setInterval(e.target.checked ? 'annual' : 'monthly')} />
                  <Typography fontWeight={interval === 'annual' ? 800 : 400}>Pago Anual</Typography>
                  {interval === 'annual' && <Chip label="¡Dos meses gratis!" color="success" sx={{ fontWeight: 800 }} />}
                </Stack>

                <Grid container spacing={4} alignItems="stretch">
                  {['basico', 'avanzado', 'premium'].map((pKey) => {
                    const isAdv = pKey === 'avanzado';
                    const plan = STRIPE_PRICES[pKey][interval][currency];
                    return (
                      <Grid item xs={12} md={4} key={pKey}>
                        <Card sx={{ 
                          height: '100%', borderRadius: 6, display: 'flex', flexDirection: 'column',
                          border: isAdv ? '3px solid #1D3557' : '1px solid #E5E7EB',
                          transform: isAdv ? { md: 'scale(1.05)' } : 'none',
                          boxShadow: isAdv ? 10 : 2, zIndex: isAdv ? 2 : 1
                        }}>
                          {isAdv && <Box sx={{ bgcolor: '#1D3557', color: 'white', textAlign: 'center', py: 1, fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem' }}>Más Popular</Box>}
                          <CardContent sx={{ p: 5, flexGrow: 1 }}>
                            <Typography variant="h5" fontWeight={800} sx={{ textTransform: 'capitalize', mb: 2 }}>{pKey === 'basico' ? 'Básico' : pKey}</Typography>
                            <Box sx={{ mb: 4 }}>
                              <Typography variant="h3" component="span" fontWeight={800} color="primary">{plan.text}</Typography>
                              <Typography variant="caption" color="text.secondary"> / {interval === 'monthly' ? 'mes' : 'año'}</Typography>
                            </Box>
                            <List dense>
                              <ListItem disableGutters><ListItemText primary="✅ Newsletter mensual" /></ListItem>
                              <ListItem disableGutters><ListItemText primary={`✅ ${pKey === 'basico' ? '5' : pKey === 'avanzado' ? '20' : '100'} consultas diarias`} /></ListItem>
                              <ListItem disableGutters><ListItemText primary={`✅ ${pKey === 'basico' ? '3' : pKey === 'avanzado' ? '15' : '25'} análisis de documentos`} /></ListItem>
                              <ListItem disableGutters><ListItemText primary={`✅ ${pKey === 'basico' ? '1' : pKey === 'avanzado' ? '3' : '5'} archivos por análisis`} /></ListItem>
                              <ListItem disableGutters><ListItemText primary={`✅ ${pKey === 'basico' ? '15' : '40'} Mb por archivo`} /></ListItem>
                              <ListItem disableGutters><ListItemText primary={pKey === 'basico' ? '❌ Sin precalificador' : `✅ ${pKey === 'avanzado' ? '20' : '100'} precalificaciones`} /></ListItem>
                            </List>
                          </CardContent>
                          <Box sx={{ p: 4, pt: 0 }}>
                            <Button fullWidth variant={isAdv ? "contained" : "outlined"} sx={isAdv ? muiPrimaryBtnStyle : muiGhostBtnStyle} onClick={() => handleSelectPlan(pKey)}>
                              Elegir Plan
                            </Button>
                          </Box>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </>
            )}
          </div>
        </Box>

        {/* INFO CORPORATIVA */}
        <Box component="section" sx={{ py: 12, textAlign: 'center' }}>
          <Container maxWidth="md">
            <Business sx={{ fontSize: 60, color: '#1D3557', mb: 3 }} />
            <Typography variant="h4" fontWeight={800} gutterBottom>¿PIDA para tu Organización o Institución?</Typography>
            <Typography variant="body1" sx={{ color: '#4B5563', fontSize: '1.2rem', mb: 6, lineHeight: 1.8 }}>
              PIDA está diseñado para escalar con las necesidades de grandes equipos de litigio. Si representas a una firma legal, una organización de defensa de DDHH, una fiscalía u órgano de gobierno, ofrecemos licenciamiento por volumen, facturación centralizada y soporte técnico prioritario.
            </Typography>
            <Button variant="contained" size="large" sx={muiPrimaryBtnStyle} onClick={() => setIsContactOpen(true)}>
              Contactar Soporte Corporativo
            </Button>
          </Container>
        </Box>

        {/* TESTIMONIOS */}
        <Box component="section" sx={{ py: 12, bgcolor: '#F8FAFC' }}>
          <Container maxWidth="lg">
            <Typography variant="h4" align="center" fontWeight={800} sx={{ mb: 8 }}>Lo que dicen nuestros usuarios</Typography>
            <Box sx={{ position: 'relative', maxWidth: 850, mx: 'auto', overflow: 'hidden' }}>
              <Stack direction="row" sx={{ 
                transform: `translateX(-${currentSlide * 100}%)`, 
                transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)', width: '100%'
              }}>
                {[
                  { text: "PIDA me dio respuestas mucho más completas y técnicas de lo que yo andaba buscando, me da mucha confianza.", author: "Carlos Urquilla" },
                  { text: "Este sistema PIDA me ha gustado mucho por la calidad de información que proporciona. He realizado varias consultas y han satisfecho mis expectativas.", author: "Alexandra Esquivel" },
                  { text: "Creo que la limitante de creer en la IA es que uno no entiende cómo funciona. Cuando comprendes que la IA no sustituye la inteligencia humana sino que la complementa, trabajarás en otro nivel.", author: "Fabiola Galaviz" }
                ].map((t, i) => (
                  <Box key={i} sx={{ minWidth: '100%', p: 2 }}>
                    <Card elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                      <Typography variant="h1" sx={{ color: '#1D3557', opacity: 0.1, mb: -4 }}>“</Typography>
                      <Typography variant="h5" sx={{ fontStyle: 'italic', mb: 4, fontWeight: 400, color: '#374151' }}>{t.text}</Typography>
                      <Typography variant="subtitle1" fontWeight={800} color="primary" sx={{ letterSpacing: 1 }}>{t.author.toUpperCase()}</Typography>
                    </Card>
                  </Box>
                ))}
              </Stack>
              <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 4 }}>
                {[0, 1, 2].map((i) => (
                  <Box key={i} onClick={() => setCurrentSlide(i)} sx={{ 
                    width: currentSlide === i ? 24 : 10, height: 10, borderRadius: 5, cursor: 'pointer',
                    bgcolor: currentSlide === i ? '#1D3557' : '#CBD5E1', transition: '0.3s'
                  }} />
                ))}
              </Stack>
            </Box>
          </Container>
        </Box>

        {/* FOOTER */}
        <Box component="footer" sx={{ py: 8, borderTop: '1px solid #E5E7EB' }}>
          <Container maxWidth="lg">
            <Grid container spacing={4} justifyContent="space-between" alignItems="center">
              <Grid item xs={12} md={4}>
                <img src="/img/PIDA_logo-576.png" style={{ height: 50, marginBottom: 20 }} />
                <Typography variant="body2" color="text.secondary">© 2025 IIRESODH PAYMENTS, LLC. <br /> Delaware, Estados Unidos.</Typography>
              </Grid>
              <Grid item xs={12} md={8}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="flex-end">
                  <Button color="inherit" href="/terminos.html" target="_blank">Términos</Button>
                  <Button color="inherit" href="/privacidad.html" target="_blank">Privacidad</Button>
                  <Button color="inherit" startIcon={<Email />} href="mailto:contacto@pida-ai.com">contacto@pida-ai.com</Button>
                </Stack>
              </Grid>
            </Grid>
          </Container>
        </Box>
      </main>

      {/* CONTACT DIALOG */}
      <Dialog open={isContactOpen} onClose={() => setIsContactOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 5, p: 3 } }}>
        <DialogTitle sx={{ textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={800} color="primary">Contacto Corporativo</Typography>
        </DialogTitle>
        <form onSubmit={handleContactSubmit}>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 4, color: '#64748B', textAlign: 'center' }}>Diseñaremos un plan a la medida de tu equipo legal o académico.</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Nombre" required value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Organización" required value={contactForm.company} onChange={e => setContactForm({...contactForm, company: e.target.value})} /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Email" type="email" required value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} /></Grid>
              <Grid item xs={4}><TextField fullWidth label="Cód." value={contactForm.countryCode} onChange={e => setContactForm({...contactForm, countryCode: e.target.value})} /></Grid>
              <Grid item xs={8}><TextField fullWidth label="Teléfono" value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} /></Grid>
              <Grid item xs={12}><TextField fullWidth multiline rows={4} label="Mensaje" required value={contactForm.message} onChange={e => setContactForm({...contactForm, message: e.target.value})} /></Grid>
            </Grid>
            {contactStatus.text && <Alert severity={contactStatus.type} sx={{ mt: 3 }}>{contactStatus.text}</Alert>}
          </DialogContent>
          <DialogActions sx={{ p: 3, justifyContent: 'center' }}>
            <Button onClick={() => setIsContactOpen(false)} color="inherit">Cerrar</Button>
            <Button variant="contained" sx={muiPrimaryBtnStyle} type="submit" disabled={contactStatus.isSubmitting}>Enviar Solicitud</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}