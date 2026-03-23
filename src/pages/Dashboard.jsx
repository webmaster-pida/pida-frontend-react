import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ChatInterface from '../components/ChatInterface';
import AnalyzerInterface from '../components/AnalyzerInterface';
import PrequalifierInterface from '../components/PrequalifierInterface';
import AccountInterface from '../components/AccountInterface';
import SupportModal from '../components/SupportModal'; // <--- IMPORTAMOS EL MODAL DE AYUDA
import { db, auth } from '../config/firebase'; 
import { PIDA_CONFIG, STRIPE_PRICES } from '../config/constants';

import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_live_51QriCdGgaloBN5L8XyzW4M1QePJK316USJg3kjrZGFGln3bhwEQKnpoNXf2MnLXGHylM1OQ6SvWJmNVCNqhCxg6x000l605E1B');

const InAppCheckout = ({ user }) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [plan, setPlan] = useState('avanzado');
  const [interval, setInterval] = useState('monthly');
  
  // 🔐 PROTECCIÓN CONTRA CRASHES
  const rawCurrency = localStorage.getItem('pida_currency');
  const [currency] = useState(['USD', 'MXN'].includes(rawCurrency) ? rawCurrency : 'USD');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [promoCode, setPromoCode] = useState('');
  const [discountData, setDiscountData] = useState(null);
  const [promoMsg, setPromoMsg] = useState({ text: '', type: '' });

  // Lectura segura
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
      // =========================================================
      // 📊 EVENTO GA4: BEGIN CHECKOUT (Intento de pago)
      // =========================================================
      try {
        if (typeof window !== "undefined" && window.gtag) {
          window.gtag("event", "begin_checkout", {
            currency: currency.toUpperCase(),
            value: discountData ? (discountData.final_amount / 100) : (planDetails.amount / 100),
            items: [{ item_id: planDetails.id, item_name: `Plan ${plan.toUpperCase()} - ${interval}` }]
          });
        }
      } catch (gaError) { console.error("GA Error:", gaError); }
      // =========================================================

      const cardElement = elements.getElement(CardElement);
      
      // 🛡️ NUEVO FLUJO: 1. Creamos y validamos el Método de Pago PRIMERO
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: { name: user.displayName || user.email || 'Usuario PIDA' }
      });

      if (pmError) {
        throw new Error(pmError.message);
      }

      // 🛡️ 2. Solo si la tarjeta es real, llamamos al backend enviando el ID del Método de Pago
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
          paymentMethodId: paymentMethod.id // <-- Le pasamos la tarjeta validada
        })
      });
      
      const data = await intentRes.json();
      if (!intentRes.ok) throw new Error(data.detail || "Error al procesar pago");

      // 🛡️ 3. Si el banco del cliente exige autorización extra (3D Secure)
      if (data.requiresAction) {
        let result;
        if (data.clientSecret.startsWith('seti_')) {
          result = await stripe.confirmCardSetup(data.clientSecret);
        } else {
          result = await stripe.confirmCardPayment(data.clientSecret);
        }
        if (result.error) throw new Error(result.error.message);
      }

      // =========================================================
      // 📊 EVENTO GA4: PURCHASE (Venta exitosa)
      // =========================================================
      try {
        if (typeof window !== "undefined" && window.gtag) {
          window.gtag("event", "purchase", {
            transaction_id: data.subscriptionId, // ID de la suscripción de Stripe
            value: discountData ? (discountData.final_amount / 100) : (planDetails.amount / 100),
            currency: currency.toUpperCase(),
            items: [
              {
                item_id: planDetails.id,
                item_name: `Plan ${plan.toUpperCase()} - ${interval}`,
                coupon: discountData ? promoCode : undefined,
                quantity: 1
              }
            ]
          });
        }
      } catch (gaError) { console.error("GA Error:", gaError); }
      // =========================================================

      // Éxito Total
      sessionStorage.setItem('pida_is_onboarding', 'true');
      window.location.reload(); 
      
    } catch(err) {
      setError(`❌ ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', textAlign: 'center', margin: '0 auto', width: '95%' }}>
      {/* 1. GUÍA DE PASOS CLARA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '35px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '15px', left: '15%', right: '15%', height: '2px', background: '#E2E8F0', zIndex: 0 }}></div>
        {[
          { step: 1, label: 'Cuenta', done: true },
          { step: 2, label: 'Activación', active: true },
          { step: 3, label: 'Acceso' }
        ].map((s, i) => (
          <div key={i} style={{ zIndex: 1, position: 'relative', width: '80px' }}>
            <div style={{ 
              width: '32px', height: '32px', borderRadius: '50%', background: s.active || s.done ? 'var(--pida-primary)' : '#E2E8F0', 
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontWeight: 'bold'
            }}>
              {s.done ? '✓' : s.step}
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: s.active ? '800' : '500', color: s.active ? 'var(--pida-primary)' : '#94A3B8' }}>{s.label}</span>
          </div>
        ))}
      </div>

      <h2 style={{ color: 'var(--pida-primary)', marginBottom: '10px', fontSize: '1.6rem' }}>Activa tus 5 días gratis</h2>
      <p style={{ color: '#64748B', marginBottom: '30px', fontSize: '0.95rem' }}>
        Has iniciado sesión como <strong>{user.email}</strong>. Configura tu plan final. No se realizará ningún cobro hoy.
      </p>

      <form onSubmit={handlePay} style={{ textAlign: 'left' }}>
        
        {/* 2. SELECTOR DE NIVEL DE PLAN (Botones en lugar de select) */}
        <label className="input-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--pida-primary)', marginBottom: '8px', display: 'block' }}>Elige tu Plan</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {['basico', 'avanzado', 'premium'].map((p) => (
            <button key={p} type="button" onClick={() => { setPlan(p); setDiscountData(null); setPromoCode(''); setPromoMsg({text:'', type:''}); }} style={{
              padding: '12px 5px', borderRadius: '10px', border: `2px solid ${plan === p ? 'var(--pida-primary)' : '#E2E8F0'}`,
              background: plan === p ? '#F0F7FF' : 'white', cursor: 'pointer', transition: '0.2s', fontWeight: plan === p ? '800' : '500',
              color: plan === p ? 'var(--pida-primary)' : '#64748B', fontSize: '0.85rem', textTransform: 'capitalize'
            }}>
              {p === 'basico' ? 'Básico' : p}
            </button>
          ))}
        </div>

        {/* 3. SELECTOR DE INTERVALO CON RESALTE DE AHORRO */}
        <label className="input-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--pida-primary)', marginBottom: '8px', display: 'block' }}>Ciclo de facturación</label>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button type="button" onClick={() => { setInterval('monthly'); setDiscountData(null); setPromoCode(''); setPromoMsg({text:'', type:''}); }} style={{
            flex: 1, padding: '12px', borderRadius: '10px', border: `2px solid ${interval === 'monthly' ? 'var(--pida-primary)' : '#E2E8F0'}`,
            background: interval === 'monthly' ? '#F0F7FF' : 'white', cursor: 'pointer', fontWeight: interval === 'monthly' ? '700' : '500', color: interval === 'monthly' ? 'var(--pida-primary)' : '#64748B'
          }}>Mensual</button>
          
          <button type="button" onClick={() => { setInterval('annual'); setDiscountData(null); setPromoCode(''); setPromoMsg({text:'', type:''}); }} style={{
            flex: 1, padding: '12px', borderRadius: '10px', border: `2px solid ${interval === 'annual' ? 'var(--pida-primary)' : '#E2E8F0'}`,
            background: interval === 'annual' ? '#F0F7FF' : 'white', cursor: 'pointer', position: 'relative', fontWeight: interval === 'annual' ? '700' : '500', color: interval === 'annual' ? 'var(--pida-primary)' : '#64748B'
          }}>
            Anual
            <span style={{ 
              position: 'absolute', top: '-10px', right: '-5px', background: '#10B981', color: 'white', 
              fontSize: '0.65rem', padding: '2px 8px', borderRadius: '10px', fontWeight: '800'
            }}>AHORRA ~20%</span>
          </button>
        </div>

        {/* 4. ACLARACIÓN DEL CICLO DE COBRO */}
        <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: '12px', marginBottom: '20px', border: '1px solid #E2E8F0' }}>
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
          <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '12px', lineHeight: '1.4' }}>
            * Al ingresar tu tarjeta activas el periodo de prueba. El cobro se realizará automáticamente al finalizar los 5 días a menos que canceles antes desde tu perfil.
          </p>
        </div>

        <label className="input-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--pida-primary)', marginBottom: '8px', display: 'block' }}>Datos de la tarjeta</label>
        <div style={{ padding: '15px', border: '1px solid #CBD5E1', borderRadius: '8px', background: 'white', marginBottom: '15px' }}>
          <CardElement options={{ style: { base: { fontSize: '16px', fontFamily: '"Inter", sans-serif', color: '#1D3557', '::placeholder': { color: '#aab7c4' } }, invalid: { color: '#EF4444' } }, hidePostalCode: true }} />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '5px' }}>
          <input type="text" className="pida-textarea" style={{ padding: '10px 12px', flex: 1, marginBottom: 0, textTransform: 'uppercase', fontSize: '0.9rem' }} placeholder="CÓDIGO DE DESCUENTO" value={promoCode} onChange={e => setPromoCode(e.target.value)} disabled={!!discountData || loading} />
          <button type="button" className="pida-button-secondary" style={{ border: '1px solid #CBD5E1', padding: '0 15px', borderRadius: '6px', fontWeight: '600' }} onClick={handleApplyPromo} disabled={!!discountData || !promoCode || loading}>
            {discountData ? '✓ Aplicado' : 'Aplicar'}
          </button>
        </div>
        {promoMsg.text && <div style={{ fontSize: '0.8rem', color: promoMsg.type === 'error' ? '#EF4444' : '#10B981', marginBottom: '15px' }}>{promoMsg.text}</div>}

        {error && <div style={{ color: '#EF4444', fontSize: '0.9rem', marginTop: '15px', padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', fontWeight: '500' }}>{error}</div>}

        <button type="submit" className="pida-button-primary" style={{ width: '100%', padding: '16px', fontSize: '1.05rem', marginTop: '20px' }} disabled={loading}>
          {loading ? 'Procesando pago...' : 'Confirmar y empezar prueba gratuita'}
        </button>
      </form>

      <button
        style={{ marginTop: '25px', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}
        onClick={() => auth.signOut()}
      >
        Cerrar sesión
      </button>
    </div>
  );
};


export default function Dashboard({ user }) {
  const [currentView, setCurrentView] = useState('investigador'); 
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasValidAccess, setHasValidAccess] = useState(false);
  const [userPlan, setUserPlan] = useState('basico'); 
  const [isVip, setIsVip] = useState(false);
  const [isTrial, setIsTrial] = useState(false);

  // 1. ESTADOS PARA EL MODAL DE SOPORTE
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [globalLastError, setGlobalLastError] = useState('');

  const [resetChat, setResetChat] = useState(0);
  const [resetAna, setResetAna] = useState(0);
  const [resetPre, setResetPre] = useState(0);

  const [chatHistory, setChatHistory] = useState([]);
  const [anaHistory, setAnaHistory] = useState([]);
  const [preHistory, setPreHistory] = useState([]);

  const [showMenu, setShowMenu] = useState({ chat: false, ana: false, pre: false });
  const [loadChatId, setLoadChatId] = useState(null);
  const [loadAnaId, setLoadAnaId] = useState(null);
  const [loadPreData, setLoadPreData] = useState(null);

  useEffect(() => {
    if (!user) return;

    // 🔐 SOLUCIÓN A LA CONDICIÓN DE CARRERA (Race Condition)
    let isVipResolved = false;
    let isStripeResolved = false;

    let resolvedIsVip = false;
    let resolvedStripeStatus = null;
    let resolvedPlan = 'basico';
    let resolvedTrial = false;

    const evaluateFinalAccess = () => {
      if (!isVipResolved || !isStripeResolved) return; 

      if (resolvedIsVip === true || resolvedStripeStatus === 'active' || resolvedStripeStatus === 'trialing') {
        setIsVip(resolvedIsVip);
        setUserPlan(resolvedPlan);
        setIsTrial(resolvedTrial);
        setHasValidAccess(true);
      } else {
        setHasValidAccess(false);
      }
      setIsCheckingAccess(false); 
    };

    const checkVip = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${PIDA_CONFIG.API_CHAT}/check-vip-access`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }});
        if (res.ok) {
          const data = await res.json();
          resolvedIsVip = data.is_vip_user;
        }
      } catch (e) {
        console.error("Error VIP", e);
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
      } else {
        resolvedStripeStatus = null;
      }
      evaluateFinalAccess();
    }, (err) => {
      console.error("Firestore error", err);
      isStripeResolved = true;
      evaluateFinalAccess();
    });

    fetchChatHistory();
    fetchAnaHistory();
    fetchPreHistory();

    return () => unsubscribe();
  }, [user]);

  const fetchChatHistory = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${PIDA_CONFIG.API_CHAT}/conversations`, { headers: { 'Authorization': `Bearer ${token}` }});
      if (res.ok) setChatHistory(await res.json());
    } catch (e) { console.error("Error chats", e); }
  };

  const fetchAnaHistory = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${PIDA_CONFIG.API_ANA}/analysis-history/`, { headers: { 'Authorization': `Bearer ${token}` }});
      if (res.ok) setAnaHistory(await res.json());
    } catch (e) { console.error("Error análisis", e); }
  };

  const fetchPreHistory = async () => {
    try {
      const snap = await db.collection('users').doc(user.uid).collection('prequalifications').orderBy('created_at', 'desc').limit(20).get();
      setPreHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) { console.error("Error precalificaciones", e); }
  };

  const deleteChat = async (id, e) => {
    e.stopPropagation();
    try {
      const token = await user.getIdToken();
      await fetch(`${PIDA_CONFIG.API_CHAT}/conversations/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
      fetchChatHistory();
    } catch (err) {}
  };

  const deleteAna = async (id, e) => {
    e.stopPropagation();
    try {
      const token = await user.getIdToken();
      await fetch(`${PIDA_CONFIG.API_ANA}/analysis-history/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
      fetchAnaHistory();
    } catch (err) {}
  };

  const deletePre = async (id, e) => {
    e.stopPropagation();
    try {
      await db.collection('users').doc(user.uid).collection('prequalifications').doc(id).delete();
      fetchPreHistory();
    } catch (err) {}
  };

  if (isCheckingAccess) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f9fafb' }}>
        <div className="loader"></div>
        <p style={{ marginTop: '20px', color: '#666' }}>Verificando suscripción...</p>
      </div>
    );
  }

  if (!hasValidAccess) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f3f4f6', padding: '20px', overflowY: 'auto' }}>
        <Elements stripe={stripePromise}>
          <InAppCheckout user={user} />
        </Elements>
      </div>
    );
  }

  let displayPlan = isVip ? 'VIP' : userPlan.charAt(0).toUpperCase() + userPlan.slice(1);
  if (displayPlan === 'Basico' || displayPlan === 'Basic') displayPlan = 'Básico';
  if (isTrial && !isVip) displayPlan += ' (Prueba)';

  const closeMenus = () => setShowMenu({ chat: false, ana: false, pre: false });

  return (
    <div id="pida-app-layout" onClick={closeMenus}>
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} user={user} />

      <main id="pida-main-content">
        <header className="pida-top-header">
          <div className="pida-context-controls">
            
            {currentView === 'investigador' && (
              <div className="context-group">
                <button className="pida-header-btn primary" onClick={() => { setResetChat(prev => prev + 1); setLoadChatId(null); fetchChatHistory(); }}>+ Nuevo Chat</button>
                <div className="pida-dropdown">
                  <button className="pida-header-btn" onClick={(e) => { e.stopPropagation(); setShowMenu({ chat: !showMenu.chat, ana: false, pre: false }); fetchChatHistory(); }}>
                    Chats Previos <span style={{ fontSize: '0.7rem' }}>▼</span>
                  </button>
                  {showMenu.chat && (
                    <div className="pida-dropdown-content show">
                      {chatHistory.length === 0 ? <div style={{ padding: '15px', textAlign: 'center', color: '#999' }}>No hay consultas previas.</div> : null}
                      {chatHistory.map(c => (
                        <div key={c.id} className={`pida-history-item ${loadChatId === c.id ? 'active' : ''}`}>
                          <span className="pida-history-item-title" onClick={() => { setLoadChatId(c.id); setShowMenu({ chat: false, ana: false, pre: false }); }}>{c.title || "Sin título"}</span>
                          <button className="delete-icon-btn" onClick={(e) => deleteChat(c.id, e)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentView === 'analizador' && (
              <div className="context-group">
                <button className="pida-header-btn primary" onClick={() => { setResetAna(prev => prev + 1); setLoadAnaId(null); fetchAnaHistory(); }}>+ Nuevo Análisis</button>
                <div className="pida-dropdown">
                  <button className="pida-header-btn" onClick={(e) => { e.stopPropagation(); setShowMenu({ chat: false, ana: !showMenu.ana, pre: false }); fetchAnaHistory(); }}>
                    Análisis Previos <span style={{ fontSize: '0.7rem' }}>▼</span>
                  </button>
                  {showMenu.ana && (
                    <div className="pida-dropdown-content show">
                      {anaHistory.length === 0 ? <div style={{ padding: '15px', textAlign: 'center', color: '#999' }}>No hay análisis previos.</div> : null}
                      {anaHistory.map(a => (
                        <div key={a.id} className={`pida-history-item ${loadAnaId === a.id ? 'active' : ''}`}>
                          <span className="pida-history-item-title" onClick={() => { setLoadAnaId(a.id); setShowMenu({ chat: false, ana: false, pre: false }); }}>{a.title || "Sin título"}</span>
                          <button className="delete-icon-btn" onClick={(e) => deleteAna(a.id, e)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentView === 'precalificador' && (
              <div className="context-group">
                <button className="pida-header-btn primary" onClick={() => { setResetPre(prev => prev + 1); setLoadPreData(null); fetchPreHistory(); }}>+ Nueva Precalificación</button>
                <div className="pida-dropdown">
                  <button className="pida-header-btn" onClick={(e) => { e.stopPropagation(); setShowMenu({ chat: false, ana: false, pre: !showMenu.pre }); fetchPreHistory(); }}>
                    Historial <span style={{ fontSize: '0.7rem' }}>▼</span>
                  </button>
                  {showMenu.pre && (
                    <div className="pida-dropdown-content show">
                      {preHistory.length === 0 ? <div style={{ padding: '15px', textAlign: 'center', color: '#999' }}>No hay historial.</div> : null}
                      {preHistory.map(p => (
                        <div key={p.id} className="pida-history-item">
                          <span className="pida-history-item-title" onClick={() => { setLoadPreData(p); setShowMenu({ chat: false, ana: false, pre: false }); }}>{p.title || "Sin título"}</span>
                          <button className="delete-icon-btn" onClick={(e) => deletePre(p.id, e)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentView === 'cuenta' && (
              <div className="context-group">
                <h2 style={{ margin:0, fontSize: '1.2rem', color: 'var(--pida-primary)' }}>Gestión de Cuenta</h2>
              </div>
            )}
            
            <div className={`plan-badge plan-${userPlan} ${isVip ? 'vip-active' : ''}`}>
              Plan: <strong className={isVip ? 'vip-text' : ''}>{displayPlan}</strong>
            </div>

            {/* 2. BOTÓN AYUDA CON ESTILO NATIVO Y COLOR PRIMARIO */}
            <button 
              className="pida-header-btn" 
              onClick={() => setIsSupportOpen(true)}
              title="Solicitar Ayuda o Reportar un Fallo"
              style={{ color: 'var(--pida-primary)', fontWeight: '700', border: 'none', backgroundColor: 'transparent' }}
            >
              Ayuda
            </button>
            
            {/* 3. MASCOTA ROBOT EN SU ESTRUCTURA Y LUGAR EXACTO ORIGINAL */}
            <img 
              src="/img/PIDA-MASCOTA-menu.png" 
              alt="PIDA Mascota" 
              className="pida-header-mascot" 
              onClick={() => setIsSupportOpen(true)}
              style={{ cursor: 'pointer' }}
              title="Solicitar Ayuda o Reportar un Fallo"
            />
          </div>
        </header>

        {currentView === 'investigador' && <ChatInterface user={user} resetSignal={resetChat} loadChatId={loadChatId} refreshHistory={fetchChatHistory} />}
        {currentView === 'analizador' && <AnalyzerInterface user={user} resetSignal={resetAna} loadAnaId={loadAnaId} />}
        {currentView === 'precalificador' && <PrequalifierInterface user={user} resetSignal={resetPre} loadPreData={loadPreData} />}
        {currentView === 'cuenta' && <AccountInterface user={user} isVip={isVip} />}

        <SupportModal 
          isOpen={isSupportOpen} 
          onClose={() => setIsSupportOpen(false)} 
          user={user} 
          currentView={currentView} 
          lastError={globalLastError} 
        />
      </main>
    </div>
  );
}