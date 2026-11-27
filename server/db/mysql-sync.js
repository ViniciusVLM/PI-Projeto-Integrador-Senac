const mysql = require('mysql2/promise');
const env = require('../config/env');
const { ICONES_CATEGORIA_PADRAO } = require('../config/constants');

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

function obterConfigPool() {
  if (env.mysql.disabled) return null;

  const { host, port, user, password, database, ssl } = env.mysql;
  if (!host || !user || !password) {
    console.log('[MYSQL] Variáveis DB_HOST, DB_USER e DB_PASSWORD não definidas — operando com server/db.json.');
    return null;
  }

  return {
    host,
    port,
    user,
    password,
    database,
    ssl,
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

async function sincronizarSnapshot(pool, snapshot) {
  if (!pool) return;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

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

    const catIds = snapshot.categorias.map((c) => c.id);
    if (catIds.length > 0) {
      await conn.query('DELETE FROM Categorias WHERE Id NOT IN (?)', [catIds]);
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

    const chamadoIds = snapshot.chamados.map((c) => c.id);
    if (chamadoIds.length > 0) {
      await conn.query('DELETE FROM Anexos WHERE Chamado_Id NOT IN (?)', [chamadoIds]);
      await conn.query('DELETE FROM Comentarios_Chamados WHERE Chamado_Id NOT IN (?)', [chamadoIds]);
      await conn.query('DELETE FROM Historico_Chamados WHERE Chamado_Id NOT IN (?)', [chamadoIds]);
      await conn.query('DELETE FROM Chamados WHERE Id NOT IN (?)', [chamadoIds]);

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
              a.arquivo || a.nomeSalvo || a.caminho || '',
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
    console.error('[MYSQL] Erro ao sincronizar escrita:', err.message);
  } finally {
    conn.release();
  }
}

async function lerDadosDoMySQL(pool, estadoAtual) {
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

  // Preserva metadados estendidos locais (ex.: avatarUrl, departamento, avaliação, notas internas) quando o schema SQL básico não tem essas colunas
  const usuariosLocaisPorId = new Map((estadoAtual.usuarios || []).map((u) => [u.id, u]));
  const categoriasLocaisPorId = new Map((estadoAtual.categorias || []).map((c) => [c.id, c]));
  const equipamentosLocaisPorId = new Map((estadoAtual.equipamentos || []).map((e) => [e.id, e]));
  const chamadosLocaisPorId = new Map((estadoAtual.chamados || []).map((c) => [c.id, c]));
  const comentariosLocaisPorId = new Map((estadoAtual.comentarios || []).map((cm) => [cm.id, cm]));

  const anexosPorChamado = new Map();
  for (const a of anexosRows) {
    if (!anexosPorChamado.has(a.Chamado_Id)) anexosPorChamado.set(a.Chamado_Id, []);
    anexosPorChamado.get(a.Chamado_Id).push({
      id: a.Id,
      usuarioId: a.Usuario_Id,
      nomeOriginal: a.Nome_Arquivo,
      arquivo: a.Caminho_Arquivo,
      nomeSalvo: a.Caminho_Arquivo,
      tipo: a.Tipo_Arquivo || 'application/octet-stream',
      tamanho: a.Tamanho_Bytes || 0,
      dataUpload: paraIso(a.Data_Upload),
    });
  }

  estadoAtual.usuarios = usuariosRows.map((u) => {
    const local = usuariosLocaisPorId.get(u.Id) || {};
    return {
      ...local,
      id: u.Id,
      nome: u.Nome,
      email: u.Email,
      telefone: u.Telefone || null,
      senha: u.Senha,
      perfil: ID_PARA_PERFIL[u.Perfil_Id] || 'cliente',
      status: u.Status || 'Ativo',
      avatarUrl: local.avatarUrl ?? (u.Id <= 9 ? `/img/avatars/avatar-${u.Id}.jpg` : null),
      departamento: local.departamento ?? null,
      cargo: local.cargo ?? null,
    };
  });

  estadoAtual.categorias = categoriasRows.map((c) => {
    const local = categoriasLocaisPorId.get(c.Id) || {};
    return {
      ...local,
      id: c.Id,
      nome: c.Nome,
      descricao: c.Descricao || '',
      status: c.Status || 'Ativa',
      icone: local.icone || ICONES_CATEGORIA_PADRAO[c.Nome] || 'ti-tag',
      slaHoras: local.slaHoras || 24,
    };
  });

  estadoAtual.equipamentos = equipamentosRows.map((e) => {
    const local = equipamentosLocaisPorId.get(e.Id) || {};
    return {
      ...local,
      id: e.Id,
      tipo: e.Tipo,
      nome: e.Nome,
      marca: e.Marca || null,
      modelo: e.Modelo || null,
      patrimonio: e.Patrimonio,
      usuarioId: e.Usuario_Id || null,
      status: e.Status || 'Ativo',
    };
  });

  estadoAtual.chamados = chamadosRows.map((c) => {
    const local = chamadosLocaisPorId.get(c.Id) || {};
    return {
      ...local,
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
      avaliacao: local.avaliacao || null,
    };
  });

  estadoAtual.historico = historicoRows.map((h) => ({
    id: h.Id,
    chamadoId: h.Chamado_Id,
    usuarioId: h.Usuario_Id,
    statusAnterior: h.Status_Anterior_Id ? ID_PARA_STATUS[h.Status_Anterior_Id] || null : null,
    statusNovo: ID_PARA_STATUS[h.Status_Novo_Id] || 'ABERTO',
    observacao: h.Observacao || '',
    dataEvento: paraIso(h.Data_Evento),
  }));

  estadoAtual.comentarios = comentariosRows.map((cm) => {
    const local = comentariosLocaisPorId.get(cm.Id) || {};
    return {
      id: cm.Id,
      chamadoId: cm.Chamado_Id,
      usuarioId: cm.Usuario_Id,
      comentario: cm.Comentario,
      interno: Boolean(local.interno),
      dataCriacao: paraIso(cm.Data_Criacao),
    };
  });
}

module.exports = {
  mysql,
  obterConfigPool,
  sincronizarSnapshot,
  lerDadosDoMySQL,
};
