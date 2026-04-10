import React, { useState } from 'react';
import { auth, googleProvider } from '../config/firebase';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { STRIPE_PRICES, PIDA_CONFIG } from '../config/constants';
import { Box, TextField, Button, CircularProgress } from '@mui/material';

// Asegúrate de usar la llave pública correcta para tu entorno
const stripePromise = loadStripe('pk_live_51QriCdGgaloBN5L8XyzW4M1QePJK316USJg3kjrZGFGln3bhwEQKnpoNXf2MnLXGHylM1OQ6SvWJmNVCNqhCxg6x000l605E1B');

const cardStyle = {
  style: {
    base: { fontSize: '16px', fontFamily: '"Inter", sans-serif', color: 'var(--pida-primary)', '::placeholder': { color: '#94A3B8' } },
    invalid: { color: '#EF4444' },
  },
  hidePostalCode: true
};

function AuthFormContent({ onClose, initialMode }) {
  const stripe = useStripe();
  const elements = useElements();

  const [mode, setMode] = useState(initialMode || 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState({ text: '', type: '' });
  const [discountData, setDiscountData] = useState(null);

  const [plan, setPlan] = useState(sessionStorage.getItem('pida_pending_plan') || 'basico');
  const [interval, setInterval] = useState(sessionStorage.getItem('pida_pending_interval') || 'monthly');
  
  const rawCurrency = localStorage.getItem('pida_currency');
  const currency = ['USD', 'MXN'].includes(rawCurrency) ? rawCurrency : 'USD';
  
  const planDetails = STRIPE_PRICES[plan]?.[interval]?.[currency] || STRIPE_PRICES['basico']['monthly']['USD'];

  // --- LÓGICA DE GOOGLE LOGIN (INTACTA) ---
  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    setLoadingText('Conectando...');
    try {
      await auth.signInWithPopup(googleProvider);
      onClose();
    } catch (err) {
      setError('No se pudo iniciar sesión con Google.');
      setIsLoading(false);
    } 
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoMessage({ text: 'Validando...', type: 'info' });
    try {
      const res = await fetch(`${PIDA_CONFIG.API_CHAT}/validate-promo-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim(), priceId: planDetails.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Código inválido');

      setDiscountData(data);
      setPromoMessage({ text: `✅ Cupón aplicado: ${data.description}`, type: 'success' });
    } catch (err) {
      setDiscountData(null);
      setPromoMessage({ text: `❌ ${err.message}`, type: 'error' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'reset') {
        setLoadingText('Enviando...');
        await auth.sendPasswordResetEmail(email);
        setError('✅ Enlace enviado. Revisa tu correo.');
        setIsLoading(false);
        return;
      } 
      
      // --- LÓGICA DE LOGIN NORMAL (INTACTA) ---
      if (mode === 'login') {
        setLoadingText('Ingresando...');
        await auth.signInWithEmailAndPassword(email, password);
        onClose();
        return;
      }

      // --- LÓGICA DE REGISTRO (CON VALIDACIÓN PREVIA DE STRIPE) ---
      if (mode === 'register') {
        if (!termsAccepted) throw new Error("Debes aceptar los términos y condiciones.");
        if (!stripe || !elements) throw new Error("Stripe no ha cargado aún.");

        const fullName = `${firstName} ${lastName}`.trim();
        const cardElement = elements.getElement(CardElement);

        setLoadingText('Validando tarjeta...');
        
        // PASO 1: CREAR EL MÉTODO DE PAGO
        const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: { name: fullName, email: email }
        });

        if (stripeError) {
          throw new Error(stripeError.message || "Por favor, ingresa los datos de tu tarjeta correctamente.");
        }

        // PASO 2: CREAR USUARIO EN FIREBASE (Si la tarjeta pasó)
        let user = auth.currentUser;
        if (!user) {
          setLoadingText('Creando cuenta...');
          const cred = await auth.createUserWithEmailAndPassword(email, password);
          user = cred.user;
          await user.updateProfile({ displayName: fullName });
        }

        setLoadingText('Iniciando prueba gratis...');

        const numericValue = discountData ? (discountData.final_amount / 100) : parseFloat(planDetails.text.replace(/[^0-9.-]+/g,""));
        const itemName = `Plan ${plan.toUpperCase()} - ${interval.toUpperCase()}`;

        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'begin_checkout', {
            currency: currency,
            value: numericValue,
            items: [{ item_id: planDetails.id, item_name: itemName, price: numericValue, quantity: 1 }]
          });
        }

        // PASO 3: COBRAR VÍA BACKEND
        const token = await user.getIdToken();
        const intentRes = await fetch(`${PIDA_CONFIG.API_CHAT}/create-payment-intent`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            priceId: planDetails.id, 
            currency: currency.toLowerCase(),
            plan_key: plan,
            trial_period_days: 5,
            name: fullName,
            promotion_code: discountData ? promoCode : "",
            paymentMethodId: paymentMethod.id 
          })
        });

        const data = await intentRes.json();
        if (!intentRes.ok) throw new Error(data.detail || "Error al procesar el pago");

        let transactionId = data.subscriptionId || "sub_unknown";

        // PASO 4: CONFIRMAR CON SEGURIDAD (ANTI PANTALLA BLANCA)
        if (data.requiresAction && data.clientSecret) {
          setLoadingText('Confirmando seguridad bancaria...');
          let result;
          if (data.clientSecret.startsWith('seti_')) {
            result = await stripe.confirmCardSetup(data.clientSecret, {
              payment_method: paymentMethod.id
            });
            if (result.error) throw new Error(result.error.message);
            transactionId = result.setupIntent.id;
          } else {
            result = await stripe.confirmCardPayment(data.clientSecret, {
              payment_method: paymentMethod.id
            });
            if (result.error) throw new Error(result.error.message);
            transactionId = result.paymentIntent.id;
          }
        }

        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'purchase', {
            transaction_id: transactionId,
            currency: currency,
            value: numericValue,
            items: [{ item_id: planDetails.id, item_name: itemName, price: numericValue, quantity: 1 }]
          });
        }

        setLoadingText('¡Suscripción activada!');
        sessionStorage.setItem('pida_is_onboarding', 'true');
        setTimeout(() => { window.location.href = window.location.pathname + "?payment_status=success"; }, 1500);
      }

    } catch (err) {
      console.error("AuthModal Error:", err);
      
      let msg = err.message || "Ocurrió un error inesperado al procesar la solicitud.";
      
      if (err.code === 'auth/user-not-found') {
          msg = "No encontramos una cuenta con este correo. Recuerda que PIDA es premium, debes adquirir un plan primero.";
      } else if (err.code === 'auth/email-already-in-use') {
          msg = "Este correo ya está registrado. Haz clic en 'Volver al login' (abajo), ingresa tu correo y contraseña, y completa tu pago.";
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          msg = "Datos incorrectos. Revisa tu correo y contraseña.";
      }
      
      setError(msg);
      setIsLoading(false);
    }
  };

  return (
    <>
      <h2 className="modal-title">
        {mode === 'login' && ''}
        {mode === 'register' && ''} 
        {mode === 'reset' && 'Recuperar Contraseña'}
      </h2>
      <p className="modal-subtitle">
        {mode === 'register' ? 'Ingresa tus datos y elige tu plan para comenzar tu prueba de 5 días.' : 'Accede para continuar tu investigación.'}
      </p>

      {mode === 'login' && (
        <div className="modal-info-banner">
          <span className="modal-info-title">¿Aún no tienes cuenta?</span>
          <p className="modal-info-text">
            PIDA es una plataforma premium. Para registrarte, primero debes seleccionar un plan.<br/>
            <button type="button" className="modal-link-btn" onClick={() => { onClose(); window.location.href = '/#planes'; }}>
              Explorar planes y pruebas gratis →
            </button>
          </p>
        </div>
      )}

      {mode === 'login' && (
        <>
          <button className="login-btn google-btn" onClick={handleGoogleLogin} disabled={isLoading}>
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" style={{width: '18px'}}/> 
            <span>{isLoading ? loadingText : 'Entrar con Google'}</span>
          </button>
          <div className="login-divider"><span>O usa tu correo</span></div>
        </>
      )}

      <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
        
        {mode === 'register' && (
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField label="Nombre" variant="outlined" size="small" fullWidth required value={firstName} onChange={e => setFirstName(e.target.value)} sx={{ bgcolor: '#FAFAFA' }} />
            <TextField label="Apellido" variant="outlined" size="small" fullWidth required value={lastName} onChange={e => setLastName(e.target.value)} sx={{ bgcolor: '#FAFAFA' }} />
          </Box>
        )}

        <TextField type="email" label="Correo electrónico" variant="outlined" size="small" fullWidth required value={email} onChange={e => setEmail(e.target.value)} sx={{ bgcolor: '#FAFAFA', mb: 2 }} />
        
        {mode !== 'reset' && (
          <Box sx={{ position: 'relative', mb: 2 }}>
            <TextField type="password" label="Contraseña" variant="outlined" size="small" fullWidth required value={password} onChange={e => setPassword(e.target.value)} sx={{ bgcolor: '#FAFAFA' }} />
            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginTop: '8px', marginBottom: '8px' }}>
                <span onClick={() => { setMode('reset'); setError(''); }} style={{ fontSize: '0.85rem', color: 'var(--pida-accent)', cursor: 'pointer', fontWeight: '500' }}>¿Olvidaste tu contraseña?</span>
              </div>
            )}
          </Box>
        )}

        {mode === 'register' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            
            <div style={{ marginBottom: '20px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--navy)', marginBottom: '8px', display: 'block' }}>Elige tu Plan</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '15px' }}>
                {['basico', 'avanzado', 'premium'].map((p) => (
                  <button key={p} type="button" onClick={() => { setPlan(p); setDiscountData(null); setPromoCode(''); setPromoMessage({text:'', type:''}); }} style={{
                    padding: '10px 2px', borderRadius: '8px', border: `2px solid ${plan === p ? 'var(--pida-primary)' : '#E2E8F0'}`,
                    background: plan === p ? '#F0F7FF' : 'white', cursor: 'pointer', transition: '0.2s', 
                    fontWeight: '600', color: plan === p ? 'var(--pida-primary)' : '#64748B', fontSize: '0.8rem', textTransform: 'capitalize', textAlign: 'center'
                  }}>
                    {p === 'basico' ? 'Básico' : p}
                  </button>
                ))}
              </div>

              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--navy)', marginBottom: '8px', display: 'block' }}>Ciclo de facturación</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                <button type="button" onClick={() => { setInterval('monthly'); setDiscountData(null); setPromoCode(''); setPromoMessage({text:'', type:''}); }} style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: `2px solid ${interval === 'monthly' ? 'var(--pida-primary)' : '#E2E8F0'}`,
                  background: interval === 'monthly' ? '#F0F7FF' : 'white', cursor: 'pointer', fontWeight: '600', color: interval === 'monthly' ? 'var(--pida-primary)' : '#64748B', fontSize: '0.85rem'
                }}>Mensual</button>
                
                <button type="button" onClick={() => { setInterval('annual'); setDiscountData(null); setPromoCode(''); setPromoMessage({text:'', type:''}); }} style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: `2px solid ${interval === 'annual' ? 'var(--pida-primary)' : '#E2E8F0'}`,
                  background: interval === 'annual' ? '#F0F7FF' : 'white', cursor: 'pointer', position: 'relative', fontWeight: '600', color: interval === 'annual' ? 'var(--pida-primary)' : '#64748B', fontSize: '0.85rem'
                }}>
                  Anual
                  <span style={{ position: 'absolute', top: '-10px', right: '-5px', background: '#10B981', color: 'white', fontSize: '0.55rem', padding: '2px 6px', borderRadius: '8px', fontWeight: '800', border: '1px solid white', whiteSpace: 'nowrap' }}>AHORRA ~20%</span>
                </button>
              </div>
            </div>

            <div className="auth-summary-box" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '15px', borderRadius: '10px', marginBottom: '15px' }}>
              <div className="auth-summary-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="auth-summary-label" style={{ color: '#166534', fontWeight: '600', fontSize: '0.9rem' }}>Total a pagar hoy:</span>
                <span style={{ fontWeight: '800', color: '#166534', fontSize: '1.1rem' }}>$0.00 (Prueba 5 días)</span>
              </div>
              <p style={{ fontSize: '0.75rem', marginTop: '10px', color: '#15803d', lineHeight: '1.4' }}>
                Después de la prueba se cobrarán <strong><span style={{ textDecoration: discountData ? 'line-through' : 'none', opacity: discountData ? 0.7 : 1 }}>{planDetails.text}</span> {discountData && <>{new Intl.NumberFormat(currency === 'MXN' ? 'es-MX' : 'en-US', { style: 'currency', currency }).format(discountData.final_amount / 100)}</>}</strong> cada {interval === 'monthly' ? 'mes' : 'año'}.
              </p>
              {discountData && (
                <div className="auth-discount-badge" style={{ marginTop: '8px', background: '#DCFCE7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', display: 'inline-block', fontWeight: 'bold' }}>
                  Cupón: {discountData.description}
                </div>
              )}
            </div>

            <label className="input-label" style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', color: 'var(--navy)', marginBottom: '8px' }}>Datos de la tarjeta</label>
            <div className="stripe-element-box" style={{ padding: '12px', border: '1px solid #CBD5E1', borderRadius: '8px', marginBottom: '15px' }}>
              <CardElement options={cardStyle} />
            </div>

            <div className="promo-group" style={{ display: 'flex', flexDirection: 'row', gap: '8px', marginBottom: '10px', alignItems: 'stretch' }}>
              <TextField 
                label="Código de descuento" variant="outlined" size="small"
                value={promoCode} onChange={e => setPromoCode(e.target.value)} disabled={!!discountData || isLoading}
                sx={{ flex: 1, bgcolor: '#FAFAFA', '& input': { textTransform: 'uppercase' } }}
              />
              <Button 
                type="button" variant="outlined" onClick={handleApplyPromo} disabled={!!discountData || !promoCode || isLoading}
                sx={{ textTransform: 'none', fontWeight: 600, px: 2, borderColor: '#CBD5E1', color: 'var(--pida-text-muted)', '&:hover': { borderColor: 'var(--pida-primary)', backgroundColor: 'transparent' } }}
              >
                {discountData ? '✓ Aplicado' : 'Aplicar'}
              </Button>
            </div>
            {promoMessage.text && <div style={{ fontSize: '0.8rem', color: promoMessage.type === 'error' ? '#EF4444' : '#10B981', marginBottom: '15px' }}>{promoMessage.text}</div>}

            <div className="terms-group" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '15px', marginBottom: '15px' }}>
              <input type="checkbox" style={{ marginTop: '4px' }} required checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} />
              <label style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: '1.4', cursor: 'pointer' }} onClick={() => setTermsAccepted(!termsAccepted)}>
                Acepto los <a href="/terminos.html" target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ color: 'var(--pida-primary)', textDecoration: 'underline' }}>términos de uso</a> y la <a href="/privacidad.html" target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ color: 'var(--pida-primary)', textDecoration: 'underline' }}>política de privacidad</a>.
              </label>
            </div>
          </div>
        )}

        {error && <div className="status-msg error" style={{ color: '#EF4444', fontSize: '0.85rem', background: '#FEF2F2', padding: '10px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #FECACA' }}>{error}</div>}

        <button type="submit" className="form-submit-btn pida-button-primary" style={{ width: '100%', padding: '14px', fontSize: '1rem' }} disabled={isLoading || (!stripe && mode === 'register')}>
          {isLoading ? loadingText : (mode === 'login' ? 'Ingresar' : mode === 'register' ? 'Activar cuenta y probar 5 días' : 'Enviar enlace')}
        </button>
      </form>

      <div className="bottom-link" style={{ textAlign: 'center', marginTop: '20px' }}>
        {mode === 'reset' && <span style={{ cursor: 'pointer', color: 'var(--pida-primary)', fontSize: '0.9rem', fontWeight: '500' }} onClick={() => { setMode('login'); setError(''); }}>← Volver al login</span>}
        {mode === 'register' && <span style={{ cursor: 'pointer', color: 'var(--pida-primary)', fontSize: '0.9rem', fontWeight: '500' }} onClick={() => { setMode('login'); setError(''); }}>← Ya tengo cuenta, iniciar sesión</span>}
      </div>

      {isLoading && (
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(4px)', 
          zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', borderRadius: '16px' 
        }}>
          <CircularProgress size={60} thickness={4} sx={{ color: 'var(--pida-primary)', mb: 3 }} />
          <h3 style={{ color: 'var(--navy)', fontWeight: 700, fontSize: '1.25rem', margin: '0 0 10px 0', textAlign: 'center' }}>
            {loadingText}
          </h3>
          <p style={{ color: '#64748B', fontSize: '0.95rem', textAlign: 'center', maxWidth: '80%', margin: 0 }}>
            Procesando de forma segura.<br/>Por favor, no cierres esta ventana.
          </p>
        </Box>
      )}
    </>
  );
}

export default function AuthModal({ isOpen, initialMode = 'login', onClose }) {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" onClick={onClose} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', width: '90%', padding: '30px', background: 'white', borderRadius: '16px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748B' }}>×</button>
        <img src="/img/PIDA_logo-100-blue-red.webp" alt="PIDA Logo" style={{ width: '140px', marginBottom: '25px', display: 'block', margin: '0 auto' }} />
        <Elements stripe={stripePromise}>
          <AuthFormContent onClose={onClose} initialMode={initialMode} />
        </Elements>
      </div>
    </div>
  );
}