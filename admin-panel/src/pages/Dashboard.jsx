import React from 'react';
import { Typography, Container, Grid, Paper } from '@mui/material';

export default function Dashboard() {
  const cards = [
    { label: 'Libros en Firestore', value: '12', color: '#1976d2' },
    { label: 'Chunks Totales', value: '15,420', color: '#388e3c' },
    { label: 'Consultas IA', value: '450', color: '#f57c00' }
  ];

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: '#333' }}>
        Panel de Control
      </Typography>

      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid item xs={12} md={4} key={card.label}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">{card.label}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: card.color }}>{card.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}