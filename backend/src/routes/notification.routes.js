const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleGuard');
const { ROLES } = require('../utils/constants');

// All routes require authentication
router.use(authenticate);

// All authenticated users can access their own notifications
router.get('/me', notificationController.getMyNotifications);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);

// ADMIN only
router.get('/', authorize(ROLES.ADMIN), notificationController.getAll);
router.post('/check-low-stock', authorize(ROLES.ADMIN), notificationController.checkLowStock);

module.exports = router;
