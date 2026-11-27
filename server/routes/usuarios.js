const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { permitir } = require('../middlewares/auth.middleware');
const { receberAvatar } = require('../config/upload');
const usuariosController = require('../controllers/usuarios.controller');

const router = express.Router();

router.get('/', authMiddleware, usuariosController.listar);
router.get('/tecnicos', authMiddleware, usuariosController.listarTecnicos);
router.get('/:id', authMiddleware, usuariosController.obterPorId);

router.post('/', authMiddleware, permitir('admin'), usuariosController.criar);
router.put('/:id', authMiddleware, permitir('admin'), usuariosController.atualizar);
router.post('/:id/avatar', authMiddleware, permitir('admin'), receberAvatar, usuariosController.uploadAvatarUsuario);
router.delete('/:id', authMiddleware, permitir('admin'), usuariosController.inativar);

module.exports = router;
