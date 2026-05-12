const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplier.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleGuard');
const { validateSupplier } = require('../middlewares/validator');
const { ROLES } = require('../utils/constants');

// All routes require authentication
router.use(authenticate);

// All roles can read
router.get('/', supplierController.getAll);
router.get('/:id', supplierController.getById);

// ADMIN & OPERATOR can create/update
router.post('/', authorize(ROLES.ADMIN, ROLES.OPERATOR), validateSupplier, supplierController.create);
router.put('/:id', authorize(ROLES.ADMIN, ROLES.OPERATOR), supplierController.update);

// ADMIN only can delete
router.delete('/:id', authorize(ROLES.ADMIN), supplierController.remove);

module.exports = router;
