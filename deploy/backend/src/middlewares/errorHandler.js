const { Prisma } = require('@prisma/client');
const { errorResponse } = require('../utils/responseHelper');

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.name || 'Error'}:`, err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // --- Prisma errors ---
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const fields = err.meta?.target;
        const fieldName = Array.isArray(fields) ? fields.join(', ') : fields;
        return errorResponse(
          res,
          `Data dengan ${fieldName} tersebut sudah ada`,
          409
        );
      }
      case 'P2025':
        return errorResponse(res, 'Data tidak ditemukan', 404);
      case 'P2003': {
        const field = err.meta?.field_name || 'relasi';
        return errorResponse(
          res,
          `Gagal memproses, terdapat referensi yang tidak valid pada ${field}`,
          400
        );
      }
      case 'P2014':
        return errorResponse(
          res,
          'Perubahan ini akan melanggar relasi data yang ada',
          400
        );
      default:
        return errorResponse(res, `Database error: ${err.message}`, 500);
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return errorResponse(res, 'Data yang dikirim tidak valid', 400);
  }

  // --- JWT errors ---
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Token tidak valid', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Token telah kadaluarsa', 401);
  }

  // --- Multer errors ---
  if (err.name === 'MulterError') {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return errorResponse(res, 'Ukuran file terlalu besar', 400);
      case 'LIMIT_FILE_COUNT':
        return errorResponse(res, 'Jumlah file melebihi batas', 400);
      case 'LIMIT_UNEXPECTED_FILE':
        return errorResponse(res, 'Tipe file tidak diizinkan', 400);
      default:
        return errorResponse(res, `Upload error: ${err.message}`, 400);
    }
  }

  // --- Validation errors (express-validator style thrown manually) ---
  if (err.name === 'ValidationError' || err.type === 'validation') {
    return errorResponse(res, err.message || 'Validasi gagal', 422, err.errors || null);
  }

  // --- Generic / unknown errors ---
  const statusCode = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Terjadi kesalahan pada server'
      : err.message || 'Terjadi kesalahan pada server';

  return errorResponse(res, message, statusCode);
};

module.exports = { errorHandler };
