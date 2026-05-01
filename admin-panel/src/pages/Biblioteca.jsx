import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  writeBatch, 
  doc,
  deleteDoc
} from 'firebase/firestore';
import { 
  Typography, 
  Container, 
  Card, 
  Box, 
  TextField, 
  Button,
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth } from '../AuthContext'; // Importamos tu seguridad

export default function Biblioteca() {
  const { userRole } = useAuth(); // Blindaje de seguridad

  const [books, setBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Estados para el Modal de Eliminación
  const [openDialog, setOpenDialog] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cargar el catálogo de libros
  const fetchBooks = async () => {
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      // ATENCIÓN: Leemos de una colección catálogo (library_registry)
      // Esto hace que cargar 100 libros cueste 100 lecturas, NO 50,000.
      const querySnapshot = await getDocs(collection(db, 'library_registry'));
      const booksList = [];
      querySnapshot.forEach((document) => {
        booksList.push({ id: document.id, ...document.data() });
      });
      setBooks(booksList);
    } catch (error) {
      console.error("Error cargando la biblioteca: ", error);
      setStatus({ type: 'error', message: 'Error al cargar los documentos. Verifica tus permisos.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // Filtrado de búsqueda en el cliente (rápido y gratis)
  const filteredBooks = books.filter(book => 
    (book.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (book.author || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Manejo de Eliminación
  const confirmDelete = (book) => {
    if (userRole === 'lector') return; // Seguridad
    setBookToDelete(book);
    setOpenDialog(true);
  };

  const executeDelete = async () => {
    if (userRole === 'lector' || !bookToDelete) return;
    
    setIsDeleting(true);
    try {
      // 1. Buscar todos los chunks en pida_kb_genai-v20 que pertenezcan a este libro
      const chunksRef = collection(db, 'pida_kb_genai-v20');
      // Asegúrate de que el campo en tu base de datos se llame 'title' o 'metadata.title' según corresponda
      const q = query(chunksRef, where('metadata.title', '==', bookToDelete.title));
      const chunkSnapshots = await getDocs(q);

      // 2. Borrar los chunks usando "Batched Writes" (Lotes de 500 máximo por transacción en Firestore)
      const batch = writeBatch(db);
      let count = 0;
      
      chunkSnapshots.forEach((chunkDoc) => {
        batch.delete(chunkDoc.ref);
        count++;
        // Si tienes más de 500 chunks para un libro, la lógica requeriría múltiples batches.
        // Para la mayoría de los casos, 500 es suficiente por operación.
      });

      if (count > 0) {
        await batch.commit();
      }

      // 3. Borrar el libro del catálogo (library_registry)
      await deleteDoc(doc(db, 'library_registry', bookToDelete.id));

      setStatus({ type: 'success', message: `Se eliminó el libro y sus ${count} vectores correctamente.` });
      setOpenDialog(false);
      setBookToDelete(null);
      
      // Refrescar tabla
      fetchBooks();
    } catch (error) {
      console.error("Error al eliminar:", error);
      setStatus({ type: 'error', message: 'Hubo un problema al intentar eliminar los vectores. Es posible que necesites un Índice en Firestore.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: '#333' }}>
        Gestión de Biblioteca Vectorial
      </Typography>

      {status.message && <Alert severity={status.type} sx={{ mb: 3 }}>{status.message}</Alert>}

      {/* BARRA DE HERRAMIENTAS: Buscador y Refrescar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField 
          variant="outlined"
          placeholder="Buscar por título o autor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1, bgcolor: 'white', borderRadius: 1 }}
          size="small"
        />
        <Button 
          variant="outlined" 
          startIcon={<RefreshIcon />} 
          onClick={fetchBooks}
          disabled={loading || isDeleting}
        >
          REFRESCAR LISTA
        </Button>
      </Box>

      {/* TABLA PRINCIPAL */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Título del Libro ↑</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Autor</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Total Chunks</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">No se encontraron documentos en la biblioteca.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBooks.map((book) => (
                  <TableRow key={book.id} hover>
                    <TableCell sx={{ maxWidth: 400 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {book.title}
                      </Typography>
                    </TableCell>
                    <TableCell>{book.author}</TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={book.total_chunks || 0} 
                        size="small" 
                        variant="outlined"
                        color="primary"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton 
                        color="error" 
                        onClick={() => confirmDelete(book)}
                        disabled={userRole === 'lector'} // Blindaje visual
                        title={userRole === 'lector' ? 'No tienes permisos' : 'Eliminar documento'}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <Dialog open={openDialog} onClose={() => !isDeleting && setOpenDialog(false)}>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>
          ⚠️ Cuidado: Eliminación Destructiva
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Estás a punto de eliminar el libro <strong>{bookToDelete?.title}</strong> de la base de conocimientos.
          </DialogContentText>
          <DialogContentText color="text.secondary">
            Esta acción buscará y destruirá los <strong>{bookToDelete?.total_chunks} vectores/chunks</strong> asociados en la base de datos (pida_kb_genai-v20). La Inteligencia Artificial perderá este conocimiento de forma irreversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit" disabled={isDeleting}>
            Cancelar
          </Button>
          <Button 
            onClick={executeDelete} 
            color="error" 
            variant="contained" 
            autoFocus
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
          >
            {isDeleting ? 'Destruyendo Vectores...' : 'Sí, Eliminar Libro'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}