import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import AuthModal from './components/AuthModal';
import Dashboard from './pages/Dashboard';
import SystemBanner from './components/SystemBanner';
import NotFound from './pages/NotFound';
import UpdateNotifier from './components/UpdateNotifier';
import { auth } from './config/firebase';

// Componente visual premium integrado para procesar el clic del correo
function AuthActionHandler() {
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('Sincronizando credenciales de acceso institucional...');

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const mode = queryParams.get('mode');
    const oobCode = queryParams.get('oobCode');

    if (mode === 'verifyEmail' && oobCode) {
      auth.applyActionCode(oobCode)
        .then(() => {
          setStatus('success');
          setMessage('¡Tu dirección de correo electrónico ha sido confirmada con éxito!');
          if (auth.currentUser) auth.currentUser.reload();
        })
        .catch((error) => {
          console.error(error);
          setStatus('error');
          if (error.code === 'auth/invalid-action-code') {
            setMessage('El enlace de activación es inválido o ya fue utilizado anteriormente.');
          } else if (error.code === 'auth/expired-action-code') {
            setMessage('La solicitud de verificación ha caducado. Por favor, solicita un nuevo enlace.');
          } else {
            setMessage('No se pudo completar la verificación debido a un problema de red.');
          }
        });
    } else {
      setStatus('error');
      setMessage('Acción no reconocida o parámetros de seguridad ausentes.');
    }
  }, []);

  return (
    <div style={{
      minHeight: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '20px', fontFamily: '"Inter", sans-serif'
    }}>
      <div style={{ maxWidth: '450px', width: '100%', padding: '40px', background: 'white', borderRadius: '16px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <img src="/img/PIDA_logo-100-blue-red.webp" alt="PIDA Logo" style={{ width: '130px', marginBottom: '25px', display: 'block', margin: '0 auto' }} />
        
        {status === 'verifying' && (
          <div>
            <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #1d3557', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px auto' }}></div>
            <p style={{ color: '#475569', fontSize: '0.95rem', fontWeight: '500' }}>{message}</p>
          </div>
        )}

        {status === 'success' && (
          <>
            <h2 style={{ color: '#10B981', margin: '0 0 10px 0', fontWeight: '700', fontSize: '1.6rem' }}>¡Verificación Completada!</h2>
            <p style={{ color: '#64748B', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '25px' }}>
              {message}
              <br /><br />
              <strong>Puedes cerrar esta pestaña de forma segura</strong> y regresar a la ventana original donde iniciaste tu registro. El sistema ya habrá avanzado automáticamente.
            </p>
            <button onClick={() => window.close()} style={{ width: '100%', padding: '14px', border: 'none', borderRadius: '8px', background: '#1d3557', color: 'white', fontWeight: '600', fontSize: '1rem', cursor: 'pointer' }}>
              Cerrar Ventana
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <h2 style={{ color: '#EF4444', margin: '0 0 10px 0', fontWeight: '700', fontSize: '1.6rem' }}>Enlace Inválido</h2>
            <p style={{ color: '#64748B', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '25px' }}>{message}</p>
            <button onClick={() => window.location.href = '/'} style={{ width: '100%', padding: '14px', border: 'none', borderRadius: '8px', background: '#475569', color: 'white', fontWeight: '600', fontSize: '1rem', cursor: 'pointer' }}>
              Ir al inicio
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } .loader { border-top: 4px solid #1d3557; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto; }`}</style>
    </div>
  );
}

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

  const currentPath = window.location.pathname;

  // Interceptar la subruta de verificación para renderizar la pantalla limpia
  if (currentPath === '/auth-action') {
    return <AuthActionHandler />;
  }

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
        onClose={(success) => {
          if (!success && user) {
            auth.signOut();
            sessionStorage.removeItem('pida_pending_plan');
            sessionStorage.removeItem('pida_pending_interval');
          }
          setAuthModalConfig({ isOpen: false, mode: 'login' });
        }} 
      />

      {user && !authModalConfig.isOpen && (
        <Dashboard 
          user={user} 
          onRequireSubscription={() => setAuthModalConfig({ isOpen: true, mode: 'checkout' })}
        />
      )}
    </>
  );
}

export default App;