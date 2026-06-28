import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import AuthModal from './components/AuthModal';
import Dashboard from './pages/Dashboard';
import SystemBanner from './components/SystemBanner';
import NotFound from './pages/NotFound';
import UpdateNotifier from './components/UpdateNotifier';
import { auth } from './config/firebase';

function App() {
  const [authModalConfig, setAuthModalConfig] = useState({ isOpen: false, mode: 'login' });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div id="pida-global-loader">
        <div className="loader"></div>
      </div>
    );
  }

  // 👇 NUEVO CAPTURADOR JURÍDICO PARA LA NUEVA PESTAÑA (Muestra tarjeta premium de éxito)
  const queryParams = new URLSearchParams(window.location.search);
  const isCallbackInstance = queryParams.get('pida_callback') === 'verified';

  if (isCallbackInstance) {
    return (
      <div style={{
        minHeight: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '20px', fontFamily: '"Inter", sans-serif'
      }}>
        <div style={{ maxWidth: '450px', width: '100%', padding: '40px', background: 'white', borderRadius: '16px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
          <img src="/img/PIDA_logo-100-blue-red.webp" alt="PIDA Logo" style={{ width: '130px', marginBottom: '25px', display: 'block', margin: '0 auto' }} />
          <h2 style={{ color: '#1d3557', margin: '0 0 10px 0', fontWeight: '700', fontSize: '1.6rem' }}>¡Verificación Exitosa!</h2>
          <p style={{ color: '#64748B', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '25px' }}>
            Tu dirección de correo electrónico institucional ha sido confirmada correctamente en nuestros servidores seguros. 
            <br /><br />
            <strong>Puedes cerrar esta pestaña de forma segura</strong> y regresar a la ventana original donde iniciaste tu registro para completar la pasarela.
          </p>
          <button 
            onClick={() => window.close()} 
            style={{ width: '100%', padding: '14px', border: 'none', borderRadius: '8px', background: '#1d3557', color: 'white', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = '#457b9d'}
            onMouseOut={e => e.currentTarget.style.background = '#1d3557'}
          >
            Cerrar Ventana de Confirmación
          </button>
        </div>
      </div>
    );
  }

  const currentPath = window.location.pathname;
  const isNotFound = currentPath !== '/' && currentPath !== '/index.html';

  if (isNotFound) {
    return (
      <>
        <SystemBanner />
        <UpdateNotifier />
        <NotFound />
      </>
    );
  }

  return (
    <>
      <SystemBanner />
      <UpdateNotifier />

      {(!user || authModalConfig.isOpen) && (
        <LandingPage 
          onOpenAuth={(mode = 'login') => setAuthModalConfig({ isOpen: true, mode })} 
        />
      )}

      <AuthModal 
        isOpen={authModalConfig.isOpen} 
        initialMode={authModalConfig.mode}
        onClose={() => setAuthModalConfig({ isOpen: false, mode: 'login' })} 
      />

      {user && !authModalConfig.isOpen && (
        <Dashboard user={user} />
      )}
    </>
  );
}

export default App;