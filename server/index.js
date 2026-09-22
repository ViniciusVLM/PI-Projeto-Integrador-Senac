const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const categoriasRoutes = require('./routes/categorias');
const equipamentosRoutes = require('./routes/equipamentos');
const chamadosRoutes = require('./routes/chamados');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const authMiddleware = require('./middleware/auth');
const db = require('./db');

app.get('/api/tecnicos', authMiddleware, (req, res) => {
  const tecnicos = db.data.usuarios
    .filter((u) => u.perfil === 'tecnico' && u.status === 'Ativo')
    .map(({ senha, ...u }) => u);
  return res.json(tecnicos);
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/equipamentos', equipamentosRoutes);
app.use('/api/chamados', chamadosRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error('[ERRO]', err.message);
  res.status(500).json({ erro: 'Erro interno do servidor.', detalhes: err.message });
});

app.listen(PORT, () => {
  console.log(`SecureDesk API rodando em http://localhost:${PORT}`);
});

module.exports = app;
