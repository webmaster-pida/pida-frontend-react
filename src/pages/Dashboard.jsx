import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatInterface from '../components/ChatInterface';
import AnalyzerInterface from '../components/AnalyzerInterface';
import PrequalifierInterface from '../components/PrequalifierInterface';
import AccountInterface from '../components/AccountInterface'; // <--- IMPORTACIÓN AÑADIDA

export default function Dashboard({ user }) {
  // Estado que controla qué vista está activa
  const [currentView, setCurrentView] = useState('investigador'); 

  return (
    <div id="pida-app-layout">
      {/* Barra Lateral */}
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        user={user} 
      />

      {/* Contenido Principal */}
      <main id="pida-main-content">
        
        {/* BARRA SUPERIOR DINÁMICA */}
        <header className="pida-top-header">
          <div className="pida-context-controls">
            
            {/* Controles para Investigador */}
            {currentView === 'investigador' && (
              <div className="context-group">
                <button className="pida-header-btn primary">+ Nuevo Chat</button>
                <button className="pida-header-btn">Chats Previos ▼</button>
              </div>
            )}

            {/* Controles para Analizador */}
            {currentView === 'analizador' && (
              <div className="context-group">
                <button className="pida-header-btn primary">+ Subir Archivos</button>
                <button className="pida-header-btn">Análisis Previos ▼</button>
              </div>
            )}

            {/* Controles para Precalificador */}
            {currentView === 'precalificador' && (
              <div className="context-group">
                <button className="pida-header-btn primary">+ Nueva Precalificación</button>
                <button className="pida-header-btn">Historial ▼</button>
              </div>
            )}

            {/* Título para Mi Cuenta */}
            {currentView === 'cuenta' && (
              <div className="context-group">
                <h2 style={{ margin:0, fontSize: '1.2rem', color: 'var(--pida-primary)' }}>Gestión de Cuenta</h2>
              </div>
            )}
            
            {/* Etiqueta de Plan */}
            <div className="plan-badge">Plan: Básico</div>
            <img src="/img/PIDA-MASCOTA-menu.png" alt="PIDA Mascota" className="pida-header-mascot" />
          </div>
        </header>

        {/* ZONA DONDE IRÁ LA HERRAMIENTA SELECCIONADA */}
        
        {currentView === 'investigador' && <ChatInterface user={user} />}

        {currentView === 'analizador' && <AnalyzerInterface user={user} />}

        {currentView === 'precalificador' && <PrequalifierInterface user={user} />}

        {/* <--- VISTA DE CUENTA AÑADIDA ---> */}
        {currentView === 'cuenta' && <AccountInterface user={user} />}

      </main>
    </div>
  );
}