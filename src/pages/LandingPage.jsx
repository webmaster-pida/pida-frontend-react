import React from 'react';

export default function LandingPage() {
  return (
    <div id="landing-page-root">
      {/* HEADER / NAVBAR */}
      <header className="nav" id="navbar">
        <div className="wrapper nav-inner">
          <nav className="nav-menu">
            <a href="#diferencia" className="nav-link">Diferencia PIDA</a>
            <a href="#bondades" className="nav-link">Bondades</a>
            <a href="#planes" className="nav-link">Planes</a>
            <div className="nav-dropdown-container">
              <span className="nav-link" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Newsletter <span style={{ fontSize: '0.7em' }}>▼</span>
              </span>
              <div className="nav-dropdown-menu">
                <a href="/newsletter-001.pdf" target="_blank" rel="noreferrer">Enero 2026</a>
                <a href="/newsletter-002.pdf" target="_blank" rel="noreferrer">Febrero 2026</a>
                <a href="/newsletter-003.pdf" target="_blank" rel="noreferrer">Marzo 2026</a>
              </div>
            </div>
          </nav>
        </div>
      </header>

      <main>
        {/* SECCIÓN HERO */}
        <section className="hero">
          <div className="wrapper hero-grid">
            <div className="hero-content">
              <div>
                <img src="/img/PIDA_logo-576.png" alt="Logo PIDA" />
              </div>
              <h1>
                Inteligencia Aumentada para la Defensa de los <br />
                <span className="text-gradient">Derechos Humanos</span>
              </h1>
              <p className="hero-desc">
                Los asistentes de Inteligencia Artificial genéricos son un océano de información, pero sin un ancla, pueden llevarte a la deriva con datos imprecisos.
              </p>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                {/* Nota: Más adelante le daremos la función de abrir el modal a este botón */}
                <button id="cta-hero" className="btn btn-primary trigger-login">
                  Entrar a PIDA
                </button>
              </div>
            </div>
            
            <div className="hero-visual-column">
              <img style={{ borderRadius: '8px' }} src="/img/PIDA-MASCOTA-576-trans.png" alt="Robot PIDA" />
              <div className="video-trigger-wrapper">
                <button id="open-video-modal-btn" className="video-link-btn">
                  <div className="play-icon-circle">▶</div>
                  <span>Ver video</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN BONDADES (Ejemplo) */}
        <section id="bondades" style={{ background: '#FAFAFA' }}>
          <div className="wrapper">
            <h2 style={{ marginBottom: '40px', textAlign: 'center' }}>Bondades únicas de PIDA</h2>
            <div className="bento-grid">
              <div className="bento-card">
                <h3 className="bento-title">Respuestas Ancladas, no Adivinanzas</h3>
                <p>Cada respuesta está fundamentada y prioriza el conocimiento del IIRESODH. Esto le da un nivel de fiabilidad y precisión que las IAs genéricas no pueden ofrecer.</p>
              </div>
              <div className="bento-card">
                <h3 className="bento-title">Lo Mejor de Dos Mundos</h3>
                <p>Combina la sabiduría especializada del IIRESODH con la capacidad de razonamiento y redacción de un modelo de IA de vanguardia.</p>
              </div>
              <div className="bento-card">
                <h3 className="bento-title">Eficiencia Acelerada</h3>
                <p>El "Analizador de Documentos" sigue siendo tu experto incansable, capaz de procesar tus archivos y extraer información clave en minutos.</p>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}