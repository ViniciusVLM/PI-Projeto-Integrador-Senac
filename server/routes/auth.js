const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { hashSenha, conferirSenha } = require('../utils/seguranca');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
  }

  const usuario = db.data.usuarios.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && conferirSenha(senha, u.senha) && u.status === 'Ativo'
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

const handleCadastro = (req, res) => {
  const { email, senha, confirmarSenha, nome } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
  }

  if (confirmarSenha && senha !== confirmarSenha) {
    return res.status(400).json({ erro: 'As senhas não coincidem.' });
  }

  const emailExistente = db.data.usuarios.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  );

  if (emailExistente) {
    return res.status(409).json({ erro: 'Já existe um usuário cadastrado com este e-mail.' });
  }

  const nomeFormatado = nome && nome.trim()
    ? nome.trim()
    : email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  const novoId = db.nextId('usuarios');
  const novoUsuario = {
    id: novoId,
    nome: nomeFormatado,
    email: email.trim().toLowerCase(),
    senha: hashSenha(senha),
    perfil: 'cliente',
    status: 'Ativo',
  };

  db.data.usuarios.push(novoUsuario);
  db.save();

  return res.status(201).json({
    mensagem: 'Conta criada com sucesso!',
    usuario: {
      id: novoUsuario.id,
      nome: novoUsuario.nome,
      email: novoUsuario.email,
      perfil: novoUsuario.perfil,
    },
  });
};

router.post('/cadastro', handleCadastro);
router.post('/register', handleCadastro);
router.post('/registro', handleCadastro);

const handleEsqueciSenha = (req, res) => {
  const { email, senha, novaSenha, confirmarSenha } = req.body;
  const proximaSenha = novaSenha || senha;

  if (!email) {
    return res.status(400).json({ erro: 'O e-mail é obrigatório.' });
  }

  const usuario = db.data.usuarios.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  );

  if (!usuario) {
    return res.status(404).json({ erro: 'Nenhum usuário encontrado com este e-mail.' });
  }

  if (usuario.status !== 'Ativo') {
    return res.status(403).json({ erro: 'Este usuário está inativo no sistema.' });
  }

  if (proximaSenha) {
    if (confirmarSenha && proximaSenha !== confirmarSenha) {
      return res.status(400).json({ erro: 'As senhas não coincidem.' });
    }

    usuario.senha = hashSenha(proximaSenha);
    db.save();

    return res.status(200).json({
      mensagem: 'Senha redefinida com sucesso!',
    });
  }

  return res.status(200).json({
    mensagem: 'E-mail validado. Você pode redefinir sua senha.',
  });
};

router.post('/esqueci-senha', handleEsqueciSenha);
router.post('/redefinir-senha', handleEsqueciSenha);

module.exports = router;
