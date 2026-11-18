const db = require('../db');
const { tokenExpirado } = require('../utils/seguranca');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token de autenticação não fornecido.' });
  }

  const token = authHeader.split(' ')[1];
  const registro = db.data.tokens.find((t) => t.token === token);

  if (!registro || tokenExpirado(registro)) {
    return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
  }

  const usuario = db.data.usuarios.find((u) => u.id === registro.usuarioId);
  if (!usuario || usuario.status !== 'Ativo') {
    return res.status(403).json({ erro: 'Usuário inativo ou não encontrado.' });
  }

  req.usuario = usuario;
  req.token = token;
  next();
}

// Uso: router.post('/', authMiddleware, permitir('admin'), ...)
function permitir(...perfis) {
  return (req, res, next) => {
    if (!req.usuario || !perfis.includes(req.usuario.perfil)) {
      return res.status(403).json({ erro: 'Você não tem permissão para esta ação.' });
    }
    next();
  };
}

module.exports = authMiddleware;
module.exports.permitir = permitir;
