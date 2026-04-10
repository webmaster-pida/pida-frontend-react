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
  Backdrop
} from '@mui/material';
import { 
  Add as AddIcon, 
  History as HistoryIcon, 
  Delete as DeleteIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Stars as VipIcon
} from '@mui/icons-material';

import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_live_51QriCdGgaloBN5L8XyzW4M1QePJK316USJg3kjrZGFGln3bhwEQKnpoNXf2MnLXGHylM1OQ6SvWJmNVCNqhCxg6x000l605E1B');

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
        type: 'card',
        card: cardElement,
        billing_details: { name: user.displayName || user.email || 'Usuario PIDA' }
      });

      if (pmError) throw new Error(pmError.message);

      const token = await user.getIdToken();
      const intentRes = await fetch(`${PIDA_CONFIG.API_CHAT}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: planDetails.id,
          currency: currency.toLowerCase(),
          plan_key: plan,
          name: user.displayName || user.email,
          promotion_code: discountData ? promoCode : "",
          paymentMethodId: paymentMethod.id
        })
      });
      
      const data = await intentRes.json();
      if (!intentRes.ok) throw new Error(data.detail || "Error al procesar pago");

      if (data.requiresAction) {
        let result;
        if (data.clientSecret.startsWith('seti_')) {
          result = await stripe.confirmCardSetup(data.clientSecret);
        } else {
          result = await stripe.confirmCardPayment(data.clientSecret);
        }
        if (result.error) throw new Error(result.error.message);
      }

      sessionStorage.setItem('pida_is_onboarding', 'true');
      window.location.reload(); 
      
    } catch(err) {
      setError(`❌ ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <Paper elevation={4} sx={{ maxWidth: 600, background: 'white', padding: '40px', borderRadius: '16px', textAlign: 'center', margin: '0 auto', width: '95%', position: 'relative' }}>
      <Stepper activeStep={1} alternativeLabel sx={{ mb: 4 }}>
        {['Cuenta', 'Activación', 'Acceso'].map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      <Typography variant="h5" sx={{ color: 'var(--pida-primary)', marginBottom: '10px', fontWeight: 800 }}>Activa tus 5 días gratis</Typography>
      <p style={{ color: '#64748B', marginBottom: '30px', fontSize: '0.95rem' }}>
        Has iniciado sesión como <strong>{user.email}</strong>. Configura tu plan final. No se realizará ningún cobro hoy.
      </p>

      <Box component="form" onSubmit={handlePay} style={{ textAlign: 'left' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--pida-primary)', mb: 1 }}>Elige tu Plan</Typography>
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
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--pida-primary)' }}>Ciclo de facturación</Typography>
          <FormControlLabel
            control={<Switch checked={interval === 'annual'} onChange={(e) => setInterval(e.target.checked ? 'annual' : 'monthly')} />}
            label={interval === 'annual' ? "Anual (Ahorra 20%)" : "Mensual"}
          />
        </Box>

        <Box sx={{ padding: '20px', background: '#F8FAFC', borderRadius: '12px', marginBottom: '20px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ color: '#64748B', fontWeight: '600' }}>Total a pagar hoy:</span>
            <span style={{ color: '#10B981', fontWeight: '800' }}>$0.00 (Prueba 5 días)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
            <span style={{ color: '#1D3557', fontWeight: '600' }}>Después de la prueba:</span>
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: '#1D3557', fontWeight: '800', textDecoration: discountData ? 'line-through' : 'none', opacity: discountData ? 0.5 : 1 }}>
                {planDetails.text} / {interval === 'monthly' ? 'mes' : 'año'}
              </span>
              {discountData && (
                <div style={{ color: '#10B981', fontWeight: '800', fontSize: '1.1rem' }}>
                  {new Intl.NumberFormat(currency === 'MXN' ? 'es-MX' : 'en-US', { style: 'currency', currency }).format(discountData.final_amount / 100)} / {interval === 'monthly' ? 'mes' : 'año'}
                </div>
              )}
            </div>
          </div>
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--pida-primary)', mb: 1 }}>Datos de la tarjeta</Typography>
        <div style={{ padding: '15px', border: '1px solid #CBD5E1', borderRadius: '8px', background: 'white', marginBottom: '15px' }}>
          <CardElement options={{ style: { base: { fontSize: '16px', color: '#1D3557' } } }} />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
          <TextField 
            size="small" fullWidth placeholder="CÓDIGO DE DESCUENTO" 
            value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} 
            disabled={!!discountData || loading} 
          />
          <Button variant="outlined" onClick={handleApplyPromo} disabled={!!discountData || !promoCode || loading}>
            {discountData ? '✓' : 'Aplicar'}
          </Button>
        </div>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Button 
          type="submit" variant="contained" fullWidth size="large" 
          disabled={loading} sx={{ py: 1.5, borderRadius: 3, fontWeight: 700 }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Confirmar y empezar prueba gratuita'}
        </Button>

        {/* BACKDROP BLOQUEANTE PARA DASHBOARD */}
        <Backdrop
          sx={{ 
            color: '#fff', 
            zIndex: 3000, 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: 'rgba(16, 24, 82, 0.98)',
            backdropFilter: 'blur(5px)'
          }}
          open={loading}
        >
          <CircularProgress size={70} thickness={4} sx={{ color: 'white', mb: 3 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Activando tu cuenta</Typography>
          <Typography variant="body1">Preparando tu entorno de investigación...</Typography>
        </Backdrop>
      </Box>
    </Paper>
  );
};


export default function Dashboard({ user }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [currentView, setCurrentView] = useState('investigador'); 
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasValidAccess, setHasValidAccess] = useState(false);
  const [userPlan, setUserPlan] = useState('basico'); 
  const [isVip, setIsVip] = useState(false);
  const [isTrial, setIsTrial] = useState(false);

  const [chatHistory, setChatHistory] = useState([]);
  const [anaHistory, setAnaHistory] = useState([]);
  const [preHistory, setPreHistory] = useState([]);
  
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

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

  if (isCheckingAccess) return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: '#101852' }}>
      <CircularProgress size={60} sx={{ color: 'white' }} />
      <Typography sx={{ mt: 3, color: 'white', fontWeight: 600 }}>Cargando su entorno legal...</Typography>
    </Box>
  );

  if (!hasValidAccess) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', bgcolor: '#f3f4f6', py: 4 }}>
      <Elements stripe={stripePromise}><InAppCheckout user={user} /></Elements>
    </Box>
  );

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
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} user={user} />

      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <Box component="header" sx={{ 
          height: 70, bgcolor: 'white', borderBottom: '1px solid #E5E7EB', 
          display: 'flex', alignItems: 'center', px: { xs: 2, md: 4 }, gap: 2, zIndex: 1100 
        }}>
          
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

          {currentView !== 'cuenta' && (
            <>
              <Button 
                variant="outlined" color="inherit" startIcon={<HistoryIcon />} size="small"
                onClick={handleMenuOpen}
                sx={{ ...headerBtnSx, borderColor: '#E2E8F0', color: 'text.secondary' }}
              >
                {!isMobile && 'Historial de consultas'} <ArrowDownIcon sx={{ ml: 'auto' }} />
              </Button>
              <Menu
                anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose}
                sx={{ zIndex: 200000 }} 
                PaperProps={{ sx: { width: 320, maxHeight: 450, borderRadius: 3, mt: 1, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' } }}
              >
                <Typography variant="overline" sx={{ px: 2, py: 1, display: 'block', fontWeight: 800, color: 'text.disabled' }}>Registros Recientes</Typography>
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
                    <IconButton 
                        size="small" 
                        color="error" 
                        onClick={(e) => deleteItem(currentView === 'investigador' ? 'chat' : currentView === 'analizador' ? 'ana' : 'pre', item.id, e)}
                    >
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
    </Box>
  );
}