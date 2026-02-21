const { body, validationResult } = require('express-validator');
const { TRANSACTION_TYPES, ROLES, PROJECT_STATUS } = require('../utils/constants');

// ==================== Handle validation result ====================

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validasi gagal',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

// ==================== Auth ====================

const validateLogin = [
  body('email')
    .notEmpty().withMessage('Email wajib diisi')
    .isEmail().withMessage('Format email tidak valid'),
  body('password')
    .notEmpty().withMessage('Password wajib diisi')
    .isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
  handleValidationErrors,
];

const validateRefreshToken = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token wajib diisi'),
  handleValidationErrors,
];

// ==================== User ====================

const validateUser = [
  body('fullName')
    .notEmpty().withMessage('Nama lengkap wajib diisi')
    .isLength({ min: 2 }).withMessage('Nama lengkap minimal 2 karakter'),
  body('email')
    .notEmpty().withMessage('Email wajib diisi')
    .isEmail().withMessage('Format email tidak valid'),
  body('password')
    .notEmpty().withMessage('Password wajib diisi')
    .isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
  body('role')
    .notEmpty().withMessage('Role wajib diisi')
    .isIn(Object.values(ROLES)).withMessage(`Role harus salah satu dari: ${Object.values(ROLES).join(', ')}`),
  handleValidationErrors,
];

const validateUserUpdate = [
  body('fullName')
    .optional()
    .isLength({ min: 2 }).withMessage('Nama lengkap minimal 2 karakter'),
  body('email')
    .optional()
    .isEmail().withMessage('Format email tidak valid'),
  body('role')
    .optional()
    .isIn(Object.values(ROLES)).withMessage(`Role harus salah satu dari: ${Object.values(ROLES).join(', ')}`),
  handleValidationErrors,
];

const validateChangePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Password lama wajib diisi'),
  body('newPassword')
    .notEmpty().withMessage('Password baru wajib diisi')
    .isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter'),
  handleValidationErrors,
];

// ==================== Category ====================

const validateCategory = [
  body('name')
    .notEmpty().withMessage('Nama kategori wajib diisi')
    .isLength({ min: 2 }).withMessage('Nama kategori minimal 2 karakter'),
  handleValidationErrors,
];

// ==================== Product ====================

const validateProduct = [
  body('name')
    .notEmpty().withMessage('Nama produk wajib diisi'),
  body('categoryId')
    .notEmpty().withMessage('Kategori wajib diisi'),
  body('buyPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Harga beli harus berupa angka positif'),
  body('sellPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Harga jual harus berupa angka positif'),
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stok harus berupa angka positif'),
  body('minStock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stok minimum harus berupa angka positif'),
  body('maxStock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stok maksimum harus berupa angka positif'),
  handleValidationErrors,
];

// ==================== Transaction ====================

const validateTransaction = [
  body('type')
    .notEmpty().withMessage('Tipe transaksi wajib diisi')
    .isIn(Object.values(TRANSACTION_TYPES))
    .withMessage(`Tipe transaksi harus salah satu dari: ${Object.values(TRANSACTION_TYPES).join(', ')}`),
  body('items')
    .notEmpty().withMessage('Item transaksi wajib diisi')
    .isArray({ min: 1 }).withMessage('Item transaksi harus berupa array minimal 1 item'),
  body('items.*.productId')
    .notEmpty().withMessage('Product ID wajib diisi pada setiap item'),
  body('items.*.quantity')
    .notEmpty().withMessage('Jumlah wajib diisi pada setiap item')
    .isInt({ min: 1 }).withMessage('Jumlah harus minimal 1'),
  body('items.*.price')
    .notEmpty().withMessage('Harga wajib diisi pada setiap item')
    .isFloat({ min: 0 }).withMessage('Harga harus berupa angka positif'),
  handleValidationErrors,
];

// ==================== Purchase Order ====================

const validatePurchaseOrder = [
  body('supplierId')
    .notEmpty().withMessage('Supplier wajib diisi'),
  body('items')
    .notEmpty().withMessage('Item purchase order wajib diisi')
    .isArray({ min: 1 }).withMessage('Item purchase order harus berupa array minimal 1 item'),
  body('items.*.productId')
    .notEmpty().withMessage('Product ID wajib diisi pada setiap item'),
  body('items.*.quantity')
    .notEmpty().withMessage('Jumlah wajib diisi pada setiap item')
    .isInt({ min: 1 }).withMessage('Jumlah harus minimal 1'),
  body('items.*.price')
    .notEmpty().withMessage('Harga wajib diisi pada setiap item')
    .isFloat({ min: 0 }).withMessage('Harga harus berupa angka positif'),
  handleValidationErrors,
];

// ==================== Supplier ====================

const validateSupplier = [
  body('name')
    .notEmpty().withMessage('Nama supplier wajib diisi'),
  body('phone')
    .notEmpty().withMessage('Nomor telepon wajib diisi'),
  handleValidationErrors,
];

// ==================== Project ====================

const validateProject = [
  body('name')
    .notEmpty().withMessage('Nama proyek wajib diisi'),
  body('status')
    .optional()
    .isIn(Object.values(PROJECT_STATUS))
    .withMessage(`Status proyek harus salah satu dari: ${Object.values(PROJECT_STATUS).join(', ')}`),
  body('budget')
    .optional()
    .isFloat({ min: 0 }).withMessage('Anggaran harus berupa angka positif'),
  handleValidationErrors,
];

// ==================== Stock Opname ====================

const validateStockOpname = [
  body('items')
    .notEmpty().withMessage('Item opname wajib diisi')
    .isArray({ min: 1 }).withMessage('Item opname harus berupa array minimal 1 item'),
  body('items.*.productId')
    .notEmpty().withMessage('Product ID wajib diisi pada setiap item'),
  body('items.*.actualStock')
    .notEmpty().withMessage('Stok aktual wajib diisi pada setiap item')
    .isInt({ min: 0 }).withMessage('Stok aktual harus berupa angka positif'),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateLogin,
  validateRefreshToken,
  validateUser,
  validateUserUpdate,
  validateChangePassword,
  validateCategory,
  validateProduct,
  validateTransaction,
  validatePurchaseOrder,
  validateSupplier,
  validateProject,
  validateStockOpname,
};
