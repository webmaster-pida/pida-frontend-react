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

        {/* SECCIÓN DIFERENCIA */}
        <section id="diferencia">
            <div class="wrapper">
                <div class="section-intro"><h2>¿Cuál es la gran diferencia de PIDA?</h2><p>PIDA no improvisa buscando en el caos de internet. Su punto de partida es la biblioteca del <strong>IIRESODH</strong>, una institución referente con más de 30 años de experiencia en Litigio Estratégico Internacional.</p><p>Primero, PIDA consulta este acervo validado por personas expertas en Derechos Humanos para obtener el fundamento correcto. Luego, usa la IA para construir tu respuesta. Así obtienes la velocidad de la tecnología, pero con la <strong>autoridad y el rigor técnico</strong> que solo el IIRESODH puede garantizar.</p></div>
                <!--<div class="bento-grid">
                    <div class="bento-card"><div><img src="img/icono_01.png" alt="Económico"></div><div><h3 class="bento-title">Económico</h3><p>PIDA cuesta menos que la competencia</p></div></div>
                    <div class="bento-card"><div><img src="img/icono_03.png" alt="Seguro"></div><h3 class="bento-title">Seguro</h3><p>Tus datos viajan encriptados y no se comparten</p></div>
                    <div class="bento-card"><div><img src="img/Icon_App-Mobile.png" alt="Móvil"></div><h3 class="bento-title">Móvil</h3><p>Funciona en cualquier dispositivo móvil</p></div>
                </div>-->
            </div>
        </section>

        {/* SECCIÓN BONDADES */}
        <section id="bondades" style="background: #FAFAFA;">
            <div class="wrapper">
                <h2 style="margin-bottom: 40px; text-align: center;">Bondades únicas de PIDA</h2>
                <div class="bento-grid">
                    <div class="bento-card"><h3 class="bento-title">Respuestas Ancladas, no Adivinanzas</h3><p>Cada respuesta está fundamentada y prioriza el conocimiento del IIRESODH. Esto le da un nivel de fiabilidad y precisión que las IAs genéricas no pueden ofrecer, minimizando el riesgo de información incorrecta.</p></div>
                    <div class="bento-card"><h3 class="bento-title">Lo Mejor de Dos Mundos</h3><p>Combina la sabiduría especializada del IIRESODH con la capacidad de razonamiento y redacción de un modelo de IA de vanguardia. Obtienes respuestas con calidad de experto, no solo texto genérico.</p></div>
                    <div class="bento-card"><h3 class="bento-title">Eficiencia Acelerada</h3><p>El “Analizador de Documentos” sigue siendo tu experto incansable, capaz de procesar tus archivos y extraer información clave en minutos, liberándote para la estrategia y la acción.</p></div>
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
                  <li>✅ 1 archivo por análisis</li>
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
                  <li>✅ Newsletter mensual</li>
                  <li>✅ 20 consultas diarias</li>
                  <li>✅ 15 análisis de documentos</li>
                  <li>✅ 3 archivos por análisis</li>
                  <li>✅ 20 precalificaciones diarias</li>
                  <li>✅ Descuentos en productos IIRESODH</li>
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
                  <li>✅ Newsletter mensual</li>
                  <li>✅ 100 consultas diarias</li>
                  <li>✅ 25 análisis de documentos</li>
                  <li>✅ 5 archivos por análisis</li>
                  <li>✅ 100 precalificaciones diarias</li>
                  <li>✅ Descuentos en productos IIRESODH</li>
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