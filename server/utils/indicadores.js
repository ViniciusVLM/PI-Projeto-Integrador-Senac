// Cálculos usados pelo dashboard e pelos relatórios
const db = require('../db');

const STATUS_LISTA = ['ABERTO', 'EM ANÁLISE', 'EM ATENDIMENTO', 'AGUARDANDO USUÁRIO', 'RESOLVIDO', 'ENCERRADO', 'CANCELADO'];
const PRIORIDADE_LISTA = ['Baixa', 'Média', 'Alta', 'Crítica'];
const STATUS_RESOLVIDOS = ['RESOLVIDO', 'ENCERRADO'];
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Cliente vê só os próprios chamados; técnico e admin veem todos
function chamadosVisiveis(usuario) {
  if (usuario.perfil === 'cliente') {
    return db.data.chamados.filter((c) => c.solicitanteId === usuario.id);
  }
  return db.data.chamados;
}

function filtrarPorDias(chamados, dias) {
  if (!dias) return chamados;
  const limite = Date.now() - dias * 24 * 60 * 60 * 1000;
  return chamados.filter((c) => new Date(c.dataAbertura).getTime() >= limite);
}

function contar(chamados, condicao) {
  return chamados.filter(condicao).length;
}

function porStatus(chamados) {
  return STATUS_LISTA.map((status) => ({ status, total: contar(chamados, (c) => c.status === status) }));
}

function porPrioridade(chamados) {
  return PRIORIDADE_LISTA.map((prioridade) => ({ prioridade, total: contar(chamados, (c) => c.prioridade === prioridade) }));
}

function porCategoria(chamados) {
  return db.data.categorias
    .map((cat) => ({ categoriaId: cat.id, categoriaNome: cat.nome, total: contar(chamados, (c) => c.categoriaId === cat.id) }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
}

// Momento em que o chamado foi resolvido (primeira vez que chegou em RESOLVIDO)
function dataResolucao(chamado) {
  const evento = db.data.historico
    .filter((h) => h.chamadoId === chamado.id && h.statusNovo === 'RESOLVIDO')
    .sort((a, b) => new Date(a.dataEvento) - new Date(b.dataEvento))[0];
  if (evento) return evento.dataEvento;
  if (chamado.status === 'ENCERRADO' && chamado.dataEncerramento) return chamado.dataEncerramento;
  return null;
}

function horasDeResolucao(chamado) {
  const fim = dataResolucao(chamado);
  if (!fim) return null;
  const horas = (new Date(fim) - new Date(chamado.dataAbertura)) / (60 * 60 * 1000);
  return horas >= 0 ? horas : null;
}

function media(valores) {
  const validos = valores.filter((v) => v !== null);
  if (!validos.length) return null;
  return Math.round((validos.reduce((soma, v) => soma + v, 0) / validos.length) * 10) / 10;
}

function percentual(parte, total) {
  return total ? Math.round((parte / total) * 100) : 0;
}

function rotuloMes(data) {
  return `${MESES[data.getMonth()]}/${String(data.getFullYear()).slice(2)}`;
}

module.exports = {
  STATUS_LISTA,
  PRIORIDADE_LISTA,
  STATUS_RESOLVIDOS,
  chamadosVisiveis,
  filtrarPorDias,
  contar,
  porStatus,
  porPrioridade,
  porCategoria,
  dataResolucao,
  horasDeResolucao,
  media,
  percentual,
  rotuloMes,
};
