const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const {
  hashSenha,
  conferirSenha,
  gerarToken,
  gerarCodigo,
  calcularExpiracao,
  emailValido,
  validarNovaSenha,
  CODIGO_VALIDADE_MINUTOS,
} = require('../utils/seguranca');
const { semSenha, texto, agora } = require('../utils/formatar');

const router = express.Router();

function buscarPorEmail(email) {
  const alvo = String(email || '').trim().toLowerCase();
  return db.data.usuarios.find((u) => u.email.toLowerCase() === alvo);
}

function dadosDaSessao(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    telefone: usuario.telefone ?? null,
    perfil: usuario.perfil,
  };
}

router.post('/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
  }

  const usuario = buscarPorEmail(email);

  if (!usuario || usuario.status !== 'Ativo' || !conferirSenha(senha, usuario.senha)) {
    return res.status(401).json({ erro: 'Credenciais inválidas ou usuário inativo.' });
  }

  const token = gerarToken();

  // remove sessões antigas desse usuário
  db.data.tokens = db.data.tokens.filter((t) => t.usuarioId !== usuario.id);
  db.data.tokens.push({
    token,
    usuarioId: usuario.id,
    criadoEm: agora(),
    expiraEm: calcularExpiracao(),
  });
  db.save();

  return res.status(200).json({ token, usuario: dadosDaSessao(usuario) });
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

// Cadastro público: toda conta criada por aqui é de cliente
router.post('/registro', (req, res) => {
  const nome = texto(req.body.nome);
  const email = texto(req.body.email);
  const telefone = texto(req.body.telefone) || null;
  const { senha, confirmarSenha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Campos obrigatórios: nome, email, senha.' });
  }
  if (nome.length < 3) {
    return res.status(400).json({ erro: 'Informe o nome completo.' });
  }
  if (!emailValido(email)) {
    return res.status(400).json({ erro: 'E-mail inválido.' });
  }

  const erroSenha = validarNovaSenha(senha);
  if (erroSenha) return res.status(400).json({ erro: erroSenha });

  if (confirmarSenha !== undefined && confirmarSenha !== senha) {
    return res.status(400).json({ erro: 'As senhas não conferem.' });
  }

  if (buscarPorEmail(email)) {
    return res.status(409).json({ erro: 'Já existe uma conta com este e-mail.' });
  }

  const novoUsuario = {
    id: db.nextId('usuarios'),
    nome,
    email: email.toLowerCase(),
    telefone,
    senha: hashSenha(senha),
    perfil: 'cliente',
    status: 'Ativo',
    criadoEm: agora(),
  };

  db.data.usuarios.push(novoUsuario);
  db.save();

  return res.status(201).json(semSenha(novoUsuario));
});

// Passo 1 da recuperação: gera um código de 6 dígitos.
// O sistema não envia e-mail de verdade; o código aparece no terminal da API.
router.post('/esqueci-senha', (req, res) => {
  const email = texto(req.body.email);

  if (!emailValido(email)) {
    return res.status(400).json({ erro: 'Informe um e-mail válido.' });
  }

  const resposta = {
    mensagem: 'Se o e-mail estiver cadastrado, enviamos um código de verificação.',
    validadeMinutos: CODIGO_VALIDADE_MINUTOS,
  };

  const usuario = buscarPorEmail(email);
  if (!usuario || usuario.status !== 'Ativo') {
    // mesma resposta para não revelar quais e-mails existem
    return res.json(resposta);
  }

  const codigo = gerarCodigo();

  db.data.redefinicoes = db.data.redefinicoes.filter((r) => r.usuarioId !== usuario.id);
  db.data.redefinicoes.push({
    usuarioId: usuario.id,
    codigoHash: hashSenha(codigo),
    tentativas: 0,
    expiraEm: calcularExpiracao(CODIGO_VALIDADE_MINUTOS / 60),
  });
  db.save();

  console.log(`[E-MAIL SIMULADO] Código de redefinição para ${usuario.email}: ${codigo}`);

  return res.json(resposta);
});

// Passo 2 da recuperação: confere o código e grava a nova senha
router.post('/redefinir-senha', (req, res) => {
  const email = texto(req.body.email);
  const codigo = texto(String(req.body.codigo ?? ''));
  const { novaSenha, confirmarSenha } = req.body;

  if (!email || !codigo || !novaSenha) {
    return res.status(400).json({ erro: 'Campos obrigatórios: email, codigo, novaSenha.' });
  }

  const erroSenha = validarNovaSenha(novaSenha);
  if (erroSenha) return res.status(400).json({ erro: erroSenha });

  if (confirmarSenha !== undefined && confirmarSenha !== novaSenha) {
    return res.status(400).json({ erro: 'As senhas não conferem.' });
  }

  const usuario = buscarPorEmail(email);
  const pedido = usuario && db.data.redefinicoes.find((r) => r.usuarioId === usuario.id);
  const invalido = { erro: 'Código inválido ou expirado. Solicite um novo código.' };

  if (!pedido || new Date(pedido.expiraEm).getTime() < Date.now() || pedido.tentativas >= 5) {
    return res.status(400).json(invalido);
  }

  if (!conferirSenha(codigo, pedido.codigoHash)) {
    pedido.tentativas += 1;
    db.save();
    return res.status(400).json(invalido);
  }

  usuario.senha = hashSenha(novaSenha);
  db.data.redefinicoes = db.data.redefinicoes.filter((r) => r.usuarioId !== usuario.id);
  // encerra as sessões abertas com a senha antiga
  db.data.tokens = db.data.tokens.filter((t) => t.usuarioId !== usuario.id);
  db.save();

  return res.json({ mensagem: 'Senha redefinida com sucesso. Faça login com a nova senha.' });
});

router.get('/me', authMiddleware, (req, res) => {
  return res.json(semSenha(req.usuario));
});

// Atualiza os dados do próprio perfil (e-mail e perfil de acesso não mudam por aqui)
router.put('/me', authMiddleware, (req, res) => {
  const nome = texto(req.body.nome);
  const telefone = req.body.telefone !== undefined ? texto(req.body.telefone) || null : undefined;

  if (nome !== undefined && (!nome || nome.length < 3)) {
    return res.status(400).json({ erro: 'Informe o nome completo.' });
  }

  if (nome !== undefined) req.usuario.nome = nome;
  if (telefone !== undefined) req.usuario.telefone = telefone;
  db.save();

  return res.json(semSenha(req.usuario));
});

router.put('/me/senha', authMiddleware, (req, res) => {
  const { senhaAtual, novaSenha, confirmarSenha } = req.body;

  if (!senhaAtual || !novaSenha) {
    return res.status(400).json({ erro: 'Campos obrigatórios: senhaAtual, novaSenha.' });
  }
  if (!conferirSenha(senhaAtual, req.usuario.senha)) {
    return res.status(400).json({ erro: 'Senha atual incorreta.' });
  }

  const erroSenha = validarNovaSenha(novaSenha);
  if (erroSenha) return res.status(400).json({ erro: erroSenha });

  if (confirmarSenha !== undefined && confirmarSenha !== novaSenha) {
    return res.status(400).json({ erro: 'As senhas não conferem.' });
  }

  req.usuario.senha = hashSenha(novaSenha);
  // mantém só a sessão atual
  db.data.tokens = db.data.tokens.filter((t) => t.usuarioId !== req.usuario.id || t.token === req.token);
  db.save();

  return res.json({ mensagem: 'Senha alterada com sucesso.' });
});

module.exports = router;
