function rotaNaoEncontradaApi(req, res) {
  return res.status(404).json({
    erro: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
}

function tratadorGlobalDeErros(err, req, res, next) {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }

  if (err && err.name === 'AppError' && err.status) {
    return res.status(err.status).json({ erro: err.message });
  }

  console.error('[ERRO INTERNO]', err?.stack || err?.message || err);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

module.exports = {
  rotaNaoEncontradaApi,
  tratadorGlobalDeErros,
};
