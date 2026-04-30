import React, { useState } from 'react';
import { auth, googleProvider, db } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Box, Button, Typography, Paper, Alert } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

// 👇 AQUÍ DEFINIMOS TU MASTER KEY
const MASTER_EMAIL = 'webmaster@pida-ai.com';

export default function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userEmail = result.user.email;

      // 1. Si es el Webmaster, lo dejamos pasar automáticamente
      if (userEmail === MASTER_EMAIL) {
        setLoading(false);
        return; // React Router hará el resto
      }

      // 2. Si NO es el webmaster, validamos en Firestore
      const adminDocRef = doc(db, 'admins', userEmail);
      const adminDocSnap = await getDoc(adminDocRef);

      if (!adminDocSnap.exists()) {
        await signOut(auth);
        setError(`El correo ${userEmail} no tiene permisos registrados.`);
      }

    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al intentar iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: '#f4f6f8' }}>
      <Paper elevation={3} sx={{ p: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 400 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>PIDA ADMIN</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 4, textAlign: 'center' }}>
          Acceso restringido.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3, width: '100%' }}>{error}</Alert>}

        <Button 
          variant="contained" startIcon={<GoogleIcon />} onClick={handleGoogleLogin}
          size="large" disabled={loading} sx={{ width: '100%', textTransform: 'none' }}
        >
          {loading ? 'Verificando...' : 'Ingresar con Google'}
        </Button>
      </Paper>
    </Box>
  );
}