import React, { useState, useEffect } from 'react';
import { STRIPE_PRICES } from '../config/constants';
import { db } from '../config/firebase'; 

export default function LandingPage({ onOpenAuth }) {
  const [interval, setInterval] = useState('monthly'); 
  const [currency, setCurrency] = useState('USD');     
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNewsletter, setShowNewsletter] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
      name: '', company: '', email: '', confirmEmail: '', countryCode: '+503', phone: '', message: ''
  });
  const [contactStatus, setContactStatus] = useState({ text: '', type: '', isSubmitting: false });

  useEffect(() => {
    const detectLocation = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        const data = await response.json();
        clearTimeout(timeoutId);
        
        if (data.country_code === 'MX') { setCurrency('MXN'); }
      } catch (e) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (/Mexico|Monterrey|Chihuahua|Tijuana|Cancun/i.test(tz)) { setCurrency('MXN'); }
      }
    };
    detectLocation();
  }, []);

  useEffect(() => {
    if (window.location.hash) {
      const targetId = window.location.hash.substring(1);
      setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3); 
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const handleSelectPlan = (planKey) => {
    sessionStorage.setItem('pida_pending_plan', planKey);
    sessionStorage.setItem('pida_pending_interval', interval);
    localStorage.setItem('pida_currency', currency);
    onOpenAuth('register');
  };

  const handleContactSubmit = async (e) => {
      e.preventDefault();
      if (contactForm.email !== contactForm.confirmEmail) {
          setContactStatus({ text: '❌ Los correos electrónicos no coinciden.', type: 'error', isSubmitting: false });
          return;
      }
      setContactStatus({ text: '', type: '', isSubmitting: true });
      const leadData = {
          name: contactForm.name, company: contactForm.company, email: contactForm.email,
          phone: `${contactForm.countryCode} ${contactForm.phone}`, message: contactForm.message,
          createdAt: new Date(), status: 'nuevo'
      };
      try {
          await db.collection('leads_corporativos').add(leadData);
          setContactStatus({ text: 'Datos recibidos. Te contactaremos pronto.', type: 'success', isSubmitting: false });
          setTimeout(() => {
              setIsContactOpen(false);
              setContactForm({ name: '', company: '', email: '', confirmEmail: '', countryCode: '+503', phone: '', message: '' });
              setContactStatus({ text: '', type: '', isSubmitting: false });
          }, 3000);
      } catch (error) {
          setContactStatus({ text: 'Error de conexión. Intenta de nuevo.', type: 'error', isSubmitting: false });
      }
  };

  return (
    <div id="landing-page-root">
      <header className="nav" id="navbar">
        <div className="wrapper nav-inner">
          <nav className="nav-menu" style={{ display: 'flex', alignItems: 'center' }}>
            
            <a href="#pida" className="nav-link hide-on-mobile">PIDA</a>
            <a href="#diferencia" className="nav-link hide-on-mobile">Diferencia PIDA</a>
            <a href="#ecosistema" className="nav-link hide-on-mobile">Ecosistema</a>
            <a href="#planes" className="nav-link hide-on-mobile">Planes</a>

            <div 
              style={{ position: 'relative', display: 'inline-block' }}
              onMouseEnter={() => setShowNewsletter(true)}
              onMouseLeave={() => setShowNewsletter(false)}
            >
              <span className="nav-link" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                Newsletter <span style={{ fontSize: '0.7em' }}>▼</span>
              </span>
              
              {showNewsletter && (
                <div className="newsletter-dropdown-content">
                  <div style={{ position: 'absolute', top: '-10px', left: 0, width: '100%', height: '15px' }}></div>
                  <a href="/newsletter-001.pdf" target="_blank" rel="noreferrer">📄 Enero 2026</a>
                  <a href="/newsletter-002.pdf" target="_blank" rel="noreferrer">📄 Febrero 2026</a>
                  <a href="/newsletter-003.pdf" target="_blank" rel="noreferrer">📄 Marzo 2026</a>
                </div>
              )}
            </div>

            <button className="nav-login-btn" onClick={() => onOpenAuth('login')}>
              Login
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section id="pida"></section>
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
              
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                <button className="btn btn-primary" onClick={() => document.getElementById('planes').scrollIntoView({ behavior: 'smooth' })}>
                  Ver Planes
                </button>
                <button className="btn btn-ghost" onClick={() => onOpenAuth('login')} style={{ backgroundColor: 'white', border: '1px solid var(--pida-primary)', color: 'var(--pida-primary)' }}>
                  Login PIDA
                </button>
              </div>
            </div>
            <div className="hero-visual-column" style={{ textAlign: 'center' }}>
              <img style={{ borderRadius: '8px', marginBottom: '20px' }} src="/img/PIDA-MASCOTA-576-trans.png" alt="Robot PIDA" />
              
              <button className="btn-video-play" onClick={() => setIsVideoOpen(true)}>
                <span style={{ fontSize: '1.2rem' }}>▶</span> Ver PIDA en acción
              </button>

            </div>
          </div>
        </section>

        <section id="diferencia">
            <div className="wrapper">
                <div className="section-intro">
                    <h2>¿Cuál es la gran diferencia de PIDA?</h2>
                    <p>PIDA no improvisa buscando en el caos de internet. Su punto de partida es la biblioteca del <strong>IIRESODH</strong>, una institución referente con más de 30 años de experiencia en Litigio Estratégico Internacional.</p>
                    <p>Primero, PIDA consulta este acervo validado por personas expertas en Derechos Humanos para obtener el fundamento correcto. Luego, usa la IA para construir tu respuesta. Así obtienes la velocidad de la tecnología, pero con la <strong>autoridad y el rigor técnico</strong> que solo el IIRESODH puede garantizar.</p>
                </div>
            </div>
        </section>

        <section id="bondades" style={{ background: '#FAFAFA' }}>
            <div className="wrapper">
                <h2 style={{ marginBottom: '40px', textAlign: 'center' }}>Bondades únicas de PIDA</h2>
                <div className="bento-grid">
                    <div className="bento-card">
                        <h3 className="bento-title">Respuestas Ancladas, no Adivinanzas</h3>
                        <p>Cada respuesta está fundamentada y prioriza el conocimiento del IIRESODH. Esto le da un nivel de fiabilidad y precisión que las IAs genéricas no pueden ofrecer, minimizando el riesgo de información incorrecta.</p>
                    </div>
                    <div className="bento-card">
                        <h3 className="bento-title">Lo Mejor de Dos Mundos</h3>
                        <p>Combina la sabiduría especializada del IIRESODH con la capacidad de razonamiento y redacción de un modelo de IA de vanguardia. Obtienes respuestas con calidad de experto, no solo texto genérico.</p>
                    </div>
                    <div className="bento-card">
                        <h3 className="bento-title">Eficiencia Acelerada</h3>
                        <p>El “Analizador de Documentos” sigue siendo tu experto incansable, capaz de procesar tus archivos y extraer información clave en minutos, liberándote para la estrategia y la acción.</p>
                    </div>
                </div>
            </div>
        </section>

        <section id="ecosistema" style={{ backgroundColor: '#FFFFFF', padding: '80px 0' }}>
            <div className="wrapper">
                <div className="section-intro" style={{ marginBottom: '60px' }}>
                    <h2 style={{ color: 'var(--navy)', fontSize: '2.5rem', marginBottom: '15px' }}>El Ecosistema PIDA</h2>
                    <p style={{ fontSize: '1.2rem', color: '#4B5563', maxWidth: '800px', margin: '0 auto' }}>
                        PIDA integra tres motores especializados que trabajan en conjunto para cubrir el ciclo completo de la defensa legal: investigación, análisis documental y diagnóstico de casos.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '50px', maxWidth: '900px', margin: '0 auto' }}>
                    <div style={{ borderLeft: '4px solid #0284C7', paddingLeft: '30px' }}>
                        <h3 style={{ color: 'var(--navy)', fontSize: '1.5rem', marginBottom: '10px' }}>
                            1. Experto en Derechos Humanos
                            <span style={{ display: 'block', fontSize: '1rem', color: '#0284C7', fontWeight: '600', marginTop: '5px' }}>TU CONSULTOR FUNDAMENTADO</span>
                        </h3>
                        <p style={{ fontSize: '1.05rem', color: '#374151', lineHeight: '1.7', marginBottom: '15px' }}>
                            Este motor redefine la investigación jurídica. A diferencia de los chats genéricos que improvisan respuestas, PIDA actúa como un consultor senior conectado directamente a la <strong>biblioteca privada y curada del IIRESODH</strong>.
                        </p>
                        <p style={{ fontSize: '1rem', color: '#4B5563', lineHeight: '1.6' }}>
                            <strong>Aplicación Práctica:</strong> Utilízalo para resolver dudas complejas sobre control de convencionalidad, buscar jurisprudencia específica de la Corte IDH o redactar argumentos sólidos para tus demandas. Cada respuesta está respaldada por una base de conocimiento autorizada, garantizando rigor técnico y reduciendo el riesgo de imprecisiones.
                        </p>
                    </div>

                    <div style={{ borderLeft: '4px solid #0284C7', paddingLeft: '30px' }}>
                        <h3 style={{ color: 'var(--navy)', fontSize: '1.5rem', marginBottom: '10px' }}>
                            2. Analizador de Documentos
                            <span style={{ display: 'block', fontSize: '1rem', color: '#0284C7', fontWeight: '600', marginTop: '5px' }}>TU ESTRATEGA PROCESAL</span>
                        </h3>
                        <p style={{ fontSize: '1.05rem', color: '#374151', lineHeight: '1.7', marginBottom: '15px' }}>
                            Capacidad de procesamiento masivo para el abogado moderno. Esta herramienta lee, comprende y procesa archivos voluminosos (PDF, Word) en segundos, actuando como un asistente analítico incansable.
                        </p>
                        <p style={{ fontSize: '1rem', color: '#4B5563', lineHeight: '1.6' }}>
                            <strong>Aplicación Práctica:</strong> Carga una sentencia extensa y pídele que encuentre contradicciones lógicas, extraiga los hechos probados para armar tu apelación o elabore una <strong>Teoría del Caso</strong> basada en las pruebas del expediente. Además, puedes instruirle para que redacte borradores de escritos legales (amparos, memorandos) utilizando estrictamente la información del documento subido.
                        </p>
                    </div>

                    <div style={{ borderLeft: '4px solid #0284C7', paddingLeft: '30px' }}>
                        <h3 style={{ color: 'var(--navy)', fontSize: '1.5rem', marginBottom: '10px' }}>
                            3. Precalificador de Conductas
                            <span style={{ display: 'block', fontSize: '1rem', color: '#0284C7', fontWeight: '600', marginTop: '5px' }}>TU DIAGNÓSTICO INMEDIATO</span>
                        </h3>
                        <p style={{ fontSize: '1.05rem', color: '#374151', lineHeight: '1.7', marginBottom: '15px' }}>
                            Una herramienta de encuadre jurídico diseñada para la etapa inicial de cualquier caso. Funciona como un puente inteligente entre los hechos fácticos y la tipificación legal.
                        </p>
                        <p style={{ fontSize: '1rem', color: '#4B5563', lineHeight: '1.6' }}>
                            <strong>Aplicación Práctica:</strong> Ideal para la primera entrevista con el cliente. Simplemente narra los hechos del caso y el sistema realizará un análisis preliminar instantáneo para identificar posibles <strong>delitos penales</strong> y <strong>violaciones a Derechos Humanos</strong> conforme a estándares internacionales. Esto te permite trazar una ruta de defensa clara desde el primer minuto.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <section id="planes">
          <div className="wrapper">
            <div className="section-intro">
              <h2>Planes Flexibles</h2>
              <p style={{ marginBottom: '10px' }}>Selecciona el plan que mejor se adapte a tu nivel de investigación.</p>
              <p style={{ color: '#0284C7', fontWeight: 700, fontSize: '1.1rem', marginBottom: '20px' }}>
                Todos los planes incluyen 5 días de prueba sin costo
              </p>
            </div>

            <div className="billing-toggle-wrapper">
              <div className="billing-toggle-controls">
                <span className={`billing-label ${interval === 'monthly' ? 'active' : 'inactive'}`}>Mensual</span>
                <label className="switch">
                  <input type="checkbox" checked={interval === 'annual'} onChange={(e) => setInterval(e.target.checked ? 'annual' : 'monthly')} />
                  <span className="slider round"></span>
                </label>
                <span className={`billing-label ${interval === 'annual' ? 'active' : 'inactive'}`}>Anual</span>
              </div>
              <div className="discount-tooltip-container">
                {interval === 'annual' && <span className="discount-tooltip">¡Dos meses gratis!</span>}
              </div>
            </div>

            <div className="pricing-grid">
              
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

        <section id="info-corporativa" style={{ marginTop: '60px', padding: '60px 20px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid var(--pida-border)', textAlign: 'center' }}>
            <div className="wrapper" style={{ maxWidth: '900px', margin: '0 auto' }}>
                <h3 style={{ color: 'var(--pida-primary)', fontSize: '2rem', marginBottom: '20px' }}>¿Necesitas PIDA para tu Organización o Institución?</h3>
                <p style={{ color: 'var(--pida-text-muted)', fontSize: '1.15rem', lineHeight: '1.7', marginBottom: '35px' }}>
                    PIDA está diseñado para escalar con las necesidades de grandes equipos de litigio que requieren de mucha investigación y redacción. Si representas a una firma legal, una organización de defensa de derechos humanos, una fiscalía o formas parte de cualquier órgano de gobierno o bien, perteneces a una institución académica, ofrecemos esquemas de licenciamiento por volumen. 
                    <br /><br />
                    Nuestros planes corporativos incluyen costos unitarios preferenciales, facturación institucional centralizada y soporte técnico prioritario.
                </p>
                <button className="btn btn-primary" onClick={() => setIsContactOpen(true)}>
                    Contactar con Soporte Corporativo
                </button>
            </div>
        </section>

        <section id="testimonios">
            <div className="wrapper">
                <div className="section-intro" style={{ marginBottom: '30px' }}>
                    <h2>Lo que dicen nuestros usuarios</h2>
                </div>
                <div className="carousel-container" style={{ overflow: 'hidden' }}>
                    <div className="carousel-track" id="carouselTrack" style={{ display: 'flex', transform: `translateX(-${currentSlide * 100}%)`, transition: 'transform 0.5s ease-in-out' }}>
                        
                        <div className="testimonial-slide" style={{ minWidth: '100%' }}>
                            <div className="testimonial-card">
                                <span className="quote-icon">“</span>
                                <p className="testimonial-text">PIDA me dio respuestas mucho más completas y técnicas de lo que yo andaba buscando, me da mucha confianza.</p>
                                <span className="testimonial-author">Carlos Urquilla</span>
                            </div>
                        </div>
                        
                        <div className="testimonial-slide" style={{ minWidth: '100%' }}>
                            <div className="testimonial-card">
                                <span className="quote-icon">“</span>
                                <p className="testimonial-text">Este sistema PIDA me ha gustado mucho por la calidad de información que proporciona. He realizado varias consultas y han satisfecho mis expectativas.</p>
                                <span className="testimonial-author">Alexandra Esquivel</span>
                            </div>
                        </div>
                        
                        <div className="testimonial-slide" style={{ minWidth: '100%' }}>
                            <div className="testimonial-card">
                                <span className="quote-icon">“</span>
                                <p className="testimonial-text">Creo que la limitante de creer en la IA es que uno no entiende cómo funciona. Cuando comprendes que la IA no sustituye la inteligencia humana sino que la complementa, entonces empezarás a trabajar en otro nivel, recuperando tiempo valiosísimo para otras cosas.</p>
                                <span className="testimonial-author">Fabiola Galaviz</span>
                            </div>
                        </div>

                    </div>
                    <div className="carousel-dots" id="carouselDots">
                        <button className={`dot-btn ${currentSlide === 0 ? 'active' : ''}`} onClick={() => setCurrentSlide(0)}></button>
                        <button className={`dot-btn ${currentSlide === 1 ? 'active' : ''}`} onClick={() => setCurrentSlide(1)}></button>
                        <button className={`dot-btn ${currentSlide === 2 ? 'active' : ''}`} onClick={() => setCurrentSlide(2)}></button>
                    </div>
                </div>
            </div>
        </section>

        <div className="wrapper">                   
            <div className="copyright">
                <span>&copy; 2025 IIRESODH PAYMENTS, LLC.</span>
                <a href="/terminos.html" target="_blank" rel="noreferrer" style={{ color: 'var(--navy)', textDecoration: 'none' }}>Términos de uso</a>
                <a href="/privacidad.html" target="_blank" rel="noreferrer" style={{ color: 'var(--navy)', textDecoration: 'none' }}>Política de privacidad</a>
                <a href="mailto:contacto@pida-ai.com" style={{ color: 'var(--navy)', textDecoration: 'none' }}>contacto@pida-ai.com</a>
            </div>
            <br />&nbsp;
        </div>
      </main>

      {/* MODAL DE VIDEO USANDO CLASES CSS */}
      {isVideoOpen && (
        <div className="modal-backdrop" onClick={() => setIsVideoOpen(false)}>
          <div className="video-modal-card" onClick={e => e.stopPropagation()}>
            <button className="video-close-btn" onClick={() => setIsVideoOpen(false)}>×</button>
            <video id="pida-presentation-video" controls autoPlay style={{ width: '100%', display: 'block', maxHeight: '80vh' }}>
              <source src="https://storage.googleapis.com/img-pida/PIDA.mp4" type="video/mp4" />
              Tu navegador no soporta la reproducción de videos.
            </video>
          </div>
        </div>
      )}

      {/* MODAL CORPORATIVO USANDO CLASES CSS */}
      {isContactOpen && (
        <div className="modal-backdrop">
            <div className="modal-card">
                <button className="modal-close-btn" onClick={() => setIsContactOpen(false)}>×</button>
                <img src="/img/PIDA_logo-576.png" alt="PIDA Logo" style={{ width: '140px', marginBottom: '20px', margin: '0 auto' }} />
                <h2 className="modal-title">Contacto Corporativo</h2>
                <p className="modal-subtitle">Déjanos tus datos y un asesor se pondrá en contacto contigo para diseñar un plan a la medida de tu organización.</p>

                <form onSubmit={handleContactSubmit} style={{ textAlign: 'left' }}>
                    <div className="form-group-row">
                        <input type="text" className="form-input no-margin" placeholder="Nombre completo" required value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} />
                        <input type="text" className="form-input no-margin" placeholder="Organización / Empresa" required value={contactForm.company} onChange={e => setContactForm({...contactForm, company: e.target.value})} />
                    </div>
                    <div className="form-group-row">
                        <input type="email" className="form-input no-margin" placeholder="Correo electrónico" required value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} />
                        <input type="email" className="form-input no-margin" placeholder="Confirmar correo" required value={contactForm.confirmEmail} onChange={e => setContactForm({...contactForm, confirmEmail: e.target.value})} />
                    </div>
                    <div className="form-group-row">
                        <input type="text" className="form-input no-margin" placeholder="Cód. (Ej: +503)" required value={contactForm.countryCode} onChange={e => setContactForm({...contactForm, countryCode: e.target.value})} style={{ maxWidth: '120px' }} />
                        <input type="tel" className="form-input no-margin" placeholder="Número de teléfono" required value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} />
                    </div>
                    <textarea className="form-input" placeholder="Cuéntanos un poco sobre las necesidades de tu equipo..." rows="3" required value={contactForm.message} onChange={e => setContactForm({...contactForm, message: e.target.value})}></textarea>

                    {contactStatus.text && (
                        <div className={`status-msg ${contactStatus.type}`}>
                            {contactStatus.text}
                        </div>
                    )}

                    <button type="submit" className="form-submit-btn" disabled={contactStatus.isSubmitting}>
                        {contactStatus.isSubmitting ? 'Enviando información...' : 'Enviar Solicitud'}
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}