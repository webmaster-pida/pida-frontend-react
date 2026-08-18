import React, { useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../config/firebase';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { STRIPE_PRICES, PIDA_CONFIG } from '../config/constants';
import { Box, TextField, Button, CircularProgress, Backdrop, Typography } from '@mui/material';

const stripePromise = loadStripe('pk_live_51QriCdGgaloBN5L8XyzW4M1QePJK316USJg3kjrZGFGln3bhwEQKnpoNXf2MnLXGHylM1OQ6SvWJmNVCNqhCxg6x000l605E1B');
// const stripePromise = loadStripe('pk_test_51RMB12GaDEQrzamxhgBfRodlN2Es6kmTYJIB5XUouHAoGNzj2Fcgcz116sIbY3UeeKRIMESrHkSy4zmb9RSwQ2Ql00mK5e53gD');

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

  // 👇 RASTREADOR EN TIEMPO REAL: Escucha la activación hecha en la pestaña secundaria
  useEffect(() => {
    let pollingInterval = null;

    if (mode === 'verify-email') {
      pollingInterval = setInterval(async () => {
        if (auth.currentUser) {
          await auth.currentUser.reload(); 
          if (auth.currentUser.emailVerified) {
            setMode('checkout'); // Avanza solo al formulario de cobro
            clearInterval(pollingInterval);
          }
        }
      }, 2500); // Revisa cada 3 segundos de forma segura
    }

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [mode]);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    setLoadingText('Conectando...');
    try {
      const result = await auth.signInWithPopup(googleProvider);
      
      if (sessionStorage.getItem('pida_pending_plan')) {
        // Verificar si ya es usuario con acceso o VIP
        setLoadingText('Verificando acceso...');
        const user = result.user;
        let hasAccess = false;
        
        try {
          const token = await user.getIdToken();
          const vipRes = await fetch(`${PIDA_CONFIG.API_CHAT}/check-vip-access`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (vipRes.ok) {
            const vipData = await vipRes.json();
            if (vipData.is_vip_user) hasAccess = true;
          }
          
          if (!hasAccess) {
            const doc = await db.collection('customers').doc(user.uid).get();
            if (doc.exists) {
              const data = doc.data();
              if (data.status === 'active' || data.status === 'trialing') {
                hasAccess = true;
              }
            }
          }
        } catch (e) {
          console.error("Error al verificar acceso de usuario de Google:", e);
        }

        if (hasAccess) {
          // Ya tiene plan, omitir checkout
          sessionStorage.removeItem('pida_pending_plan');
          sessionStorage.removeItem('pida_pending_interval');
          onClose(true);
        } else {
          setMode('checkout');
          setIsLoading(false);
        }
      } else {
        onClose();
      }
    } catch (err) {
      setError('No se pudo iniciar sesión con Google.');
      setIsLoading(false);
    } 
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    const cleanCode = promoCode.trim().toUpperCase();
    setPromoMessage({ text: 'Validando...', type: 'info' });
    try {
      const res = await fetch(`${PIDA_CONFIG.API_CHAT}/validate-promo-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, priceId: planDetails.id })
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

  const handleResendVerification = async () => {
    setError('');
    try {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        const fullName = auth.currentUser.displayName || '';
        await fetch(`${PIDA_CONFIG.API_CHAT}/send-verification-email`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            frontend_url: window.location.origin,
            display_name: fullName
          })
        });
        setError('✅ Enlace de verificación reenviado. Revise su bandeja de entrada.');
      }
    } catch (err) {
      setError('Error al intentar reenviar el correo de verificación.');
    }
  };

  const handleFormSubmit = async (e) => {
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
      
      if (mode === 'login') {
        setLoadingText('Ingresando...');
        const cred = await auth.signInWithEmailAndPassword(email, password);
        
        if (!cred.user.emailVerified) {
          const token = await cred.user.getIdToken();
          const fullName = cred.user.displayName || '';
          fetch(`${PIDA_CONFIG.API_CHAT}/send-verification-email`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              frontend_url: window.location.origin,
              display_name: fullName
            })
          }).catch(err => console.error("Error enviando email en segundo plano:", err));
          
          setMode('verify-email');
          setError('⚠️ Tu correo electrónico no está verificado. Te hemos enviado un enlace de activación.');
          setIsLoading(false);
          return;
        }

        if (sessionStorage.getItem('pida_pending_plan')) {
          setLoadingText('Verificando acceso...');
          const user = cred.user;
          let hasAccess = false;
          
          try {
            const token = await user.getIdToken();
            const vipRes = await fetch(`${PIDA_CONFIG.API_CHAT}/check-vip-access`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (vipRes.ok) {
              const vipData = await vipRes.json();
              if (vipData.is_vip_user) hasAccess = true;
            }
            
            if (!hasAccess) {
              const doc = await db.collection('customers').doc(user.uid).get();
              if (doc.exists) {
                const data = doc.data();
                if (data.status === 'active' || data.status === 'trialing') {
                  hasAccess = true;
                }
              }
            }
          } catch (e) {
            console.error("Error al verificar acceso de usuario:", e);
          }

          if (hasAccess) {
            onClose(true);
          } else {
            setMode('checkout');
            setIsLoading(false);
          }
          return;
        }

        onClose();
        return;
      }

      if (mode === 'register') {
        setLoadingText('Creando cuenta...');
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        const user = cred.user;
        
        await user.updateProfile({ displayName: `${firstName} ${lastName}`.trim() });

        const token = await user.getIdToken();
        const fullName = `${firstName} ${lastName}`.trim();

        // 👇 LLAMADA EN SEGUNDO PLANO (sin await) PARA NO BLOQUEAR EL FLUJO
        fetch(`${PIDA_CONFIG.API_CHAT}/send-verification-email`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            frontend_url: window.location.origin,
            display_name: fullName
          })
        }).catch(err => console.error("Error enviando email en segundo plano:", err));
        
        setMode('checkout');
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.error("AuthModal Error:", err);
      let msg = err.message || "Ocurrió un error inesperado al procesar la solicitud.";
      if (err.code === 'auth/user-not-found') {
          msg = "No encontramos una cuenta con este correo. Recuerda que PIDA es premium, debes adquirir un plan primero.";
      } else if (err.code === 'auth/email-already-in-use') {
          msg = "Esta dirección de correo electrónico ya cuenta con un registro en PIDA.";
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          msg = "Datos incorrectos. Revisa tu correo y contraseña.";
      } else if (err.code === 'auth/too-many-requests') {
          msg = "Por motivos de seguridad institucional y prevención de accesos no autorizados, el acceso se ha pausado temporalmente tras varios intentos fallidos. Por favor, espere unos minutos antes de volver a intentarlo o restablezca su contraseña.";
      }
      setError(msg);
      setIsLoading(false);
    }
  };

  const handleCheckVerification = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setLoadingText('Sincronizando estado...');
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          setMode('checkout');
          setError('');
        } else {
          throw new Error("Tu correo electrónico aún no figura como verificado. Por favor, haz clic en el enlace enviado a tu bandeja.");
        }
      } else {
        setMode('login');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!termsAccepted) { setError("Debes aceptar los términos y condiciones."); return; }
    if (!stripe || !elements) { setError("Stripe no ha cargado aún."); return; }

    setError('');
    setIsLoading(true);
    setLoadingText('Validando tarjeta...');

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Sesión expirada. Por favor, inicia sesión nuevamente.");
      
      await user.reload();

      const fullName = user.displayName || `${firstName} ${lastName}`.trim();
      const cardElement = elements.getElement(CardElement);

      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: { name: fullName, email: user.email }
      });

      if (stripeError) {
        throw new Error(stripeError.message || "Por favor, ingresa los datos de tu tarjeta correctamente.");
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

      const token = await user.getIdToken(true);
      const intentRes = await fetch(`${PIDA_CONFIG.API_CHAT}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          priceId: planDetails.id, 
          currency: currency.toLowerCase(),
          plan_key: plan,
          trial_period_days: 5,
          name: fullName,
          promotion_code: discountData ? promoCode.trim() : "",
          paymentMethodId: paymentMethod.id 
        })
      });

      const data = await intentRes.json();
      if (!intentRes.ok) throw new Error(data.detail || "Error al procesar el pago");

      let transactionId = data.subscriptionId || "sub_unknown";

      if (data.requiresAction && data.clientSecret) {
        setLoadingText('Confirmando seguridad bancaria...');
        let result;
        if (data.clientSecret.startsWith('seti_')) {
          result = await stripe.confirmCardSetup(data.clientSecret, { payment_method: paymentMethod.id });
          if (result.error) throw new Error(result.error.message);
          transactionId = result.setupIntent.id;
        } else {
          result = await stripe.confirmCardPayment(data.clientSecret, { payment_method: paymentMethod.id });
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
      
      setTimeout(() => {
        setIsLoading(false);
        onClose(); 
      }, 1500);

    } catch (err) {
      setError(err.message || "Error procesando la transacción.");
      setIsLoading(false);
    }
  };

  return (
    <>
      <h2 className="modal-title" style={{ textAlign: 'center', fontWeight: '700', color: 'var(--navy)' }}>
        {mode === 'login' && 'Iniciar Sesión'}
        {mode === 'register' && 'Crear tu Cuenta'} 
        {mode === 'verify-email' && 'Verifica tu Correo'}
        {mode === 'checkout' && 'Configura tu Suscripción'}
        {mode === 'reset' && 'Recuperar Contraseña'}
      </h2>
      <p className="modal-subtitle" style={{ textAlign: 'center', color: '#64748B', marginBottom: '20px', fontSize: '0.9rem' }}>
        {mode === 'register' && 'Ingresa tus datos iniciales de acceso para comenzar el asistente.'}
        {mode === 'verify-email' && 'PIDA requiere una dirección de correo real para mantener contacto institucional seguro.'}
        {mode === 'checkout' && '¡Correo verificado con éxito! Estás a un paso de activar tus 5 días gratis.'}
        {mode === 'login' && 'Accede para continuar tu investigación.'}
      </p>

      {mode === 'login' && (
        <div className="modal-info-banner" style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #E2E8F0' }}>
          <span className="modal-info-title" style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--navy)' }}>¿Aún no tienes cuenta?</span>
          <p className="modal-info-text" style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
            PIDA es una plataforma premium. Para registrarte, primero debes seleccionar un plan.<br/>
            <button type="button" className="modal-link-btn" onClick={() => { onClose(false); window.location.href = '/'; }} style={{ background: 'none', border: 'none', color: 'var(--pida-primary)', fontWeight: '600', cursor: 'pointer', padding: 0, marginTop: '4px' }}>
              Explorar planes y pruebas gratis →
            </button>
          </p>
        </div>
      )}

      {mode === 'login' && (
        <>
          <button className="login-btn google-btn" onClick={handleGoogleLogin} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', padding: '10px', border: '1px solid #CBD5E1', borderRadius: '8px', background: 'white', fontWeight: '600', cursor: 'pointer' }}>
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" style={{width: '18px'}}/> 
            <span>Entrar con Google</span>
          </button>
          <div className="login-divider" style={{ textAlign: 'center', margin: '15px 0', position: 'relative' }}><span style={{ background: 'white', padding: '0 10px', fontSize: '0.8rem', color: '#94A3B8' }}>O usa tu correo</span></div>
        </>
      )}

      <form onSubmit={mode === 'verify-email' ? handleCheckVerification : mode === 'checkout' ? handleProcessPayment : handleFormSubmit} style={{ textAlign: 'left' }}>
        
        {mode === 'register' && (
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField label="Nombre" variant="outlined" size="small" fullWidth required value={firstName} onChange={e => setFirstName(e.target.value)} sx={{ bgcolor: '#FAFAFA' }} />
            <TextField label="Apellido" variant="outlined" size="small" fullWidth required value={lastName} onChange={e => setLastName(e.target.value)} sx={{ bgcolor: '#FAFAFA' }} />
          </Box>
        )}

        {(mode === 'login' || mode === 'register' || mode === 'reset') && (
          <TextField type="email" label="Correo electrónico" variant="outlined" size="small" fullWidth required value={email} onChange={e => setEmail(e.target.value)} sx={{ bgcolor: '#FAFAFA', mb: 2 }} />
        )}
        
        {(mode === 'login' || mode === 'register') && (
          <Box sx={{ position: 'relative', mb: 2 }}>
            <TextField type="password" label="Contraseña" variant="outlined" size="small" fullWidth required value={password} onChange={e => setPassword(e.target.value)} sx={{ bgcolor: '#FAFAFA' }} />
            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginTop: '8px' }}>
                <span onClick={() => { setMode('reset'); setError(''); }} style={{ fontSize: '0.85rem', color: 'var(--pida-accent)', cursor: 'pointer', fontWeight: '500' }}>¿Olvidaste tu contraseña?</span>
              </div>
            )}
          </Box>
        )}

        {mode === 'verify-email' && (
          <Box sx={{ textAlign: 'center', py: 3, px: 2, bgcolor: '#F0F9FF', borderRadius: '12px', border: '1px solid #BAE6FD', mb: 3 }}>
            <Typography variant="body2" sx={{ color: '#0369A1', fontWeight: '600', lineHeight: 1.6 }}>
              Hemos enviado un enlace de activación al correo electrónico: <br />
              <strong style={{ fontSize: '1rem', color: 'var(--navy)' }}>{email || (auth.currentUser && auth.currentUser.email)}</strong>
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#0284C7', fontSize: '0.8rem', lineHeight: 1.5 }}>
              Por favor, abre el mensaje en tu bandeja y haz clic en <strong>Complete Verification</strong>.<br />
              <span style={{ color: '#0369A1', fontWeight: 'bold' }}>⚡ ¡Esta pantalla avanzará sola automáticamente cuando hagas clic en tu correo!</span>
            </Typography>
            <Button size="small" variant="text" onClick={handleResendVerification} sx={{ mt: 2, textTransform: 'none', fontWeight: '600', color: '#0369A1', '&:hover': { textDecoration: 'underline' } }}>
              Reenviar enlace de verificación
            </Button>
          </Box>
        )}

        {mode === 'checkout' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ marginBottom: '20px', paddingTop: '10px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--navy)', marginBottom: '8px', display: 'block' }}>Confirma tu Plan</label>
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
            <div className="stripe-element-box" style={{ padding: '12px', border: '1px solid #CBD5E1', borderRadius: '8px', marginBottom: '8px' }}>
              <CardElement options={cardStyle} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '15px', color: '#166534', fontSize: '0.78rem', fontWeight: '500' }}>
              🔒 Procesamiento seguro y cifrado con tecnología Stripe
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

        {error && <div className="status-msg error" style={{ color: '#EF4444', fontSize: '0.85rem', background: '#FEF2F2', padding: '10px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #FECACA', textAlign: 'center' }}>{error}</div>}

        <button type="submit" className="form-submit-btn pida-button-primary" style={{ width: '100%', padding: '14px', fontSize: '1rem', cursor: 'pointer', border: 'none', borderRadius: '8px', background: 'var(--pida-primary)', color: 'white', fontWeight: '600' }} disabled={isLoading || (!stripe && mode === 'checkout')}>
          {isLoading ? loadingText : (
            mode === 'login' ? 'Ingresar' : 
            mode === 'register' ? 'Registrar mi cuenta' : 
            mode === 'verify-email' ? 'Ya lo verifiqué, continuar' :
            mode === 'checkout' ? 'Comenzar 5 días gratis — $0.00 hoy' : 'Enviar enlace'
          )}
        </button>

        {mode === 'verify-email' && (
          <button type="button" onClick={() => setMode('checkout')} style={{ width: '100%', padding: '10px', marginTop: '10px', fontSize: '0.9rem', cursor: 'pointer', border: '1px solid #CBD5E1', borderRadius: '8px', background: 'transparent', color: '#475569', fontWeight: '600' }}>
            Omitir por ahora y configurar suscripción →
          </button>
        )}

        {mode === 'checkout' && (
          <div style={{ color: '#64748B', fontSize: '0.78rem', marginTop: '8px', textAlign: 'center' }}>
            No se realiza ningún cobro hoy. Cancela en cualquier momento con un clic.
          </div>
        )}
      </form>

      <div className="bottom-link" style={{ textAlign: 'center', marginTop: '20px' }}>
        {(mode === 'reset' || mode === 'verify-email' || mode === 'checkout') && (
          <span style={{ cursor: 'pointer', color: 'var(--pida-primary)', fontSize: '0.9rem', fontWeight: '500' }} onClick={() => { setMode('login'); setError(''); setDiscountData(null); setPromoCode(''); setPromoMessage({text:'', type:''}); }}>← Volver al login</span>
        )}
        {mode === 'register' && (
          <span style={{ cursor: 'pointer', color: 'var(--pida-primary)', fontSize: '0.9rem', fontWeight: '500' }} onClick={() => { setMode('login'); setError(''); setDiscountData(null); setPromoCode(''); setPromoMessage({text:'', type:''}); }}>¿Ya dispone de una cuenta? Inicie sesión aquí</span>
        )}
        {mode === 'login' && (
          <span style={{ cursor: 'pointer', color: 'var(--pida-primary)', fontSize: '0.9rem', fontWeight: '500' }} onClick={() => { 
            if (!sessionStorage.getItem('pida_pending_plan')) {
              onClose(false);
              window.location.href = '/#planes';
            } else {
              setMode('register'); 
              setError(''); 
            }
          }}>¿No dispone de una cuenta? Seleccione un plan aquí</span>
        )}
      </div>

      <Backdrop
        sx={{ 
          color: '#fff', 
          zIndex: 2500, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(29, 53, 87, 0.95)', 
          backdropFilter: 'blur(5px)'
        }}
        open={isLoading}
      >
        <CircularProgress size={70} thickness={4} sx={{ color: 'white', mb: 3 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}>
          {loadingText || 'Procesando...'}
        </Typography>
      </Backdrop>
    </>
  );
}

export default function AuthModal({ isOpen, initialMode = 'login', onClose }) {
  if (!isOpen) return null;

  const handleClose = (success = false) => {
    const isSuccess = typeof success === 'boolean' ? success : false;
    onClose(isSuccess);
  };

  return (
    <div className="modal-backdrop" onClick={() => handleClose(false)} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 2000 }}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', width: '90%', padding: '30px', background: 'white', borderRadius: '16px', position: 'relative', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <button onClick={() => handleClose(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748B' }}>×</button>
        <img src="/img/PIDA_logo-100-blue-red.webp" alt="PIDA Logo" style={{ width: '140px', marginBottom: '25px', display: 'block', margin: '0 auto' }} />
        <Elements stripe={stripePromise}>
          <AuthFormContent onClose={handleClose} initialMode={initialMode} />
        </Elements>
      </div>
    </div>
  );
}