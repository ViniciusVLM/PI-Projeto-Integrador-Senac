const db = require('../db');
const {
  STATUS_CHAMADO,
  TRANSICOES_VALIDAS,
  TRANSICOES_DO_CLIENTE,
} = require('../config/constants');
const { agora } = require('../utils/formatar');
const { calcularSla } = require('./sla.service');

function obterUsuario(id) {
  if (!id) return null;
  return db.data.usuarios.find((u) => u.id === id) || null;
}

function nomeDoUsuario(id) {
  return obterUsuario(id)?.nome || null;
}

function transicoesPara(usuario, chamado) {
  if (usuario.perfil === 'cliente') {
    return chamado.solicitanteId === usuario.id
      ? TRANSICOES_DO_CLIENTE[chamado.status] || []
      : [];
  }
  return TRANSICOES_VALIDAS[chamado.status] || [];
}

function enriquecerChamado(chamado) {
  const solicitante = obterUsuario(chamado.solicitanteId);
  const tecnico = chamado.tecnicoId ? obterUsuario(chamado.tecnicoId) : null;
  const categoria = db.data.categorias.find((c) => c.id === chamado.categoriaId) || null;
  const equipamento = chamado.equipamentoId
    ? db.data.equipamentos.find((e) => e.id === chamado.equipamentoId) || null
    : null;
  const { anexos = [], ...dados } = chamado;

  return {
    ...dados,
    dataAtualizacao: chamado.dataAtualizacao || chamado.dataAbertura,
    solicitanteNome: solicitante ? solicitante.nome : null,
    solicitanteAvatar: solicitante ? solicitante.avatarUrl || null : null,
    solicitanteDepartamento: solicitante ? solicitante.departamento || null : null,
    solicitanteEmail: solicitante ? solicitante.email || null : null,
    tecnicoNome: tecnico ? tecnico.nome : null,
    tecnicoAvatar: tecnico ? tecnico.avatarUrl || null : null,
    tecnicoDepartamento: tecnico ? tecnico.departamento || null : null,
    categoriaNome: categoria ? categoria.nome : null,
    categoriaIcone: categoria ? categoria.icone || 'ti-tag' : 'ti-tag',
    equipamentoNome: equipamento ? equipamento.nome : null,
    equipamentoPatrimonio: equipamento ? equipamento.patrimonio : null,
    equipamentoTipo: equipamento ? equipamento.tipo : null,
    totalAnexos: anexos.length,
    sla: calcularSla(chamado),
    avaliacao: chamado.avaliacao || null,
  };
}

function adicionarHistorico(chamadoId, usuarioId, statusAnterior, statusNovo, observacao) {
  db.data.historico.push({
    id: db.nextId('historico'),
    chamadoId,
    usuarioId,
    statusAnterior,
    statusNovo,
    observacao: observacao || null,
    dataEvento: agora(),
  });
}

function marcarAtualizacao(chamado) {
  chamado.dataAtualizacao = agora();
}

function validarCategoria(categoriaId) {
  if (Number.isNaN(categoriaId) || categoriaId === null) return 'Categoria inválida.';
  const categoria = db.data.categorias.find((c) => c.id === categoriaId);
  if (!categoria) return 'Categoria não encontrada.';
  if (categoria.status !== 'Ativa') return 'Esta categoria está inativa.';
  return null;
}

function validarEquipamento(equipamentoId) {
  if (equipamentoId === null) return null;
  if (Number.isNaN(equipamentoId)) return 'Equipamento inválido.';
  const eq = db.data.equipamentos.find((e) => e.id === equipamentoId);
  return eq ? null : 'Equipamento não encontrado.';
}

function validarTecnico(tecnicoId) {
  return db.data.usuarios.find(
    (u) => u.id === tecnicoId && u.perfil === 'tecnico' && u.status === 'Ativo'
  );
}

function montarDetalhesChamado(chamado, usuarioSolicitante) {
  const historico = db.data.historico
    .filter((h) => h.chamadoId === chamado.id)
    .map((h) => {
      const autor = obterUsuario(h.usuarioId);
      return {
        ...h,
        usuarioNome: autor ? autor.nome : null,
        usuarioAvatar: autor ? autor.avatarUrl || null : null,
        usuarioPerfil: autor ? autor.perfil : null,
      };
    })
    .sort((a, b) => new Date(a.dataEvento) - new Date(b.dataEvento));

  const comentarios = db.data.comentarios
    .filter((c) => c.chamadoId === chamado.id)
    .filter((c) => (usuarioSolicitante.perfil === 'cliente' ? !c.interno : true))
    .map((c) => {
      const autor = obterUsuario(c.usuarioId);
      return {
        ...c,
        usuarioNome: autor ? autor.nome : c.usuarioNome || 'Usuário',
        usuarioAvatar: autor ? autor.avatarUrl || null : null,
        usuarioPerfil: autor ? autor.perfil : null,
        interno: Boolean(c.interno),
      };
    })
    .sort((a, b) => new Date(a.dataCriacao) - new Date(b.dataCriacao));

  const anexos = (chamado.anexos || []).map(({ arquivo, nomeSalvo, ...anexo }) => ({
    ...anexo,
    url: `/api/chamados/${chamado.id}/anexos/${anexo.id}`,
    ehImagem: /\.(png|jpe?g|gif|webp)$/i.test(anexo.nomeOriginal || ''),
  }));

  return {
    ...enriquecerChamado(chamado),
    historico,
    comentarios,
    anexos,
    transicoesPermitidas: transicoesPara(usuarioSolicitante, chamado),
  };
}

module.exports = {
  STATUS: STATUS_CHAMADO,
  obterUsuario,
  nomeDoUsuario,
  transicoesPara,
  enriquecerChamado,
  adicionarHistorico,
  marcarAtualizacao,
  validarCategoria,
  validarEquipamento,
  validarTecnico,
  montarDetalhesChamado,
};
