const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const notificacoesController = require('../controllers/notificacoes.controller');

const router = express.Router();

router.get('/', authMiddleware, notificacoesController.listar);
router.patch('/ler-todas', authMiddleware, notificacoesController.marcarTodas);
router.patch('/:id/lida', authMiddleware, notificacoesController.marcarLida);

module.exports = router;
