const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/responseHelper');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 'Akses ditolak, silakan login terlebih dahulu', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token telah kadaluarsa', 401);
    }
    if (err.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Token tidak valid', 401);
    }
    return errorResponse(res, 'Akses ditolak, silakan login terlebih dahulu', 401);
  }
};

module.exports = { authenticate };
