import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Importaciones para el tema global de MUI
import { ThemeProvider } from '@mui/material/styles';
import { pidaTheme } from './theme.js';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={pidaTheme}>
      <App />
    </ThemeProvider>
  </StrictMode>,
)