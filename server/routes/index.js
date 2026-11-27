const express = require('express');
const db = require('../db');
const authMiddleware = require('../middlewares/auth.middleware');
const usuariosController = require('../controllers/usuarios.controller');
const { obterStatusPublicoSmtp } = require('../services/email.service');

const authRoutes = require('./auth');
const usuariosRoutes = require('./usuarios');
const categoriasRoutes = require('./categorias');
const equipamentosRoutes = require('./equipamentos');
const chamadosRoutes = require('./chamados');
const dashboardRoutes = require('./dashboard');
const relatoriosRoutes = require('./relatorios');
const notificacoesRoutes = require('./notificacoes');
const configuracoesRoutes = require('./configuracoes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: db.mysqlAtivo ? 'aiven-mysql' : 'local-json',
    smtp: obterStatusPublicoSmtp(),
    timestamp: new Date().toISOString(),
  });
});

// Rota legada mantida por compatibilidade; rota principal: /api/usuarios/tecnicos
router.get('/tecnicos', authMiddleware, usuariosController.listarTecnicos);

router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/categorias', categoriasRoutes);
router.use('/equipamentos', equipamentosRoutes);
router.use('/chamados', chamadosRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/relatorios', relatoriosRoutes);
router.use('/notificacoes', notificacoesRoutes);
router.use('/configuracoes', configuracoesRoutes);

module.exports = router;
