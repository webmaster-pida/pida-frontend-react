import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { 
  Typography, Container, Card, CardContent, Button, Box, Alert, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
  TextField, IconButton, Chip,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

const MASTER_EMAIL = 'webmaster@pida-ai.com';

export default function Usuarios() {
  const [admins, setAdmins] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Estados para el Modal de Confirmación
  const [openDialog, setOpenDialog] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState(null);

  const fetchAdmins = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'admins'));
      const adminList = [];
      querySnapshot.forEach((doc) => {
        adminList.push({ email: doc.id, ...doc.data() });
      });
      setAdmins(adminList);
    } catch (error) {
      console.error("Error cargando usuarios: ", error);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setStatus({ type: 'warning', message: 'Ingresa un correo electrónico válido.' });
      return;
    }
    if (newEmail === MASTER_EMAIL) {
      setStatus({ type: 'info', message: 'El webmaster ya tiene acceso maestro por defecto.' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      await setDoc(doc(db, 'admins', newEmail.toLowerCase()), {
        role: 'admin',
        addedAt: new Date().toISOString()
      });
      setStatus({ type: 'success', message: `Acceso concedido a ${newEmail}` });
      setNewEmail('');
      fetchAdmins();
    } catch (error) {
      console.error("Error agregando admin: ", error);
      setStatus({ type: 'error', message: 'Error al agregar el usuario.' });
    } finally {
      setLoading(false);
    }
  };

  // 1. Abre el modal y guarda a quién queremos borrar
  const confirmRemoveAdmin = (email) => {
    if (email === MASTER_EMAIL) return;
    setAdminToRemove(email);
    setOpenDialog(true);
  };

  // 2. Ejecuta el borrado si el usuario dice "Aceptar" en el modal
  const executeRemoveAdmin = async () => {
    setOpenDialog(false); // Cerramos el modal primero
    if (!adminToRemove) return;

    try {
      await deleteDoc(doc(db, 'admins', adminToRemove));
      setStatus({ type: 'success', message: `Acceso revocado a ${adminToRemove}` });
      fetchAdmins();
    } catch (error) {
      console.error("Error eliminando admin: ", error);
      setStatus({ type: 'error', message: 'Error al remover el usuario.' });
    } finally {
      setAdminToRemove(null); // Limpiamos el estado
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: '#333' }}>
        Gestión de Accesos
      </Typography>

      {status.message && <Alert severity={status.type} sx={{ mb: 3 }}>{status.message}</Alert>}

      <Card sx={{ mb: 4, border: '1px solid #e0e0e0', borderRadius: 2 }} elevation={0}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Dar acceso a nuevo administrador</Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField 
              fullWidth label="Correo electrónico (ej. nombre@pida-ai.com)" 
              variant="outlined" value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={loading}
            />
            <Button 
              variant="contained" startIcon={<PersonAddIcon />} 
              onClick={handleAddAdmin} disabled={loading} sx={{ px: 4, whiteSpace: 'nowrap' }}
            >
              Conceder Acceso
            </Button>
          </Box>
        </CardContent>
      </Card>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Usuario / Correo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Rol</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>{MASTER_EMAIL}</TableCell>
              <TableCell><Chip label="Super Admin (Master)" color="primary" size="small" /></TableCell>
              <TableCell align="center">
                <Typography variant="caption" color="textSecondary">Inamovible</Typography>
              </TableCell>
            </TableRow>
            
            {admins.map((admin) => (
              <TableRow key={admin.email}>
                <TableCell>{admin.email}</TableCell>
                <TableCell><Chip label="Admin" color="default" size="small" /></TableCell>
                <TableCell align="center">
                  <IconButton color="error" onClick={() => confirmRemoveAdmin(admin.email)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- MODAL DE CONFIRMACIÓN MUI --- */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
      >
        <DialogTitle>
          ¿Revocar acceso?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Estás a punto de revocar el acceso de administrador a <strong>{adminToRemove}</strong>. Esta persona ya no podrá ingresar al panel ni modificar la base de datos.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit">
            Cancelar
          </Button>
          <Button onClick={executeRemoveAdmin} color="error" variant="contained" autoFocus>
            Sí, Revocar Acceso
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}