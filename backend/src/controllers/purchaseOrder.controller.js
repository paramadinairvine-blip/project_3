const poService = require('../services/purchaseOrder.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');
const { DEFAULT_PAGE_SIZE } = require('../utils/constants');

const getAll = async (req, res) => {
  try {
    const { page, limit, status, supplierId, startDate, endDate } = req.query;

    const result = await poService.getAll({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || DEFAULT_PAGE_SIZE,
      status,
      supplierId,
      startDate,
      endDate,
    });

    return paginatedResponse(
      res,
      result.data,
      result.total,
      result.page,
      result.limit,
      'Daftar purchase order berhasil diambil'
    );
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const getById = async (req, res) => {
  try {
    const po = await poService.getById(req.params.id);
    return successResponse(res, po, 'Detail purchase order berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const create = async (req, res) => {
  try {
    const po = await poService.create(req.body, req.user.id);
    return successResponse(res, po, 'Purchase order berhasil dibuat', 201);
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const update = async (req, res) => {
  try {
    const po = await poService.update(req.params.id, req.body, req.user.id);
    return successResponse(res, po, 'Purchase order berhasil diperbarui');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const send = async (req, res) => {
  try {
    const po = await poService.send(req.params.id, req.user.id);
    return successResponse(res, po, 'Purchase order berhasil dikirim ke supplier');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const receive = async (req, res) => {
  try {
    const { receivedItems } = req.body;
    console.log('[PO RECEIVE] id:', req.params.id, '| receivedItems:', JSON.stringify(receivedItems), '| userId:', req.user.id);
    const po = await poService.receive(req.params.id, receivedItems, req.user.id);
    return successResponse(res, po, 'Barang dari purchase order berhasil diterima');
  } catch (err) {
    console.error('[PO RECEIVE ERROR]', err.message, err.stack);
    return errorResponse(res, err.message, err.status || 500);
  }
};

const cancel = async (req, res) => {
  try {
    const po = await poService.cancel(req.params.id, req.user.id);
    return successResponse(res, po, 'Purchase order berhasil dibatalkan');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

module.exports = { getAll, getById, create, update, send, receive, cancel };
