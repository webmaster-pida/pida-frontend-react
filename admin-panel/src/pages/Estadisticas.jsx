import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, collectionGroup, getCountFromServer } from 'firebase/firestore';
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
  const [stats, setStats] = useState({
    totalChunks: 0,
    totalAdmins: 0,
    totalAnalisis: 0,
    totalConversaciones: 0,
    totalPrecalificaciones: 0
  });

  // Datos simulados (Mock Data) para el gráfico de uso semanal.
  // Nota: Para hacer este gráfico real sin gastar lecturas masivas, 
  // se recomienda crear un "contador agregado" por día en Firestore en el futuro.
  const chartData = [
    { name: 'Lun', consultas: 12 },
    { name: 'Mar', consultas: 19 },
    { name: 'Mié', consultas: 15 },
    { name: 'Jue', consultas: 25 },
    { name: 'Vie', consultas: 22 },
    { name: 'Sáb', consultas: 30 },
    { name: 'Dom', consultas: 28 },
  ];

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Contar Chunks / Vectores en la base de conocimientos
        const kbCol = collection(db, 'pida_kb_genai-v20');
        const kbSnapshot = await getCountFromServer(kbCol);
        const chunksCount = kbSnapshot.data().count;

        // 2. Contar administradores autorizados
        const adminsCol = collection(db, 'admins');
        const adminsSnapshot = await getCountFromServer(adminsCol);
        const adminsCount = adminsSnapshot.data().count;

        // 3. Contar el historial de Análisis de Documentos
        const analysisCol = collection(db, 'analysis_history');
        const analysisSnapshot = await getCountFromServer(analysisCol);
        const analysisCount = analysisSnapshot.data().count;

        // 4. Contar Conversaciones (Chat) en toda la base de datos
        // Usamos collectionGroup porque 'conversations' es una subcolección de 'users'
        const convGroup = collectionGroup(db, 'conversations');
        const convSnapshot = await getCountFromServer(convGroup);
        const conversacionesCount = convSnapshot.data().count;

        // 5. Contar Precalificaciones en toda la base de datos
        // Usamos collectionGroup porque 'prequalifications' es una subcolección de 'users'
        const prequalGroup = collectionGroup(db, 'prequalifications');
        const prequalSnapshot = await getCountFromServer(prequalGroup);
        const prequalificacionesCount = prequalSnapshot.data().count;

        // Actualizamos el estado con los totales reales
        setStats({
          totalChunks: chunksCount,
          totalAdmins: adminsCount,
          totalAnalisis: analysisCount,
          totalConversaciones: conversacionesCount,
          totalPrecalificaciones: prequalificacionesCount
        });

      } catch (err) {
        console.error("Error obteniendo estadísticas:", err);
        setError('No se pudieron cargar las estadísticas. Verifica tus permisos en las reglas de Firestore.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Componente auxiliar para las Tarjetas (Cards) superiores
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

      {/* FILA DE TARJETAS DE RESUMEN (Ajustado para 5 tarjetas: 3 arriba, 2 abajo) */}
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

      {/* SECCIÓN DEL GRÁFICO */}
      <Paper elevation={0} sx={{ p: 4, border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Historial de Interacciones (Últimos 7 días)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Métrica de uso basada en la actividad reciente de los usuarios. (Datos de muestra visual).
        </Typography>
        
        <Box sx={{ width: '100%', height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666' }} dx={-10} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }}/>
              <Line 
                type="monotone" 
                name="Consultas" 
                dataKey="consultas" 
                stroke="#1976d2" 
                strokeWidth={3} 
                activeDot={{ r: 8 }} 
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Box>
  );
}