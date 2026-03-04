import React, { useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../config/firebase';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { STRIPE_PRICES, PIDA_CONFIG } from '../config/constants';

// Inicializamos Stripe con tu llave pública
const stripePromise = loadStripe('pk_live_51QriCdGgaloBN5L8XyzW4M1QePJK316USJg3kjrZGFGln3bhwEQKnpoNXf2MnLXGHylM1OQ6SvWJmNVCNqhCxg6x000l605E1B');

// Estilos para el campo de la tarjeta
const cardStyle = {
  style: {
    base: { fontSize: '16px', fontFamily: '"Inter", sans-serif', color: '#1D3557', '::placeholder': { color: '#aab7c4' } },
    invalid: { color: '#EF4444' },
  },
  hidePostalCode: true
};

// Subcomponente que contiene el formulario (Necesario para usar los Hooks de Stripe)
function AuthFormContent({ onClose, initialMode }) {
  const stripe = useStripe();
  const elements = useElements();

  const [mode, setMode] = useState(initialMode || 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // Estados de carga y errores
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  // Estados de Pago / Promo
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState({ text: '', type: '' });
  const [discountData, setDiscountData] = useState(null);

  // Leer la configuración del plan seleccionado desde Storage
  const planKey = sessionStorage.getItem('pida_pending_plan') || 'basico';
  const intervalKey = sessionStorage.getItem('pida_pending_interval') || 'monthly';
  const currency = localStorage.getItem('pida_currency') || 'USD';
  const planDetails = STRIPE_PRICES[planKey]?.[intervalKey]?.[currency] || { text: 'N/A', id: '' };

  // Manejar Login con Google
  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    setLoadingText('Conectando...');
    try {
      await auth.signInWithPopup(googleProvider);
      onClose();
    } catch (err) {
      setError('No se pudo iniciar sesión con Google.');
    } finally {
      setIsLoading(false);
    }
  };

  // Validar Cupón de Descuento
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
      setPromoMessage({ text: `✅ Cupón "${data.coupon_name}" aplicado.`, type: 'success' });
    } catch (err) {
      setDiscountData(null);
      setPromoMessage({ text: `❌ ${err.message}`, type: 'error' });
    }
  };

  // Manejar el envío del formulario (Login, Registro o Reset)
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

      // --- FLUJO DE REGISTRO Y PAGO ---
      if (mode === 'register') {
        if (!termsAccepted) throw new Error("Debes aceptar los términos y condiciones.");
        if (!stripe || !elements) throw new Error("Stripe no ha cargado aún.");

        const fullName = `${firstName} ${lastName}`.trim();
        let user = auth.currentUser;

        // 1. Crear usuario si no existe
        if (!user) {
          setLoadingText('Creando cuenta...');
          const cred = await auth.createUserWithEmailAndPassword(email, password);
          user = cred.user;
          await user.updateProfile({ displayName: fullName });
        }

        // 2. Crear Payment Intent en tu Backend
        setLoadingText('Iniciando prueba gratis...');
        const token = await user.getIdToken();
        const intentRes = await fetch(`${PIDA_CONFIG.API_CHAT}/create-payment-intent`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            priceId: planDetails.id, 
            currency: currency.toLowerCase(),
            plan_key: planKey,
            trial_period_days: 5,
            name: fullName,
            promotion_code: discountData ? promoCode : ""
          })
        });

        const data = await intentRes.json();
        if (!intentRes.ok) throw new Error(data.detail || "Error al procesar el pago");

        // 3. Confirmar la tarjeta con Stripe
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

        if (result.error) {
          throw new Error(result.error.message);
        }

        // 4. Pago exitoso
        setLoadingText('¡Suscripción activada!');
        sessionStorage.setItem('pida_is_onboarding', 'true');
        
        // Esperamos un segundo para que el backend de Stripe actualice Firebase
        setTimeout(() => {
          window.location.href = window.location.pathname + "?payment_status=success";
        }, 1500);
      }

    } catch (err) {
      console.error(err);
      let msg = err.message || "Ocurrió un error.";
      if (err.code === 'auth/email-already-in-use') msg = "Este correo ya está registrado. Por favor, inicia sesión.";
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') msg = "Datos incorrectos.";
      setError(msg);
      setIsLoading(false);
    }
  };

  return (
    <>
      {mode !== 'reset' && (
        <div className="login-tabs">
          <button className={`login-tab-btn ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); }}>Ingresar</button>
          <button className={`login-tab-btn ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setError(''); }}>Crear Cuenta</button>
        </div>
      )}

      <h2 id="auth-title" style={{ color: 'var(--pida-primary)', marginTop: 0, fontSize: '1.2rem' }}>
        {mode === 'login' && 'Bienvenido de nuevo'}
        {mode === 'register' && 'Completar Suscripción'}
        {mode === 'reset' && 'Recuperar Contraseña'}
      </h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        {mode === 'register' ? 'Ingresa tus datos de pago para activar tu plan.' : 'Accede para continuar tu investigación.'}
      </p>

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
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input type="text" className="login-input" style={{ marginBottom: 0 }} placeholder="Nombre" required value={firstName} onChange={e => setFirstName(e.target.value)} />
            <input type="text" className="login-input" style={{ marginBottom: 0 }} placeholder="Apellido" required value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
        )}

        <input type="email" className="login-input" placeholder="Correo electrónico" required value={email} onChange={e => setEmail(e.target.value)} />
        
        {mode !== 'reset' && (
          <div style={{ position: 'relative' }}>
            <input type="password" className="login-input" placeholder="Contraseña" required value={password} onChange={e => setPassword(e.target.value)} />
            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginTop: '-10px', marginBottom: '15px' }}>
                <span onClick={() => { setMode('reset'); setError(''); }} style={{ fontSize: '0.8rem', color: '#666', cursor: 'pointer' }}>¿Olvidaste tu contraseña?</span>
              </div>
            )}
          </div>
        )}

        {/* --- SECCIÓN DE PAGO DE STRIPE (SOLO EN REGISTRO) --- */}
        {mode === 'register' && (
          <div className="payment-summary-container">
            <div className="order-summary-box">
              <div className="summary-header">
                Plan {planKey.charAt(0).toUpperCase() + planKey.slice(1)} ({intervalKey === 'monthly' ? 'Mensual' : 'Anual'})
              </div>
              <div className="summary-price-row">
                <span>Total a pagar:</span>
                <div className="price-display-wrapper">
                  <span className={`current-price ${discountData ? 'crossed-out' : ''}`}>{planDetails.text}</span>
                  {discountData && (
                    <span className="final-price">
                      {new Intl.NumberFormat(currency === 'MXN' ? 'es-MX' : 'en-US', { style: 'currency', currency }).format(discountData.final_amount / 100)}
                    </span>
                  )}
                </div>
              </div>
              {discountData && <div className="discount-pill">Ahorras: {discountData.description}</div>}
            </div>

            <label className="input-label">Datos de la tarjeta</label>
            <div className="stripe-input-box">
              <CardElement options={cardStyle} />
            </div>

            {/* Promo Code */}
            <div className="promo-section">
              <div className="promo-input-group">
                <input type="text" placeholder="CÓDIGO DE DESCUENTO" value={promoCode} onChange={e => setPromoCode(e.target.value)} disabled={!!discountData} />
                <button type="button" onClick={handleApplyPromo} disabled={!!discountData || !promoCode}>
                  {discountData ? '✓' : 'Aplicar'}
                </button>
              </div>
              {promoMessage.text && <div className={`promo-msg ${promoMessage.type}`} style={{ display: 'block' }}>{promoMessage.text}</div>}
            </div>

            {/* Términos y Condiciones */}
            <div className="terms-box">
              <input type="checkbox" id="terms" required checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} />
              <label htmlFor="terms">Acepto los <a href="/terminos.html" target="_blank" rel="noreferrer">términos de uso</a> y la <a href="/privacidad.html" target="_blank" rel="noreferrer">política de privacidad</a>.</label>
            </div>
          </div>
        )}

        {error && <div className="login-error" style={{ display: 'block', marginBottom: '15px' }}>{error}</div>}

        <button type="submit" className="login-btn" disabled={isLoading || (!stripe && mode === 'register')}>
          {isLoading ? loadingText : (mode === 'login' ? 'Ingresar' : mode === 'register' ? 'Iniciar prueba gratis' : 'Enviar enlace')}
        </button>
      </form>

      <div style={{ marginTop: '20px', fontSize: '0.85rem', color: '#666', textAlign: 'center' }}>
        {mode === 'login' && <>¿No tienes cuenta? <span onClick={() => { setMode('register'); setError(''); }} style={{ color: 'var(--pida-accent)', textDecoration: 'underline', cursor: 'pointer' }}>Regístrate aquí</span></>}
        {mode === 'register' && <>¿Ya tienes cuenta? <span onClick={() => { setMode('login'); setError(''); }} style={{ color: 'var(--pida-accent)', textDecoration: 'underline', cursor: 'pointer' }}>Inicia sesión aquí</span></>}
        {mode === 'reset' && <span onClick={() => { setMode('login'); setError(''); }} style={{ color: 'var(--pida-accent)', textDecoration: 'underline', cursor: 'pointer' }}>← Volver al login</span>}
      </div>
    </>
  );
}

// El Modal Principal que envuelve todo en el "Provider" de Stripe
export default function AuthModal({ isOpen, initialMode = 'login', onClose }) {
  if (!isOpen) return null;

  return (
    <div id="pida-login-screen" style={{ display: 'flex' }}>
      <div className="login-card">
        <button className="close-login-btn" onClick={onClose} style={{ zIndex: 10 }}>×</button>
        <img src="/img/PIDA_logo-576.png" alt="PIDA Logo" className="login-logo" />
        
        {/* Aquí envolvemos el formulario con los Elementos de Stripe */}
        <Elements stripe={stripePromise}>
          <AuthFormContent onClose={onClose} initialMode={initialMode} />
        </Elements>

      </div>
    </div>
  );
}