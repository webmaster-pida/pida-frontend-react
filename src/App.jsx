import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import AuthModal from './components/AuthModal';
import Dashboard from './pages/Dashboard';
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

  if (loading) return <div id="pida-global-loader"><div className="loader"></div></div>;

  return (
    <>
      {!user ? (
        <>
          <LandingPage 
            onOpenAuth={(mode = 'login') => setAuthModalConfig({ isOpen: true, mode })} 
          />
          <AuthModal 
            isOpen={authModalConfig.isOpen} 
            initialMode={authModalConfig.mode}
            onClose={() => setAuthModalConfig({ isOpen: false, mode: 'login' })} 
          />
        </>
      ) : (
        <Dashboard user={user} />
      )}
    </>
  );
}

export default App;