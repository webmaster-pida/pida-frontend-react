import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { 
  Typography, Container, Card, CardContent, Button, Box, Alert, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
  TextField, IconButton, Chip, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useAuth } from '../AuthContext';

const MASTER_EMAIL = 'webmaster@pida-ai.com';

export default function Usuarios() {
  const { userRole } = useAuth(); // Obtenemos el rol actual del usuario logueado

  const [admins, setAdmins] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('lector'); // Por defecto, es más seguro dar el rol menor
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

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
    if (userRole === 'lector') return; // Bloqueo de seguridad

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
        role: newRole, // Guardamos el rol seleccionado
        addedAt: new Date().toISOString()
      });
      setStatus({ type: 'success', message: `Acceso de ${newRole} concedido a ${newEmail}` });
      setNewEmail('');
      setNewRole('lector'); // Reseteamos al rol seguro
      fetchAdmins();
    } catch (error) {
      console.error("Error agregando admin: ", error);
      setStatus({ type: 'error', message: 'Error al agregar el usuario. Verifica que tengas permisos de administrador total.' });
    } finally {
      setLoading(false);
    }
  };

  const confirmRemoveAdmin = (email) => {
    if (userRole === 'lector') return; // Bloqueo de seguridad
    if (email === MASTER_EMAIL) return;
    setAdminToRemove(email);
    setOpenDialog(true);
  };

  const executeRemoveAdmin = async () => {
    if (userRole === 'lector') return; // Bloqueo de seguridad
    setOpenDialog(false);
    if (!adminToRemove) return;

    try {
      await deleteDoc(doc(db, 'admins', adminToRemove));
      setStatus({ type: 'success', message: `Acceso revocado a ${adminToRemove}` });
      fetchAdmins();
    } catch (error) {
      console.error("Error eliminando admin: ", error);
      setStatus({ type: 'error', message: 'Error al remover el usuario. Verifica tus permisos.' });
    } finally {
      setAdminToRemove(null);
    }
  };

  // Función auxiliar para pintar las etiquetas bonitas
  const getRoleChip = (role) => {
    if (role === 'admin') return <Chip label="Administrador" color="primary" size="small" />;
    if (role === 'lector') return <Chip label="Solo Lectura" color="default" size="small" variant="outlined" />;
    return <Chip label={role} size="small" />;
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: '#333' }}>
        Gestión de Accesos
      </Typography>

      {status.message && <Alert severity={status.type} sx={{ mb: 3 }}>{status.message}</Alert>}

      <Card sx={{ mb: 4, border: '1px solid #e0e0e0', borderRadius: 2 }} elevation={0}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Dar acceso a nuevo usuario</Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField 
              fullWidth label="Correo electrónico (ej. nombre@pida-ai.com)" 
              variant="outlined" value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={loading || userRole === 'lector'}
            />
            
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Rol</InputLabel>
              <Select
                value={newRole}
                label="Rol"
                onChange={(e) => setNewRole(e.target.value)}
                disabled={loading || userRole === 'lector'}
              >
                <MenuItem value="admin">Administrador</MenuItem>
                <MenuItem value="lector">Solo Lectura</MenuItem>
              </Select>
            </FormControl>

            <Tooltip title={userRole === 'lector' ? "No tienes permisos para agregar usuarios" : ""}>
              <span style={{ display: 'flex' }}>
                <Button 
                  variant="contained" startIcon={<PersonAddIcon />} 
                  onClick={handleAddAdmin} disabled={loading || userRole === 'lector'} sx={{ px: 4, whiteSpace: 'nowrap', height: '56px' }}
                >
                  Conceder
                </Button>
              </span>
            </Tooltip>
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
              <TableCell><Chip label="Super Admin (Master)" color="secondary" size="small" /></TableCell>
              <TableCell align="center">
                <Typography variant="caption" color="textSecondary">Inamovible</Typography>
              </TableCell>
            </TableRow>
            
            {admins.map((admin) => (
              <TableRow key={admin.email}>
                <TableCell>{admin.email}</TableCell>
                <TableCell>{getRoleChip(admin.role)}</TableCell>
                <TableCell align="center">
                  <Tooltip title={userRole === 'lector' ? "No tienes permisos para revocar accesos" : ""}>
                    <span>
                      <IconButton 
                        color="error" 
                        onClick={() => confirmRemoveAdmin(admin.email)}
                        disabled={userRole === 'lector'}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* MODAL DE CONFIRMACIÓN MUI */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>¿Revocar acceso?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Estás a punto de revocar el acceso a <strong>{adminToRemove}</strong>. Esta persona ya no podrá ingresar al panel.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit">Cancelar</Button>
          <Button onClick={executeRemoveAdmin} color="error" variant="contained" autoFocus>
            Sí, Revocar Acceso
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}