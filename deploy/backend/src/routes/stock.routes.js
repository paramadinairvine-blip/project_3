const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stock.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleGuard');
const { ROLES } = require('../utils/constants');

// All routes require authentication
router.use(authenticate);

// ==================== Stock ====================
// All roles can read
router.get('/', stockController.getAllStock);
router.get('/:productId', stockController.getStockByProduct);

// ADMIN only can adjust
router.post('/adjustment', authorize(ROLES.ADMIN), stockController.adjustStock);

module.exports = router;
