const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { permitir } = require('../middlewares/auth.middleware');
const equipamentosController = require('../controllers/equipamentos.controller');

const router = express.Router();

router.get('/', authMiddleware, equipamentosController.listar);
router.get('/:id', authMiddleware, equipamentosController.obterPorId);
router.post('/', authMiddleware, permitir('admin'), equipamentosController.criar);
router.put('/:id', authMiddleware, permitir('admin'), equipamentosController.atualizar);
router.delete('/:id', authMiddleware, permitir('admin'), equipamentosController.inativar);

module.exports = router;
