const express = require('express');
const router = express.Router();
const unitController = require('../controllers/unit.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleGuard');
const { ROLES } = require('../utils/constants');

// All routes require authentication
router.use(authenticate);

// ==================== UnitOfMeasure ====================
router.get('/measures', unitController.getAllUnits);
router.post('/measures', authorize(ROLES.ADMIN, ROLES.OPERATOR), unitController.createUnit);
router.put('/measures/:id', authorize(ROLES.ADMIN, ROLES.OPERATOR), unitController.updateUnit);
router.delete('/measures/:id', authorize(ROLES.ADMIN), unitController.deleteUnit);

// ==================== UnitLembaga ====================
router.get('/lembaga', unitController.getAllUnitLembaga);
router.post('/lembaga', authorize(ROLES.ADMIN, ROLES.OPERATOR), unitController.createUnitLembaga);
router.put('/lembaga/:id', authorize(ROLES.ADMIN, ROLES.OPERATOR), unitController.updateUnitLembaga);
router.delete('/lembaga/:id', authorize(ROLES.ADMIN), unitController.deleteUnitLembaga);

module.exports = router;
