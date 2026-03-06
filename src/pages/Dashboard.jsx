import React, { useState, useEffect } from 'react';
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
      const token = await user.getIdToken();
      const intentRes = await fetch(`${PIDA_CONFIG.API_CHAT}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: planDetails.id,
          currency: currency.toLowerCase(),
          plan_key: plan,
          // 🛡️ CORRECCIÓN SPOOFING: Eliminado el envío de trial_period_days desde el frontend.
          name: user.displayName || user.email,
          promotion_code: discountData ? promoCode : ""
        })
      });
      
      const data = await intentRes.json();
      if (!intentRes.ok) throw new Error(data.detail || "Error al procesar pago");

      const cardElement = elements.getElement(CardElement);
      let result;
      
      if (data.clientSecret.startsWith('seti_')) {
        result = await stripe.confirmCardSetup(data.clientSecret, { payment_method: { card: cardElement, billing_details: { name: user.displayName || 'Usuario PIDA' } } });
      } else {
        result = await stripe.confirmCardPayment(data.clientSecret, { payment_method: { card: cardElement, billing_details: { name: user.displayName || 'Usuario PIDA' } } });
      }

      if (result.error) throw new Error(result.error.message);

      sessionStorage.setItem('pida_is_onboarding', 'true');
      window.location.reload(); 
    } catch(err) {
      setError(`❌ ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '550px', background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', textAlign: 'center', margin: '0 auto', width: '95%' }}>
      <h2 style={{ color: 'var(--pida-primary)', marginBottom: '10px' }}>Completa tu Suscripción ⚖️</h2>
      <p style={{ color: '#4B5563', marginBottom: '25px', fontSize: '0.95rem', lineHeight: '1.5' }}>
        Has iniciado sesión como <strong>{user.email}</strong>, pero necesitas activar un plan para acceder a las herramientas.
      </p>

      <form onSubmit={handlePay} style={{ textAlign: 'left' }}>
        <label className="input-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--pida-primary)', marginBottom: '8px', display: 'block' }}>Elige tu Plan</label>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <select className="pida-textarea" style={{ flex: 1, padding: '12px', marginBottom: 0, fontWeight: 'bold' }} value={plan} onChange={e => {setPlan(e.target.value); setDiscountData(null); setPromoCode(''); setPromoMsg({text:'', type:''});}}>
            <option value="basico">Plan Básico</option>
            <option value="avanzado">Plan Avanzado (Recomendado)</option>
            <option value="premium">Plan Premium</option>
          </select>
          <select className="pida-textarea" style={{ width: '130px', padding: '12px', marginBottom: 0 }} value={interval} onChange={e => {setInterval(e.target.value); setDiscountData(null); setPromoCode(''); setPromoMsg({text:'', type:''});}}>
            <option value="monthly">Mensual</option>
            <option value="annual">Anual</option>
          </select>
        </div>

        <div style={{ padding: '15px', background: '#F8FAFC', borderRadius: '8px', marginBottom: '20px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '600', color: 'var(--pida-text-muted)' }}>Total a pagar:</span>
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
          {loading ? 'Procesando pago...' : 'Activar mi cuenta y probar 5 días'}
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
    // Usamos variables de control para saber cuándo terminaron ambos procesos
    let isVipResolved = false;
    let isStripeResolved = false;

    // Guardamos los resultados temporalmente
    let resolvedIsVip = false;
    let resolvedStripeStatus = null;
    let resolvedPlan = 'basico';
    let resolvedTrial = false;

    // Función unificada que decide el acceso SOLO cuando ambos procesos han respondido
    const evaluateFinalAccess = () => {
      if (!isVipResolved || !isStripeResolved) return; // Si falta uno, esperamos.

      if (resolvedIsVip === true || resolvedStripeStatus === 'active' || resolvedStripeStatus === 'trialing') {
        setIsVip(resolvedIsVip);
        setUserPlan(resolvedPlan);
        setIsTrial(resolvedTrial);
        setHasValidAccess(true);
      } else {
        setHasValidAccess(false);
      }
      setIsCheckingAccess(false); // Por fin ocultamos el loader de pantalla
    };

    // PROCESO 1: Chequeo VIP a la API
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

    // PROCESO 2: Chequeo de Stripe a Firestore
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
            
            <img src="/img/PIDA-MASCOTA-menu.png" alt="PIDA Mascota" className="pida-header-mascot" />
          </div>
        </header>

        {currentView === 'investigador' && <ChatInterface user={user} resetSignal={resetChat} loadChatId={loadChatId} refreshHistory={fetchChatHistory} />}
        {currentView === 'analizador' && <AnalyzerInterface user={user} resetSignal={resetAna} loadAnaId={loadAnaId} />}
        {currentView === 'precalificador' && <PrequalifierInterface user={user} resetSignal={resetPre} loadPreData={loadPreData} />}
        {currentView === 'cuenta' && <AccountInterface user={user} isVip={isVip} />}

      </main>
    </div>
  );
}