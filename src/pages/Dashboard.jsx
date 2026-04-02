import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  IconButton, 
  Divider, 
  Avatar, 
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
  useTheme
} from '@mui/material';
import { 
  Add as AddIcon, 
  History as HistoryIcon, 
  Delete as DeleteIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Stars as VipIcon
} from '@mui/icons-material';

// Importaciones de PIDA
import Sidebar from '../components/Sidebar';
import ChatInterface from '../components/ChatInterface';
import AnalyzerInterface from '../components/AnalyzerInterface';
import PrequalifierInterface from '../components/PrequalifierInterface';
import AccountInterface from '../components/AccountInterface';
import { db, auth } from '../config/firebase'; 
import { PIDA_CONFIG, STRIPE_PRICES } from '../config/constants';

import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_live_51QriCdGgaloBN5L8XyzW4M1QePJK316USJg3kjrZGFGln3bhwEQKnpoNXf2MnLXGHylM1OQ6SvWJmNVCNqhCxg6x000l605E1B');

// =========================================================
// COMPONENTE: CHECKOUT DENTRO DE LA APP
// =========================================================
const InAppCheckout = ({ user }) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [plan, setPlan] = useState('avanzado');
  const [interval, setInterval] = useState('monthly');
  const rawCurrency = localStorage.getItem('pida_currency');
  const [currency] = useState(['USD', 'MXN'].includes(rawCurrency) ? rawCurrency : 'USD');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [discountData, setDiscountData] = useState(null);
  const [promoMsg, setPromoMsg] = useState({ text: '', type: '' });

  const planDetails = STRIPE_PRICES[plan]?.[interval]?.[currency] || STRIPE_PRICES['basico']['monthly']['USD'];

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoMsg({ text: 'Validando...', type: 'info' });
    try {
      const res = await fetch(`${PIDA_CONFIG.API_CHAT}/validate-promo-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim(), priceId: planDetails.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Código inválido');
      setDiscountData(data);
      setPromoMsg({ text: `✅ Cupón aplicado: ${data.description}`, type: 'success' });
    } catch (err) {
      setDiscountData(null);
      setPromoMsg({ text: `❌ ${err.message}`, type: 'error' });
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true); setError('');
    try {
      const cardElement = elements.getElement(CardElement);
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card', card: cardElement,
        billing_details: { name: user.displayName || user.email || 'Usuario PIDA' }
      });
      if (pmError) throw new Error(pmError.message);

      const token = await user.getIdToken();
      const intentRes = await fetch(`${PIDA_CONFIG.API_CHAT}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: planDetails.id, currency: currency.toLowerCase(), plan_key: plan,
          name: user.displayName || user.email, promotion_code: discountData ? promoCode : "",
          paymentMethodId: paymentMethod.id
        })
      });
      
      const data = await intentRes.json();
      if (!intentRes.ok) throw new Error(data.detail || "Error al procesar pago");

      if (data.requiresAction) {
        const result = data.clientSecret.startsWith('seti_') 
          ? await stripe.confirmCardSetup(data.clientSecret)
          : await stripe.confirmCardPayment(data.clientSecret);
        if (result.error) throw new Error(result.error.message);
      }

      sessionStorage.setItem('pida_is_onboarding', 'true');
      window.location.reload(); 
    } catch(err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <Paper elevation={4} sx={{ maxWidth: 600, p: { xs: 3, md: 5 }, borderRadius: 4, margin: 'auto' }}>
      <Stepper activeStep={1} alternativeLabel sx={{ mb: 4 }}>
        {['Cuenta', 'Activación', 'Acceso'].map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      <Typography variant="h5" color="primary" fontWeight={800} gutterBottom>
        Activa tus 5 días gratis
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Sesión iniciada como <strong>{user.email}</strong>. No se realizará ningún cobro hoy.
      </Typography>

      <Box component="form" onSubmit={handlePay}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Elige tu Plan</Typography>
        <ToggleButtonGroup
          value={plan}
          exclusive
          onChange={(e, v) => v && setPlan(v)}
          fullWidth
          sx={{ mb: 3 }}
          color="primary"
        >
          <ToggleButton value="basico">Básico</ToggleButton>
          <ToggleButton value="avanzado">Avanzado</ToggleButton>
          <ToggleButton value="premium">Premium</ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700}>Ciclo de facturación</Typography>
          <FormControlLabel
            control={<Switch checked={interval === 'annual'} onChange={(e) => setInterval(e.target.checked ? 'annual' : 'monthly')} />}
            label={interval === 'annual' ? "Anual (Ahorra 20%)" : "Mensual"}
          />
        </Box>

        <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">Total hoy:</Typography>
            <Typography variant="body2" fontWeight={800} color="success.main">$0.00 (Prueba)</Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" fontWeight={700}>Después de la prueba:</Typography>
            <Typography variant="body2" fontWeight={800} color="primary">
              {discountData ? `${(discountData.final_amount/100).toLocaleString('es-ES', {style:'currency', currency})} / ${interval === 'monthly' ? 'mes' : 'año'}` : `${planDetails.text} / ${interval === 'monthly' ? 'mes' : 'año'}`}
            </Typography>
          </Box>
        </Box>

        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Datos de la tarjeta</Typography>
        <Box sx={{ p: 1.5, border: '1px solid #CBD5E1', borderRadius: 2, mb: 2, bgcolor: 'white' }}>
          <CardElement options={{ style: { base: { fontSize: '16px', color: '#1D3557' } } }} />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField 
            size="small" fullWidth placeholder="CÓDIGO DESCUENTO" 
            value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())}
          />
          <Button variant="outlined" onClick={handleApplyPromo} disabled={loading}>Aplicar</Button>
        </Box>
        {promoMsg.text && <Typography variant="caption" color={promoMsg.type === 'error' ? 'error' : 'success.main'}>{promoMsg.text}</Typography>}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        <Button 
          type="submit" variant="contained" fullWidth size="large" 
          disabled={loading} sx={{ mt: 3, py: 1.5, borderRadius: 3, fontWeight: 700 }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Empezar prueba gratuita'}
        </Button>
      </Box>
    </Paper>
  );
};

