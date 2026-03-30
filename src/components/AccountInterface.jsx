import React, { useState, useEffect } from 'react';
import { auth } from '../config/firebase';

// Importamos los componentes de Material-UI (eliminamos Paper)
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
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
    // Utilizamos las clases nativas de PIDA para que el scroll funcione perfectamente
    <Box className="pida-view" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box 
        className="pida-view-content" 
        sx={{ 
          flex: 1, 
          overflowY: 'auto', // Permite el scroll interno sin cortar la pantalla
          p: { xs: 3, sm: 5, md: 8 } 
        }}
      >
        <Box sx={{ width: '100%', maxWidth: '600px', mx: 'auto', pb: 6 }}>
          
          {/* Cabecera */}
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 800, mb: 1 }}>
              Mi Cuenta
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Gestiona tu perfil y suscripción.
            </Typography>
          </Box>
          
          {/* Sección: Perfil Personal */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 2, fontWeight: 600, fontSize: '0.85rem' }}>
              Perfil Personal
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                label="Nombre"
                variant="outlined"
                size="medium"
                fullWidth
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                sx={{ bgcolor: 'white' }} // Fondo blanco solo para el input
              />
              <TextField
                label="Apellido"
                variant="outlined"
                size="medium"
                fullWidth
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                sx={{ bgcolor: 'white' }}
              />
            </Box>
            <Button 
              variant="contained" 
              color="primary" 
              fullWidth 
              onClick={handleUpdateName}
              sx={{ py: 1.5, fontWeight: 'bold', fontSize: '1rem', borderRadius: 2 }}
            >
              Actualizar Nombre
            </Button>
          </Box>

          <Divider sx={{ my: 5 }} />

          {/* Sección: Suscripción */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 2, fontWeight: 600, fontSize: '0.85rem' }}>
              Suscripción
            </Typography>
            
            {isVip === true ? (
              <Button 
                variant="contained" 
                disabled 
                fullWidth 
                sx={{ 
                  py: 1.5, 
                  fontWeight: 'bold', 
                  fontSize: '1rem',
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
                  py: 1.5, 
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  borderRadius: 2,
                  bgcolor: '#2A4B7C', 
                  '&:hover': { bgcolor: '#1D3557' }
                }}
              >
                Portal de Facturación
              </Button>
            )}
          </Box>

          <Divider sx={{ my: 5 }} />

          {/* Sección: Seguridad */}
          <Box sx={{ mb: 5 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 2, fontWeight: 600, fontSize: '0.85rem' }}>
              Seguridad
            </Typography>
            <Button 
              variant="outlined" 
              color="inherit"
              fullWidth 
              onClick={handlePasswordReset}
              sx={{ py: 1.5, borderRadius: 2, fontSize: '1rem', color: 'text.secondary', borderColor: '#ccc', bgcolor: 'white' }}
            >
              Restablecer contraseña
            </Button>
          </Box>

          {/* Código de descuento */}
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="body1" color="text.secondary">
              Código de descuento IIRESODH:{' '}
              <Box 
                component="span" 
                sx={{ 
                  color: 'primary.main', 
                  background: '#F0F7FF', 
                  padding: '6px 12px', 
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

        </Box>
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