const db = require('../db');
const { apagarArquivos } = require('../config/upload');
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
const { asyncHandler } = require('../utils/http-error');
const { enviarCodigoRecuperacao, obterStatusPublicoSmtp } = require('../services/email.service');

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
    avatarUrl: usuario.avatarUrl ?? null,
    departamento: usuario.departamento ?? null,
    cargo: usuario.cargo ?? null,
  };
}

function extrairArquivoAvatarAntigo(avatarUrl) {
  if (typeof avatarUrl === 'string' && avatarUrl.startsWith('/api/uploads/avatars/')) {
    return avatarUrl.replace('/api/uploads/avatars/', '');
  }
  return null;
}

function login(req, res) {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
  }

  const usuario = buscarPorEmail(email);

  if (!usuario || usuario.status !== 'Ativo' || !conferirSenha(senha, usuario.senha)) {
    return res.status(401).json({ erro: 'Credenciais inválidas ou usuário inativo.' });
  }

  const token = gerarToken();

  db.data.tokens = db.data.tokens.filter((t) => t.usuarioId !== usuario.id);
  db.data.tokens.push({
    token,
    usuarioId: usuario.id,
    criadoEm: agora(),
    expiraEm: calcularExpiracao(),
  });
  db.save();

  return res.status(200).json({ token, usuario: dadosDaSessao(usuario) });
}

function logout(req, res) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    db.data.tokens = db.data.tokens.filter((t) => t.token !== token);
    db.save();
  }
  return res.status(200).json({ mensagem: 'Logout realizado com sucesso.' });
}

function cadastrar(req, res) {
  if (db.data?.configuracoes?.cadastroPublicoAtivo === false) {
    return res.status(403).json({
      erro: 'O auto-cadastro público está desativado. Solicite seu acesso ao administrador de TI.',
    });
  }

  const email = texto(req.body.email);
  const nome =
    texto(req.body.nome) ||
    (typeof email === 'string'
      ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
      : '');
  const telefone = texto(req.body.telefone) || null;
  const departamento = texto(req.body.departamento) || 'Geral';
  const cargo = texto(req.body.cargo) || 'Colaborador';
  const { senha, confirmarSenha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
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
    departamento,
    cargo,
    avatarUrl: null,
    senha: hashSenha(senha),
    perfil: 'cliente',
    status: 'Ativo',
    criadoEm: agora(),
  };

  db.data.usuarios.push(novoUsuario);
  db.save();

  const usuario = semSenha(novoUsuario);
  return res.status(201).json({ ...usuario, mensagem: 'Conta criada com sucesso!', usuario });
}

const esqueciSenha = asyncHandler(async (req, res) => {
  const email = texto(req.body.email);

  if (!emailValido(email)) {
    return res.status(400).json({ erro: 'Informe um e-mail válido.' });
  }

  const statusSmtp = obterStatusPublicoSmtp();
  const resposta = {
    mensagem: 'Se o e-mail estiver cadastrado, enviamos um código de verificação.',
    validadeMinutos: CODIGO_VALIDADE_MINUTOS,
    smtpAtivo: statusSmtp.ativo,
  };

  const usuario = buscarPorEmail(email);
  if (!usuario || usuario.status !== 'Ativo') {
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

  await enviarCodigoRecuperacao({
    para: usuario.email,
    nome: usuario.nome,
    codigo,
    validadeMinutos: CODIGO_VALIDADE_MINUTOS,
  });

  return res.json(resposta);
});

function redefinirSenha(req, res) {
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
  db.data.tokens = db.data.tokens.filter((t) => t.usuarioId !== usuario.id);
  db.save();

  return res.json({ mensagem: 'Senha redefinida com sucesso. Faça login com a nova senha.' });
}

function obterPerfil(req, res) {
  return res.json(semSenha(req.usuario));
}

function atualizarPerfil(req, res) {
  const nome = req.body.nome !== undefined ? texto(req.body.nome) : undefined;
  const telefone = req.body.telefone !== undefined ? texto(req.body.telefone) || null : undefined;
  const departamento = req.body.departamento !== undefined ? texto(req.body.departamento) || null : undefined;
  const cargo = req.body.cargo !== undefined ? texto(req.body.cargo) || null : undefined;

  if (nome !== undefined && (!nome || nome.length < 3)) {
    return res.status(400).json({ erro: 'Informe o nome completo.' });
  }

  if (nome !== undefined) req.usuario.nome = nome;
  if (telefone !== undefined) req.usuario.telefone = telefone;
  if (departamento !== undefined) req.usuario.departamento = departamento;
  if (cargo !== undefined) req.usuario.cargo = cargo;
  if (req.body.avatarUrl !== undefined) {
    const antigo = extrairArquivoAvatarAntigo(req.usuario.avatarUrl);
    if (antigo && antigo !== extrairArquivoAvatarAntigo(req.body.avatarUrl)) {
      apagarArquivos([antigo], 'avatars');
    }
    req.usuario.avatarUrl = req.body.avatarUrl || null;
  }

  db.save();
  return res.json(semSenha(req.usuario));
}

function uploadMeuAvatar(req, res) {
  if (!req.file) {
    return res.status(400).json({ erro: 'Selecione um arquivo de imagem válido.' });
  }

  const antigo = extrairArquivoAvatarAntigo(req.usuario.avatarUrl);
  if (antigo) apagarArquivos([antigo], 'avatars');

  req.usuario.avatarUrl = `/api/uploads/avatars/${req.file.filename}`;
  db.save();

  return res.json(semSenha(req.usuario));
}

function alterarMinhaSenha(req, res) {
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
  db.data.tokens = db.data.tokens.filter(
    (t) => t.usuarioId !== req.usuario.id || t.token === req.token
  );
  db.save();

  return res.json({ mensagem: 'Senha alterada com sucesso.' });
}

module.exports = {
  login,
  logout,
  cadastrar,
  esqueciSenha,
  redefinirSenha,
  obterPerfil,
  atualizarPerfil,
  uploadMeuAvatar,
  alterarMinhaSenha,
};
