const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/metricas', authMiddleware, (req, res) => {
  const chamados = db.data.chamados;
  const categorias = db.data.categorias;

  const totalChamados = chamados.length;

  const prioridadeAltaCritica = chamados.filter(
    (c) => c.prioridade === 'Alta' || c.prioridade === 'Crítica'
  ).length;

  const chamadosAbertos = chamados.filter((c) => c.status === 'ABERTO').length;

  const chamadosEmAndamento = chamados.filter(
    (c) => c.status === 'EM ATENDIMENTO' || c.status === 'EM ANÁLISE' || c.status === 'AGUARDANDO USUÁRIO'
  ).length;

  const chamadosResolvidos = chamados.filter(
    (c) => c.status === 'RESOLVIDO' || c.status === 'ENCERRADO'
  ).length;

  const chamadosCancelados = chamados.filter((c) => c.status === 'CANCELADO').length;

  const porCategoria = categorias.map((cat) => {
    const total = chamados.filter((c) => c.categoriaId === cat.id).length;
    return { categoriaId: cat.id, categoriaNome: cat.nome, total };
  }).filter((item) => item.total > 0);

  const statusList = ['ABERTO', 'EM ANÁLISE', 'EM ATENDIMENTO', 'AGUARDANDO USUÁRIO', 'RESOLVIDO', 'ENCERRADO', 'CANCELADO'];
  const porStatus = statusList.map((status) => ({
    status,
    total: chamados.filter((c) => c.status === status).length,
  }));

  const prioridadeList = ['Baixa', 'Média', 'Alta', 'Crítica'];
  const porPrioridade = prioridadeList.map((p) => ({
    prioridade: p,
    total: chamados.filter((c) => c.prioridade === p).length,
  }));

  const recentes = [...chamados]
    .sort((a, b) => new Date(b.dataAbertura) - new Date(a.dataAbertura))
    .slice(0, 5)
    .map((c) => {
      const cat = categorias.find((cat) => cat.id === c.categoriaId);
      const tec = db.data.usuarios.find((u) => u.id === c.tecnicoId);
      return {
        id: c.id,
        titulo: c.titulo,
        status: c.status,
        prioridade: c.prioridade,
        categoriaNome: cat ? cat.nome : null,
        tecnicoNome: tec ? tec.nome : null,
        dataAbertura: c.dataAbertura,
      };
    });

  return res.json({
    totalChamados,
    prioridadeAltaCritica,
    chamadosAbertos,
    chamadosEmAndamento,
    chamadosResolvidos,
    chamadosCancelados,
    porCategoria,
    porStatus,
    porPrioridade,
    recentes,
    geradoEm: new Date().toISOString(),
  });
});

module.exports = router;
