import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  getCountFromServer, 
  getDocs,
  query, 
  orderBy,
  where,
  collectionGroup,
  Timestamp
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
  ToggleButton,
  ToggleButtonGroup
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
  
  // Selector de tiempo: 'hoy', 'semana', 'mes', 'año'
  const [timeRange, setTimeRange] = useState('año');

  // Estado para las tarjetas superiores
  const [stats, setStats] = useState({
    interacciones: { conversaciones: 0, analisis: 0, precalificaciones: 0 },
    globales: { docs: 0, chunks: 0 }
  });

  // Estado para el gráfico
  const [chartData, setChartData] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    setLoadingChart(true);
    if (loading) setError(null);
    
    try {
      // 1. CARGA DE GLOBALES (Solo la primera vez o independiente del filtro)
      const chunksCol = collection(db, 'pida_kb_genai-v20');
      const catalogCol = collection(db, 'library_registry');

      const [chunksSnap, catalogSnap] = await Promise.all([
        getCountFromServer(chunksCol),
        getCountFromServer(catalogCol)
      ]);

      const globales = {
        docs: catalogSnap.data().count,
        chunks: chunksSnap.data().count
      };

      // 2. CARGA DE INTERACCIONES SEGÚN EL RANGO
      let sumConversaciones = 0;
      let sumAnalisis = 0;
      let sumPrecalificaciones = 0;
      let newChartData = [];

      if (timeRange === 'año') {
        // MODO AÑO: Leer de la colección barata (monthly_stats)
        const statsRef = collection(db, 'monthly_stats');
        const q = query(statsRef, orderBy('__name__', 'asc')); 
        const statsSnapshot = await getDocs(q);

        statsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const monthId = docSnap.id; 
          
          const [year, month] = monthId.split('-');
          const dateObj = new Date(year, parseInt(month) - 1, 1);
          const monthLabel = new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' }).format(dateObj);
          
          const convos = data.conversaciones || 0;
          const anals = data.analisis || 0;
          const prequals = data.precalificaciones || 0;

          sumConversaciones += convos;
          sumAnalisis += anals;
          sumPrecalificaciones += prequals;

          newChartData.push({
            name: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1).replace('.', ''),
            conversaciones: convos,
            analisis: anals,
            precalificaciones: prequals
          });
        });

      } else {
        // MODO DÍAS: Consultas en vivo a las colecciones reales
        const analysisCol = collection(db, 'analysis_history');
        const convGroup = collectionGroup(db, 'conversations');
        const prequalGroup = collectionGroup(db, 'prequalifications');

        const timeFrames = [];
        const today = new Date();
        const daysToFetch = timeRange === 'hoy' ? 1 : (timeRange === 'semana' ? 7 : 30);

        // Generar los bloques de días
        for (let i = daysToFetch - 1; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          
          const start = new Date(d); start.setHours(0, 0, 0, 0);
          const end = new Date(d); end.setHours(23, 59, 59, 999);

          let label = "";
          if (timeRange === 'hoy') {
            label = "Hoy";
          } else if (timeRange === 'semana') {
            const dayName = new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(d);
            label = dayName.charAt(0).toUpperCase() + dayName.slice(1).replace('.', '');
          } else {
            label = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(d);
          }

          timeFrames.push({ start: Timestamp.fromDate(start), end: Timestamp.fromDate(end), name: label });
        }

        // Consultar cada día (Promesas concurrentes para máxima velocidad)
        const results = await Promise.all(timeFrames.map(async (frame) => {
          const qA = query(analysisCol, where('timestamp', '>=', frame.start), where('timestamp', '<=', frame.end));
          const qC = query(convGroup, where('created_at', '>=', frame.start), where('created_at', '<=', frame.end));
          const qP = query(prequalGroup, where('created_at', '>=', frame.start), where('created_at', '<=', frame.end));

          const [sA, sC, sP] = await Promise.all([
            getCountFromServer(qA), getCountFromServer(qC), getCountFromServer(qP)
          ]);

          const anals = sA.data().count;
          const convos = sC.data().count;
          const prequals = sP.data().count;

          sumAnalisis += anals;
          sumConversaciones += convos;
          sumPrecalificaciones += prequals;

          return { name: frame.name, conversaciones: convos, analisis: anals, precalificaciones: prequals };
        }));

        newChartData = results;
      }

      setStats({
        interacciones: {
          conversaciones: sumConversaciones,
          analisis: sumAnalisis,
          precalificaciones: sumPrecalificaciones
        },
        globales
      });

      setChartData(newChartData);

    } catch (err) {
      console.error("Error cargando dashboard:", err);
      setError('Error al cargar estadísticas. Revisa la consola o los índices de Firestore.');
    } finally {
      setLoadingChart(false);
      setLoading(false);
    }
  }, [timeRange]); // Se vuelve a ejecutar cuando cambie el selector

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRangeChange = (event, newRange) => {
    if (newRange !== null) {
      setTimeRange(newRange);
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{ border: '1px solid #e0e0e0', borderRadius: 2, height: '100%' }} elevation={0}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
        <Box sx={{ 
          bgcolor: `${color}.light`, color: `${color}.main`, p: 2, borderRadius: 2, display: 'flex', mr: 3, opacity: 0.8
        }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            {loadingChart ? <CircularProgress size={20} /> : value.toLocaleString()}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" color="primary">
          Panel de Estadísticas
        </Typography>
        
        {/* SELECTOR DE TIEMPO */}
        <ToggleButtonGroup
          color="primary"
          value={timeRange}
          exclusive
          onChange={handleRangeChange}
          size="small"
          sx={{ bgcolor: '#fff' }}
        >
          <ToggleButton value="hoy">Hoy</ToggleButton>
          <ToggleButton value="semana">7 Días</ToggleButton>
          <ToggleButton value="mes">30 Días</ToggleButton>
          <ToggleButton value="año">Histórico</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

      {/* TARJETAS SUPERIORES */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Conversaciones" 
            value={stats.interacciones.conversaciones} 
            icon={<ForumIcon fontSize="large" />} 
            color="info" 
            subtitle={timeRange === 'año' ? "Total histórico" : `En el periodo seleccionado`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Análisis Generados" 
            value={stats.interacciones.analisis} 
            icon={<DescriptionIcon fontSize="large" />} 
            color="warning" 
            subtitle={timeRange === 'año' ? "Total histórico" : `En el periodo seleccionado`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Precalificaciones" 
            value={stats.interacciones.precalificaciones} 
            icon={<FactCheckIcon fontSize="large" />} 
            color="secondary" 
            subtitle={timeRange === 'año' ? "Total histórico" : `En el periodo seleccionado`}
          />
        </Grid>
        
        {/* ESTAS NUNCA CAMBIAN CON EL FILTRO PORQUE SON LA BIBLIOTECA GLOBAL */}
        <Grid item xs={12} sm={6} md={6}>
          <StatCard title="Documentos en Biblioteca" value={stats.globales.docs} icon={<LibraryBooksIcon fontSize="large" />} color="success" subtitle="Total actual en plataforma" />
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <StatCard title="Total Vectores" value={stats.globales.chunks} icon={<StorageIcon fontSize="large" />} color="primary" subtitle="Base de conocimiento IA" />
        </Grid>
      </Grid>

      {/* SECCIÓN DEL GRÁFICO */}
      <Paper elevation={0} sx={{ p: 4, border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight="bold">
            Distribución de Actividad
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {timeRange === 'año' 
              ? "Desglose por meses según tu historial agrupado." 
              : `Desglose diario de los últimos ${timeRange === 'hoy' ? '24 horas' : (timeRange === 'semana' ? '7 días' : '30 días')}.`}
          </Typography>
        </Box>
        
        {loadingChart ? (
          <Box sx={{ width: '100%', height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography color="text.secondary">Procesando datos...</Typography>
          </Box>
        ) : (
          <Box sx={{ width: '100%' }}>
            {chartData.length === 0 ? (
                <Box sx={{ width: '100%', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">No hay datos en este periodo.</Typography>
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
                  <Bar dataKey="conversaciones" name="Conversaciones" stackId="a" fill="#0288d1" radius={timeRange === 'hoy' ? [4,4,0,0] : [0, 0, 4, 4]} />
                  <Bar dataKey="analisis" name="Análisis" stackId="a" fill="#ed6c02" />
                  <Bar dataKey="precalificaciones" name="Precalificaciones" stackId="a" fill="#9c27b0" radius={timeRange !== 'hoy' ? [4, 4, 0, 0] : [0,0,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
}