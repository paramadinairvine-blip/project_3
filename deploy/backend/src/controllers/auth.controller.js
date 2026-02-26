const authService = require('../services/auth.service');
const { createLog, ACTION_TYPES } = require('../services/auditLog.service');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const prisma = require('../config/database');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    await createLog({
      userId: result.user.id,
      action: ACTION_TYPES.LOGIN,
      tableName: 'users',
      recordId: result.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, result, 'Login berhasil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);

    return successResponse(res, result, 'Token berhasil diperbarui');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);

    await createLog({
      userId: req.user.id,
      action: ACTION_TYPES.LOGOUT,
      tableName: 'users',
      recordId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, null, 'Logout berhasil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      return errorResponse(res, 'User tidak ditemukan', 404);
    }

    return successResponse(res, user, 'Data user berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

module.exports = { login, refresh, logout, me };
