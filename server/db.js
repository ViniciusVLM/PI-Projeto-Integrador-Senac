const fs = require('fs');
const path = require('path');

// DB_FILE permite rodar os testes em uma cópia do banco, sem mexer no db.json
const DB_PATH = process.env.DB_FILE || path.join(__dirname, 'db.json');

const COLECOES = ['usuarios', 'categorias', 'equipamentos', 'chamados', 'historico', 'comentarios', 'tokens', 'redefinicoes'];

let data = null;

function load() {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  data = JSON.parse(raw);

  COLECOES.forEach((colecao) => {
    if (!Array.isArray(data[colecao])) data[colecao] = [];
  });
}

function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function nextId(colecao) {
  if (!data[colecao] || data[colecao].length === 0) return 1;
  return Math.max(...data[colecao].map((item) => item.id)) + 1;
}

load();

module.exports = {
  get data() {
    return data;
  },
  save,
  nextId,
  load,
  DB_PATH,
};
