class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }

  static badRequest(message = 'Data yang dikirim tidak valid') {
    return new AppError(message, 400);
  }

  static unauthorized(message = 'Akses ditolak, silakan login terlebih dahulu') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Anda tidak memiliki akses') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Data tidak ditemukan') {
    return new AppError(message, 404);
  }

  static conflict(message = 'Data sudah ada') {
    return new AppError(message, 409);
  }
}

module.exports = AppError;
