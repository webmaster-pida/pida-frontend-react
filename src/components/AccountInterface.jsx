import React, { useState, useEffect } from 'react';
import { auth } from '../config/firebase';

// Importamos los componentes de Material-UI
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  Divider, 
  Snackbar, 
  Alert 
} from '@mui/material';

const API_CHAT = "https://chat-v20-stripe-elements-465781488910.us-central1.run.app";

export default function AccountInterface({ user, isVip }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [message, setMessage] = useState({ text: '', type: 'success', open: false });

  useEffect(() => {
    if (user && user.displayName) {
      const parts = user.displayName.split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
    }
  }, [user]);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type, open: true });
  };

  const handleCloseMessage = (event, reason) => {
    if (reason === 'clickaway') return;
    setMessage({ ...message, open: false });
  };

  const handleUpdateName = async () => {
    if (!firstName && !lastName) return;
    try {
      await user.updateProfile({ displayName: `${firstName} ${lastName}`.trim() });
      showMessage('✅ Perfil actualizado correctamente. (Los cambios se verán al recargar)');
    } catch (error) {
      console.error(error);
      showMessage('❌ Error al actualizar el perfil.', 'error');
    }
  };

  const handleBillingPortal = async () => {
    if (isVip) return;

    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_CHAT}/create-portal-session`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ return_url: window.location.origin })
      });
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; 
      } else {
        showMessage('❌ No se recibió URL del portal.', 'error');
      }
    } catch (error) {
      console.error(error);
      showMessage('❌ Error de conexión al abrir el portal de facturación.', 'error');
    }
  };

  const handlePasswordReset = async () => {
    try {
      await auth.sendPasswordResetEmail(user.email);
      showMessage('✅ Correo de restablecimiento enviado.');
    } catch (error) {
      console.error(error);
      showMessage('❌ Error al enviar el correo.', 'error');
    }
  };

  return (
    // CAMBIO AQUÍ: Contenedor principal a pantalla completa para centrado vertical y horizontal
    <Box 
      sx={{ 
        width: '100%',
        minHeight: '100vh', // Ocupa todo el alto de la ventana
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', // Centrado vertical
        backgroundColor: '#f9fafb', // Fondo suave para resaltar la tarjeta
        p: { xs: 2, sm: 4, md: 6 }, // Padding generoso para el enmarcado
      }}
    >
      <Box sx={{ width: '100%', maxWidth: '600px' }}>
        
        {/* Contenedor Principal MUI con sombra */}
        <Paper elevation={3} sx={{ p: { xs: 3, sm: 5 }, borderRadius: 3, background: 'white' }}>
          
          {/* Cabecera */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 700, mb: 1 }}>
              Mi Cuenta
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestiona tu perfil y suscripción.
            </Typography>
          </Box>
          
          {/* Sección: Perfil Personal */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 2, fontWeight: 600 }}>
              Perfil Personal
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                label="Nombre"
                variant="outlined"
                size="small"
                fullWidth
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
              />
              <TextField
                label="Apellido"
                variant="outlined"
                size="small"
                fullWidth
                value={lastName}
                onChange={e => setLastName(e.target.value)}
              />
            </Box>
            <Button 
              variant="contained" 
              color="primary" 
              fullWidth 
              onClick={handleUpdateName}
              sx={{ py: 1.2, fontWeight: 'bold', borderRadius: 2 }}
            >
              Actualizar Nombre
            </Button>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Sección: Suscripción */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 2, fontWeight: 600 }}>
              Suscripción
            </Typography>
            
            {isVip === true ? (
              <Button 
                variant="contained" 
                disabled 
                fullWidth 
                sx={{ 
                  py: 1.2, 
                  fontWeight: 'bold', 
                  borderRadius: 2,
                  '&.Mui-disabled': {
                    bgcolor: '#9ca3af',
                    color: 'white',
                    opacity: 0.8
                  }
                }}
              >
                VIP: No posee facturación
              </Button>
            ) : (
              <Button 
                variant="contained" 
                fullWidth 
                onClick={handleBillingPortal}
                sx={{ 
                  py: 1.2, 
                  fontWeight: 'bold', 
                  borderRadius: 2,
                  bgcolor: '#2A4B7C', 
                  '&:hover': { bgcolor: '#1D3557' }
                }}
              >
                Portal de Facturación
              </Button>
            )}
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Sección: Seguridad */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 2, fontWeight: 600 }}>
              Seguridad
            </Typography>
            <Button 
              variant="outlined" 
              color="inherit"
              fullWidth 
              onClick={handlePasswordReset}
              sx={{ py: 1.2, borderRadius: 2, color: 'text.secondary', borderColor: '#ccc' }}
            >
              Restablecer contraseña
            </Button>
          </Box>

          {/* Código de descuento */}
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Código de descuento IIRESODH:{' '}
              <Box 
                component="span" 
                sx={{ 
                  color: 'primary.main', 
                  background: '#F0F7FF', 
                  padding: '4px 10px', 
                  borderRadius: 2, 
                  border: '1px solid #BAE6FD', 
                  fontWeight: 'bold',
                  display: 'inline-block',
                  ml: 1
                }}
              >
                PIDA33
              </Box>
            </Typography>
          </Box>

        </Paper>
      </Box>

      {/* Notificación Flotante (MUI Snackbar) */}
      <Snackbar 
        open={message.open} 
        autoHideDuration={5000} 
        onClose={handleCloseMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseMessage} 
          severity={message.type} 
          variant="filled"
          sx={{ width: '100%', borderRadius: 2, fontWeight: 500 }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}