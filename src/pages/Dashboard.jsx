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
        console.error("Error verificando VIP", e);
      }
    };
    checkVip();

    const unsubscribe = db.collection('customers').doc(user.uid).onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        if (data.status === 'active' || data.status === 'trialing') {
          setUserPlan(data.plan || 'basico');
          setIsTrial(data.has_trial || false);
        }
      }
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
        
        {/* AQUÍ ESTÁ EL CAMBIO CLAVE: Pasar isVip explícitamente */}
        {currentView === 'cuenta' && <AccountInterface user={user} isVip={isVip} />}

      </main>
    </div>
  );
}