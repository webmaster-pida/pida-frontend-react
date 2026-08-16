import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, setDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  Typography, Box, Tabs, Tab, Card, CardContent, Button, Alert, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
  TextField, IconButton, Chip, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid, Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { useAuth } from '../AuthContext';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function Configuracion() {
  const { userRole } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  // Users State
  const [appUsers, setAppUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Dialog Add User
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', plan: 'Free', tokens_used: 0 });

  // Edit User State
  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserData, setEditUserData] = useState({});

  // Global Tokens Mock State
  const globalTokensLimit = 1000000;
  const globalTokensUsed = appUsers.reduce((acc, user) => acc + (user.tokens_used || 0), 0);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'users'));
      const userList = [];
      querySnapshot.forEach((docSnap) => {
        userList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setAppUsers(userList);
    } catch (error) {
      console.error("Error cargando usuarios: ", error);
      setStatus({ type: 'error', message: 'Error al cargar los usuarios.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleAddUser = async () => {
    if (userRole === 'lector') return;
    if (!newUser.email) return;

    try {
      setLoading(true);
      // Usamos el email como ID por simplicidad o generamos un ID
      const userDocRef = doc(db, 'users', newUser.email.toLowerCase());
      await setDoc(userDocRef, {
        email: newUser.email,
        plan: newUser.plan,
        tokens_used: Number(newUser.tokens_used) || 0,
        createdAt: new Date().toISOString()
      });
      setStatus({ type: 'success', message: 'Usuario agregado correctamente.' });
      setOpenAddDialog(false);
      setNewUser({ email: '', plan: 'Free', tokens_used: 0 });
      fetchUsers();
    } catch (error) {
      console.error("Error agregando usuario: ", error);
      setStatus({ type: 'error', message: 'Error al agregar el usuario.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setEditUserData({ plan: user.plan || 'Free', tokens_used: user.tokens_used || 0 });
  };

  const handleSaveEdit = async (userId) => {
    if (userRole === 'lector') return;
    try {
      setLoading(true);
      await updateDoc(doc(db, 'users', userId), {
        plan: editUserData.plan,
        tokens_used: Number(editUserData.tokens_used)
      });
      setStatus({ type: 'success', message: 'Usuario actualizado.' });
      setEditingUserId(null);
      fetchUsers();
    } catch (error) {
      console.error("Error actualizando usuario: ", error);
      setStatus({ type: 'error', message: 'Error al actualizar usuario.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userRole === 'lector') return;
    if (window.confirm("¿Estás seguro de eliminar este usuario?")) {
      try {
        setLoading(true);
        await deleteDoc(doc(db, 'users', userId));
        setStatus({ type: 'success', message: 'Usuario eliminado.' });
        fetchUsers();
      } catch (error) {
        console.error("Error eliminando usuario: ", error);
        setStatus({ type: 'error', message: 'Error al eliminar usuario.' });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Configuración General
      </Typography>

      {status.message && (
        <Alert severity={status.type} sx={{ mb: 3 }} onClose={() => setStatus({ type: '', message: '' })}>
          {status.message}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Usuarios y Planes" />
          <Tab label="Integraciones (API)" />
          <Tab label="Sistema y Configuración" />
        </Tabs>
      </Box>

      {/* TAB 0: USUARIOS Y PLANES */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
          <Typography variant="h6">Gestión de Usuarios App</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => setOpenAddDialog(true)}
            disabled={userRole === 'lector'}
          >
            Nuevo Usuario
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Email / ID</TableCell>
                <TableCell>Plan de Suscripción</TableCell>
                <TableCell>Tokens Utilizados</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {appUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">No hay usuarios registrados.</TableCell>
                </TableRow>
              ) : (
                appUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email || user.id}</TableCell>
                    <TableCell>
                      {editingUserId === user.id ? (
                        <FormControl size="small" fullWidth>
                          <Select
                            value={editUserData.plan}
                            onChange={(e) => setEditUserData({ ...editUserData, plan: e.target.value })}
                          >
                            <MenuItem value="Free">Free</MenuItem>
                            <MenuItem value="Pro">Pro</MenuItem>
                            <MenuItem value="Enterprise">Enterprise</MenuItem>
                          </Select>
                        </FormControl>
                      ) : (
                        <Chip 
                          label={user.plan || 'Free'} 
                          color={user.plan === 'Pro' ? 'primary' : user.plan === 'Enterprise' ? 'secondary' : 'default'}
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {editingUserId === user.id ? (
                        <TextField 
                          size="small" 
                          type="number"
                          value={editUserData.tokens_used}
                          onChange={(e) => setEditUserData({ ...editUserData, tokens_used: e.target.value })}
                        />
                      ) : (
                        user.tokens_used || 0
                      )}
                    </TableCell>
                    <TableCell>
                      {editingUserId === user.id ? (
                        <>
                          <IconButton color="primary" onClick={() => handleSaveEdit(user.id)}><SaveIcon /></IconButton>
                          <Button size="small" onClick={() => setEditingUserId(null)}>Cancelar</Button>
                        </>
                      ) : (
                        <>
                          <IconButton color="info" onClick={() => handleEditClick(user)} disabled={userRole === 'lector'}><EditIcon /></IconButton>
                          <IconButton color="error" onClick={() => handleDeleteUser(user.id)} disabled={userRole === 'lector'}><DeleteIcon /></IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Dialog Add User */}
        <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)}>
          <DialogTitle>Agregar Nuevo Usuario</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Crea un usuario manualmente para asignarle un plan y tokens iniciales.
            </DialogContentText>
            <TextField
              fullWidth label="Email del Usuario" margin="dense"
              value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})}
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Plan de Suscripción</InputLabel>
              <Select
                value={newUser.plan}
                label="Plan de Suscripción"
                onChange={(e) => setNewUser({...newUser, plan: e.target.value})}
              >
                <MenuItem value="Free">Free</MenuItem>
                <MenuItem value="Pro">Pro</MenuItem>
                <MenuItem value="Enterprise">Enterprise</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth label="Tokens Iniciales Utilizados" margin="dense" type="number"
              value={newUser.tokens_used} onChange={(e) => setNewUser({...newUser, tokens_used: e.target.value})}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddUser} variant="contained" disabled={loading}>Guardar</Button>
          </DialogActions>
        </Dialog>
      </TabPanel>

      {/* TAB 1: INTEGRACIONES */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" sx={{ mb: 3 }}>Integración de Microservicios (Cloud Run) y Terceros</Typography>
        
        <Grid container spacing={3}>
          {/* STRIPE */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold">Conector Stripe (Suscripciones y Pagos)</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Configuración para pagos, facturación y control de planes.
                </Typography>
                <TextField fullWidth label="Stripe Public Key" margin="dense" placeholder="pk_test_..." size="small" />
                <TextField fullWidth label="Stripe Secret Key" margin="dense" placeholder="sk_test_..." type="password" size="small" />
                <TextField fullWidth label="Webhook Secret" margin="dense" placeholder="whsec_..." type="password" size="small" />
                <Box sx={{ mt: 2 }}><Button variant="outlined" size="small">Probar Conexión Stripe</Button></Box>
              </CardContent>
            </Card>
          </Grid>

          {/* CHAT API */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold">Servicio de Chat</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Integración con el microservicio de Chat en Cloud Run.
                </Typography>
                <TextField fullWidth label="Cloud Run Endpoint URL" margin="dense" placeholder="https://chat-service-xxx.run.app" size="small" />
                <Box sx={{ mt: 2 }}><Button variant="outlined" size="small">Probar Conexión</Button></Box>
              </CardContent>
            </Card>
          </Grid>

          {/* ANALIZADOR API */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold">Servicio Analizador</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Integración con el microservicio de Análisis de Documentos en Cloud Run.
                </Typography>
                <TextField fullWidth label="Cloud Run Endpoint URL" margin="dense" placeholder="https://analyzer-service-xxx.run.app" size="small" />
                <Box sx={{ mt: 2 }}><Button variant="outlined" size="small">Probar Conexión</Button></Box>
              </CardContent>
            </Card>
          </Grid>

          {/* PRECALIFICADOR API */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold">Servicio Precalificador</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Integración con el microservicio de Precalificación en Cloud Run.
                </Typography>
                <TextField fullWidth label="Cloud Run Endpoint URL" margin="dense" placeholder="https://prequalifier-service-xxx.run.app" size="small" />
                <Box sx={{ mt: 2 }}><Button variant="outlined" size="small">Probar Conexión</Button></Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" color="primary" disabled>Guardar Integraciones</Button>
        </Box>
      </TabPanel>

      {/* TAB 2: SISTEMA Y CONFIGURACIÓN */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" sx={{ mb: 3 }}>Configuración del Sistema</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold">Control de Tokens Global</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body1" sx={{ mt: 2 }}>
                  <strong>Tokens Totales Utilizados: </strong> {globalTokensUsed.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Consumo global de toda la plataforma en el mes actual.
                </Typography>
                <TextField 
                  fullWidth 
                  label="Límite de Tokens Global (Mensual)" 
                  margin="dense" 
                  type="number" 
                  defaultValue={globalTokensLimit} 
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold">Mantenimiento</Typography>
                <Divider sx={{ my: 1 }} />
                <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                  Activar el modo de mantenimiento bloqueará el acceso a la aplicación para los usuarios finales.
                </Alert>
                <Button variant="outlined" color="error">Activar Modo Mantenimiento</Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" color="primary" disabled>Guardar Configuración de Sistema</Button>
        </Box>
      </TabPanel>
    </Box>
  );
}
