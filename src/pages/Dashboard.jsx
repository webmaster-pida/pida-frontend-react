import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ChatInterface from '../components/ChatInterface';
import AnalyzerInterface from '../components/AnalyzerInterface';
import PrequalifierInterface from '../components/PrequalifierInterface';
import AccountInterface from '../components/AccountInterface';
import { db, auth } from '../config/firebase'; 
import { PIDA_CONFIG, STRIPE_PRICES } from '../config/constants';

import { 
  Box, 
  Typography, 
  Button, 
  IconButton, 
  Divider, 
  CircularProgress, 
  Paper, 
  Stepper, 
  Step, 
  StepLabel,
  ToggleButtonGroup,
  ToggleButton,
  Switch,
  FormControlLabel,
  Menu,
  MenuItem,
  Chip,
  Alert,
  useMediaQuery,
  useTheme,
  Backdrop,
  TextField,
  Drawer,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent
} from '@mui/material';

import { 
  Add as AddIcon, 
  History as HistoryIcon, 
  Delete as DeleteIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Stars as VipIcon,
  Close as CloseIcon
} from '@mui/icons-material';

import { loadStripe } from '@stripe/stripe-js';
import { 
  Elements, 
  CardElement, 
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_live_51QriCdGgaloBN5L8XyzW4M1QePJK316USJg3kjrZGFGln3bhwEQKnpoNXf2MnLXGHylM1OQ6SvWJmNVCNqhCxg6x000l605E1B');

const CURRENT_TERMS_VERSION = "2025-12-09";

const TermsUpdateModal = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          const userDoc = await db.collection('customers').doc(user.uid).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.accepted_terms_version !== CURRENT_TERMS_VERSION) {
              setOpen(true);
            }
          } else {
            setOpen(true);
          }
        } catch (error) {
          console.error("Error verificando términos:", error);
        }
      } else {
        setOpen(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await db.collection('customers').doc(userId).set({
        accepted_terms_version: CURRENT_TERMS_VERSION,
        terms_accepted_at: db.app.internal_from_config ? db.app.firebase_.firestore.FieldValue.serverTimestamp() : new Date()
      }, { merge: true });
      setOpen(false);
    } catch (error) {
      console.error("Error al guardar aceptación:", error);
      alert("Hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      disableEscapeKeyDown 
      onClose={(event, reason) => {
        if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') {
          setOpen(false);
        }
      }}
      PaperProps={{ sx: { borderRadius: '16px', p: 1, maxWidth: '500px' } }}
      sx={{ zIndex: 9999999 }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', color: 'var(--navy)', textAlign: 'center', pb: 1 }}>
        Actualización Importante
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center' }}>
        <Typography variant="body1" sx={{ mb: 2, color: '#475569' }}>
          Hemos mejorado nuestras <strong>Políticas de Privacidad</strong> y <strong>Términos de Uso</strong> para ofrecerte mayor seguridad.
        </Typography>
        
        <Box sx={{ bgcolor: '#F0F9FF', p: 2, borderRadius: '8px', mb: 3, textAlign: 'left', border: '1px solid #BAE6FD' }}>
          <Typography variant="body2" sx={{ color: '#0369A1', fontWeight: 600, mb: 1 }}>
            Nuevas garantías para tu información:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#0284C7', fontSize: '0.85rem' }}>
            <li>Tus documentos originales se eliminan automáticamente en 48 horas.</li>
            <li>Garantizamos explícitamente que <strong>nunca</strong> usamos tus datos para entrenar modelos de Inteligencia Artificial.</li>
          </ul>
        </Box>

        <Typography variant="body2" sx={{ mb: 3, color: '#64748B' }}>
          Para continuar usando PIDA, por favor revisa y acepta las nuevas políticas. <br/>
          <a href="/terminos.html" target="_blank" rel="noreferrer" style={{ color: 'var(--pida-primary)', textDecoration: 'underline' }}>Términos de Uso</a> | <a href="/privacidad.html" target="_blank" rel="noreferrer" style={{ color: 'var(--pida-primary)', textDecoration: 'underline' }}>Política de Privacidad</a>
        </Typography>

        <Button 
          variant="contained" 
          fullWidth 
          onClick={handleAccept} 
          disabled={loading}
          sx={{ 
            bgcolor: 'var(--pida-primary)', 
            color: 'white', 
            fontWeight: 'bold', 
            py: 1.5, 
            borderRadius: '8px',
            textTransform: 'none',
            fontSize: '1rem',
            '&:hover': { bgcolor: 'var(--pida-accent)' }
          }}
        >
          {loading ? 'Guardando...' : 'He leído y acepto los términos'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default function Dashboard({ user, onRequireSubscription }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [currentView, setCurrentView] = useState('investigador'); 
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasValidAccess, setHasValidAccess] = useState(false);
  const [userPlan, setUserPlan] = useState('basico'); 
  const [isVip, setIsVip] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  
  const [isOnboarding, setIsOnboarding] = useState(sessionStorage.getItem('pida_is_onboarding') === 'true');

  const [chatHistory, setChatHistory] = useState([]);
  const [anaHistory, setAnaHistory] = useState([]);
  const [preHistory, setPreHistory] = useState([]);
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [resetSignals, setResetSignals] = useState({ chat: 0, ana: 0, pre: 0 });
  const [loadData, setLoadData] = useState({ chat: null, ana: null, pre: null });

  // === ESTADOS PARA EL SISTEMA DE SOPORTE TÉCNICO ===
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  // Corrección 1: Valor inicial alineado con las opciones reales del menú
  const [supportForm, setSupportForm] = useState({ subject: '', category: 'Otra consulta', message: '' });
  const [supportStatus, setSupportStatus] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!user) return;
    let isVipResolved = false;
    let isStripeResolved = false;
    let resolvedIsVip = false;
    let resolvedStripeStatus = null;
    let resolvedPlan = 'basico';
    let resolvedTrial = false;

    const evaluateFinalAccess = () => {
      if (!isVipResolved || !isStripeResolved) return;
      if (resolvedIsVip || resolvedStripeStatus === 'active' || resolvedStripeStatus === 'trialing') {
        sessionStorage.removeItem('pida_is_onboarding');
        setIsOnboarding(false);
        
        setIsVip(resolvedIsVip); 
        setUserPlan(resolvedPlan); 
        setIsTrial(resolvedTrial);
        setHasValidAccess(true);
        fetchHistories();
      } else { 
        setHasValidAccess(false); 
        if (onRequireSubscription) onRequireSubscription();
      }
      setIsCheckingAccess(false);
    };

    const checkVip = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${PIDA_CONFIG.API_CHAT}/check-vip-access`, { 
          method: 'POST', 
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) { 
          const data = await res.json(); 
          resolvedIsVip = data.is_vip_user; 
        }
      } catch (e) { 
        console.error(e); 
      } finally { 
        isVipResolved = true; 
        evaluateFinalAccess(); 
      }
    };
    
    checkVip();

    const unsubscribe = db.collection('customers').doc(user.uid).onSnapshot((doc) => {
      isStripeResolved = true;
      if (doc.exists) {
        const data = doc.data();
        resolvedStripeStatus = data.status; 
        resolvedPlan = data.plan || 'basico'; 
        resolvedTrial = data.has_trial || false;
      }
      evaluateFinalAccess();
    }, () => { 
      isStripeResolved = true; 
      evaluateFinalAccess(); 
    });

    return () => unsubscribe();
  }, [user]);

  const fetchHistories = async () => {
    try {
      const token = await user.getIdToken();
      const fetchRes = async (url) => {
          const r = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }});
          if (r.status === 403) throw new Error('403');
          return r.ok ? await r.json() : [];
      };
      setChatHistory(await fetchRes(`${PIDA_CONFIG.API_CHAT}/conversations`));
      setAnaHistory(await fetchRes(`${PIDA_CONFIG.API_ANA}/analysis-history/`));
      const snap = await db.collection('users').doc(user.uid).collection('prequalifications').orderBy('created_at', 'desc').limit(20).get();
      setPreHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      if (err.message === '403') {
        if (onRequireSubscription) onRequireSubscription();
      } else {
        console.error("Error fetching histories:", err);
      }
    }
  };

  const handleMenuOpen = (event) => { 
    fetchHistories(); 
    setAnchorEl(event.currentTarget); 
  };
  
  const handleMenuClose = () => setAnchorEl(null);
  
  const deleteItem = async (type, id, e) => {
    e.stopPropagation(); 
    const token = await user.getIdToken();
    const baseUrl = type === 'chat' ? PIDA_CONFIG.API_CHAT + '/conversations' : PIDA_CONFIG.API_ANA + '/analysis-history';
    if (type === 'pre') { 
      await db.collection('users').doc(user.uid).collection('prequalifications').doc(id).delete(); 
    } else { 
      await fetch(`${baseUrl}/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }}); 
    }
    fetchHistories();
  };

  // === FUNCIÓN PARA ENVIAR TICKET DE SOPORTE A FIRESTORE ===
  const handleSendTicket = async (e) => {
    e.preventDefault();
    if (!supportForm.subject.trim() || !supportForm.message.trim()) {
      setSupportStatus({ type: 'error', text: 'Por favor complete todos los campos obligatorios.' });
      return;
    }

    setIsSending(true);
    setSupportStatus({ type: '', text: '' });

    try {
      const timestamp = db.app.internal_from_config ? db.app.firebase_.firestore.FieldValue.serverTimestamp() : new Date();

      // 1. Guardar el ticket en la base de datos (Historial)
      await db.collection('support_tickets').add({
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || 'Usuario PIDA',
        subject: supportForm.subject.trim(),
        category: supportForm.category,
        message: supportForm.message.trim(),
        status: "open",
        created_at: timestamp
      });

      // 2. Disparar el Email a través de la colección "mail" usando el Template
      await db.collection('mail').add({
        to: 'contacto@pida-ai.com',
        template: {
          name: 'support-ticket', // El nombre exacto del documento que creaste en el Paso 1
          data: {
            userName: user.displayName || 'Usuario PIDA',
            userEmail: user.email,
            subject: supportForm.subject.trim(),
            category: supportForm.category,
            message: supportForm.message.trim()
          }
        },
        created_at: timestamp
      });

      setSupportStatus({ type: 'success', text: 'Ticket enviado con éxito. Te responderemos en un plazo de 24 a 48 horas.' });
      setSupportForm({ subject: '', category: 'Otra consulta', message: '' });
    } catch (err) {
      console.error("Error al enviar ticket de soporte:", err);
      setSupportStatus({ type: 'error', text: 'Ocurrió un error al enviar el mensaje. Inténtalo de nuevo.' });
    } finally {
      setIsSending(false);
    }
  };

  if (isCheckingAccess || isOnboarding) {
    return (
      <Box sx={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: '#101852' }}>
        <CircularProgress size={60} sx={{ color: 'white' }} />
        <Typography sx={{ mt: 3, color: 'white', fontWeight: 600 }}>Configurando su entorno legal...</Typography>
      </Box>
    );
  }

  if (!hasValidAccess) {
    return null;
  }

  const openMenu = Boolean(anchorEl);
  const headerBtnSx = { 
    width: isMobile ? 'auto' : 240, 
    borderRadius: 2, 
    textTransform: 'none', 
    fontWeight: 700, 
    whiteSpace: 'nowrap', 
    height: 42 
  };

  return (
    <Box id="pida-app-layout" sx={{ display: 'flex', bgcolor: 'var(--pida-bg-app)', height: '100vh', overflow: 'hidden' }}>
      <TermsUpdateModal />
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} user={user} />
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <Box component="header" sx={{ height: 70, bgcolor: 'white', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', px: { xs: 2, md: 4 }, gap: 2, zIndex: 1100 }}>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            size="small" 
            onClick={() => { 
              setResetSignals(prev => ({ ...prev, [currentView === 'investigador' ? 'chat' : currentView === 'analizador' ? 'ana' : 'pre']: prev[currentView === 'investigador' ? 'chat' : currentView === 'analizador' ? 'ana' : 'pre'] + 1 })); 
              setLoadData({ chat: null, ana: null, pre: null }); 
            }} 
            sx={{ ...headerBtnSx, display: currentView === 'cuenta' ? 'none' : 'inline-flex' }}
          >
            {isMobile ? 'Nuevo' : (currentView === 'investigador' ? 'Nuevo Chat' : currentView === 'analizador' ? 'Nuevo Análisis' : 'Nuevo Caso')}
          </Button>
          
          {currentView !== 'cuenta' && (
            <>
              <Button 
                variant="outlined" 
                color="inherit" 
                startIcon={<HistoryIcon />} 
                size="small" 
                onClick={handleMenuOpen} 
                sx={{ ...headerBtnSx, borderColor: '#E2E8F0', color: 'text.secondary' }}
              >
                {!isMobile && 'Historial de consultas'} <ArrowDownIcon sx={{ ml: 'auto' }} />
              </Button>
              <Menu 
                anchorEl={anchorEl} 
                open={openMenu} 
                onClose={handleMenuClose} 
                sx={{ zIndex: 200000 }} 
                PaperProps={{ sx: { width: 320, maxHeight: 450, borderRadius: 3, mt: 1, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' } }}
              >
                <Typography variant="overline" sx={{ px: 2, py: 1, display: 'block', fontWeight: 800, color: 'text.disabled' }}>
                  Registros Recientes
                </Typography>
                <Divider />
                {((currentView === 'investigador' ? chatHistory : currentView === 'analizador' ? anaHistory : preHistory).length === 0) && ( 
                  <MenuItem disabled sx={{ justifyContent: 'center', py: 3 }}>No hay historial aún</MenuItem> 
                )}
                {(currentView === 'investigador' ? chatHistory : currentView === 'analizador' ? anaHistory : preHistory).map((item) => (
                  <MenuItem 
                    key={item.id} 
                    sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 1.5 }} 
                    onClick={() => { 
                      if (currentView === 'investigador') setLoadData(p => ({...p, chat: item.id})); 
                      else if (currentView === 'analizador') setLoadData(p => ({...p, ana: item.id})); 
                      else setLoadData(p => ({...p, pre: item})); 
                      handleMenuClose(); 
                    }}
                  >
                    <Typography variant="body2" noWrap sx={{ flexGrow: 1, maxWidth: '240px' }}>
                      {item.title || "Sin título"}
                    </Typography>
                    <IconButton size="small" color="error" onClick={(e) => deleteItem(currentView === 'investigador' ? 'chat' : currentView === 'analizador' ? 'ana' : 'pre', item.id, e)}> 
                      <DeleteIcon fontSize="small" /> 
                    </IconButton>
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
          
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              icon={isVip ? <VipIcon /> : undefined} 
              label={`Plan: ${isVip ? 'VIP' : userPlan}${isTrial && !isVip ? ' (Prueba)' : ''}`} 
              color={isVip ? "warning" : "primary"} 
              sx={{ fontWeight: 700, borderRadius: 2, height: 32, bgcolor: isVip ? '#FFFBEB' : '#EEF2FF', color: isVip ? '#92400E' : '#1D3557' }} 
            />
            
            {/* BOTÓN DE AYUDA CON DEBUGGING */}
            <Button 
              variant="text" 
              onClick={(e) => {
                console.log("👉 Botón de ayuda clickeado. Estado anterior:", isSupportOpen);
                setIsSupportOpen(true);
              }}
              sx={{ 
                color: 'var(--pida-primary)', 
                fontWeight: 700, 
                textTransform: 'none',
                px: 2,
                '&:hover': { 
                  backgroundColor: 'rgba(29, 53, 87, 0.08)',
                  textDecoration: 'none' 
                }
              }}
            >
              Ayuda
            </Button>

            {!isMobile && <Box component="img" src="/img/PIDA-MASCOTA-menu.png" sx={{ height: 45 }} />}
          </Box>
        </Box>
        <Box sx={{ flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
          {currentView === 'investigador' && <ChatInterface user={user} resetSignal={resetSignals.chat} loadChatId={loadData.chat} refreshHistory={fetchHistories} />}
          {currentView === 'analizador' && <AnalyzerInterface user={user} resetSignal={resetSignals.ana} loadAnaId={loadData.ana} />}
          {currentView === 'precalificador' && <PrequalifierInterface user={user} resetSignal={resetSignals.pre} loadPreData={loadData.pre} />}
          {currentView === 'cuenta' && <AccountInterface user={user} isVip={isVip} />}
        </Box>
      </Box>

      {/* COMPONENTE DRAWER FORZADO AL FRENTE Y CON FOCO LIBERADO */}
      <Drawer
        anchor="right"
        open={isSupportOpen}
        onClose={() => {
          setIsSupportOpen(false);
          setSupportStatus({ type: '', text: '' });
        }}
        sx={{ zIndex: 999999 }} 
        ModalProps={{
          disableEnforceFocus: true, 
          disableAutoFocus: true,
        }}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 400 }, padding: '30px', display: 'flex', flexDirection: 'column', gap: 3 }
        }}
      >
        {/* --- NUEVO ENCABEZADO CON BOTÓN DE CERRAR --- */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box pr={2}>
            <Typography variant="h5" sx={{ color: 'var(--pida-primary)', fontWeight: 800, mb: 1 }}>
              Soporte Técnico PIDA
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', lineHeight: 1.5 }}>
              Déjanos tu duda o reporte. Nuestro equipo te responderá vía correo electrónico en un plazo de 24 a 48 horas.
            </Typography>
          </Box>
          <IconButton 
            onClick={() => {
              setIsSupportOpen(false);
              setSupportStatus({ type: '', text: '' });
            }}
            sx={{ bgcolor: '#F1F5F9', '&:hover': { bgcolor: '#E2E8F0' } }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        {/* ------------------------------------------- */}

        <Divider />

        <Box component="form" onSubmit={handleSendTicket} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, flexGrow: 1 }}>
          <TextField
            label="Asunto"
            name="subject"
            required
            fullWidth
            size="small"
            value={supportForm.subject}
            onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
            disabled={isSending}
          />

          <FormControl fullWidth size="small">
            <InputLabel id="support-category-label">Categoría / Tipo de problema</InputLabel>
            <Select
              labelId="support-category-label"
              name="category"
              label="Categoría / Tipo de problema"
              value={supportForm.category}
              onChange={(e) => setSupportForm({ ...supportForm, category: e.target.value })}
              disabled={isSending}
              MenuProps={{ disablePortal: true }} // Corrección 3: Evita que el menú flote fuera y congele el componente
            >
              <MenuItem value="Problema técnico o error en la plataforma">Problema técnico o error en la plataforma</MenuItem>
              <MenuItem value="Duda sobre una respuesta de la IA">Duda sobre una respuesta de la IA</MenuItem>
              <MenuItem value="Facturación, suscripciones y pagos">Facturación, suscripciones y pagos</MenuItem>
              <MenuItem value="Sugerencia de nueva funcionalidad">Sugerencia de nueva funcionalidad</MenuItem>
              <MenuItem value="Otra consulta">Otra consulta</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Mensaje / Descripción detallada"
            name="message"
            required
            fullWidth
            multiline
            rows={5}
            placeholder="Describe detalladamente tu inconveniente o duda para ayudarte mejor..."
            value={supportForm.message}
            onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
            disabled={isSending}
          />

          {supportStatus.text && (
            <Alert severity={supportStatus.type} sx={{ width: '100%' }}>
              {supportStatus.text}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={isSending}
            sx={{
              mt: 'auto',
              py: 1.2,
              fontWeight: 700,
              textTransform: 'none',
              bgcolor: 'var(--pida-primary)',
              '&:hover': { bgcolor: 'var(--pida-accent)' }
            }}
          >
            {isSending ? <CircularProgress size={24} color="inherit" /> : 'Enviar mensaje de soporte'}
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
}