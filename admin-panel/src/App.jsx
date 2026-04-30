// admin-panel/src/App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Componentes de MUI (Los mismos que ya tenías, más el botón de salir)
import { 
  Box, CssBaseline, Drawer, AppBar, Toolbar, List, Typography, 
  ListItem, ListItemButton, ListItemIcon, ListItemText, CircularProgress, IconButton, Tooltip
} from '@mui/material';
import {
  Dashboard as DashboardIcon, LibraryBooks as LibraryIcon,
  BarChart as AnalyticsIcon, Settings as SettingsIcon, Person as PersonIcon, Logout as LogoutIcon
} from '@mui/icons-material';

// Tus páginas
import Dashboard from './pages/Dashboard';
import Biblioteca from './pages/Biblioteca';
import Ingesta from './pages/Ingesta';
import Login from './pages/Login';
import Usuarios from './pages/Usuarios';

const drawerWidth = 240;

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estados para manejar la sesión
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Escuchamos los cambios de sesión de Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Función para cerrar sesión
  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  // Si está cargando la validación, mostramos un spinner
  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Si no hay usuario, retornamos SOLO la pantalla de Login
  if (!user) {
    return <Login />;
  }

  // SI LLEGA AQUÍ: El usuario está logueado y autorizado
  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Biblioteca', icon: <LibraryIcon />, path: '/biblioteca' },
    { text: 'Ingesta', icon: <LibraryIcon />, path: '/ingesta' },
    { text: 'Estadísticas', icon: <AnalyticsIcon />, path: '/estadisticas' },
    { text: 'Usuarios', icon: <PersonIcon />, path: '/usuarios' },
    { text: 'Configuración', icon: <SettingsIcon />, path: '/configuracion' },
  ];

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f4f6f8', minHeight: '100vh' }}>
      <CssBaseline />
      
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: '#ffffff', color: '#202124', boxShadow: 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
            PIDA <span style={{ color: '#1976d2' }}>ADMIN</span>
          </Typography>
          
          {/* Botón de Cerrar Sesión con el correo del usuario */}
          <Typography variant="body2" sx={{ mr: 2, color: 'text.secondary' }}>
            {user.email}
          </Typography>
          <Tooltip title="Cerrar sesión">
            <IconButton onClick={handleLogout} color="error">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', borderRight: '1px solid #e0e0e0' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', mt: 2 }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton 
                  onClick={() => navigate(item.path)}
                  selected={location.pathname === item.path}
                >
                  <ListItemIcon sx={{ color: location.pathname === item.path ? '#1976d2' : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} sx={{ color: location.pathname === item.path ? '#1976d2' : 'inherit' }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 4 }}>
        <Toolbar /> 
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/biblioteca" element={<Biblioteca />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/ingesta" element={<Ingesta />} />
          <Route path="*" element={<Typography variant="h5" sx={{p:4}}>Módulo en construcción...</Typography>} />
        </Routes>
      </Box>
    </Box>
  );
}