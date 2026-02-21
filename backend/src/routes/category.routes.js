const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleGuard');
const { ROLES } = require('../utils/constants');

// All routes require authentication
router.use(authenticate);

// All roles can read
router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getById);

// ADMIN & OPERATOR can create/update
router.post('/', authorize(ROLES.ADMIN, ROLES.OPERATOR), categoryController.create);
router.put('/:id', authorize(ROLES.ADMIN, ROLES.OPERATOR), categoryController.update);

// ADMIN only can delete
router.delete('/:id', authorize(ROLES.ADMIN), categoryController.remove);

module.exports = router;
