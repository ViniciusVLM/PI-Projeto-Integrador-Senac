const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { permitir } = require('../middlewares/auth.middleware');
const configuracoesController = require('../controllers/configuracoes.controller');

const router = express.Router();

router.get('/', authMiddleware, configuracoesController.obterParametros);
router.put('/', authMiddleware, permitir('admin'), configuracoesController.atualizarParametros);
router.put('/smtp', authMiddleware, permitir('admin'), configuracoesController.atualizarSmtp);
router.post('/smtp/testar', authMiddleware, permitir('admin'), configuracoesController.testarSmtp);

module.exports = router;
