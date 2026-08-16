const fs = require('fs');
const file = 'c:/Users/durquilla/Documentos/PROYECTOS DESARROLLO/PIDA_FRONTEND_REACT/pida-frontend-react/src/pages/LandingPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldModal = `      <Dialog 
        open={limitReached} 
        onClose={() => setLimitReached(false)}
        PaperProps={{ sx: { borderRadius: '16px', p: { xs: 1, sm: 2 }, textAlign: 'center', maxWidth: '420px' } }}
      >
        <DialogTitle sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, pb: 1 }}>
          <LockIcon sx={{ fontSize: 48, color: 'var(--red)' }} />
          <Typography variant="h6" fontWeight="bold" color="var(--navy)">Límite Alcanzado</Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          <Typography variant="body2" sx={{ color: '#64748B', mb: 3, lineHeight: 1.6 }}>
            Has alcanzado el límite de consultas anónimas gratuitas por el día de hoy. Inicia tu prueba de 5 días para continuar conversando con PIDA sin restricciones.
          </Typography>
          <Button 
            variant="contained" 
            fullWidth
            onClick={() => { setLimitReached(false); handleUnlock(); }} 
            sx={{ bgcolor: 'var(--red)', color: 'white', fontWeight: 'bold', textTransform: 'none', py: 1.5, borderRadius: '8px', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)', '&:hover': { bgcolor: '#be123c' } }}
          >
            Ver planes y suscribirme
          </Button>
        </DialogContent>
      </Dialog>`;

const newModal = `      <Dialog 
        open={limitReached} 
        onClose={() => setLimitReached(false)}
        PaperProps={{ sx: { borderRadius: '24px', p: { xs: 2, sm: 3 }, textAlign: 'center', maxWidth: '420px', backgroundColor: '#ffffff' } }}
      >
        <DialogTitle sx={{ pt: 2, pb: 1 }}>
          <Typography variant="h5" fontWeight="800" color="var(--navy)" sx={{ lineHeight: 1.2 }}>
            Ya viste de qué es capaz PIDA
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: 3, pt: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          <Box sx={{ bgcolor: 'var(--navy)', color: 'white', px: 2, py: 0.5, borderRadius: '999px', display: 'inline-block', mb: 2.5, fontWeight: '600', fontSize: '0.85rem' }}>
            5 días de prueba gratis
          </Box>
          
          <Typography variant="body1" sx={{ color: '#475569', mb: 3, lineHeight: 1.5 }}>
            Sigue disfrutando sin restricciones — planes desde <strong>$9.99/mes</strong>.
          </Typography>
          
          <Button 
            variant="contained" 
            fullWidth
            onClick={() => { setLimitReached(false); handleUnlock(); }} 
            sx={{ bgcolor: 'var(--red)', color: 'white', fontWeight: 'bold', textTransform: 'none', py: 1.5, mb: 2, borderRadius: '12px', fontSize: '1rem', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)', '&:hover': { bgcolor: '#be123c' } }}
          >
            Empezar prueba gratis
          </Button>

          <Typography variant="body2" sx={{ color: '#64748B', fontSize: '0.85rem' }}>
            o <span style={{ textDecoration: 'underline', cursor: 'pointer', color: 'var(--navy)', fontWeight: '600' }} onClick={() => setLimitReached(false)}>vuelve mañana</span> por más consultas gratis
          </Typography>
          
        </DialogContent>
      </Dialog>`;

if (content.includes(oldModal)) {
    content = content.replace(oldModal, newModal);
    fs.writeFileSync(file, content);
    console.log('Modal replaced successfully.');
} else {
    console.error('Could not find the exact old modal string in the file.');
}
