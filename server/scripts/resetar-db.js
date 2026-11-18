// Volta o server/db.json para os dados iniciais (server/db.seed.json).
// Uso: npm run db:reset
const fs = require('fs');
const path = require('path');

const origem = path.join(__dirname, '..', 'db.seed.json');
const destino = path.join(__dirname, '..', 'db.json');

fs.copyFileSync(origem, destino);
console.log('Banco restaurado com os dados iniciais (server/db.seed.json).');
console.log('Usuários de teste: senha 123456 para todos.');
