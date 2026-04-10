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