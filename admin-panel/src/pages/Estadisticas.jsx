import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  collectionGroup, 
  getCountFromServer, 
  query, 
  where, 
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
  ToggleButton,
  ToggleButtonGroup,
  Stack
} from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import DescriptionIcon from '@mui/icons-material/Description';
import ForumIcon from '@mui/icons-material/Forum';
import FactCheckIcon from '@mui/icons-material/FactCheck';

// Importaciones de Recharts para el gráfico
import { 
  LineChart, 
  Line, 
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
  
  // Rango de días: 7 o 30
  const [daysRange, setDaysRange] = useState(30);

  // Estado para las tarjetas superiores (Sin Chunks)
  const [stats, setStats] = useState({
    totalConversaciones: 0,
    totalAnalisis: 0,
    totalPrecalificaciones: 0,
    totalDocs: "---" // Placeholder hasta definir cómo contar los libros únicos
  });

  // Estado para el gráfico lineal
  const [chartData, setChartData] = useState([]);

  // 1. CARGA DE TOTALES GLOBALES (Se ejecuta una sola vez al montar)
  useEffect(() => {
    const fetchTotals = async () => {
      try {
        const convGroup = collectionGroup(db, 'conversations');
        const analysisCol = collection(db, 'analysis_history');
        const prequalGroup = collectionGroup(db, 'prequalifications');

        const [convSnap, analysisSnap, prequalSnap] = await Promise.all([
          getCountFromServer(convGroup),
          getCountFromServer(analysisCol),
          getCountFromServer(prequalGroup)
        ]);

        setStats({
          totalConversaciones: convSnap.data().count,
          totalAnalisis: analysisSnap.data().count,
          totalPrecalificaciones: prequalSnap.data().count,
          totalDocs: "---" // Pendiente de conexión
        });
      } catch (err) {
        console.error("Error obteniendo totales:", err);
      }
    };
    fetchTotals();
  }, []);

  // 2. CARGA DEL GRÁFICO (Se ejecuta al montar y cada vez que cambie daysRange)
  useEffect(() => {
    const fetchChartData = async () => {
      setLoadingChart(true);
      setError(null);
      
      try {
        const analysisCol = collection(db, 'analysis_history');
        const convGroup = collectionGroup(db, 'conversations');
        const prequalGroup = collectionGroup(db, 'prequalifications');

        const timeFrames = [];
        const today = new Date();
        
        // Generar los rangos de fecha dinámicamente según el daysRange
        for (let i = daysRange - 1; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          
          const startOfDay = new Date(d);
          startOfDay.setHours(0, 0, 0, 0);
          
          const endOfDay = new Date(d);
          endOfDay.setHours(23, 59, 59, 999);

          // Formato de etiqueta
          let label = "";
          if (daysRange <= 7) {
            const dayName = new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(d);
            label = dayName.charAt(0).toUpperCase() + dayName.slice(1).replace('.', '');
          } else {
            label = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(d);
          }

          timeFrames.push({ 
            start: Timestamp.fromDate(startOfDay), 
            end: Timestamp.fromDate(endOfDay), 
            name: label 
          });
        }

        // Consultas concurrentes por cada día del rango
        const results = await Promise.all(timeFrames.map(async (frame) => {
          const qA = query(analysisCol, where('timestamp', '>=', frame.start), where('timestamp', '<=', frame.end));
          const qC = query(convGroup, where('created_at', '>=', frame.start), where('created_at', '<=', frame.end));
          const qP = query(prequalGroup, where('created_at', '>=', frame.start), where('created_at', '<=', frame.end));

          const [sA, sC, sP] = await Promise.all([
            getCountFromServer(qA),
            getCountFromServer(qC),
            getCountFromServer(qP)
          ]);

          return {
            name: frame.name,
            consultas: sA.data().count + sC.data().count + sP.data().count
          };
        }));

        setChartData(results);
      } catch (err) {
        console.error("Error en gráfico:", err);
        setError('Error al cargar historial. Verifica los índices de Firestore en la consola (F12).');
      } finally {
        setLoadingChart(false);
        setLoading(false);
      }
    };

    fetchChartData();
  }, [daysRange]);

  const handleRangeChange = (event, newRange) => {
    if (newRange !== null) {
      setDaysRange(newRange);
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
            {loading ? <CircularProgress size={20} /> : value}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary" sx={{ mb: 4 }}>
        Panel de Estadísticas
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

      {/* FILA DE TARJETAS DE RESUMEN (4 Tarjetas equitativas) */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Conversaciones" value={stats.totalConversaciones} icon={<ForumIcon fontSize="large" />} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Análisis Generados" value={stats.totalAnalisis} icon={<DescriptionIcon fontSize="large" />} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Precalificaciones" value={stats.totalPrecalificaciones} icon={<FactCheckIcon fontSize="large" />} color="secondary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Docs en Biblioteca" value={stats.totalDocs} icon={<LibraryBooksIcon fontSize="large" />} color="success" />
        </Grid>
      </Grid>

      {/* SECCIÓN DEL GRÁFICO REAL */}
      <Paper elevation={0} sx={{ p: 4, border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Historial de Interacciones
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Suma de actividad en Análisis, Chat y Precalificaciones.
            </Typography>
          </Box>
          
          <ToggleButtonGroup
            color="primary"
            value={daysRange}
            exclusive
            onChange={handleRangeChange}
            size="small"
          >
            <ToggleButton value={7}>Últimos 7 días</ToggleButton>
            <ToggleButton value={30}>Últimos 30 días</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        
        {loadingChart ? (
          <Box sx={{ width: '100%', height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography color="text.secondary">Procesando datos de Firestore...</Typography>
          </Box>
        ) : (
          <Box sx={{ width: '100%' }}>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#666', fontSize: 12 }} 
                    dy={10} 
                    interval={daysRange > 7 ? 4 : 0} 
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666' }} dx={-10} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#333' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                <Line 
                  type="monotone" 
                  name="Interacciones Totales" 
                  dataKey="consultas" 
                  stroke="#1976d2" 
                  strokeWidth={3} 
                  dot={daysRange <= 7} 
                  activeDot={{ r: 6 }} 
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Paper>
    </Box>
  );
}