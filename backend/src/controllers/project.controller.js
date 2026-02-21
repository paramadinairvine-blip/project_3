const projectService = require('../services/project.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');
const { DEFAULT_PAGE_SIZE } = require('../utils/constants');

const getAll = async (req, res) => {
  try {
    const { page, limit, status } = req.query;

    const result = await projectService.getAll({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || DEFAULT_PAGE_SIZE,
      status,
    });

    return paginatedResponse(
      res,
      result.data,
      result.total,
      result.page,
      result.limit,
      'Daftar proyek berhasil diambil'
    );
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const getById = async (req, res) => {
  try {
    const project = await projectService.getById(req.params.id);
    return successResponse(res, project, 'Detail proyek berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const create = async (req, res) => {
  try {
    const project = await projectService.create(req.body, req.user.id);
    return successResponse(res, project, 'Proyek berhasil dibuat', 201);
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const update = async (req, res) => {
  try {
    const project = await projectService.update(req.params.id, req.body, req.user.id);
    return successResponse(res, project, 'Proyek berhasil diperbarui');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const remove = async (req, res) => {
  try {
    await projectService.delete(req.params.id, req.user.id);
    return successResponse(res, null, 'Proyek berhasil dinonaktifkan');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const addMaterial = async (req, res) => {
  try {
    const material = await projectService.addMaterial(req.params.id, req.body, req.user.id);
    return successResponse(res, material, 'Material berhasil ditambahkan ke proyek', 201);
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const updateMaterial = async (req, res) => {
  try {
    const { usedQty } = req.body;
    if (usedQty === undefined || usedQty === null) {
      return errorResponse(res, 'Jumlah penggunaan (usedQty) wajib diisi', 400);
    }

    const material = await projectService.updateMaterialUsage(
      req.params.id,
      req.params.materialId,
      parseInt(usedQty),
      req.user.id
    );
    return successResponse(res, material, 'Penggunaan material berhasil diperbarui');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const getMaterialReport = async (req, res) => {
  try {
    const report = await projectService.getMaterialReport(req.params.id);
    return successResponse(res, report, 'Laporan material proyek berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

module.exports = { getAll, getById, create, update, remove, addMaterial, updateMaterial, getMaterialReport };
