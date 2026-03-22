import React, { useState, useEffect } from 'react';

export default function UpdateNotifier() {
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    // Si estamos programando en local (localhost), no queremos que salte esto.
    if (import.meta.env.DEV) return;

    let currentScriptHash = null;
    
    // 1. Buscamos qué versión de JavaScript tiene cargada el usuario actualmente
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src;
      if (src.includes('/assets/index-')) {
        currentScriptHash = src;
        break;
      }
    }

    // 2. Función silenciosa que "pregunta" al servidor si hay una nueva versión
    const checkForUpdates = async () => {
      if (!currentScriptHash || hasUpdate) return;
      try {
        // Hacemos un fetch a la raíz engañando al caché con la hora actual
        const res = await fetch(`/?t=${new Date().getTime()}`);
        if (!res.ok) return;
        const html = await res.text();
        
        // Buscamos el nombre del script que está vivo AHORA MISMO en Firebase
        const match = html.match(/\/assets\/index-[a-zA-Z0-9_-]+\.js/);
        
        if (match && match[0]) {
          const newScriptHash = match[0];
          // Si el de Firebase es diferente al que tiene el usuario... ¡Hay actualización!
          if (!currentScriptHash.includes(newScriptHash)) {
            setHasUpdate(true);
          }
        }
      } catch (error) {
        // Ignoramos errores de red (ej. si el usuario pierde el internet un momento)
      }
    };

    // 3. Revisar cada 10 minutos automáticamente
    const intervalId = setInterval(checkForUpdates, 10 * 60 * 1000);
    
    // 4. Revisar también cada vez que el usuario cambie de pestaña y vuelva a PIDA
    window.addEventListener('focus', checkForUpdates);

    // Limpieza al desmontar
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', checkForUpdates);
    };
  }, [hasUpdate]);

  // Si no hay actualización, no renderizamos nada
  if (!hasUpdate) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '30px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'var(--pida-primary, #1D3557)', 
      color: 'white',
      padding: '12px 24px',
      borderRadius: '30px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      zIndex: 999999,
      animation: 'slideUp 0.5s ease-out'
    }}>
      <style>
        {`
          @keyframes slideUp {
            from { transform: translate(-50%, 100px); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
          }
        `}
      </style>
      <span style={{ fontSize: '0.95rem', fontWeight: '500', whiteSpace: 'nowrap' }}>
        ✨ Nueva actualización disponible
      </span>
      <button 
        onClick={() => window.location.reload(true)}
        style={{
          backgroundColor: 'var(--pida-accent, #0284C7)',
          color: 'white',
          border: 'none',
          padding: '8px 18px',
          borderRadius: '20px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '0.85rem',
          transition: 'background 0.2s',
          whiteSpace: 'nowrap'
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = '#0369a1'}
        onMouseOut={(e) => e.target.style.backgroundColor = 'var(--pida-accent, #0284C7)'}
      >
        Actualizar ahora
      </button>
    </div>
  );
}