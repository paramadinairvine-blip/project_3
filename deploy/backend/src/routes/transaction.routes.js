const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleGuard');
const { validateTransaction } = require('../middlewares/validator');
const { ROLES } = require('../utils/constants');

// All routes require authentication
router.use(authenticate);

// All roles can read
router.get('/', transactionController.getAll);
router.get('/:id', transactionController.getById);

// ADMIN & OPERATOR can create
router.post('/', authorize(ROLES.ADMIN, ROLES.OPERATOR), validateTransaction, transactionController.create);

// ADMIN only can cancel
router.put('/:id/cancel', authorize(ROLES.ADMIN), transactionController.cancel);

module.exports = router;
