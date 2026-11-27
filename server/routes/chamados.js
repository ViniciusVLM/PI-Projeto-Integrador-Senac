const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { permitir } = require('../middlewares/auth.middleware');
const { STATUS_CHAMADO } = require('../config/constants');
const { receberAnexos } = require('../config/upload');
const chamadosController = require('../controllers/chamados.controller');

const router = express.Router();

router.get('/', authMiddleware, chamadosController.listar);
router.get('/:id', authMiddleware, chamadosController.obterPorId);
router.post('/', authMiddleware, receberAnexos, chamadosController.criar);
router.put('/:id', authMiddleware, chamadosController.atualizar);
router.delete('/:id', authMiddleware, permitir('admin'), chamadosController.excluir);

router.patch('/:id/assumir', authMiddleware, permitir('tecnico', 'admin'), chamadosController.assumir);
router.patch('/:id/status', authMiddleware, chamadosController.alterarStatus);
router.patch('/:id/reabrir', authMiddleware, chamadosController.reabrir);
router.patch('/:id/avaliar', authMiddleware, chamadosController.avaliarAtendimento);

router.post('/:id/comentarios', authMiddleware, chamadosController.comentar);
router.post('/:id/observacoes', authMiddleware, chamadosController.comentar);

router.post('/:id/anexos', authMiddleware, receberAnexos, chamadosController.adicionarAnexos);
router.get('/:id/anexos/:anexoId', authMiddleware, chamadosController.baixarAnexo);

module.exports = router;
module.exports.STATUS = STATUS_CHAMADO;
