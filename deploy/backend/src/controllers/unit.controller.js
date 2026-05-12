const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { createLog, ACTION_TYPES } = require('../services/auditLog.service');

// ==================== UnitOfMeasure ====================

const getAllUnits = async (req, res) => {
  try {
    const units = await prisma.unitOfMeasure.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return successResponse(res, units, 'Daftar satuan berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const createUnit = async (req, res) => {
  try {
    const { name, abbreviation } = req.body;
    if (!name || !abbreviation) {
      return errorResponse(res, 'Nama dan singkatan wajib diisi', 400);
    }

    const unit = await prisma.unitOfMeasure.create({
      data: { name, abbreviation },
    });

    await createLog({
      userId: req.user.id,
      action: ACTION_TYPES.CREATE,
      tableName: 'unit_of_measures',
      recordId: unit.id,
      newData: { name, abbreviation },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, unit, 'Satuan berhasil dibuat', 201);
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.unitOfMeasure.findUnique({ where: { id } });
    if (!existing) return errorResponse(res, 'Satuan tidak ditemukan', 404);

    const { name, abbreviation, isActive } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (abbreviation !== undefined) updateData.abbreviation = abbreviation;
    if (isActive !== undefined) updateData.isActive = isActive;

    const unit = await prisma.unitOfMeasure.update({
      where: { id },
      data: updateData,
    });

    await createLog({
      userId: req.user.id,
      action: ACTION_TYPES.UPDATE,
      tableName: 'unit_of_measures',
      recordId: id,
      oldData: { name: existing.name, abbreviation: existing.abbreviation },
      newData: updateData,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, unit, 'Satuan berhasil diperbarui');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.unitOfMeasure.findUnique({ where: { id } });
    if (!existing) return errorResponse(res, 'Satuan tidak ditemukan', 404);

    await prisma.unitOfMeasure.update({
      where: { id },
      data: { isActive: false },
    });

    await createLog({
      userId: req.user.id,
      action: ACTION_TYPES.DELETE,
      tableName: 'unit_of_measures',
      recordId: id,
      oldData: { name: existing.name, isActive: true },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, null, 'Satuan berhasil dinonaktifkan');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

// ==================== UnitLembaga ====================

const getAllUnitLembaga = async (req, res) => {
  try {
    const units = await prisma.unitLembaga.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return successResponse(res, units, 'Daftar unit lembaga berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const createUnitLembaga = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return errorResponse(res, 'Nama unit lembaga wajib diisi', 400);

    const unit = await prisma.unitLembaga.create({
      data: { name },
    });

    await createLog({
      userId: req.user.id,
      action: ACTION_TYPES.CREATE,
      tableName: 'unit_lembaga',
      recordId: unit.id,
      newData: { name },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, unit, 'Unit lembaga berhasil dibuat', 201);
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const updateUnitLembaga = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.unitLembaga.findUnique({ where: { id } });
    if (!existing) return errorResponse(res, 'Unit lembaga tidak ditemukan', 404);

    const { name, isActive } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;

    const unit = await prisma.unitLembaga.update({
      where: { id },
      data: updateData,
    });

    await createLog({
      userId: req.user.id,
      action: ACTION_TYPES.UPDATE,
      tableName: 'unit_lembaga',
      recordId: id,
      oldData: { name: existing.name },
      newData: updateData,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, unit, 'Unit lembaga berhasil diperbarui');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const deleteUnitLembaga = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.unitLembaga.findUnique({ where: { id } });
    if (!existing) return errorResponse(res, 'Unit lembaga tidak ditemukan', 404);

    await prisma.unitLembaga.update({
      where: { id },
      data: { isActive: false },
    });

    await createLog({
      userId: req.user.id,
      action: ACTION_TYPES.DELETE,
      tableName: 'unit_lembaga',
      recordId: id,
      oldData: { name: existing.name, isActive: true },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, null, 'Unit lembaga berhasil dinonaktifkan');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

module.exports = {
  getAllUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  getAllUnitLembaga,
  createUnitLembaga,
  updateUnitLembaga,
  deleteUnitLembaga,
};
