const returnService = require('../services/return.service');
const { successResponse, paginatedResponse } = require('../utils/responseHelper');

const getAll = async (req, res, next) => {
  try {
    const { page, limit, search, startDate, endDate } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const { data, total } = await returnService.getAll({
      page: pageNum,
      limit: limitNum,
      search,
      startDate,
      endDate,
    });
    return paginatedResponse(res, data, total, pageNum, limitNum);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await returnService.getById(req.params.id);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};

const getByTransaction = async (req, res, next) => {
  try {
    const data = await returnService.getByTransactionId(req.params.transactionId);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await returnService.create(req.body, req.user.id);
    successResponse(res, data, 'Retur berhasil diproses', 201);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  getByTransaction,
  create,
};
