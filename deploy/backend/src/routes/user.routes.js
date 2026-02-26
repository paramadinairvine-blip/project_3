const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleGuard');
const { validateUser, validateUserUpdate, validateChangePassword } = require('../middlewares/validator');
const { ROLES } = require('../utils/constants');

// All routes require authentication
router.use(authenticate);

// ADMIN only
router.get('/', authorize(ROLES.ADMIN), userController.getAll);
router.get('/:id', authorize(ROLES.ADMIN), userController.getById);
router.post('/', authorize(ROLES.ADMIN), validateUser, userController.create);
router.put('/:id', authorize(ROLES.ADMIN), validateUserUpdate, userController.update);
router.delete('/:id', authorize(ROLES.ADMIN), userController.remove);

// ADMIN or self
router.put('/:id/change-password', validateChangePassword, userController.changePassword);

module.exports = router;
