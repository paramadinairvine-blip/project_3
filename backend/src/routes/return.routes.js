const express = require('express');
const router = express.Router();
const returnController = require('../controllers/return.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleGuard');
const { validateReturn } = require('../middlewares/validator');
const { ROLES } = require('../utils/constants');

router.use(authenticate);

router.get('/', returnController.getAll);
router.get('/transaction/:transactionId', returnController.getByTransaction);
router.get('/:id', returnController.getById);
router.post('/', authorize(ROLES.ADMIN, ROLES.KASIR), validateReturn, returnController.create);

module.exports = router;
