const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth');
const { validateLogin } = require('../middlewares/validator');

// Public routes
router.post('/login', validateLogin, authController.login);
router.post('/refresh', authController.refresh);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
