const productService = require('../services/product.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');
const { DEFAULT_PAGE_SIZE } = require('../utils/constants');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ==================== Multer config for product images ====================

const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads', 'products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype.split('/')[1]);
  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Format file harus jpg, png, atau webp'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// ==================== Controllers ====================

const getAll = async (req, res) => {
  try {
    const { page, limit, search, categoryId, brandId, isActive } = req.query;

    const result = await productService.getAll({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || DEFAULT_PAGE_SIZE,
      search,
      categoryId,
      brandId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });

    return paginatedResponse(
      res,
      result.data,
      result.total,
      result.page,
      result.limit,
      'Daftar produk berhasil diambil'
    );
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const getById = async (req, res) => {
  try {
    const product = await productService.getById(req.params.id);
    return successResponse(res, product, 'Detail produk berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const create = async (req, res) => {
  try {
    const product = await productService.create(req.body, req.user.id);
    return successResponse(res, product, 'Produk berhasil dibuat', 201);
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const update = async (req, res) => {
  try {
    const product = await productService.update(req.params.id, req.body, req.user.id);
    return successResponse(res, product, 'Produk berhasil diperbarui');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const remove = async (req, res) => {
  try {
    await productService.delete(req.params.id, req.user.id);
    return successResponse(res, null, 'Produk berhasil dinonaktifkan');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const getByBarcode = async (req, res) => {
  try {
    const product = await productService.getByBarcode(req.params.barcode);
    return successResponse(res, product, 'Produk berhasil ditemukan');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const generateBarcode = async (req, res) => {
  try {
    const product = await productService.generateProductBarcode(req.params.id);
    return successResponse(res, product, 'Barcode berhasil di-generate');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'File gambar wajib diupload', 400);
    }

    const relativePath = '/uploads/products/' + req.file.filename;
    return successResponse(res, { url: relativePath }, 'Gambar berhasil diupload');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

module.exports = { getAll, getById, create, update, remove, getByBarcode, generateBarcode, uploadImage, upload };
