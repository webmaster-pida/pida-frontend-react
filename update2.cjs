const fs = require('fs');
const file = 'c:/Users/durquilla/Documentos/PROYECTOS DESARROLLO/PIDA_FRONTEND_REACT/pida-frontend-react/src/pages/LandingPage.jsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('onClick=x() =>', 'onClick={() =>');
fs.writeFileSync(file, content);
console.log('Typo fixed');
