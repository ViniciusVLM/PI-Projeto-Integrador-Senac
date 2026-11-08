const express = require('express');
const cors = require('cors');

const db = require('./db');
const authMiddleware = require('./middleware/auth');
const { hashSenha, senhaEhHash } = require('./utils/seguranca');
const { semSenha } = require('./utils/formatar');

const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const categoriasRoutes = require('./routes/categorias');
const equipamentosRoutes = require('./routes/equipamentos');
const chamadosRoutes = require('./routes/chamados');
const dashboardRoutes = require('./routes/dashboard');
const relatoriosRoutes = require('./routes/relatorios');

const app = express();
const PORT = process.env.PORT || 3000;

// Senhas antigas gravadas em texto puro passam a ser salvas com hash
function protegerSenhasAntigas() {
  const pendentes = db.data.usuarios.filter((u) => u.senha && !senhaEhHash(u.senha));
  pendentes.forEach((u) => {
    u.senha = hashSenha(u.senha);
  });
  if (pendentes.length) {
    db.save();
    console.log(`${pendentes.length} senha(s) antiga(s) convertida(s) para hash.`);
  }
}

app.use(cors({
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition'],
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mantida por compatibilidade; a rota oficial é /api/usuarios/tecnicos
app.get('/api/tecnicos', authMiddleware, (req, res) => {
  const tecnicos = db.data.usuarios
    .filter((u) => u.perfil === 'tecnico' && u.status === 'Ativo')
    .map(semSenha);
  return res.json(tecnicos);
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/equipamentos', equipamentosRoutes);
app.use('/api/chamados', chamadosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/relatorios', relatoriosRoutes);

app.use((req, res) => {
  res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  console.error('[ERRO]', err.message);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

if (require.main === module) {
  protegerSenhasAntigas();
  app.listen(PORT, () => {
    console.log(`SecureDesk API rodando em http://localhost:${PORT}`);
  });
}

module.exports = app;
