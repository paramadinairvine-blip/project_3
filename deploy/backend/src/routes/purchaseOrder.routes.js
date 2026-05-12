const express = require('express');
const router = express.Router();
const poController = require('../controllers/purchaseOrder.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleGuard');
const { validatePurchaseOrder } = require('../middlewares/validator');
const { ROLES } = require('../utils/constants');

// All routes require authentication
router.use(authenticate);

// All roles can read
router.get('/', poController.getAll);
router.get('/:id', poController.getById);

// ADMIN & OPERATOR can create/update/send/receive
router.post('/', authorize(ROLES.ADMIN, ROLES.OPERATOR), validatePurchaseOrder, poController.create);
router.put('/:id', authorize(ROLES.ADMIN, ROLES.OPERATOR), poController.update);
router.put('/:id/send', authorize(ROLES.ADMIN, ROLES.OPERATOR), poController.send);
router.put('/:id/receive', authorize(ROLES.ADMIN, ROLES.OPERATOR), poController.receive);

// ADMIN only can cancel
router.put('/:id/cancel', authorize(ROLES.ADMIN), poController.cancel);

module.exports = router;
