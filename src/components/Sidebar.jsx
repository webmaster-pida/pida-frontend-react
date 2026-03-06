import React, { useState } from 'react';
import { auth } from '../config/firebase';

export default function Sidebar({ currentView, setCurrentView, user }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const doLogout = () => {
    auth.signOut();
  };

  // Función para cambiar de vista y cerrar el menú móvil automáticamente
  const handleNavClick = (view) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <aside id="pida-sidebar">
      <div className="pida-logo-container">
        <a href="#" id="app-home-link" onClick={(e) => { e.preventDefault(); handleNavClick('investigador'); }}>
          <img src="/img/PIDA-logo-blanco-scaled.png" alt="PIDA" className="pida-sidebar-logo" />
        </a>
      </div>
      
      <nav className="pida-main-nav">
        <button 
          className={`app-nav-link ${currentView === 'investigador' ? 'active' : ''}`}
          onClick={() => handleNavClick('investigador')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.031 16.6168L22.3137 20.8995L20.8995 22.3137L16.6168 18.031C15.0769 19.263 13.124 20 11 20C6.032 20 2 15.968 2 11C2 6.032 6.032 2 11 2C15.968 2 20 6.032 20 11C20 13.124 19.263 15.0769 18.031 16.6168ZM11 18C14.866 18 18 14.866 18 11C18 7.13401 14.866 4 11 4C7.13401 4 4 7.13401 4 11C4 14.866 7.13401 18 11 18Z"></path></svg>
          <span>Experto en DDHH</span>
        </button>
        <button 
          className={`app-nav-link ${currentView === 'analizador' ? 'active' : ''}`}
          onClick={() => handleNavClick('analizador')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15 4H5V20H19V8H15V4ZM3 2.9918C3 2.44405 3.44749 2 3.99826 2H16L21 7V20.9925C21 21.5489 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.556 3 21.0082V2.9918ZM13 12H7V14H13V12ZM13 16H7V18H13V16Z"></path></svg>
          <span>Analizador Docs</span>
        </button>
        <button 
          className={`app-nav-link ${currentView === 'precalificador' ? 'active' : ''}`}
          onClick={() => handleNavClick('precalificador')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6C5.44772 2 5 2.44772 5 3V21C5 21.5523 5.44772 22 6 22H18C18.5523 22 19 21.5523 19 21V7L14 2ZM15 8V4L18 7H15ZM12 18C10.3431 18 9 16.6569 9 15C9 13.3431 10.3431 12 12 12C13.6569 12 15 13.3431 15 15C15 16.6569 13.6569 18 12 18ZM12 16C12.5523 16 13 15.5523 13 15C13 14.4477 12.5523 14 12 14C11.4477 14 11 14.4477 11 15C11 15.5523 11.4477 16 12 16Z"></path></svg>
          <span>Precalificador</span>
        </button>

        {/* --- NUEVO: BOTÓN DE MENÚ SOLO PARA MÓVILES --- */}
        {/* (Utilizamos una clase especial o estilos en línea para asegurarnos de que se vea como botón extra) */}
        <div style={{ position: 'relative' }} className="mobile-menu-wrapper">
          <button 
            className="app-nav-link mobile-only-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4H21V6H3V4ZM3 11H21V13H3V11ZM3 18H21V20H3V18Z"></path></svg>
            <span>Menú</span>
          </button>

          {/* Burbuja flotante del Menú Móvil */}
          {isMobileMenuOpen && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              right: '0',
              marginBottom: '10px',
              backgroundColor: 'white',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
              borderRadius: '12px',
              minWidth: '200px',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <button 
                onClick={() => handleNavClick('cuenta')}
                style={{ background: 'none', border: 'none', padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', color: '#1D3557', fontWeight: '500', fontSize: '1rem' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Mi Cuenta / Pagos
              </button>
              <button 
                onClick={doLogout}
                style={{ background: 'none', border: 'none', padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#EF4444', fontWeight: '500', fontSize: '1rem' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </nav>
      
      {/* Información de usuario en Desktop */}
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

      {/* Capa invisible para cerrar el menú móvil al tocar afuera */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }}
        ></div>
      )}
    </aside>
  );
}