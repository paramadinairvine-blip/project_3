const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleGuard');
const { ROLES } = require('../utils/constants');

// All routes require authentication
router.use(authenticate);

// All roles can view dashboard and stock report
router.get('/dashboard', reportController.getDashboard);
router.get('/stock', reportController.getStockReport);

// ADMIN & VIEWER can view financial and trend reports
router.get('/financial', authorize(ROLES.ADMIN, ROLES.VIEWER), reportController.getFinancialReport);
router.get('/trend', authorize(ROLES.ADMIN, ROLES.VIEWER), reportController.getTrendReport);

module.exports = router;
