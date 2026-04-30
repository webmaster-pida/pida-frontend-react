import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { 
  Box, CssBaseline, Drawer, AppBar, Toolbar, List, Typography, 
  ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton, Tooltip
} from '@mui/material';
import {
  Dashboard as DashboardIcon, LibraryBooks as LibraryIcon,
  BarChart as AnalyticsIcon, Settings as SettingsIcon, Person as PersonIcon, Logout as LogoutIcon
} from '@mui/icons-material';

const drawerWidth = 240;

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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
          <Typography variant="h6" noWrap sx={{ fontWeight: 'bold', flexGrow: 1 }}>
            PIDA <span style={{ color: '#1976d2' }}>ADMIN</span>
          </Typography>
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
          width: drawerWidth, flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', borderRight: '1px solid #e0e0e0' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', mt: 2 }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton onClick={() => navigate(item.path)} selected={location.pathname === item.path}>
                  <ListItemIcon sx={{ color: location.pathname === item.path ? '#1976d2' : 'inherit' }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} sx={{ color: location.pathname === item.path ? '#1976d2' : 'inherit' }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 4 }}>
        <Toolbar /> 
        {/* AQUÍ ES DONDE REACT ROUTER INYECTARÁ TUS PÁGINAS PROTEGIDAS */}
        <Outlet /> 
      </Box>
    </Box>
  );
}