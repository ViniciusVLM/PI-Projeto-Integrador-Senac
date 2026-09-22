const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const TRANSICOES_VALIDAS = {
  'ABERTO': ['EM ANÁLISE', 'CANCELADO'],
  'EM ANÁLISE': ['EM ATENDIMENTO', 'CANCELADO'],
  'EM ATENDIMENTO': ['AGUARDANDO USUÁRIO', 'RESOLVIDO'],
  'AGUARDANDO USUÁRIO': ['EM ATENDIMENTO', 'CANCELADO'],
  'RESOLVIDO': ['ENCERRADO'],
  'ENCERRADO': [],
  'CANCELADO': [],
};

const PRIORIDADES_VALIDAS = ['Baixa', 'Média', 'Alta', 'Crítica'];

router.get('/', authMiddleware, (req, res) => {
  const { status, prioridade, solicitanteId, tecnicoId, categoriaId } = req.query;
  let resultado = db.data.chamados;

  if (status) resultado = resultado.filter((c) => c.status === status);
  if (prioridade) resultado = resultado.filter((c) => c.prioridade === prioridade);
  if (solicitanteId) resultado = resultado.filter((c) => c.solicitanteId === parseInt(solicitanteId));
  if (tecnicoId) resultado = resultado.filter((c) => c.tecnicoId === parseInt(tecnicoId));
  if (categoriaId) resultado = resultado.filter((c) => c.categoriaId === parseInt(categoriaId));

  if (req.usuario.perfil === 'cliente') {
    resultado = resultado.filter((c) => c.solicitanteId === req.usuario.id);
  }

  resultado = resultado.map(enriquecer);

  return res.json(resultado);
});

router.get('/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const chamado = db.data.chamados.find((c) => c.id === id);
  if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado.' });

  if (req.usuario.perfil === 'cliente' && chamado.solicitanteId !== req.usuario.id) {
    return res.status(403).json({ erro: 'Acesso negado a este chamado.' });
  }

  const historico = db.data.historico.filter((h) => h.chamadoId === id);
  const comentarios = db.data.comentarios.filter((c) => c.chamadoId === id);

  return res.json({ ...enriquecer(chamado), historico, comentarios });
});

router.post('/', authMiddleware, (req, res) => {
  const { titulo, descricao, categoriaId, prioridade, equipamentoId } = req.body;

  if (!titulo || !descricao || !categoriaId || !prioridade) {
    return res.status(400).json({ erro: 'Campos obrigatórios: titulo, descricao, categoriaId, prioridade.' });
  }

  if (!PRIORIDADES_VALIDAS.includes(prioridade)) {
    return res.status(400).json({ erro: `Prioridade inválida. Use: ${PRIORIDADES_VALIDAS.join(', ')}` });
  }

  const categoria = db.data.categorias.find((c) => c.id === parseInt(categoriaId));
  if (!categoria) return res.status(404).json({ erro: 'Categoria não encontrada.' });

  if (equipamentoId) {
    const eq = db.data.equipamentos.find((e) => e.id === parseInt(equipamentoId));
    if (!eq) return res.status(404).json({ erro: 'Equipamento não encontrado.' });
  }

  const novoId = db.nextId('chamados');
  const agora = new Date().toISOString();

  const novoChamado = {
    id: novoId,
    titulo,
    descricao,
    solicitanteId: req.usuario.id,
    tecnicoId: null,
    categoriaId: parseInt(categoriaId),
    equipamentoId: equipamentoId ? parseInt(equipamentoId) : null,
    prioridade,
    status: 'ABERTO',
    dataAbertura: agora,
    dataEncerramento: null,
  };

  db.data.chamados.push(novoChamado);

  adicionarHistorico(novoId, req.usuario.id, null, 'ABERTO', 'Chamado aberto.');

  db.save();
  return res.status(201).json(enriquecer(novoChamado));
});

router.patch('/:id/status', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const idx = db.data.chamados.findIndex((c) => c.id === id);
  if (idx === -1) return res.status(404).json({ erro: 'Chamado não encontrado.' });

  const chamado = db.data.chamados[idx];
  const { novoStatus, tecnicoId, observacao } = req.body;

  if (!novoStatus) {
    return res.status(400).json({ erro: 'novoStatus é obrigatório.' });
  }

  const transicoesPermitidas = TRANSICOES_VALIDAS[chamado.status] || [];
  if (!transicoesPermitidas.includes(novoStatus)) {
    return res.status(422).json({
      erro: `Transição inválida: '${chamado.status}' → '${novoStatus}'. Transições permitidas: ${transicoesPermitidas.join(', ') || 'nenhuma'}`,
    });
  }

  if (novoStatus === 'EM ATENDIMENTO') {
    const tecnico = tecnicoId
      ? db.data.usuarios.find((u) => u.id === parseInt(tecnicoId) && u.perfil === 'tecnico')
      : (chamado.tecnicoId ? db.data.usuarios.find((u) => u.id === chamado.tecnicoId) : null);

    if (!tecnico) {
      return res.status(400).json({
        erro: 'Para mover para EM ATENDIMENTO é necessário informar um tecnicoId válido.',
      });
    }
    chamado.tecnicoId = tecnico.id;
  }

  const statusAnterior = chamado.status;
  chamado.status = novoStatus;

  if (novoStatus === 'ENCERRADO') {
    chamado.dataEncerramento = new Date().toISOString();
  }

  db.data.chamados[idx] = chamado;

  adicionarHistorico(id, req.usuario.id, statusAnterior, novoStatus, observacao ?? null);

  db.save();
  return res.json(enriquecer(chamado));
});

router.post('/:id/observacoes', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const chamado = db.data.chamados.find((c) => c.id === id);
  if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado.' });

  const { comentario } = req.body;
  if (!comentario || comentario.trim() === '') {
    return res.status(400).json({ erro: 'O campo comentario não pode estar vazio.' });
  }

  const novoComentario = {
    id: db.nextId('comentarios'),
    chamadoId: id,
    usuarioId: req.usuario.id,
    usuarioNome: req.usuario.nome,
    comentario: comentario.trim(),
    dataCriacao: new Date().toISOString(),
  };

  db.data.comentarios.push(novoComentario);
  db.save();

  return res.status(201).json(novoComentario);
});

function enriquecer(chamado) {
  const solicitante = db.data.usuarios.find((u) => u.id === chamado.solicitanteId);
  const tecnico = chamado.tecnicoId
    ? db.data.usuarios.find((u) => u.id === chamado.tecnicoId)
    : null;
  const categoria = db.data.categorias.find((c) => c.id === chamado.categoriaId);
  const equipamento = chamado.equipamentoId
    ? db.data.equipamentos.find((e) => e.id === chamado.equipamentoId)
    : null;

  return {
    ...chamado,
    solicitanteNome: solicitante ? solicitante.nome : null,
    tecnicoNome: tecnico ? tecnico.nome : null,
    categoriaNome: categoria ? categoria.nome : null,
    equipamentoNome: equipamento ? equipamento.nome : null,
  };
}

function adicionarHistorico(chamadoId, usuarioId, statusAnterior, statusNovo, observacao) {
  db.data.historico.push({
    id: db.nextId('historico'),
    chamadoId,
    usuarioId,
    statusAnterior,
    statusNovo,
    observacao,
    dataEvento: new Date().toISOString(),
  });
}

module.exports = router;
