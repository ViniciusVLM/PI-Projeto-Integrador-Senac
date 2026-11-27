const db = require('../db');
const { STATUS_CATEGORIA, STATUS_FINALIZADOS, ICONES_CATEGORIA_PADRAO } = require('../config/constants');
const { paraInteiro, texto } = require('../utils/formatar');

function comTotal(categoria) {
  const chamadosDaCategoria = db.data.chamados.filter((c) => c.categoriaId === categoria.id);
  const chamadosAtivos = chamadosDaCategoria.filter((c) => !STATUS_FINALIZADOS.includes(c.status)).length;
  return {
    ...categoria,
    icone: categoria.icone || ICONES_CATEGORIA_PADRAO[categoria.nome] || 'ti-tag',
    slaHoras: categoria.slaHoras || 24,
    totalChamados: chamadosDaCategoria.length,
    chamadosAtivos,
  };
}

function listar(req, res) {
  const { status, busca } = req.query;
  let resultado = db.data.categorias;
  if (status) {
    resultado = resultado.filter((c) => c.status.toLowerCase() === String(status).toLowerCase());
  }
  if (busca) {
    const termo = String(busca).trim().toLowerCase();
    resultado = resultado.filter(
      (c) => c.nome.toLowerCase().includes(termo) || (c.descricao || '').toLowerCase().includes(termo)
    );
  }
  return res.json(resultado.map(comTotal));
}

function obterPorId(req, res) {
  const id = paraInteiro(req.params.id);
  const cat = db.data.categorias.find((c) => c.id === id);
  if (!cat) return res.status(404).json({ erro: 'Categoria não encontrada.' });
  return res.json(comTotal(cat));
}

function criar(req, res) {
  const nome = texto(req.body.nome);
  const descricao = texto(req.body.descricao);
  const icone = texto(req.body.icone) || ICONES_CATEGORIA_PADRAO[nome] || 'ti-tag';
  const slaHoras = paraInteiro(req.body.slaHoras) || 24;

  if (!nome) return res.status(400).json({ erro: 'Nome da categoria é obrigatório.' });

  const dup = db.data.categorias.find((c) => c.nome.toLowerCase() === nome.toLowerCase());
  if (dup) return res.status(409).json({ erro: 'Já existe uma categoria com este nome.' });

  const nova = {
    id: db.nextId('categorias'),
    nome,
    descricao: descricao ?? '',
    icone,
    slaHoras: Math.max(1, Math.min(168, slaHoras)),
    status: 'Ativa',
  };

  db.data.categorias.push(nova);
  db.save();
  return res.status(201).json(comTotal(nova));
}

function atualizar(req, res) {
  const id = paraInteiro(req.params.id);
  const categoria = db.data.categorias.find((c) => c.id === id);
  if (!categoria) return res.status(404).json({ erro: 'Categoria não encontrada.' });

  const nome = req.body.nome !== undefined ? texto(req.body.nome) : undefined;
  const descricao = req.body.descricao !== undefined ? texto(req.body.descricao) : undefined;
  const { status } = req.body;

  if (nome !== undefined && !nome) {
    return res.status(400).json({ erro: 'O nome não pode ficar vazio.' });
  }
  if (status !== undefined && !STATUS_CATEGORIA.includes(status)) {
    return res.status(400).json({ erro: `Status inválido. Use: ${STATUS_CATEGORIA.join(', ')}` });
  }

  if (nome) {
    const dup = db.data.categorias.find(
      (c) => c.nome.toLowerCase() === nome.toLowerCase() && c.id !== id
    );
    if (dup) return res.status(409).json({ erro: 'Já existe uma categoria com este nome.' });
    categoria.nome = nome;
  }
  if (descricao !== undefined) categoria.descricao = descricao;
  if (req.body.icone !== undefined) categoria.icone = texto(req.body.icone) || 'ti-tag';
  if (req.body.slaHoras !== undefined) {
    const sla = paraInteiro(req.body.slaHoras);
    if (sla && sla >= 1 && sla <= 168) categoria.slaHoras = sla;
  }
  if (status) categoria.status = status;

  db.save();
  return res.json(comTotal(categoria));
}

function remover(req, res) {
  const id = paraInteiro(req.params.id);
  const idx = db.data.categorias.findIndex((c) => c.id === id);
  if (idx === -1) return res.status(404).json({ erro: 'Categoria não encontrada.' });

  const emUso = db.data.chamados.some((c) => c.categoriaId === id);
  if (emUso) {
    db.data.categorias[idx].status = 'Inativa';
    db.save();
    return res.json({ mensagem: 'Categoria em uso por chamados: ela foi inativada em vez de removida.' });
  }

  db.data.categorias.splice(idx, 1);
  db.save();
  return res.json({ mensagem: 'Categoria removida com sucesso.' });
}

module.exports = {
  listar,
  obterPorId,
  criar,
  atualizar,
  remover,
};
