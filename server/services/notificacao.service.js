const db = require('../db');
const { agora } = require('../utils/formatar');
const { enviarNotificacaoChamado } = require('./email.service');

function criarNotificacao({ usuarioId, tipo, titulo, mensagem, chamadoId = null, enviarEmail = false, assuntoEmail = null }) {
  if (!usuarioId) return null;

  const usuario = db.data.usuarios.find((u) => u.id === usuarioId && u.status === 'Ativo');
  if (!usuario) return null;

  const item = {
    id: db.nextId('notificacoes'),
    usuarioId,
    tipo: tipo || 'chamado',
    titulo,
    mensagem,
    chamadoId,
    lida: false,
    criadaEm: agora(),
  };

  db.data.notificacoes.push(item);

  // Mantém apenas as 100 notificações mais recentes por usuário para evitar crescimento infinito
  const doUsuario = db.data.notificacoes.filter((n) => n.usuarioId === usuarioId);
  if (doUsuario.length > 100) {
    const removerIds = new Set(
      doUsuario
        .sort((a, b) => new Date(a.criadaEm) - new Date(b.criadaEm))
        .slice(0, doUsuario.length - 100)
        .map((n) => n.id)
    );
    db.data.notificacoes = db.data.notificacoes.filter((n) => !removerIds.has(n.id));
  }

  if (enviarEmail && usuario.email && chamadoId) {
    const chamado = db.data.chamados.find((c) => c.id === chamadoId);
    if (chamado) {
      enviarNotificacaoChamado({
        para: usuario.email,
        nome: usuario.nome,
        assunto: assuntoEmail || titulo,
        tituloChamado: chamado.titulo,
        chamadoId: chamado.id,
        status: chamado.status,
        detalhes: mensagem,
      }).catch(() => {});
    }
  }

  return item;
}

function listarDoUsuario(usuarioId, limite = 25) {
  const todas = (db.data.notificacoes || [])
    .filter((n) => n.usuarioId === usuarioId)
    .sort((a, b) => new Date(b.criadaEm) - new Date(a.criadaEm));

  return {
    naoLidas: todas.filter((n) => !n.lida).length,
    itens: todas.slice(0, limite),
  };
}

function marcarComoLida(usuarioId, notificacaoId) {
  const item = (db.data.notificacoes || []).find(
    (n) => n.id === notificacaoId && n.usuarioId === usuarioId
  );
  if (!item) return null;
  item.lida = true;
  db.save();
  return item;
}

function marcarTodasComoLidas(usuarioId) {
  let alteradas = 0;
  (db.data.notificacoes || []).forEach((n) => {
    if (n.usuarioId === usuarioId && !n.lida) {
      n.lida = true;
      alteradas++;
    }
  });
  if (alteradas > 0) db.save();
  return alteradas;
}

module.exports = {
  criarNotificacao,
  listarDoUsuario,
  marcarComoLida,
  marcarTodasComoLidas,
};