// =========================================================
// DASHBOARD PRINCIPAL
// =========================================================
export default function Dashboard({ user }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [currentView, setCurrentView] = useState('investigador'); 
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasValidAccess, setHasValidAccess] = useState(false);
  const [userPlan, setUserPlan] = useState('basico'); 
  const [isVip, setIsVip] = useState(false);
  const [isTrial, setIsTrial] = useState(false);

  // Estados de Historial y Menús
  const [chatHistory, setChatHistory] = useState([]);
  const [anaHistory, setAnaHistory] = useState([]);
  const [preHistory, setPreHistory] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  // Reset Signalers
  const [resetSignals, setResetSignals] = useState({ chat: 0, ana: 0, pre: 0 });
  const [loadData, setLoadData] = useState({ chat: null, ana: null, pre: null });

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
        setIsVip(resolvedIsVip); setUserPlan(resolvedPlan); setIsTrial(resolvedTrial);
        setHasValidAccess(true);
      } else { setHasValidAccess(false); }
      setIsCheckingAccess(false);
    };

    const checkVip = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${PIDA_CONFIG.API_CHAT}/check-vip-access`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }});
        if (res.ok) { const data = await res.json(); resolvedIsVip = data.is_vip_user; }
      } catch (e) { console.error(e); } finally { isVipResolved = true; evaluateFinalAccess(); }
    };
    checkVip();

    const unsubscribe = db.collection('customers').doc(user.uid).onSnapshot((doc) => {
      isStripeResolved = true;
      if (doc.exists) {
        const data = doc.data();
        resolvedStripeStatus = data.status; resolvedPlan = data.plan || 'basico'; resolvedTrial = data.has_trial || false;
      }
      evaluateFinalAccess();
    }, () => { isStripeResolved = true; evaluateFinalAccess(); });

    fetchHistories();
    return () => unsubscribe();
  }, [user]);

  const fetchHistories = async () => {
    const token = await user.getIdToken();
    const fetchRes = async (url) => {
        const r = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }});
        return r.ok ? await r.json() : [];
    };
    setChatHistory(await fetchRes(`${PIDA_CONFIG.API_CHAT}/conversations`));
    setAnaHistory(await fetchRes(`${PIDA_CONFIG.API_ANA}/analysis-history/`));
    const snap = await db.collection('users').doc(user.uid).collection('prequalifications').orderBy('created_at', 'desc').limit(20).get();
    setPreHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  // ✅ CORRECCIÓN: Actualizar historial al abrir el menú
  const handleMenuOpen = (event) => {
    fetchHistories();
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => setAnchorEl(null);

  const deleteItem = async (type, id, e) => {
    e.stopPropagation(); // Evita que el clic se propague al MenuItem y seleccione el chat
    const token = await user.getIdToken();
    const baseUrl = type === 'chat' ? PIDA_CONFIG.API_CHAT + '/conversations' : PIDA_CONFIG.API_ANA + '/analysis-history';
    if (type === 'pre') {
        await db.collection('users').doc(user.uid).collection('prequalifications').doc(id).delete();
    } else {
        await fetch(`${baseUrl}/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
    }
    fetchHistories();
  };

  if (isCheckingAccess) return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: '#f9fafb' }}>
      <CircularProgress size={40} thickness={5} />
      <Typography sx={{ mt: 2, color: 'text.secondary', fontWeight: 500 }}>Verificando suscripción...</Typography>
    </Box>
  );

  if (!hasValidAccess) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', bgcolor: '#f3f4f6', py: 4 }}>
      <Elements stripe={stripePromise}><InAppCheckout user={user} /></Elements>
    </Box>
  );

  // Estilo unificado para los botones del encabezado
  const headerBtnSx = {
    width: isMobile ? 'auto' : 200,
    borderRadius: 2,
    textTransform: 'none',
    fontWeight: 700,
    whiteSpace: 'nowrap'
  };

  return (
    <Box id="pida-app-layout" sx={{ display: 'flex', bgcolor: 'var(--pida-bg-app)', height: '100vh', overflow: 'hidden' }}>
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} user={user} />

      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <Box component="header" sx={{ 
          height: 70, bgcolor: 'white', borderBottom: '1px solid #E5E7EB', 
          display: 'flex', alignItems: 'center', px: { xs: 2, md: 4 }, gap: 2, zIndex: 1100 
        }}>
          
          {/* BOTÓN ACCIÓN PRINCIPAL - Ancho Unificado */}
          <Button 
            variant="contained" startIcon={<AddIcon />} size="small"
            onClick={() => {
                setResetSignals(prev => ({ ...prev, [currentView === 'investigador' ? 'chat' : currentView === 'analizador' ? 'ana' : 'pre']: prev[currentView === 'investigador' ? 'chat' : currentView === 'analizador' ? 'ana' : 'pre'] + 1 }));
                setLoadData({ chat: null, ana: null, pre: null });
            }}
            sx={{ ...headerBtnSx, display: currentView === 'cuenta' ? 'none' : 'inline-flex' }}
          >
            {isMobile ? 'Nuevo' : (currentView === 'investigador' ? 'Nuevo Chat' : currentView === 'analizador' ? 'Nuevo Análisis' : 'Nuevo Caso')}
          </Button>

          {/* MENÚ DE HISTORIAL - Ancho Unificado y Clic Corregido */}
          {currentView !== 'cuenta' && (
            <>
              <Button 
                variant="outlined" color="inherit" startIcon={<HistoryIcon />} size="small"
                onClick={handleMenuOpen}
                sx={{ ...headerBtnSx, borderColor: '#E2E8F0', color: 'text.secondary' }}
              >
                {!isMobile && 'Historial'} <ArrowDownIcon fontSize="small" />
              </Button>
              <Menu
                anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose}
                PaperProps={{ sx: { width: 320, maxHeight: 450, borderRadius: 3, mt: 1, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' } }}
              >
                <Typography variant="overline" sx={{ px: 2, py: 1, display: 'block', fontWeight: 800, color: 'text.disabled' }}>Consultas Recientes</Typography>
                <Divider />
                {((currentView === 'investigador' ? chatHistory : currentView === 'analizador' ? anaHistory : preHistory).length === 0) && (
                  <MenuItem disabled sx={{ justifyContent: 'center', py: 3 }}>No hay historial aún</MenuItem>
                )}
                {(currentView === 'investigador' ? chatHistory : currentView === 'analizador' ? anaHistory : preHistory).map((item) => (
                  // ✅ CORRECCIÓN: Evento de carga movido al MenuItem
                  <MenuItem 
                    key={item.id} 
                    sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}
                    onClick={() => {
                        if (currentView === 'investigador') setLoadData(p => ({...p, chat: item.id}));
                        else if (currentView === 'analizador') setLoadData(p => ({...p, ana: item.id}));
                        else setLoadData(p => ({...p, pre: item}));
                        handleMenuClose();
                    }}
                  >
                    <Typography variant="body2" noWrap sx={{ flexGrow: 1 }}>
                      {item.title || "Sin título"}
                    </Typography>
                    <IconButton 
                        size="small" 
                        color="error" 
                        onClick={(e) => deleteItem(currentView === 'investigador' ? 'chat' : currentView === 'analizador' ? 'ana' : 'pre', item.id, e)}
                    >
                      <DeleteIcon fontSize="inherit" />
                    </IconButton>
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}

          {/* BADGE DE PLAN */}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              icon={isVip ? <VipIcon /> : undefined}
              label={`Plan: ${isVip ? 'VIP' : userPlan}${isTrial && !isVip ? ' (Prueba)' : ''}`} 
              color={isVip ? "warning" : "primary"} 
              sx={{ fontWeight: 700, borderRadius: 2, height: 32, bgcolor: isVip ? '#FFFBEB' : '#EEF2FF', color: isVip ? '#92400E' : '#1D3557' }}
            />
            {!isMobile && <Box component="img" src="/img/PIDA-MASCOTA-menu.png" sx={{ height: 45 }} />}
          </Box>
        </Box>

        {/* VISTAS DINÁMICAS */}
        <Box sx={{ flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
          {currentView === 'investigador' && <ChatInterface user={user} resetSignal={resetSignals.chat} loadChatId={loadData.chat} refreshHistory={fetchHistories} />}
          {currentView === 'analizador' && <AnalyzerInterface user={user} resetSignal={resetSignals.ana} loadAnaId={loadData.ana} />}
          {currentView === 'precalificador' && <PrequalifierInterface user={user} resetSignal={resetSignals.pre} loadPreData={loadData.pre} />}
          {currentView === 'cuenta' && <AccountInterface user={user} isVip={isVip} />}
        </Box>
      </Box>
    </Box>
  );
}