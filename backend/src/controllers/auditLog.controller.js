const auditLogService = require('../services/auditLog.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');

const getAll = async (req, res) => {
  try {
    const { page, limit, userId, tableName, action, startDate, endDate } = req.query;

    const result = await auditLogService.getLogs({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      userId,
      tableName,
      action,
      startDate,
      endDate,
    });

    return paginatedResponse(
      res,
      result.data,
      result.total,
      result.page,
      result.limit,
      'Daftar audit log berhasil diambil'
    );
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const getById = async (req, res) => {
  try {
    const log = await auditLogService.getLogById(req.params.id);
    return successResponse(res, log, 'Detail audit log berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const rollback = async (req, res) => {
  try {
    const restored = await auditLogService.rollback(req.params.id, req.user.id);
    return successResponse(res, restored, 'Rollback berhasil dilakukan');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

module.exports = { getAll, getById, rollback };
