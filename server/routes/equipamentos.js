const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { permitir } = require('../middleware/auth');
const { paraInteiro, texto } = require('../utils/formatar');

const router = express.Router();

const TIPOS_VALIDOS = ['Desktop', 'Notebook', 'Monitor', 'Impressora', 'Roteador', 'Switch', 'Smartphone', 'Outro'];
const STATUS_VALIDOS = ['Ativo', 'Em manutenção', 'Inativo'];

function comResponsavel(equipamento) {
  const usuario = db.data.usuarios.find((u) => u.id === equipamento.usuarioId);
  return { ...equipamento, usuarioNome: usuario ? usuario.nome : null };
}

// Monta o nome exibido no sistema a partir da marca e do modelo
function montarNome(marca, modelo, nome) {
  if (nome) return nome;
  return [marca, modelo].filter(Boolean).join(' ');
}

function validarUsuario(usuarioId) {
  if (usuarioId === null) return null;
  if (Number.isNaN(usuarioId)) return 'usuarioId inválido.';
  const usuario = db.data.usuarios.find((u) => u.id === usuarioId);
  return usuario ? null : 'Usuário responsável não encontrado.';
}

router.get('/', authMiddleware, (req, res) => {
  const { usuarioId, status, tipo, busca } = req.query;
  let resultado = db.data.equipamentos;

  // cliente só enxerga os equipamentos que estão com ele
  if (req.usuario.perfil === 'cliente') {
    resultado = resultado.filter((e) => e.usuarioId === req.usuario.id);
  } else if (usuarioId) {
    resultado = resultado.filter((e) => e.usuarioId === paraInteiro(usuarioId));
  }

  if (status) resultado = resultado.filter((e) => e.status.toLowerCase() === String(status).toLowerCase());
  if (tipo) resultado = resultado.filter((e) => e.tipo.toLowerCase() === String(tipo).toLowerCase());
  if (busca) {
    const termo = String(busca).trim().toLowerCase();
    resultado = resultado.filter((e) =>
      [e.nome, e.marca, e.modelo, e.patrimonio].some((campo) => (campo || '').toLowerCase().includes(termo))
    );
  }

  return res.json(resultado.map(comResponsavel));
});

router.get('/:id', authMiddleware, (req, res) => {
  const id = paraInteiro(req.params.id);
  const eq = db.data.equipamentos.find((e) => e.id === id);
  if (!eq) return res.status(404).json({ erro: 'Equipamento não encontrado.' });

  if (req.usuario.perfil === 'cliente' && eq.usuarioId !== req.usuario.id) {
    return res.status(403).json({ erro: 'Acesso negado a este equipamento.' });
  }

  return res.json(comResponsavel(eq));
});

router.post('/', authMiddleware, permitir('admin'), (req, res) => {
  const tipo = texto(req.body.tipo);
  const marca = texto(req.body.marca) || null;
  const modelo = texto(req.body.modelo) || null;
  const patrimonio = texto(req.body.patrimonio);
  const nome = montarNome(marca, modelo, texto(req.body.nome));
  const usuarioId = paraInteiro(req.body.usuarioId);

  if (!tipo || !patrimonio || !nome) {
    return res.status(400).json({ erro: 'Campos obrigatórios: tipo, patrimonio e marca/modelo (ou nome).' });
  }
  if (!TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ erro: `Tipo inválido. Use: ${TIPOS_VALIDOS.join(', ')}` });
  }

  const erroUsuario = validarUsuario(usuarioId);
  if (erroUsuario) return res.status(400).json({ erro: erroUsuario });

  const dup = db.data.equipamentos.find((e) => e.patrimonio.toUpperCase() === patrimonio.toUpperCase());
  if (dup) return res.status(409).json({ erro: 'Já existe um equipamento com este número de patrimônio.' });

  const novo = {
    id: db.nextId('equipamentos'),
    tipo,
    nome,
    marca,
    modelo,
    patrimonio: patrimonio.toUpperCase(),
    usuarioId,
    status: 'Ativo',
  };

  db.data.equipamentos.push(novo);
  db.save();
  return res.status(201).json(comResponsavel(novo));
});

router.put('/:id', authMiddleware, permitir('admin'), (req, res) => {
  const id = paraInteiro(req.params.id);
  const eq = db.data.equipamentos.find((e) => e.id === id);
  if (!eq) return res.status(404).json({ erro: 'Equipamento não encontrado.' });

  const tipo = texto(req.body.tipo);
  const patrimonio = texto(req.body.patrimonio);
  const { status } = req.body;

  if (tipo !== undefined && !TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ erro: `Tipo inválido. Use: ${TIPOS_VALIDOS.join(', ')}` });
  }
  if (status !== undefined && !STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({ erro: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}` });
  }

  if (req.body.usuarioId !== undefined) {
    const usuarioId = paraInteiro(req.body.usuarioId);
    const erroUsuario = validarUsuario(usuarioId);
    if (erroUsuario) return res.status(400).json({ erro: erroUsuario });
    eq.usuarioId = usuarioId;
  }

  if (patrimonio) {
    const dup = db.data.equipamentos.find(
      (e) => e.patrimonio.toUpperCase() === patrimonio.toUpperCase() && e.id !== id
    );
    if (dup) return res.status(409).json({ erro: 'Já existe um equipamento com este número de patrimônio.' });
    eq.patrimonio = patrimonio.toUpperCase();
  }

  if (tipo) eq.tipo = tipo;
  if (req.body.marca !== undefined) eq.marca = texto(req.body.marca) || null;
  if (req.body.modelo !== undefined) eq.modelo = texto(req.body.modelo) || null;
  if (req.body.nome !== undefined || req.body.marca !== undefined || req.body.modelo !== undefined) {
    eq.nome = montarNome(eq.marca, eq.modelo, texto(req.body.nome)) || eq.nome;
  }
  if (status) eq.status = status;

  db.save();
  return res.json(comResponsavel(eq));
});

router.delete('/:id', authMiddleware, permitir('admin'), (req, res) => {
  const id = paraInteiro(req.params.id);
  const eq = db.data.equipamentos.find((e) => e.id === id);
  if (!eq) return res.status(404).json({ erro: 'Equipamento não encontrado.' });

  eq.status = 'Inativo';
  db.save();
  return res.json({ mensagem: 'Equipamento inativado com sucesso.' });
});

module.exports = router;
