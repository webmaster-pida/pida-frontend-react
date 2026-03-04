import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import AuthModal from './components/AuthModal';
import Dashboard from './pages/Dashboard'; // Importamos el Dashboard
import { auth } from './config/firebase';

function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
      {!user ? (
        <>
          <LandingPage onOpenAuth={() => setIsAuthModalOpen(true)} />
          <AuthModal 
            isOpen={isAuthModalOpen} 
            onClose={() => setIsAuthModalOpen(false)} 
          />
        </>
      ) : (
        /* Renderizamos el Dashboard pasándole el usuario */
        <Dashboard user={user} />
      )}
    </>
  );
}

export default App;