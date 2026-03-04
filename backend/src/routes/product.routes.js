const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roleGuard');
const { validateProduct } = require('../middlewares/validator');
const { ROLES } = require('../utils/constants');

// All routes require authentication
router.use(authenticate);

// All roles can read
router.get('/', productController.getAll);
router.get('/barcode/:barcode', productController.getByBarcode);
router.get('/:id', productController.getById);

// ADMIN & KASIR can create/update/upload
router.post('/', authorize(ROLES.ADMIN, ROLES.KASIR), validateProduct, productController.create);
router.put('/:id', authorize(ROLES.ADMIN, ROLES.KASIR), validateProduct, productController.update);
router.post('/:id/generate-barcode', authorize(ROLES.ADMIN, ROLES.KASIR), productController.generateBarcode);
router.post('/upload-image', authorize(ROLES.ADMIN, ROLES.KASIR), productController.upload.single('image'), productController.uploadImage);

// ADMIN only can delete
router.delete('/:id', authorize(ROLES.ADMIN), productController.remove);

module.exports = router;
