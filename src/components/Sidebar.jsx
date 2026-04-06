import React, { useState } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  Avatar, 
  Typography, 
  IconButton, 
  Tooltip,
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Description as DescriptionIcon, 
  Gavel as GavelIcon, 
  Logout as LogoutIcon, 
  AccountCircle as AccountIcon,
  MoreHoriz as MoreIcon 
} from '@mui/icons-material';
import { auth } from '../config/firebase';

const DRAWER_WIDTH = 260;

export default function Sidebar({ currentView, setCurrentView, user }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const handleMenuOpen = (event) => {
    // Importante: Detenemos la propagación para que el Dashboard no detecte el click
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => setAnchorEl(null);

  const doLogout = () => {
    auth.signOut();
    handleMenuClose();
  };

  const navItems = [
    { id: 'investigador', label: 'Experto', icon: <SearchIcon />, fullLabel: 'Experto en DDHH' },
    { id: 'analizador', label: 'Analizador', icon: <DescriptionIcon />, fullLabel: 'Analizador Docs' },
    { id: 'precalificador', label: 'Precalificar', icon: <GavelIcon />, fullLabel: 'Precalificador' },
  ];

  if (isMobile) {
    return (
      <Paper 
        elevation={10} 
        sx={{ 
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100000, // Un punto más que el layout
          borderRadius: '16px 16px 0 0', overflow: 'hidden'
        }}
      >
        <BottomNavigation
          showLabels
          value={currentView}
          onChange={(event, newValue) => {
            if (newValue !== 'menu') setCurrentView(newValue);
          }}
          sx={{ height: 70, bgcolor: '#003399' }}
        >
          {navItems.map((item) => (
            <BottomNavigationAction
              key={item.id}
              value={item.id}
              label={item.label}
              icon={item.icon}
              sx={{ 
                color: 'rgba(255,255,255,0.6)', 
                '&.Mui-selected': { color: 'white' },
                '& .MuiBottomNavigationAction-label': { fontSize: '0.65rem' }
              }}
            />
          ))}
          <BottomNavigationAction
            label="Más"
            value="menu"
            icon={<MoreIcon />}
            onClick={handleMenuOpen} // Dispara el menú
            sx={{ color: 'rgba(255,255,255,0.6)' }}
          />
        </BottomNavigation>

        <Menu
          anchorEl={anchorEl}
          open={openMenu}
          onClose={handleMenuClose}
          // ESTA ES LA SOLUCIÓN TÉCNICA CRÍTICA:
          sx={{ zIndex: 200001 }} 
          slotProps={{
            root: {
              onClick: (e) => e.stopPropagation() // Evita conflictos con el Dashboard
            }
          }}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          PaperProps={{ 
            sx: { 
              width: 200, 
              borderRadius: '12px', 
              mb: 1, 
              boxShadow: '0 -4px 20px rgba(0,0,0,0.15)' 
            } 
          }}
        >
          <MenuItem onClick={() => { setCurrentView('cuenta'); handleMenuClose(); }}>
            <ListItemIcon><AccountIcon fontSize="small" /></ListItemIcon>
            Mi Cuenta
          </MenuItem>
          <Divider />
          <MenuItem onClick={doLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
            Cerrar Sesión
          </MenuItem>
        </Menu>
      </Paper>
    );
  }

  // ... (El resto del código Desktop se mantiene igual)
  return (
    <Box component="aside" sx={{ width: DRAWER_WIDTH, height: '100vh', bgcolor: '#1D3557', display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <Box component="img" src="/img/PIDA-logo-blanco-scaled.png" alt="PIDA" sx={{ width: '100%', maxWidth: 160, cursor: 'pointer' }} onClick={() => setCurrentView('investigador')} />
      </Box>
      <List sx={{ px: 2, flexGrow: 1 }}>
        {navItems.map((item) => (
          <ListItem key={item.id} disablePadding sx={{ mb: 1 }}>
            <ListItemButton selected={currentView === item.id} onClick={() => setCurrentView(item.id)} sx={{ borderRadius: '10px', color: 'rgba(255,255,255,0.7)', '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.15)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }, '& .MuiListItemIcon-root': { color: 'white' } }, '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: 'white' } }}>
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.fullLabel} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, borderRadius: '10px', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }} onClick={() => setCurrentView('cuenta')}>
          <Avatar src={user?.photoURL} sx={{ width: 36, height: 36, border: '1.5px solid rgba(255,255,255,0.3)' }}>{user?.displayName?.charAt(0) || 'U'}</Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ color: 'white', noWrap: true, fontSize: '0.85rem' }}>{user?.displayName || 'Usuario'}</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', noWrap: true, display: 'block' }}>{user?.email}</Typography>
          </Box>
          <Tooltip title="Cerrar Sesión">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); doLogout(); }} sx={{ color: 'rgba(255,255,255,0.4)' }}><LogoutIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}