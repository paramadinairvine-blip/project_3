const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleGuard');
const { validateProject } = require('../middlewares/validator');
const { ROLES } = require('../utils/constants');

// All routes require authentication
router.use(authenticate);

// All roles can read
router.get('/', projectController.getAll);
router.get('/:id', projectController.getById);
router.get('/:id/report', projectController.getMaterialReport);

// ADMIN & OPERATOR can create/update/manage materials
router.post('/', authorize(ROLES.ADMIN, ROLES.OPERATOR), validateProject, projectController.create);
router.put('/:id', authorize(ROLES.ADMIN, ROLES.OPERATOR), projectController.update);
router.post('/:id/materials', authorize(ROLES.ADMIN, ROLES.OPERATOR), projectController.addMaterial);
router.put('/:id/materials/:materialId', authorize(ROLES.ADMIN, ROLES.OPERATOR), projectController.updateMaterial);

// ADMIN only can delete
router.delete('/:id', authorize(ROLES.ADMIN), projectController.remove);

module.exports = router;
