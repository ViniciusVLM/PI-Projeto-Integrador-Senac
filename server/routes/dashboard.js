const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const ind = require('../utils/indicadores');

const router = express.Router();

const PERIODOS_VALIDOS = [7, 30, 90, 365];

// GET /api/dashboard/metricas?periodo=30  (periodo em dias; sem periodo = todos)
router.get('/metricas', authMiddleware, (req, res) => {
  let dias = null;
  if (req.query.periodo && req.query.periodo !== 'todos') {
    dias = Number(req.query.periodo);
    if (!PERIODOS_VALIDOS.includes(dias)) {
      return res.status(400).json({ erro: `Período inválido. Use: ${PERIODOS_VALIDOS.join(', ')} ou todos.` });
    }
  }

  const chamados = ind.filtrarPorDias(ind.chamadosVisiveis(req.usuario), dias);
  const usuarios = db.data.usuarios;
  const categorias = db.data.categorias;
  const nome = (id) => (usuarios.find((u) => u.id === id) || {}).nome || null;
  const tem = (...status) => (c) => status.includes(c.status);

  const recentes = [...chamados]
    .sort((a, b) => new Date(b.dataAtualizacao || b.dataAbertura) - new Date(a.dataAtualizacao || a.dataAbertura))
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      titulo: c.titulo,
      status: c.status,
      prioridade: c.prioridade,
      categoriaNome: (categorias.find((cat) => cat.id === c.categoriaId) || {}).nome || null,
      solicitanteNome: nome(c.solicitanteId),
      tecnicoNome: c.tecnicoId ? nome(c.tecnicoId) : null,
      dataAbertura: c.dataAbertura,
      dataAtualizacao: c.dataAtualizacao || c.dataAbertura,
    }));

  const resposta = {
    escopo: req.usuario.perfil === 'cliente' ? 'meus-chamados' : 'todos',
    periodoDias: dias,
    totalChamados: chamados.length,
    prioridadeAltaCritica: ind.contar(chamados, (c) => c.prioridade === 'Alta' || c.prioridade === 'Crítica'),
    chamadosAbertos: ind.contar(chamados, tem('ABERTO')),
    chamadosEmAndamento: ind.contar(chamados, tem('EM ANÁLISE', 'EM ATENDIMENTO', 'AGUARDANDO USUÁRIO')),
    chamadosEmAtendimento: ind.contar(chamados, tem('EM ANÁLISE', 'EM ATENDIMENTO')),
    chamadosAguardando: ind.contar(chamados, tem('AGUARDANDO USUÁRIO')),
    chamadosResolvidos: ind.contar(chamados, tem('RESOLVIDO', 'ENCERRADO')),
    chamadosCancelados: ind.contar(chamados, tem('CANCELADO')),
    porCategoria: ind.porCategoria(chamados),
    porStatus: ind.porStatus(chamados),
    porPrioridade: ind.porPrioridade(chamados),
    recentes,
    geradoEm: new Date().toISOString(),
  };

  if (req.usuario.perfil === 'tecnico') {
    resposta.atribuidosAMim = ind.contar(
      chamados,
      (c) => c.tecnicoId === req.usuario.id && !['RESOLVIDO', 'ENCERRADO', 'CANCELADO'].includes(c.status)
    );
  }

  return res.json(resposta);
});

module.exports = router;
