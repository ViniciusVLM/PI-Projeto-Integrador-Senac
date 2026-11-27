const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { permitir } = require('../middlewares/auth.middleware');
const categoriasController = require('../controllers/categorias.controller');

const router = express.Router();

router.get('/', authMiddleware, categoriasController.listar);
router.get('/:id', authMiddleware, categoriasController.obterPorId);
router.post('/', authMiddleware, permitir('admin'), categoriasController.criar);
router.put('/:id', authMiddleware, permitir('admin'), categoriasController.atualizar);
router.delete('/:id', authMiddleware, permitir('admin'), categoriasController.remover);

module.exports = router;
