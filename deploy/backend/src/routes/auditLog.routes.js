const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLog.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleGuard');
const { ROLES } = require('../utils/constants');

// All routes: ADMIN only
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/', auditLogController.getAll);
router.get('/:id', auditLogController.getById);
router.post('/:id/rollback', auditLogController.rollback);

module.exports = router;
