import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; 
import { AuthProvider } from './AuthContext';
import RequireAuth from './RequireAuth';
import AdminLayout from './AdminLayout';

// Tus páginas
import Biblioteca from './pages/Biblioteca';
import Ingesta from './pages/Ingesta';
import Estadisticas from './pages/Estadisticas';
import Login from './pages/Login';
import Usuarios from './pages/Usuarios';
import Configuracion from './pages/Configuracion';
import { Typography } from '@mui/material';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<RequireAuth><AdminLayout /></RequireAuth>}>
          <Route path="/" element={<Navigate to="/estadisticas" replace />} />
          <Route path="/estadisticas" element={<Estadisticas />} />
          <Route path="/biblioteca" element={<Biblioteca />} />
          <Route path="/ingesta" element={<Ingesta />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/configuracion" element={<Configuracion />} />
          
          <Route path="*" element={<Navigate to="/estadisticas" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}