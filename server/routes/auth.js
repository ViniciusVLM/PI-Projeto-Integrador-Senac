const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { receberAvatar } = require('../config/upload');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/login', authController.login);
router.post('/logout', authController.logout);

router.post('/registro', authController.cadastrar);
router.post('/cadastro', authController.cadastrar);
router.post('/register', authController.cadastrar);

router.post('/esqueci-senha', authController.esqueciSenha);
router.post('/redefinir-senha', authController.redefinirSenha);

router.get('/me', authMiddleware, authController.obterPerfil);
router.put('/me', authMiddleware, authController.atualizarPerfil);
router.post('/me/avatar', authMiddleware, receberAvatar, authController.uploadMeuAvatar);
router.put('/me/senha', authMiddleware, authController.alterarMinhaSenha);

module.exports = router;
