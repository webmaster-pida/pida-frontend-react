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

  const planKey = sessionStorage.getItem('pida_pending_plan') || 'basico';
  const intervalKey = sessionStorage.getItem('pida_pending_interval') || 'monthly';
  
  const rawCurrency = localStorage.getItem('pida_currency');
  const currency = ['USD', 'MXN'].includes(rawCurrency) ? rawCurrency : 'USD';
  
  const planDetails = STRIPE_PRICES[planKey]?.[intervalKey]?.[currency] || STRIPE_PRICES['basico']['monthly']['USD'];

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

        setLoadingText('¡Suscripción activada!');
        sessionStorage.setItem('pida_is_onboarding', 'true');
        
        setTimeout(() => {
          window.location.href = window.location.pathname + "?payment_status=success";
        }, 1500);
      }

    } catch (err) {
      console.error(err);
      
      if (mode === 'register' && auth.currentUser) {
        await auth.signOut();
      }

      let msg = err.message || "Ocurrió un error.";
      
      // --- NUEVO: MENSAJES DE ERROR CLAROS PARA USUARIOS NUEVOS QUE INTENTAN LOGUEARSE ---
      if (err.code === 'auth/user-not-found') {
          msg = "No encontramos una cuenta con este correo. Recuerda que PIDA es premium, debes adquirir un plan primero.";
      } else if (err.code === 'auth/email-already-in-use') {
          msg = "Esta cuenta ya existe. Haz clic en 'Volver al login' abajo, ingresa con tu contraseña y podrás pagar de forma segura desde tu panel de usuario.";
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          msg = "Datos incorrectos. Si eres nuevo, cierra esta ventana y elige un plan para suscribirte.";
      }
      
      setError(msg);
      setIsLoading(false);
    }
  };

  return (
    <>
      <h2 id="auth-title" style={{ color: 'var(--pida-primary)', marginTop: 0, fontSize: '1.4rem', fontWeight: '800' }}>
        {mode === 'login' && 'Bienvenido de nuevo'}
        {mode === 'register' && 'Completar Suscripción'}
        {mode === 'reset' && 'Recuperar Contraseña'}
      </h2>
      <p style={{ color: '#64748B', marginBottom: '20px', fontSize: '0.95rem' }}>
        {mode === 'register' ? 'Ingresa tus datos de pago para activar tu plan.' : 'Accede para continuar tu investigación.'}
      </p>

      {/* --- NUEVO: BANNER EXPLICATIVO PARA NUEVOS USUARIOS EN LA VISTA DE LOGIN --- */}
      {mode === 'login' && (
        <div style={{ padding: '15px', background: '#F0F9FF', borderRadius: '8px', marginBottom: '25px', border: '1px solid #BAE6FD', textAlign: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: '#0369A1', fontWeight: '600' }}>¿Aún no tienes cuenta?</span>
          <p style={{ fontSize: '0.85rem', color: '#0284C7', margin: '5px 0 0 0', lineHeight: '1.4' }}>
            PIDA es una plataforma premium. Para registrarte, primero debes seleccionar un plan. <br/>
            <button 
              type="button"
              onClick={() => { onClose(); window.location.href = '/#planes'; }} 
              style={{ background: 'none', border: 'none', color: 'var(--pida-primary)', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer', marginTop: '8px', padding: 0 }}
            >
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
              <div style={{ textAlign: 'right', marginTop: '-10px', marginBottom: '20px' }}>
                <span onClick={() => { setMode('reset'); setError(''); }} style={{ fontSize: '0.85rem', color: 'var(--pida-accent)', cursor: 'pointer', fontWeight: '500' }}>¿Olvidaste tu contraseña?</span>
              </div>
            )}
          </div>
        )}

        {mode === 'register' && (
          <div style={{ marginTop: '10px', animation: 'fadeIn 0.3s ease' }}>
            
            <div style={{ padding: '15px', background: '#F8FAFC', borderRadius: '8px', marginBottom: '20px', border: '1px solid #E2E8F0' }}>
              <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '10px', marginBottom: '10px', fontWeight: '700', color: 'var(--pida-primary)', fontSize: '0.95rem' }}>
                Plan {planKey.charAt(0).toUpperCase() + planKey.slice(1)} ({intervalKey === 'monthly' ? 'Mensual' : 'Anual'})
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', color: '#64748B' }}>Total a pagar:</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--pida-primary)', textDecoration: discountData ? 'line-through' : 'none', opacity: discountData ? 0.5 : 1 }}>
                    {planDetails.text}
                  </span>
                  {discountData && (
                    <div style={{ color: '#10B981', fontWeight: '800', fontSize: '1.2rem' }}>
                      {new Intl.NumberFormat(currency === 'MXN' ? 'es-MX' : 'en-US', { style: 'currency', currency }).format(discountData.final_amount / 100)}
                    </div>
                  )}
                </div>
              </div>
              {discountData && (
                <div style={{ background: '#DCFCE7', color: '#166534', fontSize: '0.75rem', fontWeight: '700', padding: '4px 10px', borderRadius: '12px', marginTop: '10px', display: 'inline-block', float: 'right' }}>
                  Ahorras: {discountData.description}
                </div>
              )}
              <div style={{ clear: 'both' }}></div>
            </div>

            <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--pida-primary)', marginBottom: '8px', display: 'block' }}>Datos de la tarjeta</label>
            <div style={{ padding: '15px', border: '1px solid #CBD5E1', borderRadius: '8px', background: 'white', marginBottom: '20px' }}>
              <CardElement options={cardStyle} />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input 
                type="text" 
                style={{ padding: '12px 15px', flex: 1, border: '1px solid #CBD5E1', borderRadius: '8px', marginBottom: 0, textTransform: 'uppercase', fontSize: '0.9rem', outline: 'none' }} 
                placeholder="CÓDIGO DE DESCUENTO" 
                value={promoCode} 
                onChange={e => setPromoCode(e.target.value)} 
                disabled={!!discountData || isLoading} 
              />
              <button 
                type="button" 
                style={{ 
                  background: discountData ? '#10B981' : 'var(--pida-primary)', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0 20px', 
                  borderRadius: '8px', 
                  fontWeight: '600', 
                  cursor: (!!discountData || !promoCode || isLoading) ? 'not-allowed' : 'pointer', 
                  opacity: (!!discountData || !promoCode || isLoading) && !discountData ? 0.6 : 1,
                  transition: 'background 0.2s'
                }} 
                onClick={handleApplyPromo} 
                disabled={!!discountData || !promoCode || isLoading}
              >
                {discountData ? '✓ Aplicado' : 'Aplicar'}
              </button>
            </div>
            {promoMessage.text && <div style={{ fontSize: '0.85rem', color: promoMessage.type === 'error' ? '#EF4444' : '#10B981', marginBottom: '15px', fontWeight: '500' }}>{promoMessage.text}</div>}

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '20px', marginBottom: '20px' }}>
              <input type="checkbox" id="terms" required checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: 'var(--pida-accent)', cursor: 'pointer' }} />
              <label htmlFor="terms" style={{ fontSize: '0.85rem', color: '#4B5563', lineHeight: '1.5', cursor: 'pointer' }}>
                Acepto los <a href="https://pida-ai.com/terminos" target="_blank" rel="noreferrer" style={{ color: 'var(--pida-accent)', fontWeight: '500' }}>términos de uso</a> y la <a href="https://pida-ai.com/privacidad" target="_blank" rel="noreferrer" style={{ color: 'var(--pida-accent)', fontWeight: '500' }}>política de privacidad</a>.
              </label>
            </div>

          </div>
        )}

        {error && (
          <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '12px 15px', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '20px', border: '1px solid #FCA5A5', lineHeight: '1.4' }}>
            {error}
          </div>
        )}

        <button type="submit" className="login-btn" style={{ padding: '16px', fontSize: '1.05rem', borderRadius: '8px' }} disabled={isLoading || (!stripe && mode === 'register')}>
          {isLoading ? loadingText : (mode === 'login' ? 'Ingresar' : mode === 'register' ? 'Activar cuenta y probar 5 días' : 'Enviar enlace')}
        </button>
      </form>

      <div style={{ marginTop: '25px', fontSize: '0.9rem', color: '#64748B', textAlign: 'center' }}>
        {mode === 'reset' && <span onClick={() => { setMode('login'); setError(''); }} style={{ color: 'var(--pida-accent)', textDecoration: 'underline', cursor: 'pointer', fontWeight: '600' }}>← Volver al login</span>}
        {mode === 'register' && <span onClick={() => { setMode('login'); setError(''); }} style={{ color: 'var(--pida-accent)', textDecoration: 'underline', cursor: 'pointer', fontWeight: '600' }}>← Ya tengo cuenta, iniciar sesión</span>}
      </div>
    </>
  );
}

export default function AuthModal({ isOpen, initialMode = 'login', onClose }) {
  if (!isOpen) return null;
  return (
    <div id="pida-login-screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="login-card" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="close-login-btn" onClick={onClose} style={{ zIndex: 10 }}>×</button>
        <img src="/img/PIDA_logo-576.png" alt="PIDA Logo" className="login-logo" style={{ width: '140px', marginBottom: '25px' }} />
        <Elements stripe={stripePromise}>
          <AuthFormContent onClose={onClose} initialMode={initialMode} />
        </Elements>
      </div>
    </div>
  );
}