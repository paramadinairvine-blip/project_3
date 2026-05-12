const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stock.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleGuard');
const { ROLES } = require('../utils/constants');

// All routes require authentication + ADMIN or OPERATOR
router.use(authenticate, authorize(ROLES.ADMIN, ROLES.OPERATOR));

router.get('/', stockController.getAllOpname);
router.post('/', stockController.createOpname);
router.get('/:id', stockController.getOpnameById);
router.put('/:id/items/:itemId', stockController.updateOpnameItem);

// ADMIN only can complete
router.put('/:id/complete', authorize(ROLES.ADMIN), stockController.completeOpname);

module.exports = router;
