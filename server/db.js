const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// DB_FILE permite rodar os testes automatizados (npm run test:api) em uma cópia isolada sem alterar o banco real
const IS_TEST_FILE = Boolean(process.env.DB_FILE);
const DB_PATH = process.env.DB_FILE || path.join(__dirname, 'db.json');

const COLECOES = ['usuarios', 'categorias', 'equipamentos', 'chamados', 'historico', 'comentarios', 'tokens', 'redefinicoes'];

const PERFIL_PARA_ID = { cliente: 1, tecnico: 2, admin: 3 };
const ID_PARA_PERFIL = { 1: 'cliente', 2: 'tecnico', 3: 'admin' };

const PRIORIDADE_PARA_ID = { 'Baixa': 1, 'Média': 2, 'Alta': 3, 'Crítica': 4 };
const ID_PARA_PRIORIDADE = { 1: 'Baixa', 2: 'Média', 3: 'Alta', 4: 'Crítica' };

const STATUS_PARA_ID = {
  'ABERTO': 1,
  'EM ANÁLISE': 2,
  'EM ATENDIMENTO': 3,
  'AGUARDANDO USUÁRIO': 4,
  'RESOLVIDO': 5,
  'ENCERRADO': 6,
  'CANCELADO': 7,
};
const ID_PARA_STATUS = {
  1: 'ABERTO',
  2: 'EM ANÁLISE',
  3: 'EM ATENDIMENTO',
  4: 'AGUARDANDO USUÁRIO',
  5: 'RESOLVIDO',
  6: 'ENCERRADO',
  7: 'CANCELADO',
};

let data = null;
let pool = null;
let mysqlAtivo = false;
let sincronizandoEscrita = 0;
let ultimoRefreshMs = 0;
let filaSync = Promise.resolve();

function obterConfigMySQL() {
  if (IS_TEST_FILE || process.env.DISABLE_MYSQL === 'true') return null;

  // As credenciais ficam só no .env (local) ou nas variáveis de ambiente do Render.
  // Sem elas, a API usa o server/db.json.
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_USER || !DB_PASSWORD) {
    console.log('[AIVEN MYSQL] Variáveis DB_HOST, DB_USER e DB_PASSWORD não definidas, usando server/db.json.');
    return null;
  }

  return {
    host: DB_HOST,
    port: Number(DB_PORT || 3306),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME || 'SecureDesk',
    ssl: process.env.DB_SSL === 'false' ? undefined : { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 6,
    queueLimit: 0,
  };
}

