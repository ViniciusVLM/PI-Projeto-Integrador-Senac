const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const db = require('./db');
const apiRoutes = require('./routes');
const { rotaNaoEncontradaApi, tratadorGlobalDeErros } = require('./middlewares/error.middleware');

const app = express();

app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));

// Entrega pública de avatares enviados pelos usuários
const pastaAvatares = path.join(env.UPLOADS_DIR, 'avatars');
fs.mkdirSync(pastaAvatares, { recursive: true });
app.use('/api/uploads/avatars', express.static(pastaAvatares, { maxAge: '1d' }));

// Sincroniza leitura com o MySQL (quando ativo) antes de processar as rotas da API
app.use('/api', async (req, res, next) => {
  try {
    if (db.mysqlAtivo) {
      await db.refreshFromMySQL();
    }
  } catch {
    // Segue com estado em memória se houver oscilação momentânea de rede
  }
  next();
});

app.use('/api', apiRoutes);
app.use('/api', rotaNaoEncontradaApi);

// Em produção (Render), entrega os arquivos estáticos do build do Angular
if (fs.existsSync(path.join(env.FRONTEND_DIST_DIR, 'index.html'))) {
  app.use(express.static(env.FRONTEND_DIST_DIR));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(env.FRONTEND_DIST_DIR, 'index.html'));
  });
}

app.use(rotaNaoEncontradaApi);
app.use(tratadorGlobalDeErros);

module.exports = app;
