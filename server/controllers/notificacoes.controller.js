const { paraInteiro } = require('../utils/formatar');
const {
  listarDoUsuario,
  marcarComoLida,
  marcarTodasComoLidas,
} = require('../services/notificacao.service');

function listar(req, res) {
  const limite = paraInteiro(req.query.limite) || 25;
  return res.json(listarDoUsuario(req.usuario.id, Math.min(50, Math.max(5, limite))));
}

function marcarLida(req, res) {
  const id = paraInteiro(req.params.id);
  const item = marcarComoLida(req.usuario.id, id);
  if (!item) return res.status(404).json({ erro: 'Notificação não encontrada.' });
  return res.json(item);
}

function marcarTodas(req, res) {
  const total = marcarTodasComoLidas(req.usuario.id);
  return res.json({ mensagem: 'Notificações marcadas como lidas.', atualizadas: total });
}

module.exports = {
  listar,
  marcarLida,
  marcarTodas,
};
