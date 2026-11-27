const db = require('../db');
const { PERFIS_VALIDOS, STATUS_USUARIO } = require('../config/constants');
const { apagarArquivos } = require('../config/upload');
const { hashSenha, emailValido, validarNovaSenha } = require('../utils/seguranca');
const { semSenha, paraInteiro, texto, agora } = require('../utils/formatar');

function enriquecerUsuario(usuario) {
  const limpo = semSenha(usuario);
  const totalChamados = db.data.chamados.filter((c) => c.solicitanteId === usuario.id).length;
  const totalEquipamentos = db.data.equipamentos.filter(
    (e) => e.usuarioId === usuario.id && e.status !== 'Inativo'
  ).length;
  return {
    ...limpo,
    avatarUrl: usuario.avatarUrl ?? null,
    departamento: usuario.departamento ?? null,
    cargo: usuario.cargo ?? null,
    totalChamados,
    totalEquipamentos,
  };
}

function extrairArquivoAvatarAntigo(avatarUrl) {
  if (typeof avatarUrl === 'string' && avatarUrl.startsWith('/api/uploads/avatars/')) {
    return avatarUrl.replace('/api/uploads/avatars/', '');
  }
  return null;
}

function listar(req, res) {
  if (req.usuario.perfil === 'cliente') {
    return res.json([enriquecerUsuario(req.usuario)]);
  }

  const { perfil, status, busca } = req.query;
  let resultado = db.data.usuarios;

  if (perfil) resultado = resultado.filter((u) => u.perfil === perfil);
  if (status) {
    resultado = resultado.filter((u) => u.status.toLowerCase() === String(status).toLowerCase());
  }
  if (busca) {
    const termo = String(busca).trim().toLowerCase();
    resultado = resultado.filter(
      (u) =>
        u.nome.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo) ||
        (u.departamento || '').toLowerCase().includes(termo)
    );
  }

  return res.json(resultado.map(enriquecerUsuario));
}

function listarTecnicos(req, res) {
  const tecnicos = db.data.usuarios
    .filter((u) => u.perfil === 'tecnico' && u.status === 'Ativo')
    .map(enriquecerUsuario);
  return res.json(tecnicos);
}

function obterPorId(req, res) {
  const id = paraInteiro(req.params.id);

  if (req.usuario.perfil !== 'admin' && req.usuario.id !== id) {
    return res.status(403).json({ erro: 'Você só pode visualizar o seu próprio usuário.' });
  }

  const usuario = db.data.usuarios.find((u) => u.id === id);
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
  return res.json(enriquecerUsuario(usuario));
}

function criar(req, res) {
  const nome = texto(req.body.nome);
  const email = texto(req.body.email);
  const telefone = texto(req.body.telefone) || null;
  const departamento = texto(req.body.departamento) || null;
  const cargo = texto(req.body.cargo) || null;
  const avatarUrl = texto(req.body.avatarUrl) || null;
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
    departamento,
    cargo,
    avatarUrl,
    senha: hashSenha(senha),
    perfil,
    status: 'Ativo',
    criadoEm: agora(),
  };

  db.data.usuarios.push(novoUsuario);
  db.save();

  return res.status(201).json(enriquecerUsuario(novoUsuario));
}

function atualizar(req, res) {
  const id = paraInteiro(req.params.id);
  const usuario = db.data.usuarios.find((u) => u.id === id);
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });

  const nome = req.body.nome !== undefined ? texto(req.body.nome) : undefined;
  const email = req.body.email !== undefined ? texto(req.body.email) : undefined;
  const { senha, perfil, status } = req.body;

  if (nome !== undefined && !nome) {
    return res.status(400).json({ erro: 'O nome não pode ficar vazio.' });
  }
  if (email !== undefined && !emailValido(email)) {
    return res.status(400).json({ erro: 'E-mail inválido.' });
  }
  if (perfil !== undefined && !PERFIS_VALIDOS.includes(perfil)) {
    return res.status(400).json({ erro: `Perfil inválido. Use: ${PERFIS_VALIDOS.join(', ')}` });
  }
  if (status !== undefined && !STATUS_USUARIO.includes(status)) {
    return res.status(400).json({ erro: `Status inválido. Use: ${STATUS_USUARIO.join(', ')}` });
  }
  if (senha !== undefined && senha !== '') {
    const erroSenha = validarNovaSenha(senha);
    if (erroSenha) return res.status(400).json({ erro: erroSenha });
  }

  if (usuario.id === req.usuario.id && ((perfil && perfil !== 'admin') || status === 'Inativo')) {
    return res.status(400).json({ erro: 'Você não pode remover o seu próprio acesso de administrador.' });
  }

  if (email) {
    const dup = db.data.usuarios.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== id
    );
    if (dup) return res.status(409).json({ erro: 'Já existe um usuário com este e-mail.' });
    usuario.email = email.toLowerCase();
  }

  if (nome) usuario.nome = nome;
  if (req.body.telefone !== undefined) usuario.telefone = texto(req.body.telefone) || null;
  if (req.body.departamento !== undefined) usuario.departamento = texto(req.body.departamento) || null;
  if (req.body.cargo !== undefined) usuario.cargo = texto(req.body.cargo) || null;
  if (req.body.avatarUrl !== undefined) {
    const antigo = extrairArquivoAvatarAntigo(usuario.avatarUrl);
    if (antigo && antigo !== extrairArquivoAvatarAntigo(req.body.avatarUrl)) {
      apagarArquivos([antigo], 'avatars');
    }
    usuario.avatarUrl = texto(req.body.avatarUrl) || null;
  }
  if (perfil) usuario.perfil = perfil;
  if (status) usuario.status = status;
  if (senha) usuario.senha = hashSenha(senha);

  if (status === 'Inativo' || senha) {
    db.data.tokens = db.data.tokens.filter((t) => t.usuarioId !== usuario.id);
  }

  db.save();
  return res.json(enriquecerUsuario(usuario));
}

function uploadAvatarUsuario(req, res) {
  const id = paraInteiro(req.params.id);
  const usuario = db.data.usuarios.find((u) => u.id === id);
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });

  if (!req.file) {
    return res.status(400).json({ erro: 'Selecione um arquivo de imagem válido.' });
  }

  const antigo = extrairArquivoAvatarAntigo(usuario.avatarUrl);
  if (antigo) apagarArquivos([antigo], 'avatars');

  usuario.avatarUrl = `/api/uploads/avatars/${req.file.filename}`;
  db.save();

  return res.json(enriquecerUsuario(usuario));
}

function inativar(req, res) {
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
}

module.exports = {
  listar,
  listarTecnicos,
  obterPorId,
  criar,
  atualizar,
  uploadAvatarUsuario,
  inativar,
};
