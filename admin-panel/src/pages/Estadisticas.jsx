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
  Paper
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import PeopleIcon from '@mui/icons-material/People';
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
  const [error, setError] = useState(null);
  
  // Estado para las tarjetas superiores
  const [stats, setStats] = useState({
    totalChunks: 0,
    totalAdmins: 0,
    totalAnalisis: 0,
    totalConversaciones: 0,
    totalPrecalificaciones: 0
  });

  // Estado para el gráfico lineal
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // ====================================================================
        // 1. CARGA DE TOTALES GLOBALES (Tarjetas)
        // ====================================================================
        const kbCol = collection(db, 'pida_kb_genai-v20');
        const adminsCol = collection(db, 'admins');
        const analysisCol = collection(db, 'analysis_history');
        const convGroup = collectionGroup(db, 'conversations');
        const prequalGroup = collectionGroup(db, 'prequalifications');

        // Ejecutamos las 5 consultas generales al mismo tiempo para mayor velocidad
        const [kbSnap, adminsSnap, analysisSnap, convSnap, prequalSnap] = await Promise.all([
          getCountFromServer(kbCol),
          getCountFromServer(adminsCol),
          getCountFromServer(analysisCol),
          getCountFromServer(convGroup),
          getCountFromServer(prequalGroup)
        ]);

        setStats({
          totalChunks: kbSnap.data().count,
          totalAdmins: adminsSnap.data().count,
          totalAnalisis: analysisSnap.data().count,
          totalConversaciones: convSnap.data().count,
          totalPrecalificaciones: prequalSnap.data().count
        });

        // ====================================================================
        // 2. CARGA DEL HISTORIAL DE 7 DÍAS (Gráfico)
        // ====================================================================
        const last7Days = [];
        const today = new Date();
        
        // Generar los rangos de fecha de los últimos 7 días (0 = hoy, 6 = hace seis días)
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          
          const startOfDay = new Date(d);
          startOfDay.setHours(0, 0, 0, 0);
          
          const endOfDay = new Date(d);
          endOfDay.setHours(23, 59, 59, 999);

          // Sacar el nombre del día en español (ej. 'lun', 'mar') y capitalizarlo
          const dayName = new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(d);
          const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1).replace('.', '');

          last7Days.push({ 
            startOfDay: Timestamp.fromDate(startOfDay), 
            endOfDay: Timestamp.fromDate(endOfDay), 
            name: capitalizedDayName 
          });
        }

        // Consultar cada día de forma concurrente
        const chartDataResult = await Promise.all(last7Days.map(async (day) => {
          // El campo de fecha es 'timestamp' en analysis_history y 'created_at' en los otros dos
          const qAnalysis = query(analysisCol, where('timestamp', '>=', day.startOfDay), where('timestamp', '<=', day.endOfDay));
          const qChat = query(convGroup, where('created_at', '>=', day.startOfDay), where('created_at', '<=', day.endOfDay));
          const qPrequal = query(prequalGroup, where('created_at', '>=', day.startOfDay), where('created_at', '<=', day.endOfDay));

          const [snapAnalysisDay, snapChatDay, snapPrequalDay] = await Promise.all([
            getCountFromServer(qAnalysis),
            getCountFromServer(qChat),
            getCountFromServer(qPrequal)
          ]);

          // Sumamos todas las interacciones de los 3 servicios en ese día específico
          const totalDia = snapAnalysisDay.data().count + snapChatDay.data().count + snapPrequalDay.data().count;

          return {
            name: day.name,
            consultas: totalDia
          };
        }));

        setChartData(chartDataResult);

      } catch (err) {
        console.error("Error obteniendo estadísticas:", err);
        setError('Error al cargar datos. Si es la primera vez, abre la consola (F12) y haz clic en los enlaces azules para crear los índices en Firestore.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

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
            {loading ? <CircularProgress size={24} sx={{ mt: 1 }} /> : value}
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

      {/* FILA DE TARJETAS DE RESUMEN */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Total Chunks (KB)" 
            value={stats.totalChunks} 
            icon={<StorageIcon fontSize="large" />} 
            color="primary" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Análisis Generados" 
            value={stats.totalAnalisis} 
            icon={<DescriptionIcon fontSize="large" />} 
            color="warning" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Administradores" 
            value={stats.totalAdmins} 
            icon={<PeopleIcon fontSize="large" />} 
            color="success" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <StatCard 
            title="Conversaciones (Chat)" 
            value={stats.totalConversaciones} 
            icon={<ForumIcon fontSize="large" />} 
            color="info" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <StatCard 
            title="Precalificaciones" 
            value={stats.totalPrecalificaciones} 
            icon={<FactCheckIcon fontSize="large" />} 
            color="secondary" 
          />
        </Grid>
      </Grid>

      {/* SECCIÓN DEL GRÁFICO REAL */}
      <Paper elevation={0} sx={{ p: 4, border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Historial de Interacciones (Últimos 7 días)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Suma de interacciones de Análisis, Chat y Precalificaciones extraída en tiempo real de Firestore.
        </Typography>
        
        {loading && chartData.length === 0 ? (
          <Box sx={{ width: '100%', height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ width: '100%' }}>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666' }} dy={10} />
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
                  activeDot={{ r: 8 }} 
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Paper>
    </Box>
  );
}