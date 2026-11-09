const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { permitir } = require('../middleware/auth');
const { hashSenha, emailValido, validarNovaSenha } = require('../utils/seguranca');
const { semSenha, paraInteiro, texto, agora } = require('../utils/formatar');

const router = express.Router();

const PERFIS_VALIDOS = ['cliente', 'tecnico', 'admin'];
const STATUS_VALIDOS = ['Ativo', 'Inativo'];

router.get('/', authMiddleware, (req, res) => {
  if (req.usuario.perfil !== 'admin') {
    return res.json([semSenha(req.usuario)]);
  }

  const { perfil, status, busca } = req.query;
  let resultado = db.data.usuarios;

  if (perfil) resultado = resultado.filter((u) => u.perfil === perfil);
  if (status) resultado = resultado.filter((u) => u.status.toLowerCase() === String(status).toLowerCase());
  if (busca) {
    const termo = String(busca).trim().toLowerCase();
    resultado = resultado.filter(
      (u) => u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo)
    );
  }

  return res.json(resultado.map(semSenha));
});

router.get('/tecnicos', authMiddleware, (req, res) => {
  const tecnicos = db.data.usuarios
    .filter((u) => u.perfil === 'tecnico' && u.status === 'Ativo')
    .map(semSenha);
  return res.json(tecnicos);
});

router.get('/:id', authMiddleware, (req, res) => {
  const id = paraInteiro(req.params.id);

  if (req.usuario.perfil !== 'admin' && req.usuario.id !== id) {
    return res.status(403).json({ erro: 'Você só pode visualizar o seu próprio usuário.' });
  }

  const usuario = db.data.usuarios.find((u) => u.id === id);
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  return res.json(semSenha(usuario));
});

router.post('/', authMiddleware, permitir('admin'), (req, res) => {
  const nome = texto(req.body.nome);
  const email = texto(req.body.email);
  const telefone = texto(req.body.telefone) || null;
  const { senha, perfil } = req.body;

  if (!nome || !email || !senha || !perfil) {
    return res.status(400).json({ erro: 'Campos obrigatórios: nome, email, senha, perfil.' });
  }
  if (!emailValido(email)) {
    return res.status(400).json({ erro: 'E-mail inválido.' });
  }
  if (!PERFIS_VALIDOS.includes(perfil)) {
    return res.status(400).json({ erro: `Perfil inválido. Use: ${PERFIS_VALIDOS.join(', ')}` });
  }

  const erroSenha = validarNovaSenha(senha);
  if (erroSenha) return res.status(400).json({ erro: erroSenha });

  const emailExistente = db.data.usuarios.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (emailExistente) {
    return res.status(409).json({ erro: 'Já existe um usuário com este e-mail.' });
  }

  const novoUsuario = {
    id: db.nextId('usuarios'),
    nome,
    email: email.toLowerCase(),
    telefone,
    senha: hashSenha(senha),
    perfil,
    status: 'Ativo',
    criadoEm: agora(),
  };

  db.data.usuarios.push(novoUsuario);
  db.save();

  return res.status(201).json(semSenha(novoUsuario));
});

router.put('/:id', authMiddleware, permitir('admin'), (req, res) => {
  const id = paraInteiro(req.params.id);
  const usuario = db.data.usuarios.find((u) => u.id === id);
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });

  const nome = texto(req.body.nome);
  const email = texto(req.body.email);
  const { senha, perfil, status } = req.body;

  if (nome !== undefined && !nome) return res.status(400).json({ erro: 'O nome não pode ficar vazio.' });
  if (email !== undefined && !emailValido(email)) return res.status(400).json({ erro: 'E-mail inválido.' });
  if (perfil !== undefined && !PERFIS_VALIDOS.includes(perfil)) {
    return res.status(400).json({ erro: `Perfil inválido. Use: ${PERFIS_VALIDOS.join(', ')}` });
  }
  if (status !== undefined && !STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({ erro: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}` });
  }
  if (senha !== undefined) {
    const erroSenha = validarNovaSenha(senha);
    if (erroSenha) return res.status(400).json({ erro: erroSenha });
  }

  if (usuario.id === req.usuario.id && ((perfil && perfil !== 'admin') || status === 'Inativo')) {
    return res.status(400).json({ erro: 'Você não pode remover o seu próprio acesso de administrador.' });
  }

  if (email) {
    const dup = db.data.usuarios.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== id);
    if (dup) return res.status(409).json({ erro: 'Já existe um usuário com este e-mail.' });
    usuario.email = email.toLowerCase();
  }

  if (nome) usuario.nome = nome;
  if (req.body.telefone !== undefined) usuario.telefone = texto(req.body.telefone) || null;
  if (perfil) usuario.perfil = perfil;
  if (status) usuario.status = status;
  if (senha) usuario.senha = hashSenha(senha);

  if (status === 'Inativo' || senha) {
    db.data.tokens = db.data.tokens.filter((t) => t.usuarioId !== usuario.id);
  }

  db.save();
  return res.json(semSenha(usuario));
});

// Não apaga o registro: o usuário fica inativo para manter o histórico dos chamados
router.delete('/:id', authMiddleware, permitir('admin'), (req, res) => {
  const id = paraInteiro(req.params.id);
  const usuario = db.data.usuarios.find((u) => u.id === id);
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });

  if (usuario.id === req.usuario.id) {
    return res.status(400).json({ erro: 'Você não pode inativar a sua própria conta.' });
  }

  usuario.status = 'Inativo';
  db.data.tokens = db.data.tokens.filter((t) => t.usuarioId !== usuario.id);
  db.save();

  return res.json({ mensagem: 'Usuário inativado com sucesso.' });
});

module.exports = router;
