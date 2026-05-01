import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  getCountFromServer, 
  getDocs,
  query, 
  orderBy,
  collectionGroup,
  writeBatch,
  doc
} from 'firebase/firestore';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CircularProgress, 
  Alert,
  Paper,
  Stack,
  Button,
  LinearProgress
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import DescriptionIcon from '@mui/icons-material/Description';
import ForumIcon from '@mui/icons-material/Forum';
import FactCheckIcon from '@mui/icons-material/FactCheck';

// Importaciones de Recharts para el gráfico
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

export default function Estadisticas() {
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para la migración
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState('');
  const [migrationProgress, setMigrationProgress] = useState(0);

  // Estado para las tarjetas superiores
  const [stats, setStats] = useState({
    totalConversaciones: 0,
    totalAnalisis: 0,
    totalPrecalificaciones: 0,
    totalDocs: 0,
    totalChunks: 0
  });

  // Estado para el gráfico
  const [chartData, setChartData] = useState([]);

  // Función envuelta en useCallback para poder llamarla al cargar y al terminar la migración
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setLoadingChart(true);
    setError(null);
    
    try {
      // 1. CARGAR CATÁLOGO Y CHUNKS
      const chunksCol = collection(db, 'pida_kb_genai-v20');
      const catalogCol = collection(db, 'library_registry');

      const [chunksSnap, catalogSnap] = await Promise.all([
        getCountFromServer(chunksCol),
        getCountFromServer(catalogCol)
      ]);

      // 2. CARGAR HISTORIAL MENSUAL DESDE 'monthly_stats'
      const statsRef = collection(db, 'monthly_stats');
      const q = query(statsRef, orderBy('__name__', 'asc')); 
      const statsSnapshot = await getDocs(q);

      let sumConversaciones = 0;
      let sumAnalisis = 0;
      let sumPrecalificaciones = 0;
      const monthlyData = [];

      statsSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const monthId = docSnap.id; // Ej: "2026-04"
        
        const [year, month] = monthId.split('-');
        const dateObj = new Date(year, parseInt(month) - 1, 1);
        const monthLabel = new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' }).format(dateObj);
        const capitalizedLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1).replace('.', '');

        const convos = data.conversaciones || 0;
        const anals = data.analisis || 0;
        const prequals = data.precalificaciones || 0;

        sumConversaciones += convos;
        sumAnalisis += anals;
        sumPrecalificaciones += prequals;

        monthlyData.push({
          name: capitalizedLabel,
          conversaciones: convos,
          analisis: anals,
          precalificaciones: prequals,
          totalInteracciones: convos + anals + prequals
        });
      });

      setStats({
        totalConversaciones: sumConversaciones,
        totalAnalisis: sumAnalisis,
        totalPrecalificaciones: sumPrecalificaciones,
        totalDocs: catalogSnap.data().count,
        totalChunks: chunksSnap.data().count
      });

      setChartData(monthlyData);

    } catch (err) {
      console.error("Error cargando dashboard:", err);
      setError('Error al cargar las estadísticas. Verifica los permisos de Firestore.');
    } finally {
      setLoadingChart(false);
      setLoading(false);
    }
  }, []);

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // --- FUNCIÓN DEL BOTÓN TEMPORAL DE MIGRACIÓN ---
  const ejecutarMigracion = async () => {
    if (!window.confirm("¿Deseas iniciar la consolidación histórica? Esto leerá tu base de datos y agrupará las interacciones por mes.")) return;

    setIsMigrating(true);
    setMigrationStatus('Iniciando conteo...');
    setMigrationProgress(10);

    try {
      const statsMap = {}; 

      setMigrationStatus('Contando conversaciones (Chat)...');
      const convosSnapshot = await getDocs(query(collectionGroup(db, 'conversations')));
      convosSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.created_at) {
          const date = data.created_at.toDate();
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!statsMap[monthKey]) statsMap[monthKey] = { conversaciones: 0, analisis: 0, precalificaciones: 0 };
          statsMap[monthKey].conversaciones++;
        }
      });
      setMigrationProgress(40);

      setMigrationStatus('Contando análisis...');
      const analysisSnapshot = await getDocs(collection(db, 'analysis_history'));
      analysisSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.timestamp) {
          const date = data.timestamp.toDate();
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!statsMap[monthKey]) statsMap[monthKey] = { conversaciones: 0, analisis: 0, precalificaciones: 0 };
          statsMap[monthKey].analisis++;
        }
      });
      setMigrationProgress(70);

      setMigrationStatus('Contando precalificaciones...');
      const prequalSnapshot = await getDocs(query(collectionGroup(db, 'prequalifications')));
      prequalSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.created_at) {
          const date = data.created_at.toDate();
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!statsMap[monthKey]) statsMap[monthKey] = { conversaciones: 0, analisis: 0, precalificaciones: 0 };
          statsMap[monthKey].precalificaciones++;
        }
      });
      setMigrationProgress(90);

      setMigrationStatus('Guardando matriz consolidada...');
      const batch = writeBatch(db);
      Object.keys(statsMap).forEach(monthKey => {
        const docRef = doc(db, 'monthly_stats', monthKey);
        batch.set(docRef, statsMap[monthKey], { merge: true });
      });

      await batch.commit();
      
      setMigrationProgress(100);
      setMigrationStatus('¡Éxito! Recargando datos del panel...');
      
      // Refrescar el panel automáticamente para mostrar el gráfico nuevo
      await fetchDashboardData();
      
      // Ocultar la barra después de unos segundos
      setTimeout(() => {
        setIsMigrating(false);
      }, 3000);

    } catch (err) {
      console.error("Error en migración:", err);
      setMigrationStatus(`Error: ${err.message}`);
      setIsMigrating(false);
    }
  };

  const StatCard = ({ title, value, icon, color }) => (
    <Card sx={{ border: '1px solid #e0e0e0', borderRadius: 2, height: '100%' }} elevation={0}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
        <Box sx={{ 
          bgcolor: `${color}.light`, 
          color: `${color}.main`, 
          p: 2, 
          borderRadius: 2, 
          display: 'flex', 
          mr: 3,
          opacity: 0.8
        }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            {loading ? <CircularProgress size={20} /> : value.toLocaleString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      
      {/* BOTÓN TEMPORAL DE MIGRACIÓN */}
      <Paper sx={{ p: 2, mb: 4, bgcolor: '#fff3e0', border: '1px solid #ffcc80' }} elevation={0}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" color="warning.dark">
              🛠️ Herramienta de Configuración Inicial
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ejecuta esto solo una vez para consolidar el historial pasado (2024-2025). Puedes borrar este bloque de código después.
            </Typography>
          </Box>
          <Button variant="contained" color="warning" onClick={ejecutarMigracion} disabled={isMigrating}>
            Consolidar Historial
          </Button>
        </Stack>
        {isMigrating && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={migrationProgress} color="warning" />
            <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'warning.dark' }}>
              {migrationStatus}
            </Typography>
          </Box>
        )}
      </Paper>

      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary" sx={{ mb: 4 }}>
        Panel de Estadísticas
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Conversaciones (Chat)" value={stats.totalConversaciones} icon={<ForumIcon fontSize="large" />} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Análisis Generados" value={stats.totalAnalisis} icon={<DescriptionIcon fontSize="large" />} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Precalificaciones" value={stats.totalPrecalificaciones} icon={<FactCheckIcon fontSize="large" />} color="secondary" />
        </Grid>
        
        <Grid item xs={12} sm={6} md={6}>
          <StatCard title="Documentos en Biblioteca" value={stats.totalDocs} icon={<LibraryBooksIcon fontSize="large" />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <StatCard title="Total Chunks (Vectores)" value={stats.totalChunks} icon={<StorageIcon fontSize="large" />} color="primary" />
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 4, border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Historial de Interacciones Mensual
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Desglose histórico del uso de la plataforma por mes.
            </Typography>
          </Box>
        </Stack>
        
        {loadingChart ? (
          <Box sx={{ width: '100%', height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography color="text.secondary">Cargando gráfico...</Typography>
          </Box>
        ) : (
          <Box sx={{ width: '100%' }}>
            {chartData.length === 0 ? (
                <Box sx={{ width: '100%', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">No hay datos históricos disponibles aún.</Typography>
                </Box>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666' }} dx={-10} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#333', marginBottom: '8px' }}
                    cursor={{fill: '#f5f5f5'}}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                  <Bar dataKey="conversaciones" name="Conversaciones" stackId="a" fill="#0288d1" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="analisis" name="Análisis" stackId="a" fill="#ed6c02" />
                  <Bar dataKey="precalificaciones" name="Precalificaciones" stackId="a" fill="#9c27b0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
}