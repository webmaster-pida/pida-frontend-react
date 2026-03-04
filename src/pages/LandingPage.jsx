import React, { useState, useEffect } from 'react';
import { STRIPE_PRICES } from '../config/constants';

export default function LandingPage({ onOpenAuth }) {
  // Estados para controlar los precios
  const [interval, setInterval] = useState('monthly'); // 'monthly' o 'annual'
  const [currency, setCurrency] = useState('USD');     // 'USD' o 'MXN'

  // Detección automática de ubicación para ajustar moneda (como tenías en Vanilla JS)
  useEffect(() => {
    const detectLocation = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        const data = await response.json();
        clearTimeout(timeoutId);
        
        if (data.country_code === 'MX') {
          setCurrency('MXN');
        }
      } catch (e) {
        // Fallback por zona horaria
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (/Mexico|Monterrey|Chihuahua|Tijuana|Cancun/i.test(tz)) {
          setCurrency('MXN');
        }
      }
    };
    detectLocation();
  }, []);

  // Función al hacer clic en un plan
  const handleSelectPlan = (planKey) => {
    // Guardamos las opciones para que el AuthModal sepa qué cobrar
    sessionStorage.setItem('pida_pending_plan', planKey);
    sessionStorage.setItem('pida_pending_interval', interval);
    localStorage.setItem('pida_currency', currency);
    
    // Abrimos el modal
    onOpenAuth('register');
  };

  return (
    <div id="landing-page-root">
      <header className="nav" id="navbar">
        <div className="wrapper nav-inner">
          <nav className="nav-menu">
            <a href="#diferencia" className="nav-link">Diferencia PIDA</a>
            <a href="#planes" className="nav-link">Planes</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrapper hero-grid">
            <div className="hero-content">
              <div><img src="/img/PIDA_logo-576.png" alt="Logo PIDA" /></div>
              <h1>
                Inteligencia Aumentada para la Defensa de los <br />
                <span className="text-gradient">Derechos Humanos</span>
              </h1>
              <p className="hero-desc">
                Los asistentes de Inteligencia Artificial genéricos son un océano de información, pero sin un ancla, pueden llevarte a la deriva con datos imprecisos.
              </p>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                <button className="btn btn-primary" onClick={() => onOpenAuth('login')}>
                  Entrar a PIDA
                </button>
              </div>
            </div>
            <div className="hero-visual-column">
              <img style={{ borderRadius: '8px' }} src="/img/PIDA-MASCOTA-576-trans.png" alt="Robot PIDA" />
            </div>
          </div>
        </section>

        {/* SECCIÓN DE PLANES CON LÓGICA REACTIVA */}
        <section id="planes">
          <div className="wrapper">
            <div className="section-intro">
              <h2>Planes Flexibles</h2>
              <p style={{ marginBottom: '10px' }}>Selecciona el plan que mejor se adapte a tu nivel de investigación.</p>
              <p style={{ color: '#0284C7', fontWeight: 700, fontSize: '1.1rem', marginBottom: '20px' }}>
                Todos los planes incluyen 5 días de prueba sin costo
              </p>
            </div>

            {/* SWITCH MENSUAL / ANUAL */}
            <div className="billing-toggle-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '40px' }}>
              <span style={{ fontWeight: 700, color: interval === 'monthly' ? 'var(--pida-primary)' : '#94a3b8', transition: '0.3s' }}>
                Mensual
              </span>
              
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={interval === 'annual'} 
                  onChange={(e) => setInterval(e.target.checked ? 'annual' : 'monthly')} 
                />
                <span className="slider round"></span>
              </label>

              <span style={{ fontWeight: 700, color: interval === 'annual' ? 'var(--pida-primary)' : '#94a3b8', transition: '0.3s', position: 'relative' }}>
                Anual
                {interval === 'annual' && <span className="discount-badge" style={{ display: 'inline-block' }}>¡Dos meses gratis!</span>}
              </span>
            </div>

            {/* TARJETAS DE PRECIOS DINÁMICAS */}
            <div className="pricing-grid">
              
              {/* Básico */}
              <div className="pricing-card">
                <h3>Básico</h3>
                <div className="price-container">
                  <span className="price-val">{STRIPE_PRICES.basico[interval][currency].text}</span>
                  <span className="price-period">{interval === 'monthly' ? '/ mes' : '/ año'}</span>
                </div>
                <ul className="plan-features">
                  <li>✅ Newsletter mensual</li>
                  <li>✅ 5 consultas diarias</li>
                  <li>✅ 3 análisis de documentos</li>
                  <li>❌ Sin precalificador</li>
                </ul>
                <button className="btn btn-primary plan-cta" onClick={() => handleSelectPlan('basico')}>Elegir Básico</button>
              </div>

              {/* Avanzado */}
              <div className="pricing-card featured">
                <div className="card-badge">Más Popular</div>
                <h3>Avanzado</h3>
                <div className="price-container">
                  <span className="price-val">{STRIPE_PRICES.avanzado[interval][currency].text}</span>
                  <span className="price-period">{interval === 'monthly' ? '/ mes' : '/ año'}</span>
                </div>
                <ul className="plan-features">
                  <li>✅ 20 consultas diarias</li>
                  <li>✅ 15 análisis de documentos</li>
                  <li>✅ 20 precalificaciones diarias</li>
                </ul>
                <button className="btn btn-primary plan-cta" onClick={() => handleSelectPlan('avanzado')}>Elegir Avanzado</button>
              </div>

              {/* Premium */}
              <div className="pricing-card">
                <h3>Premium</h3>
                <div className="price-container">
                  <span className="price-val">{STRIPE_PRICES.premium[interval][currency].text}</span>
                  <span className="price-period">{interval === 'monthly' ? '/ mes' : '/ año'}</span>
                </div>
                <ul className="plan-features">
                  <li>✅ 100 consultas diarias</li>
                  <li>✅ 25 análisis de documentos</li>
                  <li>✅ 100 precalificaciones diarias</li>
                </ul>
                <button className="btn btn-primary plan-cta" onClick={() => handleSelectPlan('premium')}>Elegir Premium</button>
              </div>

            </div>
          </div>
        </section>
      </main>
    </div>
  );
}