const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const dashboardController = require('../controllers/dashboard.controller');

const router = express.Router();

router.get('/metricas', authMiddleware, dashboardController.obterMetricas);

module.exports = router;
