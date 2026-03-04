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
  
  // Estados para el Plan de Suscripción
  const [userPlan, setUserPlan] = useState('básico');
  const [isVip, setIsVip] = useState(false);
  const [isTrial, setIsTrial] = useState(false);

  // Estados "Gatillo" para limpiar las pantallas desde la barra superior
  const [resetChat, setResetChat] = useState(0);
  const [resetAna, setResetAna] = useState(0);
  const [resetPre, setResetPre] = useState(0);

  // Escuchar el Plan del Usuario
  useEffect(() => {
    if (!user) return;

    // 1. Revisar si es usuario VIP
    const checkVip = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${PIDA_CONFIG.API_CHAT}/check-vip-access`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setIsVip(data.is_vip_user);
        }
      } catch (e) {
        console.error("Error verificando VIP:", e);
      }
    };
    checkVip();

    // 2. Escuchar la suscripción de Stripe en Firestore en tiempo real
    const unsubscribe = db.collection('customers').doc(user.uid)
      .onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          if (data.status === 'active' || data.status === 'trialing') {
            setUserPlan(data.plan || 'basico');
            setIsTrial(data.has_trial || false);
          }
        }
      });

    return () => unsubscribe();
  }, [user]);

  // Formatear el texto del Plan para mostrarlo
  let displayPlan = isVip ? 'VIP 🌟' : userPlan.charAt(0).toUpperCase() + userPlan.slice(1);
  if (displayPlan === 'Basico' || displayPlan === 'Basic') displayPlan = 'Básico';
  if (isTrial && !isVip) displayPlan += ' (Prueba)';

  return (
    <div id="pida-app-layout">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} user={user} />

      <main id="pida-main-content">
        <header className="pida-top-header">
          <div className="pida-context-controls">
            
            {currentView === 'investigador' && (
              <div className="context-group">
                {/* Al hacer clic, sumamos 1 al estado para avisarle al Chat que se limpie */}
                <button className="pida-header-btn primary" onClick={() => setResetChat(prev => prev + 1)}>+ Nuevo Chat</button>
              </div>
            )}

            {currentView === 'analizador' && (
              <div className="context-group">
                <button className="pida-header-btn primary" onClick={() => setResetAna(prev => prev + 1)}>+ Nuevo Análisis</button>
              </div>
            )}

            {currentView === 'precalificador' && (
              <div className="context-group">
                <button className="pida-header-btn primary" onClick={() => setResetPre(prev => prev + 1)}>+ Nueva Precalificación</button>
              </div>
            )}

            {currentView === 'cuenta' && (
              <div className="context-group">
                <h2 style={{ margin:0, fontSize: '1.2rem', color: 'var(--pida-primary)' }}>Gestión de Cuenta</h2>
              </div>
            )}
            
            {/* Medidor de Plan Dinámico */}
            <div className={`plan-badge ${isVip ? 'vip-active' : ''}`}>
              Plan: <strong className={isVip ? 'vip-text' : ''}>{displayPlan}</strong>
            </div>
            
            <img src="/img/PIDA-MASCOTA-menu.png" alt="PIDA Mascota" className="pida-header-mascot" />
          </div>
        </header>

        {/* Le pasamos el estado "resetX" como Prop a cada componente */}
        {currentView === 'investigador' && <ChatInterface user={user} resetSignal={resetChat} />}
        {currentView === 'analizador' && <AnalyzerInterface user={user} resetSignal={resetAna} />}
        {currentView === 'precalificador' && <PrequalifierInterface user={user} resetSignal={resetPre} />}
        {currentView === 'cuenta' && <AccountInterface user={user} />}

      </main>
    </div>
  );
}