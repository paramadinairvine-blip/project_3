const prisma = require('../config/database');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');
const { createLog, ACTION_TYPES } = require('../services/auditLog.service');
const { DEFAULT_PAGE_SIZE } = require('../utils/constants');

const getAll = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null, isActive: true },
      include: {
        children: {
          where: { isActive: true },
          include: {
            children: { where: { isActive: true } },
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });

    return successResponse(res, categories, 'Daftar kategori berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const getById = async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        parent: { select: { id: true, name: true } },
        children: {
          where: { isActive: true },
          include: { _count: { select: { products: true } } },
        },
        products: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            buyPrice: true,
            sellPrice: true,
            stock: true,
            image: true,
          },
          orderBy: { name: 'asc' },
        },
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) return errorResponse(res, 'Kategori tidak ditemukan', 404);

    return successResponse(res, category, 'Detail kategori berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const create = async (req, res) => {
  try {
    const { name, description, parentId } = req.body;

    if (!name) return errorResponse(res, 'Nama kategori wajib diisi', 400);

    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) return errorResponse(res, 'Kategori induk tidak ditemukan', 404);
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
        parentId: parentId || null,
        createdBy: req.user.id,
      },
      include: {
        parent: { select: { id: true, name: true } },
      },
    });

    await createLog({
      userId: req.user.id,
      action: ACTION_TYPES.CREATE,
      tableName: 'categories',
      recordId: category.id,
      newData: { name, description, parentId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, category, 'Kategori berhasil dibuat', 201);
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return errorResponse(res, 'Kategori tidak ditemukan', 404);

    const { name, description, parentId } = req.body;

    if (parentId) {
      if (parentId === id) return errorResponse(res, 'Kategori tidak boleh menjadi induk diri sendiri', 400);
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) return errorResponse(res, 'Kategori induk tidak ditemukan', 404);
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (parentId !== undefined) updateData.parentId = parentId || null;
    updateData.updatedBy = req.user.id;

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: { select: { id: true, name: true } },
      },
    });

    await createLog({
      userId: req.user.id,
      action: ACTION_TYPES.UPDATE,
      tableName: 'categories',
      recordId: id,
      oldData: { name: existing.name, description: existing.description, parentId: existing.parentId },
      newData: updateData,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, category, 'Kategori berhasil diperbarui');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { children: true, products: true } } },
    });
    if (!existing) return errorResponse(res, 'Kategori tidak ditemukan', 404);

    if (existing._count.children > 0) {
      return errorResponse(res, 'Kategori masih memiliki sub-kategori, hapus sub-kategori terlebih dahulu', 400);
    }

    await prisma.category.update({
      where: { id },
      data: { isActive: false, updatedBy: req.user.id },
    });

    await createLog({
      userId: req.user.id,
      action: ACTION_TYPES.DELETE,
      tableName: 'categories',
      recordId: id,
      oldData: { name: existing.name, isActive: true },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, null, 'Kategori berhasil dinonaktifkan');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

module.exports = { getAll, getById, create, update, remove };
