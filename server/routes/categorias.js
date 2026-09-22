const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const { status } = req.query;
  let resultado = db.data.categorias;
  if (status) {
    resultado = resultado.filter((c) => c.status.toLowerCase() === status.toLowerCase());
  }
  return res.json(resultado);
});

router.get('/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const cat = db.data.categorias.find((c) => c.id === id);
  if (!cat) return res.status(404).json({ erro: 'Categoria não encontrada.' });
  return res.json(cat);
});

router.post('/', authMiddleware, (req, res) => {
  if (req.usuario.perfil !== 'admin') {
    return res.status(403).json({ erro: 'Apenas administradores podem criar categorias.' });
  }

  const { nome, descricao } = req.body;
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
  return res.status(201).json(nova);
});

router.put('/:id', authMiddleware, (req, res) => {
  if (req.usuario.perfil !== 'admin') {
    return res.status(403).json({ erro: 'Apenas administradores podem editar categorias.' });
  }

  const id = parseInt(req.params.id);
  const idx = db.data.categorias.findIndex((c) => c.id === id);
  if (idx === -1) return res.status(404).json({ erro: 'Categoria não encontrada.' });

  const { nome, descricao, status } = req.body;

  if (nome) {
    const dup = db.data.categorias.find(
      (c) => c.nome.toLowerCase() === nome.toLowerCase() && c.id !== id
    );
    if (dup) return res.status(409).json({ erro: 'Já existe uma categoria com este nome.' });
  }

  db.data.categorias[idx] = {
    ...db.data.categorias[idx],
    nome: nome ?? db.data.categorias[idx].nome,
    descricao: descricao ?? db.data.categorias[idx].descricao,
    status: status ?? db.data.categorias[idx].status,
  };
  db.save();
  return res.json(db.data.categorias[idx]);
});

router.delete('/:id', authMiddleware, (req, res) => {
  if (req.usuario.perfil !== 'admin') {
    return res.status(403).json({ erro: 'Apenas administradores podem remover categorias.' });
  }

  const id = parseInt(req.params.id);
  const idx = db.data.categorias.findIndex((c) => c.id === id);
  if (idx === -1) return res.status(404).json({ erro: 'Categoria não encontrada.' });

  const emUso = db.data.chamados.some((c) => c.categoriaId === id);
  if (emUso) {
    return res.status(409).json({ erro: 'Não é possível remover: categoria em uso por chamados.' });
  }

  db.data.categorias.splice(idx, 1);
  db.save();
  return res.json({ mensagem: 'Categoria removida com sucesso.' });
});

module.exports = router;
