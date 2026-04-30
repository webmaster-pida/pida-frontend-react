import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getCountFromServer } from 'firebase/firestore';
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
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import PeopleIcon from '@mui/icons-material/People';
import StorageIcon from '@mui/icons-material/Storage';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

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
    totalDocs: 0,
    totalAdmins: 0,
    // totalChunks: 0 // Lo dejaremos preparado para cuando sepamos la colección exacta de chunks
  });

  // Datos simulados (Mock Data) para el gráfico de uso semanal.
  // En el futuro, esto se llenará con datos reales de Firestore.
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
        // Consultas de Agregación (getCountFromServer):
        // Son extremadamente baratas en Firebase (1 lectura por cada 1000 conteos)
        
        // 1. Contar documentos en la biblioteca
        const docsCol = collection(db, 'pida_kb_genai-v20');
        const docsSnapshot = await getCountFromServer(docsCol);
        const docsCount = docsSnapshot.data().count;

        // 2. Contar administradores autorizados
        const adminsCol = collection(db, 'admins');
        const adminsSnapshot = await getCountFromServer(adminsCol);
        const adminsCount = adminsSnapshot.data().count;

        // Actualizamos el estado con los totales reales
        setStats({
          totalDocs: docsCount,
          totalAdmins: adminsCount,
        });

      } catch (err) {
        console.error("Error obteniendo estadísticas:", err);
        setError('No se pudieron cargar las estadísticas. Verifica tus permisos o conexión.');
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

      {/* FILA DE TARJETAS DE RESUMEN */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Documentos Base" 
            value={stats.totalDocs} 
            icon={<LibraryBooksIcon fontSize="large" />} 
            color="primary" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Administradores" 
            value={stats.totalAdmins} 
            icon={<PeopleIcon fontSize="large" />} 
            color="success" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total Chunks" 
            value="---" // Placeholder temporal
            icon={<StorageIcon fontSize="large" />} 
            color="warning" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Consultas Totales" 
            value="151" // Placeholder temporal basado en la suma del mockData
            icon={<TrendingUpIcon fontSize="large" />} 
            color="info" 
          />
        </Grid>
      </Grid>

      {/* SECCIÓN DEL GRÁFICO */}
      <Paper elevation={0} sx={{ p: 4, border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Historial de Consultas a la IA (Últimos 7 días)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Métrica de uso basada en las interacciones de los usuarios finales con la aplicación principal.
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