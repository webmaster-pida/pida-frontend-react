import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import AuthModal from './components/AuthModal';
import { auth } from './config/firebase'; // Importamos la auth

function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState(null); // Aquí guardamos al usuario
  const [loading, setLoading] = useState(true);

  // Este "Efecto" escucha cambios en la sesión (Login/Logout)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div id="pida-global-loader"><div className="loader"></div></div>;

  return (
    <>
      {/* Si NO hay usuario logueado, muestra la Landing Page */}
      {!user ? (
        <>
          <LandingPage onOpenAuth={() => setIsAuthModalOpen(true)} />
          <AuthModal 
            isOpen={isAuthModalOpen} 
            onClose={() => setIsAuthModalOpen(false)} 
          />
        </>
      ) : (
        /* Si SÍ hay usuario logueado, muestra esto (por ahora) */
        <div style={{ padding: '100px', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
          <img src="/img/PIDA_logo-576.png" alt="PIDA Logo" style={{ width: '150px', marginBottom: '20px' }}/>
          <h1 style={{ color: 'var(--navy)' }}>¡Bienvenido a PIDA, {user.displayName || user.email}! 👋</h1>
          <p style={{ color: '#666', marginBottom: '30px' }}>Has iniciado sesión exitosamente con Firebase y React.</p>
          <button 
            className="btn btn-primary" 
            onClick={() => auth.signOut()}
          >
            Cerrar Sesión
          </button>
        </div>
      )}
    </>
  );
}

export default App;