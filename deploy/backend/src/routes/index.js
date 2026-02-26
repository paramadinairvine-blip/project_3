const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const auditLogRoutes = require('./auditLog.routes');
const categoryRoutes = require('./category.routes');
const productRoutes = require('./product.routes');
const supplierRoutes = require('./supplier.routes');
const unitRoutes = require('./unit.routes');
const transactionRoutes = require('./transaction.routes');
const purchaseOrderRoutes = require('./purchaseOrder.routes');
const stockRoutes = require('./stock.routes');
const stockOpnameRoutes = require('./stockOpname.routes');
const projectRoutes = require('./project.routes');
const reportRoutes = require('./report.routes');
const brandRoutes = require('./brand.routes');
const notificationRoutes = require('./notification.routes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/units', unitRoutes);
router.use('/transactions', transactionRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/stock', stockRoutes);
router.use('/stock-opname', stockOpnameRoutes);
router.use('/projects', projectRoutes);
router.use('/reports', reportRoutes);
router.use('/brands', brandRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
