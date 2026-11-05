const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

let data = null;

function load() {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  data = JSON.parse(raw);
}

function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function nextId(colecao) {
  if (!data[colecao] || data[colecao].length === 0) return 1;
  return Math.max(...data[colecao].map((item) => item.id)) + 1;
}

load();

module.exports = { data, save, nextId, load };
