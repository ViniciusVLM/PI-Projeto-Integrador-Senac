const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  if (req.usuario.perfil === 'admin') {
    return res.json(db.data.usuarios.map(sem_senha));
  }
  return res.json([sem_senha(req.usuario)]);
});

router.get('/tecnicos', authMiddleware, (req, res) => {
  const tecnicos = db.data.usuarios
    .filter((u) => u.perfil === 'tecnico' && u.status === 'Ativo')
    .map(sem_senha);
  return res.json(tecnicos);
});

router.get('/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const usuario = db.data.usuarios.find((u) => u.id === id);
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  return res.json(sem_senha(usuario));
});

router.post('/', authMiddleware, (req, res) => {
  if (req.usuario.perfil !== 'admin') {
    return res.status(403).json({ erro: 'Apenas administradores podem criar usuários.' });
  }

  const { nome, email, senha, perfil } = req.body;

  if (!nome || !email || !senha || !perfil) {
    return res.status(400).json({ erro: 'Campos obrigatórios: nome, email, senha, perfil.' });
  }

  const emailExistente = db.data.usuarios.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (emailExistente) {
    return res.status(409).json({ erro: 'Já existe um usuário com este e-mail.' });
  }

  const perfisValidos = ['cliente', 'tecnico', 'admin'];
  if (!perfisValidos.includes(perfil)) {
    return res.status(400).json({ erro: `Perfil inválido. Use: ${perfisValidos.join(', ')}` });
  }

  const novoId = db.nextId('usuarios');
  const novoUsuario = {
    id: novoId,
    nome,
    email,
    senha,
    perfil,
    status: 'Ativo',
  };

  db.data.usuarios.push(novoUsuario);
  db.save();

  return res.status(201).json(sem_senha(novoUsuario));
});

router.put('/:id', authMiddleware, (req, res) => {
  if (req.usuario.perfil !== 'admin') {
    return res.status(403).json({ erro: 'Apenas administradores podem editar usuários.' });
  }

  const id = parseInt(req.params.id);
  const idx = db.data.usuarios.findIndex((u) => u.id === id);
  if (idx === -1) return res.status(404).json({ erro: 'Usuário não encontrado.' });

  const { nome, email, senha, perfil, status } = req.body;

  if (email) {
    const dup = db.data.usuarios.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== id
    );
    if (dup) return res.status(409).json({ erro: 'Já existe um usuário com este e-mail.' });
  }

  db.data.usuarios[idx] = {
    ...db.data.usuarios[idx],
    nome: nome ?? db.data.usuarios[idx].nome,
    email: email ?? db.data.usuarios[idx].email,
    senha: senha ?? db.data.usuarios[idx].senha,
    perfil: perfil ?? db.data.usuarios[idx].perfil,
    status: status ?? db.data.usuarios[idx].status,
  };
  db.save();

  return res.json(sem_senha(db.data.usuarios[idx]));
});

router.delete('/:id', authMiddleware, (req, res) => {
  if (req.usuario.perfil !== 'admin') {
    return res.status(403).json({ erro: 'Apenas administradores podem remover usuários.' });
  }

  const id = parseInt(req.params.id);
  const idx = db.data.usuarios.findIndex((u) => u.id === id);
  if (idx === -1) return res.status(404).json({ erro: 'Usuário não encontrado.' });

  db.data.usuarios[idx].status = 'Inativo';
  db.save();

  return res.json({ mensagem: 'Usuário inativado com sucesso.' });
});

function sem_senha(u) {
  const { senha, ...resto } = u;
  return resto;
}

module.exports = router;
