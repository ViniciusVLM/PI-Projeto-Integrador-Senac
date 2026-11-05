const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  const { usuarioId, status } = req.query;
  let resultado = db.data.equipamentos;

  if (usuarioId) {
    resultado = resultado.filter((e) => e.usuarioId === parseInt(usuarioId));
  }
  if (status) {
    resultado = resultado.filter((e) => e.status.toLowerCase() === status.toLowerCase());
  }

  resultado = resultado.map((e) => {
    const usuario = db.data.usuarios.find((u) => u.id === e.usuarioId);
    return { ...e, usuarioNome: usuario ? usuario.nome : null };
  });

  return res.json(resultado);
});

router.get('/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const eq = db.data.equipamentos.find((e) => e.id === id);
  if (!eq) return res.status(404).json({ erro: 'Equipamento não encontrado.' });

  const usuario = db.data.usuarios.find((u) => u.id === eq.usuarioId);
  return res.json({ ...eq, usuarioNome: usuario ? usuario.nome : null });
});

router.post('/', authMiddleware, (req, res) => {
  const { tipo, nome, patrimonio, usuarioId } = req.body;

  if (!tipo || !nome || !patrimonio) {
    return res.status(400).json({ erro: 'Campos obrigatórios: tipo, nome, patrimonio.' });
  }

  const dup = db.data.equipamentos.find(
    (e) => e.patrimonio.toUpperCase() === patrimonio.toUpperCase()
  );
  if (dup) return res.status(409).json({ erro: 'Já existe um equipamento com este número de patrimônio.' });

  if (usuarioId) {
    const usuario = db.data.usuarios.find((u) => u.id === usuarioId);
    if (!usuario) return res.status(404).json({ erro: 'Usuário informado não encontrado.' });
  }

  const novo = {
    id: db.nextId('equipamentos'),
    tipo,
    nome,
    patrimonio,
    usuarioId: usuarioId ?? null,
    status: 'Ativo',
  };

  db.data.equipamentos.push(novo);
  db.save();
  return res.status(201).json(novo);
});

router.put('/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const idx = db.data.equipamentos.findIndex((e) => e.id === id);
  if (idx === -1) return res.status(404).json({ erro: 'Equipamento não encontrado.' });

  const { tipo, nome, patrimonio, usuarioId, status } = req.body;

  if (patrimonio) {
    const dup = db.data.equipamentos.find(
      (e) => e.patrimonio.toUpperCase() === patrimonio.toUpperCase() && e.id !== id
    );
    if (dup) return res.status(409).json({ erro: 'Já existe um equipamento com este número de patrimônio.' });
  }

  db.data.equipamentos[idx] = {
    ...db.data.equipamentos[idx],
    tipo: tipo ?? db.data.equipamentos[idx].tipo,
    nome: nome ?? db.data.equipamentos[idx].nome,
    patrimonio: patrimonio ?? db.data.equipamentos[idx].patrimonio,
    usuarioId: usuarioId !== undefined ? usuarioId : db.data.equipamentos[idx].usuarioId,
    status: status ?? db.data.equipamentos[idx].status,
  };
  db.save();
  return res.json(db.data.equipamentos[idx]);
});

router.delete('/:id', authMiddleware, (req, res) => {
  if (req.usuario.perfil !== 'admin') {
    return res.status(403).json({ erro: 'Apenas administradores podem remover equipamentos.' });
  }

  const id = parseInt(req.params.id);
  const idx = db.data.equipamentos.findIndex((e) => e.id === id);
  if (idx === -1) return res.status(404).json({ erro: 'Equipamento não encontrado.' });

  db.data.equipamentos[idx].status = 'Inativo';
  db.save();
  return res.json({ mensagem: 'Equipamento inativado com sucesso.' });
});

module.exports = router;