function paraDataMySQL(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function paraIso(valor) {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function load() {
  if (!fs.existsSync(DB_PATH)) {
    const seedPath = path.join(__dirname, 'db.seed.json');
    if (fs.existsSync(seedPath)) {
      fs.copyFileSync(seedPath, DB_PATH);
    }
  }
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  data = JSON.parse(raw);

  COLECOES.forEach((colecao) => {
    if (!Array.isArray(data[colecao])) data[colecao] = [];
  });
}

function saveLocal() {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

async function sincronizarParaMySQL(snapshot) {
  if (!pool || !mysqlAtivo) return;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Usuários (batch upsert)
    if (snapshot.usuarios.length > 0) {
      const valoresUsuarios = snapshot.usuarios.map((u) => [
        u.id,
        u.nome,
        u.email,
        u.telefone || null,
        u.senha,
        PERFIL_PARA_ID[u.perfil] || 1,
        u.status || 'Ativo',
      ]);
      await conn.query(
        `INSERT INTO Usuarios (Id, Nome, Email, Telefone, Senha, Perfil_Id, Status)
         VALUES ?
         ON DUPLICATE KEY UPDATE
           Nome = VALUES(Nome),
           Email = VALUES(Email),
           Telefone = VALUES(Telefone),
           Senha = VALUES(Senha),
           Perfil_Id = VALUES(Perfil_Id),
           Status = VALUES(Status)`,
        [valoresUsuarios]
      );
    }

    // 2. Categorias (batch upsert + remoção das excluídas)
    const catIds = snapshot.categorias.map((c) => c.id);
    if (catIds.length > 0) {
      await conn.query(`DELETE FROM Categorias WHERE Id NOT IN (?)`, [catIds]);
      const valoresCategorias = snapshot.categorias.map((c) => [
        c.id,
        c.nome,
        c.descricao || '',
        c.status || 'Ativa',
      ]);
      await conn.query(
        `INSERT INTO Categorias (Id, Nome, Descricao, Status)
         VALUES ?
         ON DUPLICATE KEY UPDATE
           Nome = VALUES(Nome),
           Descricao = VALUES(Descricao),
           Status = VALUES(Status)`,
        [valoresCategorias]
      );
    }

    // 3. Equipamentos (batch upsert)
    if (snapshot.equipamentos.length > 0) {
      const valoresEquipamentos = snapshot.equipamentos.map((e) => [
        e.id,
        e.tipo,
        e.nome,
        e.marca || null,
        e.modelo || null,
        e.patrimonio,
        e.usuarioId || null,
        e.status || 'Ativo',
      ]);
      await conn.query(
        `INSERT INTO Equipamentos (Id, Tipo, Nome, Marca, Modelo, Patrimonio, Usuario_Id, Status)
         VALUES ?
         ON DUPLICATE KEY UPDATE
           Tipo = VALUES(Tipo),
           Nome = VALUES(Nome),
           Marca = VALUES(Marca),
           Modelo = VALUES(Modelo),
           Patrimonio = VALUES(Patrimonio),
           Usuario_Id = VALUES(Usuario_Id),
           Status = VALUES(Status)`,
        [valoresEquipamentos]
      );
    }

    // 4. Chamados (batch upsert + remoção dos excluídos)
    const chamadoIds = snapshot.chamados.map((c) => c.id);
    if (chamadoIds.length > 0) {
      await conn.query(`DELETE FROM Anexos WHERE Chamado_Id NOT IN (?)`, [chamadoIds]);
      await conn.query(`DELETE FROM Comentarios_Chamados WHERE Chamado_Id NOT IN (?)`, [chamadoIds]);
      await conn.query(`DELETE FROM Historico_Chamados WHERE Chamado_Id NOT IN (?)`, [chamadoIds]);
      await conn.query(`DELETE FROM Chamados WHERE Id NOT IN (?)`, [chamadoIds]);

      const agoraSql = paraDataMySQL(new Date().toISOString());
      const valoresChamados = snapshot.chamados.map((c) => [
        c.id,
        c.titulo,
        c.descricao,
        c.solicitanteId,
        c.tecnicoId || null,
        c.categoriaId,
        c.equipamentoId || null,
        PRIORIDADE_PARA_ID[c.prioridade] || 2,
        STATUS_PARA_ID[String(c.status).toUpperCase()] || 1,
        paraDataMySQL(c.dataAbertura) || agoraSql,
        paraDataMySQL(c.dataAtualizacao) || agoraSql,
        paraDataMySQL(c.dataEncerramento),
      ]);

      await conn.query(
        `INSERT INTO Chamados
           (Id, Titulo, Descricao, Solicitante_Id, Tecnico_Id, Categoria_Id, Equipamento_Id, Prioridade_Id, Status_Id, Data_Abertura, Data_Atualizacao, Data_Encerramento)
         VALUES ?
         ON DUPLICATE KEY UPDATE
           Titulo = VALUES(Titulo),
           Descricao = VALUES(Descricao),
           Solicitante_Id = VALUES(Solicitante_Id),
           Tecnico_Id = VALUES(Tecnico_Id),
           Categoria_Id = VALUES(Categoria_Id),
           Equipamento_Id = VALUES(Equipamento_Id),
           Prioridade_Id = VALUES(Prioridade_Id),
           Status_Id = VALUES(Status_Id),
           Data_Atualizacao = VALUES(Data_Atualizacao),
           Data_Encerramento = VALUES(Data_Encerramento)`,
        [valoresChamados]
      );

      const valoresAnexos = [];
      for (const c of snapshot.chamados) {
        if (Array.isArray(c.anexos)) {
          for (const a of c.anexos) {
            valoresAnexos.push([
              a.id,
              c.id,
              a.usuarioId || c.solicitanteId,
              a.nomeOriginal || a.nomeArquivo || 'anexo',
              a.nomeSalvo || a.caminho || '',
              a.tipo || null,
              a.tamanho || 0,
              paraDataMySQL(a.dataUpload) || agoraSql,
            ]);
          }
        }
      }
      if (valoresAnexos.length > 0) {
        await conn.query(
          `INSERT INTO Anexos (Id, Chamado_Id, Usuario_Id, Nome_Arquivo, Caminho_Arquivo, Tipo_Arquivo, Tamanho_Bytes, Data_Upload)
           VALUES ?
           ON DUPLICATE KEY UPDATE
             Nome_Arquivo = VALUES(Nome_Arquivo),
             Caminho_Arquivo = VALUES(Caminho_Arquivo)`,
          [valoresAnexos]
        );
      }
    }

    // 5. Histórico dos chamados (batch upsert)
    if (snapshot.historico.length > 0) {
      const agoraSql = paraDataMySQL(new Date().toISOString());
      const valoresHistorico = snapshot.historico.map((h) => [
        h.id,
        h.chamadoId,
        h.usuarioId,
        h.statusAnterior ? STATUS_PARA_ID[String(h.statusAnterior).toUpperCase()] || null : null,
        STATUS_PARA_ID[String(h.statusNovo).toUpperCase()] || 1,
        h.observacao || '',
        paraDataMySQL(h.dataEvento) || agoraSql,
      ]);
      await conn.query(
        `INSERT INTO Historico_Chamados (Id, Chamado_Id, Usuario_Id, Status_Anterior_Id, Status_Novo_Id, Observacao, Data_Evento)
         VALUES ?
         ON DUPLICATE KEY UPDATE
           Observacao = VALUES(Observacao)`,
        [valoresHistorico]
      );
    }

    // 6. Comentários dos chamados (batch upsert)
    if (snapshot.comentarios.length > 0) {
      const agoraSql = paraDataMySQL(new Date().toISOString());
      const valoresComentarios = snapshot.comentarios.map((cm) => [
        cm.id,
        cm.chamadoId,
        cm.usuarioId,
        cm.comentario,
        paraDataMySQL(cm.dataCriacao) || agoraSql,
      ]);
      await conn.query(
        `INSERT INTO Comentarios_Chamados (Id, Chamado_Id, Usuario_Id, Comentario, Data_Criacao)
         VALUES ?
         ON DUPLICATE KEY UPDATE
           Comentario = VALUES(Comentario)`,
        [valoresComentarios]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.error('[AIVEN MYSQL] Erro ao sincronizar escrita:', err.message);
  } finally {
    conn.release();
  }
}

async function carregarDoMySQL() {
  if (!pool || !mysqlAtivo) return false;

  const [
    [usuariosRows],
    [categoriasRows],
    [equipamentosRows],
    [chamadosRows],
    [historicoRows],
    [comentariosRows],
    [anexosRows],
  ] = await Promise.all([
    pool.query('SELECT Id, Nome, Email, Telefone, Senha, Perfil_Id, Status FROM Usuarios ORDER BY Id'),
    pool.query('SELECT Id, Nome, Descricao, Status FROM Categorias ORDER BY Id'),
    pool.query('SELECT Id, Tipo, Nome, Marca, Modelo, Patrimonio, Usuario_Id, Status FROM Equipamentos ORDER BY Id'),
    pool.query('SELECT Id, Titulo, Descricao, Solicitante_Id, Tecnico_Id, Categoria_Id, Equipamento_Id, Prioridade_Id, Status_Id, Data_Abertura, Data_Atualizacao, Data_Encerramento FROM Chamados ORDER BY Id'),
    pool.query('SELECT Id, Chamado_Id, Usuario_Id, Status_Anterior_Id, Status_Novo_Id, Observacao, Data_Evento FROM Historico_Chamados ORDER BY Id'),
    pool.query('SELECT Id, Chamado_Id, Usuario_Id, Comentario, Data_Criacao FROM Comentarios_Chamados ORDER BY Id'),
    pool.query('SELECT Id, Chamado_Id, Usuario_Id, Nome_Arquivo, Caminho_Arquivo, Tipo_Arquivo, Tamanho_Bytes, Data_Upload FROM Anexos ORDER BY Id'),
  ]);

  const anexosPorChamado = new Map();
  for (const a of anexosRows) {
    if (!anexosPorChamado.has(a.Chamado_Id)) anexosPorChamado.set(a.Chamado_Id, []);
    anexosPorChamado.get(a.Chamado_Id).push({
      id: a.Id,
      usuarioId: a.Usuario_Id,
      nomeOriginal: a.Nome_Arquivo,
      nomeSalvo: a.Caminho_Arquivo,
      tipo: a.Tipo_Arquivo || 'application/octet-stream',
      tamanho: a.Tamanho_Bytes || 0,
      dataUpload: paraIso(a.Data_Upload),
    });
  }

  data.usuarios = usuariosRows.map((u) => ({
    id: u.Id,
    nome: u.Nome,
    email: u.Email,
    telefone: u.Telefone || null,
    senha: u.Senha,
    perfil: ID_PARA_PERFIL[u.Perfil_Id] || 'cliente',
    status: u.Status || 'Ativo',
  }));

  data.categorias = categoriasRows.map((c) => ({
    id: c.Id,
    nome: c.Nome,
    descricao: c.Descricao || '',
    status: c.Status || 'Ativa',
  }));

  data.equipamentos = equipamentosRows.map((e) => ({
    id: e.Id,
    tipo: e.Tipo,
    nome: e.Nome,
    marca: e.Marca || null,
    modelo: e.Modelo || null,
    patrimonio: e.Patrimonio,
    usuarioId: e.Usuario_Id || null,
    status: e.Status || 'Ativo',
  }));

  data.chamados = chamadosRows.map((c) => ({
    id: c.Id,
    titulo: c.Titulo,
    descricao: c.Descricao,
    solicitanteId: c.Solicitante_Id,
    tecnicoId: c.Tecnico_Id || null,
    categoriaId: c.Categoria_Id,
    equipamentoId: c.Equipamento_Id || null,
    prioridade: ID_PARA_PRIORIDADE[c.Prioridade_Id] || 'Média',
    status: ID_PARA_STATUS[c.Status_Id] || 'ABERTO',
    dataAbertura: paraIso(c.Data_Abertura),
    dataAtualizacao: paraIso(c.Data_Atualizacao),
    dataEncerramento: paraIso(c.Data_Encerramento),
    anexos: anexosPorChamado.get(c.Id) || [],
  }));

  data.historico = historicoRows.map((h) => ({
    id: h.Id,
    chamadoId: h.Chamado_Id,
    usuarioId: h.Usuario_Id,
    statusAnterior: h.Status_Anterior_Id ? ID_PARA_STATUS[h.Status_Anterior_Id] || null : null,
    statusNovo: ID_PARA_STATUS[h.Status_Novo_Id] || 'ABERTO',
    observacao: h.Observacao || '',
    dataEvento: paraIso(h.Data_Evento),
  }));

  data.comentarios = comentariosRows.map((cm) => ({
    id: cm.Id,
    chamadoId: cm.Chamado_Id,
    usuarioId: cm.Usuario_Id,
    comentario: cm.Comentario,
    dataCriacao: paraIso(cm.Data_Criacao),
  }));

  ultimoRefreshMs = Date.now();
  saveLocal();
  return true;
}

async function initMySQL() {
  const cfg = obterConfigMySQL();
  if (!cfg) return false;

  try {
    pool = mysql.createPool(cfg);
    await pool.query('SELECT 1');
    mysqlAtivo = true;

    // Se houver usuários criados localmente no db.json que ainda não estão no Aiven, envia antes de carregar
    const [existentes] = await pool.query('SELECT Email FROM Usuarios');
    const emailsNoAiven = new Set(existentes.map((r) => String(r.Email).toLowerCase()));
    const locaisNovos = data.usuarios.filter((u) => !emailsNoAiven.has(String(u.email).toLowerCase()));
    if (locaisNovos.length > 0) {
      await sincronizarParaMySQL(data);
    }

    await carregarDoMySQL();
    console.log(`[AIVEN MYSQL] Conectado com sucesso a ${cfg.host}:${cfg.port}/${cfg.database} (${data.usuarios.length} usuários, ${data.chamados.length} chamados)`);
    return true;
  } catch (err) {
    mysqlAtivo = false;
    console.error('[AIVEN MYSQL] Falha ao conectar, usando cache local server/db.json:', err.message);
    return false;
  }
}

async function refreshFromMySQL(forcar = false) {
  if (!mysqlAtivo || !pool || sincronizandoEscrita > 0) return;
  if (!forcar && Date.now() - ultimoRefreshMs < 1500) return;
  try {
    await carregarDoMySQL();
  } catch (err) {
    console.error('[AIVEN MYSQL] Erro ao atualizar dados do banco:', err.message);
  }
}

function save() {
  saveLocal();
  if (mysqlAtivo && pool) {
    const snapshot = JSON.parse(JSON.stringify(data));
    sincronizandoEscrita++;
    filaSync = filaSync
      .then(() => sincronizarParaMySQL(snapshot))
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
  DB_PATH,
};
