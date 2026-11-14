const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { permitir } = require('../middleware/auth');
const { paraInteiro, texto } = require('../utils/formatar');

const router = express.Router();

const STATUS_VALIDOS = ['Ativa', 'Inativa'];

function comTotal(categoria) {
  const totalChamados = db.data.chamados.filter((c) => c.categoriaId === categoria.id).length;
  return { ...categoria, totalChamados };
}

router.get('/', authMiddleware, (req, res) => {
  const { status } = req.query;
  let resultado = db.data.categorias;
  if (status) {
    resultado = resultado.filter((c) => c.status.toLowerCase() === String(status).toLowerCase());
  }
  return res.json(resultado.map(comTotal));
});

router.get('/:id', authMiddleware, (req, res) => {
  const id = paraInteiro(req.params.id);
  const cat = db.data.categorias.find((c) => c.id === id);
  if (!cat) return res.status(404).json({ erro: 'Categoria não encontrada.' });
  return res.json(comTotal(cat));
});

router.post('/', authMiddleware, permitir('admin'), (req, res) => {
  const nome = texto(req.body.nome);
  const descricao = texto(req.body.descricao);

  if (!nome) return res.status(400).json({ erro: 'Nome da categoria é obrigatório.' });

  const dup = db.data.categorias.find((c) => c.nome.toLowerCase() === nome.toLowerCase());
  if (dup) return res.status(409).json({ erro: 'Já existe uma categoria com este nome.' });

  const nova = {
    id: db.nextId('categorias'),
    nome,
    descricao: descricao ?? '',
    status: 'Ativa',
  };

  db.data.categorias.push(nova);
  db.save();
  return res.status(201).json(comTotal(nova));
});

router.put('/:id', authMiddleware, permitir('admin'), (req, res) => {
  const id = paraInteiro(req.params.id);
  const categoria = db.data.categorias.find((c) => c.id === id);
  if (!categoria) return res.status(404).json({ erro: 'Categoria não encontrada.' });

  const nome = texto(req.body.nome);
  const descricao = texto(req.body.descricao);
  const { status } = req.body;

  if (nome !== undefined && !nome) return res.status(400).json({ erro: 'O nome não pode ficar vazio.' });
  if (status !== undefined && !STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({ erro: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}` });
  }

  if (nome) {
    const dup = db.data.categorias.find((c) => c.nome.toLowerCase() === nome.toLowerCase() && c.id !== id);
    if (dup) return res.status(409).json({ erro: 'Já existe uma categoria com este nome.' });
    categoria.nome = nome;
  }
  if (descricao !== undefined) categoria.descricao = descricao;
  if (status) categoria.status = status;

  db.save();
  return res.json(comTotal(categoria));
});

// Categoria usada em chamados não é apagada, apenas inativada
router.delete('/:id', authMiddleware, permitir('admin'), (req, res) => {
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
});

module.exports = router;
