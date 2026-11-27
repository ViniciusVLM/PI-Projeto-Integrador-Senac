const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { permitir } = require('../middlewares/auth.middleware');
const relatoriosController = require('../controllers/relatorios.controller');

const router = express.Router();

router.get('/', authMiddleware, permitir('tecnico', 'admin'), relatoriosController.obterRelatorio);
router.get('/exportar', authMiddleware, permitir('tecnico', 'admin'), relatoriosController.exportarCsv);

module.exports = router;
