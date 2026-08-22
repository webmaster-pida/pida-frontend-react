import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Importaciones para el tema global de MUI
import { ThemeProvider } from '@mui/material/styles';
import { pidaTheme } from './theme.js';

// Inicialización de Facebook (Meta) Pixel de forma dinámica y segura
if (typeof window !== 'undefined') {
  // Opcional: Solo inicializar en producción para no ensuciar métricas en localhost
  if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window,document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '27380370771628479');
    fbq('track', 'PageView');
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={pidaTheme}>
      <App />
    </ThemeProvider>
  </StrictMode>,
)