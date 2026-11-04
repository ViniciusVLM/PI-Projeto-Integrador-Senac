const db = require('../db');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token de autenticação não fornecido.' });
  }

  const token = authHeader.split(' ')[1];
  const registro = db.data.tokens.find((t) => t.token === token);

  if (!registro) {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }

  const usuario = db.data.usuarios.find((u) => u.id === registro.usuarioId);
  if (!usuario || usuario.status !== 'Ativo') {
    return res.status(403).json({ erro: 'Usuário inativo ou não encontrado.' });
  }

  req.usuario = usuario;
  next();
}

module.exports = authMiddleware;
