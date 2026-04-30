import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Box, CircularProgress, Typography } from '@mui/material';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

const MASTER_EMAIL = 'webmaster@pida-ai.com';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // <-- NUEVO ESTADO
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      if (firebaseUser.email === MASTER_EMAIL) {
        setUser(firebaseUser);
        setUserRole('master'); // <-- LE ASIGNAMOS ROL MASTER
        setLoading(false);
        return;
      }

      try {
        const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.email.toLowerCase()));
        if (adminDoc.exists()) {
          setUser(firebaseUser);
          setUserRole(adminDoc.data().role || 'admin'); // <-- LE ASIGNAMOS SU ROL (admin o lector)
        } else {
          await firebaseSignOut(auth);
          setUser(null);
          setUserRole(null);
        }
      } catch (error) {
        console.error("Error de seguridad:", error);
        await firebaseSignOut(auth);
        setUser(null);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await firebaseSignOut(auth);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#f4f6f8' }}>
        <CircularProgress size={60} thickness={4} sx={{ mb: 2 }} />
        <Typography variant="h6" color="textSecondary">Validando entorno seguro...</Typography>
      </Box>
    );
  }

  return (
    // NUEVO: Exportamos userRole para que toda la app lo pueda usar
    <AuthContext.Provider value={{ user, userRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}