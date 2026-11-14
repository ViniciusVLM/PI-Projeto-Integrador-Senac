const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { permitir } = require('../middleware/auth');
const { paraInteiro } = require('../utils/formatar');
const ind = require('../utils/indicadores');

const router = express.Router();

// Aplica os filtros da tela de relatórios: meses, categoria, técnico e status
function filtrar(query) {
  const meses = query.meses ? Number(query.meses) : 6;
  if (![1, 3, 6, 12].includes(meses)) {
    return { erro: 'Período inválido. Use meses = 1, 3, 6 ou 12.' };
  }

  const inicio = new Date();
  inicio.setDate(1);
  inicio.setHours(0, 0, 0, 0);
  inicio.setMonth(inicio.getMonth() - (meses - 1));

  let chamados = db.data.chamados.filter((c) => new Date(c.dataAbertura) >= inicio);

  if (query.categoriaId) chamados = chamados.filter((c) => c.categoriaId === paraInteiro(query.categoriaId));
  if (query.status) chamados = chamados.filter((c) => c.status === query.status);
  if (query.tecnicoId === 'nenhum') {
    chamados = chamados.filter((c) => !c.tecnicoId);
  } else if (query.tecnicoId) {
    chamados = chamados.filter((c) => c.tecnicoId === paraInteiro(query.tecnicoId));
  }

  return { chamados, meses, inicio };
}

function porMes(chamados, meses, inicio) {
  const lista = [];
  for (let i = 0; i < meses; i++) {
    const data = new Date(inicio.getFullYear(), inicio.getMonth() + i, 1);
    const total = ind.contar(chamados, (c) => {
      const abertura = new Date(c.dataAbertura);
      return abertura.getFullYear() === data.getFullYear() && abertura.getMonth() === data.getMonth();
    });
    lista.push({ mes: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`, rotulo: ind.rotuloMes(data), total });
  }
  return lista;
}

function porTecnico(chamados) {
  const grupos = new Map();
  chamados.forEach((c) => {
    const chave = c.tecnicoId || 0;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(c);
  });

  return [...grupos.entries()]
    .map(([tecnicoId, lista]) => {
      const resolvidos = ind.contar(lista, (c) => ind.STATUS_RESOLVIDOS.includes(c.status));
      const tecnico = db.data.usuarios.find((u) => u.id === tecnicoId);
      return {
        tecnicoId: tecnicoId || null,
        tecnicoNome: tecnico ? tecnico.nome : 'Não atribuído',
        atendidos: lista.length,
        resolvidos,
        taxaResolucao: ind.percentual(resolvidos, lista.length),
        tempoMedioResolucaoHoras: ind.media(lista.map(ind.horasDeResolucao)),
      };
    })
    .sort((a, b) => (a.tecnicoId === null) - (b.tecnicoId === null) || b.atendidos - a.atendidos);
}

router.get('/', authMiddleware, permitir('tecnico', 'admin'), (req, res) => {
  const filtro = filtrar(req.query);
  if (filtro.erro) return res.status(400).json({ erro: filtro.erro });

  const { chamados, meses, inicio } = filtro;
  const resolvidos = ind.contar(chamados, (c) => ind.STATUS_RESOLVIDOS.includes(c.status));

  return res.json({
    filtros: {
      meses,
      inicio: inicio.toISOString(),
      categoriaId: req.query.categoriaId ? paraInteiro(req.query.categoriaId) : null,
      tecnicoId: req.query.tecnicoId || null,
      status: req.query.status || null,
    },
    totalChamados: chamados.length,
    chamadosResolvidos: resolvidos,
    taxaResolucao: ind.percentual(resolvidos, chamados.length),
    tempoMedioResolucaoHoras: ind.media(chamados.map(ind.horasDeResolucao)),
    porMes: porMes(chamados, meses, inicio),
    porCategoria: ind.porCategoria(chamados),
    porPrioridade: ind.porPrioridade(chamados),
    porStatus: ind.porStatus(chamados),
    porTecnico: porTecnico(chamados),
    geradoEm: new Date().toISOString(),
  });
});

function celulaCsv(valor) {
  if (valor === null || valor === undefined) return '';
  const textoCelula = String(valor);
  return /[";\n]/.test(textoCelula) ? `"${textoCelula.replace(/"/g, '""')}"` : textoCelula;
}

function dataBr(iso) {
  return iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '';
}

// Exporta os chamados filtrados em CSV (abre direto no Excel)
router.get('/exportar', authMiddleware, permitir('tecnico', 'admin'), (req, res) => {
  const filtro = filtrar(req.query);
  if (filtro.erro) return res.status(400).json({ erro: filtro.erro });

  const nome = (id) => (db.data.usuarios.find((u) => u.id === id) || {}).nome || '';
  const categoria = (id) => (db.data.categorias.find((c) => c.id === id) || {}).nome || '';

  const cabecalho = ['ID', 'Título', 'Categoria', 'Prioridade', 'Status', 'Solicitante', 'Técnico', 'Abertura', 'Encerramento', 'Horas até resolver'];
  const linhas = filtro.chamados.map((c) => {
    const horas = ind.horasDeResolucao(c);
    return [
      c.id,
      c.titulo,
      categoria(c.categoriaId),
      c.prioridade,
      c.status,
      nome(c.solicitanteId),
      nome(c.tecnicoId),
      dataBr(c.dataAbertura),
      dataBr(c.dataEncerramento),
      horas === null ? '' : horas.toFixed(1).replace('.', ','),
    ];
  });

  const csv = [cabecalho, ...linhas].map((linha) => linha.map(celulaCsv).join(';')).join('\r\n');
  const arquivo = `relatorio-chamados-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${arquivo}"`);
  return res.send('﻿' + csv);
});

module.exports = router;
