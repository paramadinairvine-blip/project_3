const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleGuard');
const { ROLES } = require('../utils/constants');

// All routes: ADMIN only
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/', notificationController.getAll);
router.post('/test', notificationController.sendTest);
router.get('/wa-status', notificationController.getWhatsAppStatus);
router.post('/check-low-stock', notificationController.checkLowStock);

module.exports = router;
