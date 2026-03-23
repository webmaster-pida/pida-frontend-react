import React, { useState } from 'react';
import { auth, googleProvider } from '../config/firebase';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { STRIPE_PRICES, PIDA_CONFIG } from '../config/constants';

const stripePromise = loadStripe('pk_live_51QriCdGgaloBN5L8XyzW4M1QePJK316USJg3kjrZGFGln3bhwEQKnpoNXf2MnLXGHylM1OQ6SvWJmNVCNqhCxg6x000l605E1B');

const cardStyle = {
  style: {
    base: { fontSize: '16px', fontFamily: '"Inter", sans-serif', color: '#1D3557', '::placeholder': { color: '#94A3B8' } },
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

  // Convertimos en estados para permitir cambios de última hora
  const [plan, setPlan] = useState(sessionStorage.getItem('pida_pending_plan') || 'basico');
  const [interval, setInterval] = useState(sessionStorage.getItem('pida_pending_interval') || 'monthly');
  
  const rawCurrency = localStorage.getItem('pida_currency');
  const currency = ['USD', 'MXN'].includes(rawCurrency) ? rawCurrency : 'USD';
  
  const planDetails = STRIPE_PRICES[plan]?.[interval]?.[currency] || STRIPE_PRICES['basico']['monthly']['USD'];

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
      
      if (mode === 'login') {
        setLoadingText('Ingresando...');
        await auth.signInWithEmailAndPassword(email, password);
        onClose();
        return;
      }

      if (mode === 'register') {
        if (!termsAccepted) throw new Error("Debes aceptar los términos y condiciones.");
        if (!stripe || !elements) throw new Error("Stripe no ha cargado aún.");

        const fullName = `${firstName} ${lastName}`.trim();
        let user = auth.currentUser;

        if (!user) {
          setLoadingText('Creando cuenta...');
          const cred = await auth.createUserWithEmailAndPassword(email, password);
          user = cred.user;
          await user.updateProfile({ displayName: fullName });
        }

        setLoadingText('Iniciando prueba gratis...');

        // --- INICIO: EVENTOS GOOGLE ANALYTICS ---
        const numericValue = discountData ? (discountData.final_amount / 100) : parseFloat(planDetails.text.replace(/[^0-9.-]+/g,""));
        const itemName = `Plan ${plan.toUpperCase()} - ${interval.toUpperCase()}`;

        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'begin_checkout', {
            currency: currency,
            value: numericValue,
            items: [{
              item_id: planDetails.id,
              item_name: itemName,
              price: numericValue,
              quantity: 1
            }]
          });
        }
        // --- FIN: EVENTOS GOOGLE ANALYTICS ---

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
            promotion_code: discountData ? promoCode : ""
          })
        });

        const data = await intentRes.json();
        if (!intentRes.ok) throw new Error(data.detail || "Error al procesar el pago");

        const cardElement = elements.getElement(CardElement);
        let result;
        
        if (data.clientSecret.startsWith('seti_')) {
          result = await stripe.confirmCardSetup(data.clientSecret, {
            payment_method: { card: cardElement, billing_details: { name: fullName } }
          });
        } else {
          result = await stripe.confirmCardPayment(data.clientSecret, {
            payment_method: { card: cardElement, billing_details: { name: fullName } }
          });
        }

        if (result.error) throw new Error(result.error.message);

        // --- INICIO: EVENTO DE COMPRA GOOGLE ANALYTICS ---
        if (typeof window !== 'undefined' && window.gtag) {
          const transactionId = data.clientSecret.startsWith('seti_') ? result.setupIntent.id : result.paymentIntent.id;
          window.gtag('event', 'purchase', {
            transaction_id: transactionId,
            currency: currency,
            value: numericValue,
            items: [{
              item_id: planDetails.id,
              item_name: itemName,
              price: numericValue,
              quantity: 1
            }]
          });
        }
        // --- FIN: EVENTO DE COMPRA GOOGLE ANALYTICS ---

        setLoadingText('¡Suscripción activada!');
        sessionStorage.setItem('pida_is_onboarding', 'true');
        
        setTimeout(() => { window.location.href = window.location.pathname + "?payment_status=success"; }, 1500);
      }

    } catch (err) {
      console.error(err);
      if (mode === 'register' && auth.currentUser) await auth.signOut();

      let msg = err.message || "Ocurrió un error.";
      if (err.code === 'auth/user-not-found') {
          msg = "No encontramos una cuenta con este correo. Recuerda que PIDA es premium, debes adquirir un plan primero.";
      } else if (err.code === 'auth/email-already-in-use') {
          msg = "Esta cuenta ya existe. Haz clic en 'Volver al login' abajo, ingresa con tu contraseña y podrás pagar desde tu panel de usuario.";
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          msg = "Datos incorrectos. Si eres nuevo, cierra esta ventana y elige un plan para suscribirte.";
      }
      
      setError(msg);
      setIsLoading(false);
    }
  };

  return (
    <>
      <h2 className="modal-title">
        {mode === 'login' && 'Bienvenido de nuevo'}
        {mode === 'register' && 'Completar Suscripción'}
        {mode === 'reset' && 'Recuperar Contraseña'}
      </h2>
      <p className="modal-subtitle">
        {mode === 'register' ? 'Configura tu plan final para activar la prueba.' : 'Accede para continuar tu investigación.'}
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
          <div className="form-group-row">
            <input type="text" className="form-input no-margin" placeholder="Nombre" required value={firstName} onChange={e => setFirstName(e.target.value)} />
            <input type="text" className="form-input no-margin" placeholder="Apellido" required value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
        )}

        <input type="email" className="form-input" placeholder="Correo electrónico" required value={email} onChange={e => setEmail(e.target.value)} />
        
        {mode !== 'reset' && (
          <div style={{ position: 'relative' }}>
            <input type="password" className="form-input" placeholder="Contraseña" required value={password} onChange={e => setPassword(e.target.value)} />
            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginTop: '-5px', marginBottom: '20px' }}>
                <span onClick={() => { setMode('reset'); setError(''); }} style={{ fontSize: '0.85rem', color: 'var(--pida-accent)', cursor: 'pointer', fontWeight: '500' }}>¿Olvidaste tu contraseña?</span>
              </div>
            )}
          </div>
        )}

        {mode === 'register' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            
            {/* NUEVA SECCIÓN DE SELECCIÓN DE ÚLTIMA HORA */}
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--pida-primary)' }}>CONFIGURAR PLAN</span>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '5px' }}>
                <select value={plan} onChange={e => { setPlan(e.target.value); setDiscountData(null); setPromoCode(''); setPromoMessage({text:'', type:''}); }} className="form-input no-margin" style={{ height: '40px', fontSize: '0.85rem' }}>
                   <option value="basico">Plan Básico</option>
                   <option value="avanzado">Plan Avanzado</option>
                   <option value="premium">Plan Premium</option>
                </select>
                <select value={interval} onChange={e => { setInterval(e.target.value); setDiscountData(null); setPromoCode(''); setPromoMessage({text:'', type:''}); }} className="form-input no-margin" style={{ height: '40px', fontSize: '0.85rem' }}>
                   <option value="monthly">Mensual</option>
                   <option value="annual">Anual (Ahorra ~20%)</option>
                </select>
              </div>
            </div>

            <div className="auth-summary-box" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <div className="auth-summary-row">
                <span className="auth-summary-label" style={{ color: '#166534' }}>Total a pagar hoy:</span>
                <span style={{ fontWeight: '800', color: '#166534', fontSize: '1.2rem' }}>$0.00 (Prueba 5 días)</span>
              </div>
              <p style={{ fontSize: '0.75rem', marginTop: '10px', color: '#15803d', lineHeight: '1.4' }}>
                Después de la prueba se cobrarán <strong><span style={{ textDecoration: discountData ? 'line-through' : 'none', opacity: discountData ? 0.7 : 1 }}>{planDetails.text}</span> {discountData && <>{new Intl.NumberFormat(currency === 'MXN' ? 'es-MX' : 'en-US', { style: 'currency', currency }).format(discountData.final_amount / 100)}</>}</strong> cada {interval === 'monthly' ? 'mes' : 'año'}.
              </p>
              {discountData && (
                <div className="auth-discount-badge" style={{ marginTop: '8px' }}>
                  Cupón: {discountData.description}
                </div>
              )}
              <div style={{ clear: 'both' }}></div>
            </div>

            <label className="input-label">Datos de la tarjeta</label>
            <div className="stripe-element-box">
              <CardElement options={cardStyle} />
            </div>

            <div className="promo-group">
              <input type="text" className="promo-input" placeholder="CÓDIGO DE DESCUENTO" value={promoCode} onChange={e => setPromoCode(e.target.value)} disabled={!!discountData || isLoading} />
              <button type="button" className={`promo-btn ${discountData ? 'applied' : ''}`} onClick={handleApplyPromo} disabled={!!discountData || !promoCode || isLoading}>
                {discountData ? '✓ Aplicado' : 'Aplicar'}
              </button>
            </div>
            {promoMessage.text && <div className={`promo-msg ${promoMessage.type}`}>{promoMessage.text}</div>}

            <div className="terms-group">
              <input type="checkbox" className="terms-checkbox" required checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} />
              <label className="terms-label" onClick={() => setTermsAccepted(!termsAccepted)}>
                Acepto los <a href="/terminos.html" target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}>términos de uso</a> y la <a href="/privacidad.html" target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}>política de privacidad</a>.
              </label>
            </div>
          </div>
        )}

        {error && <div className="status-msg error">{error}</div>}

        <button type="submit" className="form-submit-btn" disabled={isLoading || (!stripe && mode === 'register')}>
          {isLoading ? loadingText : (mode === 'login' ? 'Ingresar' : mode === 'register' ? 'Activar cuenta y probar 5 días' : 'Enviar enlace')}
        </button>
      </form>

      <div className="bottom-link">
        {mode === 'reset' && <span onClick={() => { setMode('login'); setError(''); }}>← Volver al login</span>}
        {mode === 'register' && <span onClick={() => { setMode('login'); setError(''); }}>← Ya tengo cuenta, iniciar sesión</span>}
      </div>
    </>
  );
}

export default function AuthModal({ isOpen, initialMode = 'login', onClose }) {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <button className="modal-close-btn" onClick={onClose}>×</button>
        <img src="/img/PIDA_logo-576.png" alt="PIDA Logo" style={{ width: '140px', marginBottom: '25px', margin: '0 auto' }} />
        <Elements stripe={stripePromise}>
          <AuthFormContent onClose={onClose} initialMode={initialMode} />
        </Elements>
      </div>
    </div>
  );
}