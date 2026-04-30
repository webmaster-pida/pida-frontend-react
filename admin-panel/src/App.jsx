import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; 
import { AuthProvider } from './AuthContext';
import RequireAuth from './RequireAuth';
import AdminLayout from './AdminLayout';

// Tus páginas
import Dashboard from './pages/Dashboard';
import Biblioteca from './pages/Biblioteca';
import Ingesta from './pages/Ingesta';
import Login from './pages/Login';
import Usuarios from './pages/Usuarios';
import { Typography } from '@mui/material';

export default function App() {
  return (
    <AuthProvider>
      {/* Cero rastro de BrowserRouter en este archivo */}
      <Routes>
        {/* RUTAS PÚBLICAS */}
        <Route path="/login" element={<Login />} />

        {/* RUTAS PROTEGIDAS */}
        <Route element={<RequireAuth><AdminLayout /></RequireAuth>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/biblioteca" element={<Biblioteca />} />
          <Route path="/ingesta" element={<Ingesta />} />
          <Route path="/usuarios" element={<Usuarios />} />
          
          <Route path="/estadisticas" element={<Typography variant="h5" sx={{p:4}}>Módulo en construcción...</Typography>} />
          <Route path="/configuracion" element={<Typography variant="h5" sx={{p:4}}>Módulo en construcción...</Typography>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}