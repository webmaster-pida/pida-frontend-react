const fs = require('fs');
const file = 'c:/Users/durquilla/Documentos/PROYECTOS DESARROLLO/PIDA_FRONTEND_REACT/pida-frontend-react/src/pages/LandingPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const newModal = `    <Dialog \n
        open={limitReached} \n
        onClose={() => setLimitReached(false)}\n
        PaperProps={{ sx: { borderRadius: '24px', p: { xs: 2, sm: 3 }, textAlign: 'center', maxWidth: '420px', backgroundColor: '#ffffff' } }}\n
      >\n
        <DialogTitle sx={{ pt: 2, pb: 1 }}>\n
          <Typography variant="h5" fontWeight="800" color="var(--navy)" sx={{ lineHeight: 1.2 }}>\n
            Ya viste de qué es capaz PIDA\n
          </Typography>\n
        </DialogTitle>\n
        <DialogContent sx={{ pb: 3, pt: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>\n
          \n
          <Box sx={{ bgcolor: 'var(--navy)', color: 'white', px: 2, py: 0.5, borderRadius: '999px', display: 'inline-block', mb: 2.5, fontWeight: '600', fontSize: '0.85rem' }}>\n
            5 días de prueba gratis\n
          </Box>\n
          \n
          <Typography variant="body1" sx={{ color: '#475569', mb: 3, lineHeight: 1.5 }}>\n
            Sigue disfrutando sin restricciones — planes desde <strong>$9.99/mes</strong>.\n
          </Typography>\n
          \n
          <Button \n
            variant="contained" \n
            fullWidth\n
            onClick={() => { setLimitReached(false); handleUnlock(); }} \n
            sx={{ bgcolor: 'var(--red)', color: 'white', fontWeight: 'bold', textTransform: 'none', py: 1.5, mb: 2, borderRadius: '12px', fontSize: '1rem', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)', '&:hover': { bgcolor: '#be123c' } }}\n
          >\n
            Empezar prueba gratis\n
          </Button>\n

          <Typography variant="body2" sx={{ color: '#64748B', fontSize: '0.85rem' }}>\n
            o <span style={{ textDecoration: 'underline', cursor: 'pointer', color: 'var(--navy)', fontWeight: '600' }} onClick=x() => setLimitReached(false)}>vuelve mañana</span> por más consultas gratis\n
          </Typography>\n
          \n
        </DialogContent>\n
      </Dialog>`;

const startStr = "<Dialog";
const openLimitReached = "open={limitReached}";
let startIndex = content.indexOf(openLimitReached);
if (startIndex !== -1) {
    startIndex = content.lastIndexOf(startStr, startIndex);
    if (startIndex !== -1) {
        let endIndex = content.indexOf("</Dialog>", startIndex);
        if (endIndex !== -1) {
            endIndex += "</Dialog>".length;
            content = content.substring(0, startIndex) + newModal + content.substring(endIndex);
            fs.writeFileSync(file, content);
            console.log('Modal replaced successfully by indices.');
        }
    }
}
