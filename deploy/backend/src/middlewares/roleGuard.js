const { errorResponse } = require('../utils/responseHelper');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Akses ditolak, silakan login terlebih dahulu', 401);
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 'Anda tidak memiliki izin untuk mengakses resource ini', 403);
    }

    next();
  };
};

module.exports = { authorize };
