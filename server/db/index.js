const fs = require('fs');
const env = require('../config/env');
const { CONFIGURACOES_PADRAO, ICONES_CATEGORIA_PADRAO } = require('../config/constants');
const { mysql, obterConfigPool, sincronizarSnapshot, lerDadosDoMySQL } = require('./mysql-sync');

const COLECOES = [
  'usuarios',
  'categorias',
  'equipamentos',
  'chamados',
  'historico',
  'comentarios',
  'tokens',
  'redefinicoes',
  'notificacoes',
];

const METADADOS_USUARIOS_SEED = {
  1: { avatarUrl: '/img/avatars/avatar-1.jpg', departamento: 'Financeiro', cargo: 'Analista Financeiro' },
  2: { avatarUrl: '/img/avatars/avatar-2.jpg', departamento: 'Service Desk N2', cargo: 'Analista de Suporte Sênior' },
  3: { avatarUrl: '/img/avatars/avatar-3.jpg', departamento: 'Governança de TI', cargo: 'Coordenador de TI' },
  4: { avatarUrl: '/img/avatars/avatar-4.jpg', departamento: 'Infraestrutura & Redes', cargo: 'Especialista em Infraestrutura' },
  5: { avatarUrl: '/img/avatars/avatar-5.jpg', departamento: 'Marketing', cargo: 'Designer de Produto' },
  6: { avatarUrl: '/img/avatars/avatar-6.jpg', departamento: 'Comercial', cargo: 'Executivo de Contas' },
  7: { avatarUrl: '/img/avatars/avatar-7.jpg', departamento: 'Recursos Humanos', cargo: 'Business Partner de RH' },
  8: { avatarUrl: '/img/avatars/avatar-8.jpg', departamento: 'Fiscal & Faturamento', cargo: 'Analista Fiscal' },
  9: { avatarUrl: '/img/avatars/avatar-9.jpg', departamento: 'Operações', cargo: 'Supervisor de Operações' },
};

let data = null;
let pool = null;
let mysqlAtivo = false;
let sincronizandoEscrita = 0;
let ultimoRefreshMs = 0;
let filaSync = Promise.resolve();

function normalizarEstrutura() {
  COLECOES.forEach((colecao) => {
    if (!Array.isArray(data[colecao])) data[colecao] = [];
  });

  data.configuracoes = {
    ...CONFIGURACOES_PADRAO,
    ...(data.configuracoes || {}),
    slaPorPrioridade: {
      ...CONFIGURACOES_PADRAO.slaPorPrioridade,
      ...(data.configuracoes?.slaPorPrioridade || {}),
    },
    smtp: {
      ...CONFIGURACOES_PADRAO.smtp,
      ...(data.configuracoes?.smtp || {}),
    },
  };

  data.usuarios.forEach((u) => {
    const padrao = METADADOS_USUARIOS_SEED[u.id];
    if (padrao) {
      if (u.avatarUrl === undefined) u.avatarUrl = padrao.avatarUrl;
      if (!u.departamento) u.departamento = padrao.departamento;
      if (!u.cargo) u.cargo = padrao.cargo;
    } else {
      if (u.avatarUrl === undefined) u.avatarUrl = null;
      if (u.departamento === undefined) u.departamento = null;
      if (u.cargo === undefined) u.cargo = null;
    }
  });

  data.categorias.forEach((c) => {
    if (!c.icone) c.icone = ICONES_CATEGORIA_PADRAO[c.nome] || 'ti-tag';
    if (!c.slaHoras) c.slaHoras = 24;
  });
}

function load() {
  if (!fs.existsSync(env.DB_PATH) && fs.existsSync(env.SEED_PATH)) {
    fs.copyFileSync(env.SEED_PATH, env.DB_PATH);
  }
  const raw = fs.readFileSync(env.DB_PATH, 'utf-8');
  data = JSON.parse(raw);
  normalizarEstrutura();
}

function saveLocal() {
  fs.writeFileSync(env.DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

async function carregarDoMySQL() {
  if (!pool || !mysqlAtivo) return false;
  await lerDadosDoMySQL(pool, data);
  normalizarEstrutura();
  ultimoRefreshMs = Date.now();
  saveLocal();
  return true;
}

async function initMySQL() {
  const cfg = obterConfigPool();
  if (!cfg) return false;

  try {
    pool = mysql.createPool(cfg);
    await pool.query('SELECT 1');
    mysqlAtivo = true;

    const [existentes] = await pool.query('SELECT Email FROM Usuarios');
    const emailsNoBanco = new Set(existentes.map((r) => String(r.Email).toLowerCase()));
    const locaisNovos = data.usuarios.filter((u) => !emailsNoBanco.has(String(u.email).toLowerCase()));
    if (locaisNovos.length > 0) {
      await sincronizarSnapshot(pool, data);
    }

    await carregarDoMySQL();
    console.log(
      `[MYSQL] Conectado a ${cfg.host}:${cfg.port}/${cfg.database} (${data.usuarios.length} usuários, ${data.chamados.length} chamados)`
    );
    return true;
  } catch (err) {
    mysqlAtivo = false;
    console.error('[MYSQL] Falha ao conectar, usando cache local server/db.json:', err.message);
    return false;
  }
}

async function refreshFromMySQL(forcar = false) {
  if (!mysqlAtivo || !pool || sincronizandoEscrita > 0) return;
  if (!forcar && Date.now() - ultimoRefreshMs < 1500) return;
  try {
    await carregarDoMySQL();
  } catch (err) {
    console.error('[MYSQL] Erro ao atualizar leitura:', err.message);
  }
}

function save() {
  saveLocal();
  if (mysqlAtivo && pool) {
    const snapshot = JSON.parse(JSON.stringify(data));
    sincronizandoEscrita++;
    filaSync = filaSync
      .then(() => sincronizarSnapshot(pool, snapshot))
      .finally(() => {
        sincronizandoEscrita = Math.max(0, sincronizandoEscrita - 1);
        ultimoRefreshMs = Date.now();
      });
  }
}

function waitForSync() {
  return filaSync;
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
  get mysqlAtivo() {
    return mysqlAtivo;
  },
  save,
  nextId,
  load,
  initMySQL,
  refreshFromMySQL,
  waitForSync,
  DB_PATH: env.DB_PATH,
};
