import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ChatInterface from '../components/ChatInterface';
import AnalyzerInterface from '../components/AnalyzerInterface';
import PrequalifierInterface from '../components/PrequalifierInterface';
import AccountInterface from '../components/AccountInterface';
import { db } from '../config/firebase';
import { PIDA_CONFIG } from '../config/constants';

export default function Dashboard({ user }) {
  const [currentView, setCurrentView] = useState('investigador'); 
  
  // Estados de acceso y carga
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasValidAccess, setHasValidAccess] = useState(false);

  // Estados del Plan
  const [userPlan, setUserPlan] = useState('basico');
  const [isVip, setIsVip] = useState(false);
  const [isTrial, setIsTrial] = useState(false);

  // Estados de limpieza y limpieza
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

    let vipConfirmed = false;
    let stripeConfirmed = false;

    // Función para validar acceso total
    const validateAccess = (vipStatus, stripeStatus) => {
      if (vipStatus || stripeStatus === 'active' || stripeStatus === 'trialing') {
        setHasValidAccess(true);
      } else {
        setHasValidAccess(false);
      }
      setIsCheckingAccess(false);
    };

    // 1. Verificar acceso VIP (Backend)
    const checkVip = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${PIDA_CONFIG.API_CHAT}/check-vip-access`, { 
          method: 'POST', 
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const isVipUser = data.is_vip_user;
          setIsVip(isVipUser);
          vipConfirmed = isVipUser;
          if (isVipUser) validateAccess(true, null);
        }
      } catch (e) {
        console.error("Error VIP:", e);
      }
    };
    checkVip();

    // 2. Verificar Suscripción Stripe (Firestore)
    const unsubscribe = db.collection('customers').doc(user.uid).onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        const status = data.status;
        stripeConfirmed = (status === 'active' || status === 'trialing');
        
        setUserPlan(data.plan || 'basico');
        setIsTrial(data.has_trial || false);
        
        validateAccess(vipConfirmed, status);
      } else {
        // Si no hay documento en 'customers', no hay pago registrado
        if (!vipConfirmed) {
          setHasValidAccess(false);
          setIsCheckingAccess(false);
        }
      }
    }, (error) => {
      setIsCheckingAccess(false);
    });

    fetchChatHistory();
    fetchAnaHistory();
    fetchPreHistory();

    return () => unsubscribe();
  }, [user]);

  // Funciones de historial (se mantienen igual)
  const fetchChatHistory = async () => { /* ... */ };
  const fetchAnaHistory = async () => { /* ... */ };
  const fetchPreHistory = async () => { /* ... */ };

  // --- LÓGICA DE RENDERIZADO CONDICIONAL ---

  // 1. Pantalla de carga inicial
  if (isCheckingAccess) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f9fafb' }}>
        <div className="loader"></div>
        <p style={{ marginTop: '20px', color: '#666', fontFamily: 'sans-serif' }}>Verificando credenciales de acceso...</p>
      </div>
    );
  }

  // 2. Bloqueo si no tiene acceso válido (Stripe fallido o sin pagar)
  if (!hasValidAccess) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f3f4f6', padding: '20px' }}>
        <div style={{ maxWidth: '500px', background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <h2 style={{ color: '#1D3557', marginBottom: '15px' }}>Suscripción requerida ⚖️</h2>
          <p style={{ color: '#4B5563', lineHeight: '1.6' }}>No hemos detectado una suscripción activa vinculada a tu cuenta. Para acceder a las herramientas de PIDA, debes completar el registro de pago.</p>
          <button 
            className="pida-button-primary" 
            style={{ marginTop: '25px', width: '100%' }}
            onClick={() => window.location.href = '/'} // O a tu URL de checkout de Stripe
          >
            Ir a Planes de Suscripción
          </button>
          <button 
            style={{ marginTop: '15px', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => auth.signOut()}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  // 3. Renderizado normal (Solo si pasó las validaciones anteriores)
  let displayPlan = isVip ? 'VIP 🌟' : userPlan.charAt(0).toUpperCase() + userPlan.slice(1);
  if (displayPlan === 'Basico' || displayPlan === 'Basic') displayPlan = 'Básico';
  if (isTrial && !isVip) displayPlan += ' (Prueba)';

  const closeMenus = () => setShowMenu({ chat: false, ana: false, pre: false });

  return (
    <div id="pida-app-layout" onClick={closeMenus}>
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} user={user} />
      <main id="pida-main-content">
        <header className="pida-top-header">
           <div className="pida-context-controls">
             {/* ... Controles de Chat, Analizador, Precalificador ... */}
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