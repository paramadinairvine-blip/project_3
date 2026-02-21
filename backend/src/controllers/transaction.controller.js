const transactionService = require('../services/transaction.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');
const { DEFAULT_PAGE_SIZE } = require('../utils/constants');

const getAll = async (req, res) => {
  try {
    const { page, limit, type, status, unitLembagaId, startDate, endDate } = req.query;

    const result = await transactionService.getAll({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || DEFAULT_PAGE_SIZE,
      type,
      status,
      unitLembagaId,
      startDate,
      endDate,
    });

    return paginatedResponse(
      res,
      result.data,
      result.total,
      result.page,
      result.limit,
      'Daftar transaksi berhasil diambil'
    );
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const getById = async (req, res) => {
  try {
    const transaction = await transactionService.getById(req.params.id);
    return successResponse(res, transaction, 'Detail transaksi berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const create = async (req, res) => {
  try {
    const transaction = await transactionService.create(req.body, req.user.id);
    return successResponse(res, transaction, 'Transaksi berhasil dibuat', 201);
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const cancel = async (req, res) => {
  try {
    const transaction = await transactionService.cancel(req.params.id, req.user.id);
    return successResponse(res, transaction, 'Transaksi berhasil dibatalkan');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

module.exports = { getAll, getById, create, cancel };
