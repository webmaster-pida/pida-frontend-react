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
  Collapse,
  TablePagination
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import BuildIcon from '@mui/icons-material/Build';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useAuth } from '../AuthContext'; 

// =========================================================================
// SUB-COMPONENTE: FILA DESPLEGABLE (CARPETA DE AUTOR)
// =========================================================================
function AuthorFolderRow({ authorData, confirmDelete, userRole }) {
  const [open, setOpen] = useState(false);
  const { author, books } = authorData;
  
  // Sumamos los chunks de todos los libros dentro de esta carpeta
  const totalChunksInFolder = books.reduce((sum, book) => sum + (book.total_chunks || 0), 0);

  // Ordenamos los libros alfabéticamente dentro de la carpeta
  const sortedBooks = [...books].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <React.Fragment>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' }, bgcolor: open ? '#f0f4f8' : 'inherit', transition: 'background-color 0.3s' }}>
        <TableCell>
          <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderIcon color="primary" /> {author}
        </TableCell>
        <TableCell align="center">
          <Chip label={`${books.length} documentos`} size="small" color="info" variant={open ? "filled" : "outlined"} />
        </TableCell>
        <TableCell align="center" sx={{ fontWeight: 'medium' }}>
          {totalChunksInFolder.toLocaleString()}
        </TableCell>
      </TableRow>
      
      {/* CONTENIDO DESPLEGABLE DE LA CARPETA */}
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2, borderLeft: '3px solid #1976d2', pl: 2 }}>
              <Typography variant="subtitle2" gutterBottom component="div" color="text.secondary">
                Documentos en esta carpeta:
              </Typography>
              <Table size="small" aria-label="documentos">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Título de la Sentencia / Documento</TableCell>
                    {/* ANCHOS FIJOS PARA LAS COLUMNAS */}
                    <TableCell align="center" sx={{ fontWeight: 'bold', width: 100, minWidth: 100 }}>Vectores</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', width: 100, minWidth: 100 }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedBooks.map((book) => (
                    <TableRow key={book.id} hover>
                      <TableCell>
                        {/* ENCAPSULADO CORRECTO PARA EVITAR QUE SE ROMPA LA FILA */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <InsertDriveFileIcon fontSize="small" color="action" sx={{ mt: 0.3, flexShrink: 0 }} />
                          <Typography variant="body2">{book.title}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ width: 100 }}>{book.total_chunks || 0}</TableCell>
                      <TableCell align="center" sx={{ width: 100 }}>
                        <IconButton 
                          color="error" 
                          size="small"
                          onClick={() => confirmDelete(book)}
                          disabled={userRole === 'lector'} 
                          title={userRole === 'lector' ? 'No tienes permisos' : 'Eliminar documento'}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

// =========================================================================
// COMPONENTE PRINCIPAL
// =========================================================================
export default function Biblioteca() {
  const { userRole } = useAuth(); 

  const [books, setBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Estados para la paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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

  // Lógica de filtrado y AGRUPACIÓN por Autor
  const getGroupedAndFilteredBooks = () => {
    // 1. Filtrar por la búsqueda global
    const filtered = books.filter(book => 
      (book.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (book.author || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 2. Agrupar en formato Carpeta { "Corte IDH": [libro1, libro2], "Otro Autor": [libro3] }
    const grouped = {};
    filtered.forEach(book => {
      const author = book.author || 'Autor Desconocido';
      if (!grouped[author]) {
        grouped[author] = [];
      }
      grouped[author].push(book);
    });

    // 3. Convertir el objeto a un arreglo para poder mapearlo y paginarlo
    const groupedArray = Object.keys(grouped).map(author => ({
      author: author,
      books: grouped[author]
    }));

    // 4. Ordenar las carpetas alfabéticamente
    return groupedArray.sort((a, b) => a.author.localeCompare(b.author));
  };

  const groupedAuthors = getGroupedAndFilteredBooks();

  // Controladores de paginación
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

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
        const safeId = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 150); // Mantenemos el límite seguro de 150
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
          placeholder="Buscar por título de sentencia o autor..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0); // Reiniciar paginación al buscar
          }}
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

      {/* TABLA PRINCIPAL ESTILO CARPETAS */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table aria-label="collapsible table">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ width: 50 }} /> {/* Columna vacía para la flechita */}
                  <TableCell sx={{ fontWeight: 'bold' }}>Autor (Carpeta)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Total de Documentos</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Total Vectores</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedAuthors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                      <Typography color="text.secondary">No se encontraron documentos.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  // Aplicamos la paginación cortando el arreglo de carpetas
                  groupedAuthors
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((authorFolder) => (
                      <AuthorFolderRow 
                        key={authorFolder.author} 
                        authorData={authorFolder} 
                        confirmDelete={confirmDelete}
                        userRole={userRole}
                      />
                  ))
                )}
              </TableBody>
            </Table>
            
            {/* CONTROLES DE PAGINACIÓN */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={groupedAuthors.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Carpetas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </>
        )}
      </TableContainer>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <Dialog open={openDialog} onClose={() => !isDeleting && setOpenDialog(false)}>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>
          ⚠️ Cuidado: Eliminación Destructiva
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Estás a punto de eliminar el documento <strong>{bookToDelete?.title}</strong> de la base de conocimientos.
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
            {isDeleting ? 'Destruyendo...' : 'Sí, Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}