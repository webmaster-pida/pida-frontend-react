import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { 
  Typography, Container, Card, Button, Box, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Tooltip, Chip, TextField, InputAdornment, TableSortLabel,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';

export default function Biblioteca() {
  const [books, setBooks] = useState([]);
  const [loadingTable, setLoadingTable] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  
  // Estados para Búsqueda y Ordenamiento
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'title', direction: 'asc' });

  // Estados para el Modal de Biblioteca
  const [openDialog, setOpenDialog] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);

  const fetchBooks = async () => {
    setLoadingTable(true);
    setStatus({ type: '', message: '' });
    try {
      const collectionRef = collection(db, 'pida_kb_genai-v20');
      const querySnapshot = await getDocs(collectionRef);
      
      const bookMap = new Map();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const title = data.metadata?.title || 'Sin Título';
        const author = data.metadata?.author || 'Autor Desconocido';
        
        if (bookMap.has(title)) {
          bookMap.get(title).chunks += 1;
        } else {
          bookMap.set(title, { title, author, chunks: 1 });
        }
      });

      const uniqueBooks = Array.from(bookMap.values());
      setBooks(uniqueBooks);
    } catch (error) {
      console.error("Error obteniendo libros: ", error);
      setStatus({ type: 'error', message: 'Error al cargar la lista de libros desde Firestore.' });
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // 1. Abre modal
  const confirmDeleteBook = (bookTitle) => {
    setBookToDelete(bookTitle);
    setOpenDialog(true);
  };

  // 2. Ejecuta borrado real
  const executeDeleteBook = async () => {
    setOpenDialog(false);
    if (!bookToDelete) return;

    setDeleting(true);
    setStatus({ type: '', message: '' });

    try {
      const collectionRef = collection(db, 'pida_kb_genai-v20');
      const q = query(collectionRef, where('metadata.title', '==', bookToDelete));
      const querySnapshot = await getDocs(q);

      let batch = writeBatch(db);
      let count = 0;
      let totalDeleted = 0;

      for (const doc of querySnapshot.docs) {
        batch.delete(doc.ref);
        count++;
        totalDeleted++;

        if (count === 500) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      setStatus({ type: 'success', message: `¡Éxito! Se eliminaron ${totalDeleted} chunks del libro "${bookToDelete}".` });
      fetchBooks();

    } catch (error) {
      console.error("Error borrando documentos: ", error);
      setStatus({ type: 'error', message: `Error al intentar borrar el libro "${bookToDelete}".` });
    } finally {
      setDeleting(false);
      setBookToDelete(null);
    }
  };

  // --- LÓGICA DE ORDENAMIENTO ---
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // --- LÓGICA DE FILTRADO Y ORDENAMIENTO (useMemo) ---
  const processedBooks = useMemo(() => {
    let filtered = books.filter(book => 
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      book.author.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [books, searchTerm, sortConfig]);


  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#333' }}>
          Gestión de Biblioteca Vectorial
        </Typography>
      </Box>

      {/* Controles: Buscador y Refrescar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between' }}>
        <TextField
          variant="outlined"
          placeholder="Buscar por título o autor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          sx={{ width: { xs: '100%', sm: '400px' }, bgcolor: 'white' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        <Button 
          startIcon={<RefreshIcon />} 
          variant="outlined" 
          onClick={fetchBooks}
          disabled={loadingTable || deleting}
          sx={{ height: '40px' }}
        >
          Refrescar Lista
        </Button>
      </Box>

      {status.message && (
        <Alert severity={status.type} sx={{ mb: 3 }}>
          {status.message}
        </Alert>
      )}

      <Card elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '55%' }}>
                  <TableSortLabel
                    active={sortConfig.key === 'title'}
                    direction={sortConfig.key === 'title' ? sortConfig.direction : 'asc'}
                    onClick={() => handleSort('title')}
                  >
                    Título del Libro
                  </TableSortLabel>
                </TableCell>

                <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>
                  <TableSortLabel
                    active={sortConfig.key === 'author'}
                    direction={sortConfig.key === 'author' ? sortConfig.direction : 'asc'}
                    onClick={() => handleSort('author')}
                  >
                    Autor
                  </TableSortLabel>
                </TableCell>

                <TableCell align="center" sx={{ fontWeight: 'bold', width: '10%' }}>Total Chunks</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', width: '10%' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            
            <TableBody>
              {loadingTable ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 2, color: 'text.secondary' }}>Analizando base de datos...</Typography>
                  </TableCell>
                </TableRow>
              ) : processedBooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">
                      {searchTerm ? 'No se encontraron resultados para tu búsqueda.' : 'No se encontraron libros indexados en Firestore.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                processedBooks.map((book) => (
                  <TableRow key={book.title} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell component="th" scope="row">{book.title}</TableCell>
                    <TableCell>{book.author}</TableCell>
                    <TableCell align="center">
                      <Chip label={book.chunks} color="primary" variant="outlined" size="small" />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Eliminar este libro">
                        <span>
                          <IconButton 
                            color="error" 
                            onClick={() => confirmDeleteBook(book.title)}
                            disabled={deleting}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* --- MODAL DE CONFIRMACIÓN MUI --- */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>¿Eliminar libro de la base vectorial?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Estás a punto de eliminar todos los chunks del libro <strong>"{bookToDelete}"</strong>. Esta acción borrará los datos de Firestore y no se puede deshacer. ¿Deseas continuar?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit">Cancelar</Button>
          <Button onClick={executeDeleteBook} color="error" variant="contained">Sí, Eliminar Libro</Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
}