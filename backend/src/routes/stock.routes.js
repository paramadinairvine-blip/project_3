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

// ADMIN only can adjust (specific route before wildcard)
router.post('/adjustment', authorize(ROLES.ADMIN), stockController.adjustStock);

// Wildcard route last
router.get('/:productId', stockController.getStockByProduct);

module.exports = router;
