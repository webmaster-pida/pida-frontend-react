import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  writeBatch, 
  doc,
  deleteDoc,
  setDoc
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
  Alert,
  TableSortLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import BuildIcon from '@mui/icons-material/Build'; // Icono para la migración
import { useAuth } from '../AuthContext'; 

export default function Biblioteca() {
  const { userRole } = useAuth(); 

  const [books, setBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Estados para el ordenamiento
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('title');

  // Estados para el Modal de Eliminación
  const [openDialog, setOpenDialog] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Estado para la migración
  const [isMigrating, setIsMigrating] = useState(false);

  const fetchBooks = async () => {
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
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

  // Función para manejar el clic en los encabezados
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Función para ordenar y filtrar
  const getSortedAndFilteredBooks = () => {
    const filtered = books.filter(book => 
      (book.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (book.author || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let valueA = a[orderBy] || '';
      let valueB = b[orderBy] || '';
      
      // Convertir a minúsculas para ordenar correctamente
      if (typeof valueA === 'string') valueA = valueA.toLowerCase();
      if (typeof valueB === 'string') valueB = valueB.toLowerCase();

      if (valueA < valueB) {
        return order === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const sortedAndFilteredBooks = getSortedAndFilteredBooks();

  const confirmDelete = (book) => {
    if (userRole === 'lector') return; 
    setBookToDelete(book);
    setOpenDialog(true);
  };

  const executeDelete = async () => {
    if (userRole === 'lector' || !bookToDelete) return;
    
    setIsDeleting(true);
    try {
      const chunksRef = collection(db, 'pida_kb_genai-v20');
      const q = query(chunksRef, where('metadata.title', '==', bookToDelete.title));
      const chunkSnapshots = await getDocs(q);

      const batch = writeBatch(db);
      let count = 0;
      
      chunkSnapshots.forEach((chunkDoc) => {
        batch.delete(chunkDoc.ref);
        count++;
      });

      if (count > 0) {
        await batch.commit();
      }

      await deleteDoc(doc(db, 'library_registry', bookToDelete.id));

      setStatus({ type: 'success', message: `Se eliminó el libro y sus ${count} vectores correctamente.` });
      setOpenDialog(false);
      setBookToDelete(null);
      
      fetchBooks();
    } catch (error) {
      console.error("Error al eliminar:", error);
      setStatus({ type: 'error', message: 'Hubo un problema al intentar eliminar los vectores.' });
    } finally {
      setIsDeleting(false);
    }
  };

  // =========================================================================
  // SCRIPT DE MIGRACIÓN/SINCRONIZACIÓN
  // =========================================================================
  const runMigration = async () => {
    if (userRole === 'lector') return;
    if (!window.confirm("Esto sincronizará el catálogo leyendo todos los vectores actuales. ¿Continuar?")) return;
    
    setIsMigrating(true);
    setStatus({ type: 'info', message: 'Sincronizando biblioteca. Por favor no cierres la ventana...' });
    
    try {
      const chunksSnap = await getDocs(collection(db, 'pida_kb_genai-v20'));
      const catalog = {}; 
      
      chunksSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.metadata && data.metadata.title) {
          const title = data.metadata.title;
          const author = data.metadata.author || "Autor Desconocido";
          
          if (!catalog[title]) {
            catalog[title] = { title: title, author: author, total_chunks: 1 };
          } else {
            catalog[title].total_chunks += 1;
          }
        }
      });

      const batch = writeBatch(db);
      const registryRef = collection(db, 'library_registry');
      
      let booksFound = 0;
      Object.keys(catalog).forEach(title => {
        const safeId = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        const docRef = doc(registryRef, safeId);
        batch.set(docRef, catalog[title]);
        booksFound++;
      });

      if (booksFound > 0) {
        await batch.commit();
        setStatus({ type: 'success', message: `¡Sincronización exitosa! Se catalogaron ${booksFound} libros.` });
        fetchBooks(); 
      } else {
        setStatus({ type: 'warning', message: 'No se encontraron metadatos válidos en los vectores.' });
      }

    } catch (error) {
      console.error("Error en sincronización:", error);
      setStatus({ type: 'error', message: 'Error durante la sincronización: ' + error.message });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: '#333' }}>
        Gestión de Biblioteca Vectorial
      </Typography>

      {status.message && <Alert severity={status.type} sx={{ mb: 3 }}>{status.message}</Alert>}

      {/* BARRA DE HERRAMIENTAS */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
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
          disabled={loading || isDeleting || isMigrating}
        >
          REFRESCAR LISTA
        </Button>
        
        {/* BOTÓN DE SINCRONIZACIÓN (Siempre visible para admins) */}
        {userRole !== 'lector' && (
          <Button 
            variant="contained" 
            color="secondary"
            startIcon={isMigrating ? <CircularProgress size={20} color="inherit" /> : <BuildIcon />} 
            onClick={runMigration}
            disabled={isMigrating}
          >
            {isMigrating ? 'SINC. VECTORES...' : 'SINCRONIZAR CATÁLOGO'}
          </Button>
        )}
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
                <TableCell sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={orderBy === 'title'}
                    direction={orderBy === 'title' ? order : 'asc'}
                    onClick={() => handleRequestSort('title')}
                  >
                    Título del Libro
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={orderBy === 'author'}
                    direction={orderBy === 'author' ? order : 'asc'}
                    onClick={() => handleRequestSort('author')}
                  >
                    Autor
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Total Chunks</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedAndFilteredBooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">No se encontraron documentos en la biblioteca.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                sortedAndFilteredBooks.map((book) => (
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
                        disabled={userRole === 'lector'} 
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