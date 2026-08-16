const fs = require('fs');
const file = 'c:/Users/durquilla/Documentos/PROYECTOS DESARROLLO/PIDA_FRONTEND_REACT/pida-frontend-react/src/pages/LandingPage.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    "bgcolor: 'var(--navy)', color: 'white'", 
    "bgcolor: 'white', color: '#4caf50', border: '1px solid #4caf50'"
);

content = content.replace(
    "<strong>$9.99/mes</strong>", 
    "<strong>$9.99 USD ($199 MXN)/mes</strong>"
);

fs.writeFileSync(file, content);
console.log('Update complete');