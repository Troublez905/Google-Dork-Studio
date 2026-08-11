const fs = require('fs');
const path = require('path');
const saved = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'saved-queries.json'), 'utf8')||'[]');
fs.writeFileSync(path.join(process.cwd(), 'saved-queries-export.json'), JSON.stringify(saved, null, 2), 'utf8');
console.log('Exported saved queries to saved-queries-export.json');
