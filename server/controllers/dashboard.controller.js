const db = require('../db');
const ind = require('../utils/indicadores');
const { calcularSla } = require('../services/sla.service');

const PERIODOS_VALIDOS = [1, 7, 30, 90, 365];

function obterMetricas(req, res) {
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
  const obterUsuario = (id) => usuarios.find((u) => u.id === id) || null;
  const tem = (...status) => (c) => status.includes(c.status);

  const recentes = [...chamados]
    .sort((a, b) => new Date(b.dataAtualizacao || b.dataAbertura) - new Date(a.dataAtualizacao || a.dataAbertura))
    .slice(0, 5)
    .map((c) => {
      const solicitante = obterUsuario(c.solicitanteId);
      const tecnico = c.tecnicoId ? obterUsuario(c.tecnicoId) : null;
      const cat = categorias.find((ct) => ct.id === c.categoriaId);
      return {
        id: c.id,
        titulo: c.titulo,
        status: c.status,
        prioridade: c.prioridade,
        categoriaNome: cat ? cat.nome : null,
        categoriaIcone: cat ? cat.icone || 'ti-tag' : 'ti-tag',
        solicitanteNome: solicitante ? solicitante.nome : null,
        solicitanteAvatar: solicitante ? solicitante.avatarUrl || null : null,
        tecnicoNome: tecnico ? tecnico.nome : null,
        tecnicoAvatar: tecnico ? tecnico.avatarUrl || null : null,
        dataAbertura: c.dataAbertura,
        dataAtualizacao: c.dataAtualizacao || c.dataAbertura,
        sla: calcularSla(c),
      };
    });

  const slasCalculados = chamados.map(calcularSla).filter(Boolean);
  const slaVencidos = slasCalculados.filter((s) => s.situacao === 'vencido').length;
  const slaEmAtencao = slasCalculados.filter((s) => s.situacao === 'atencao').length;
  const avaliacoes = chamados.map((c) => c.avaliacao?.nota).filter((n) => typeof n === 'number');
  const mediaSatisfacao = avaliacoes.length
    ? Math.round((avaliacoes.reduce((s, n) => s + n, 0) / avaliacoes.length) * 10) / 10
    : null;

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
    chamadosSemTecnico: ind.contar(
      chamados,
      (c) => !c.tecnicoId && !['RESOLVIDO', 'ENCERRADO', 'CANCELADO'].includes(c.status)
    ),
    slaVencidos,
    slaEmAtencao,
    tempoMedioResolucaoHoras: ind.media(chamados.map(ind.horasDeResolucao)),
    mediaSatisfacao,
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
}

module.exports = { obterMetricas };
