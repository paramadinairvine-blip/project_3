const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleGuard');
const { ROLES } = require('../utils/constants');

// All routes require authentication
router.use(authenticate);

// All authenticated users can view all reports (read-only)
router.get('/dashboard', reportController.getDashboard);
router.get('/stock', reportController.getStockReport);
router.get('/financial', reportController.getFinancialReport);
router.get('/trend', reportController.getTrendReport);
router.get('/laba-rugi', reportController.getLabaRugi);

module.exports = router;
