const db = require('../db');
const { SLA_PADRAO_POR_PRIORIDADE, STATUS_FINALIZADOS, STATUS_CHAMADO } = require('../config/constants');

function obterPrazoHoras(chamado) {
  const mapaConfig = db.data?.configuracoes?.slaPorPrioridade || SLA_PADRAO_POR_PRIORIDADE;
  const prazoPrioridade = mapaConfig[chamado.prioridade];
  if (prazoPrioridade && Number(prazoPrioridade) > 0) {
    return Number(prazoPrioridade);
  }
  const cat = db.data?.categorias?.find((c) => c.id === chamado.categoriaId);
  if (cat?.slaHoras) return Number(cat.slaHoras);
  return Number(db.data?.configuracoes?.slaPadraoHoras || 24);
}

function momentoConclusao(chamado) {
  const resolvidoNoHistorico = (db.data?.historico || [])
    .filter((h) => h.chamadoId === chamado.id && h.statusNovo === STATUS_CHAMADO.RESOLVIDO)
    .sort((a, b) => new Date(a.dataEvento) - new Date(b.dataEvento))[0];

  if (resolvidoNoHistorico) return new Date(resolvidoNoHistorico.dataEvento);
  if (chamado.dataEncerramento) return new Date(chamado.dataEncerramento);
  if (chamado.status === STATUS_CHAMADO.RESOLVIDO && chamado.dataAtualizacao) {
    return new Date(chamado.dataAtualizacao);
  }
  return null;
}

function calcularSla(chamado) {
  if (!chamado?.dataAbertura) return null;

  const prazoHoras = obterPrazoHoras(chamado);
  const aberturaMs = new Date(chamado.dataAbertura).getTime();
  const limiteMs = aberturaMs + prazoHoras * 60 * 60 * 1000;
  const dataLimite = new Date(limiteMs).toISOString();

  if (chamado.status === STATUS_CHAMADO.CANCELADO) {
    return {
      prazoHoras,
      dataLimite,
      situacao: 'cancelado',
      rotulo: 'Cancelado',
      horasRestantes: null,
    };
  }

  if (chamado.status === STATUS_CHAMADO.RESOLVIDO || STATUS_FINALIZADOS.includes(chamado.status)) {
    const fim = momentoConclusao(chamado) || new Date();
    const dentroDoPrazo = fim.getTime() <= limiteMs;
    return {
      prazoHoras,
      dataLimite,
      situacao: dentroDoPrazo ? 'concluido_no_prazo' : 'concluido_atrasado',
      rotulo: dentroDoPrazo ? 'Atendido no SLA' : 'Concluído fora do SLA',
      horasRestantes: null,
    };
  }

  const diffHoras = Math.round(((limiteMs - Date.now()) / (60 * 60 * 1000)) * 10) / 10;

  if (diffHoras < 0) {
    return {
      prazoHoras,
      dataLimite,
      situacao: 'vencido',
      rotulo: 'SLA vencido',
      horasRestantes: diffHoras,
    };
  }

  // Últimos 25% do tempo disponível (ou menos de 2h) = atenção
  if (diffHoras <= Math.max(2, prazoHoras * 0.25)) {
    return {
      prazoHoras,
      dataLimite,
      situacao: 'atencao',
      rotulo: 'Próximo do vencimento',
      horasRestantes: diffHoras,
    };
  }

  return {
    prazoHoras,
    dataLimite,
    situacao: 'no_prazo',
    rotulo: 'Dentro do prazo',
    horasRestantes: diffHoras,
  };
}

module.exports = {
  obterPrazoHoras,
  calcularSla,
};
