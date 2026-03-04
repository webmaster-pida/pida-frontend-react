import React from 'react';
import { auth } from '../config/firebase';

export default function Sidebar({ currentView, setCurrentView, user }) {
  const doLogout = () => {
    auth.signOut();
  };

  return (
    <aside id="pida-sidebar">
      <div className="pida-logo-container">
        <a href="#" id="app-home-link" onClick={(e) => e.preventDefault()}>
          <img src="/img/PIDA-logo-blanco-scaled.png" alt="PIDA" className="pida-sidebar-logo" />
        </a>
      </div>
      
      <nav className="pida-main-nav">
        <button 
          className={`app-nav-link ${currentView === 'investigador' ? 'active' : ''}`}
          onClick={() => setCurrentView('investigador')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.031 16.6168L22.3137 20.8995L20.8995 22.3137L16.6168 18.031C15.0769 19.263 13.124 20 11 20C6.032 20 2 15.968 2 11C2 6.032 6.032 2 11 2C15.968 2 20 6.032 20 11C20 13.124 19.263 15.0769 18.031 16.6168ZM11 18C14.866 18 18 14.866 18 11C18 7.13401 14.866 4 11 4C7.13401 4 4 7.13401 4 11C4 14.866 7.13401 18 11 18Z"></path></svg>
          <span>Experto en DDHH</span>
        </button>
        <button 
          className={`app-nav-link ${currentView === 'analizador' ? 'active' : ''}`}
          onClick={() => setCurrentView('analizador')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15 4H5V20H19V8H15V4ZM3 2.9918C3 2.44405 3.44749 2 3.99826 2H16L21 7V20.9925C21 21.5489 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.556 3 21.0082V2.9918ZM13 12H7V14H13V12ZM13 16H7V18H13V16Z"></path></svg>
          <span>Analizador Docs</span>
        </button>
        <button 
          className={`app-nav-link ${currentView === 'precalificador' ? 'active' : ''}`}
          onClick={() => setCurrentView('precalificador')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6C5.44772 2 5 2.44772 5 3V21C5 21.5523 5.44772 22 6 22H18C18.5523 22 19 21.5523 19 21V7L14 2ZM15 8V4L18 7H15ZM12 18C10.3431 18 9 16.6569 9 15C9 13.3431 10.3431 12 12 12C13.6569 12 15 13.3431 15 15C15 16.6569 13.6569 18 12 18ZM12 16C12.5523 16 13 15.5523 13 15C13 14.4477 12.5523 14 12 14C11.4477 14 11 14.4477 11 15C11 15.5523 11.4477 16 12 16Z"></path></svg>
          <span>Precalificador</span>
        </button>
      </nav>
      
      <div className="pida-sidebar-user">
        <img 
          src={user?.photoURL || "/img/PIDA_logo-P3-80.png"} 
          className="pida-user-avatar" 
          alt="Avatar" 
          onClick={() => setCurrentView('cuenta')} 
        />
        <div className="pida-user-info" onClick={() => setCurrentView('cuenta')}>
          <span className="pida-user-name">{user?.displayName || 'Usuario'}</span>
          <span className="pida-user-email">{user?.email}</span>
        </div>
        <button className="pida-logout-icon-btn" title="Cerrar Sesión" onClick={doLogout}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </div>
    </aside>
  );
}