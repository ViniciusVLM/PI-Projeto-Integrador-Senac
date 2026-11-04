const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
  }

  const usuario = db.data.usuarios.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.senha === senha && u.status === 'Ativo'
  );

  if (!usuario) {
    return res.status(401).json({ erro: 'Credenciais inválidas ou usuário inativo.' });
  }

  const token = crypto.randomUUID();

  db.data.tokens = db.data.tokens.filter((t) => t.usuarioId !== usuario.id);

  db.data.tokens.push({
    token,
    usuarioId: usuario.id,
    criadoEm: new Date().toISOString(),
  });
  db.save();

  return res.status(200).json({
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    },
  });
});

router.post('/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    db.data.tokens = db.data.tokens.filter((t) => t.token !== token);
    db.save();
  }
  return res.status(200).json({ mensagem: 'Logout realizado com sucesso.' });
});

module.exports = router;
