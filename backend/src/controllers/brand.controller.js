const { PrismaClient } = require('@prisma/client');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');
const { createLog, ACTION_TYPES } = require('../services/auditLog.service');
const { DEFAULT_PAGE_SIZE } = require('../utils/constants');

const prisma = new PrismaClient();

const getAll = async (req, res) => {
  try {
    const { page, limit, search, isActive } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || DEFAULT_PAGE_SIZE;
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [data, total] = await Promise.all([
      prisma.brand.findMany({
        where,
        include: { _count: { select: { products: true } } },
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.brand.count({ where }),
    ]);

    return paginatedResponse(res, data, total, pageNum, limitNum, 'Daftar brand berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const getById = async (req, res) => {
  try {
    const brand = await prisma.brand.findUnique({
      where: { id: req.params.id },
      include: {
        products: {
          select: { id: true, name: true, sku: true, stock: true, isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!brand) {
      return errorResponse(res, 'Brand tidak ditemukan', 404);
    }

    return successResponse(res, brand, 'Detail brand berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const create = async (req, res) => {
  try {
    const { name } = req.body;

    const brand = await prisma.brand.create({
      data: { name },
    });

    await createLog({
      userId: req.user.id,
      action: ACTION_TYPES.CREATE,
      tableName: 'brands',
      recordId: brand.id,
      newData: brand,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, brand, 'Brand berhasil dibuat', 201);
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const existing = await prisma.brand.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(res, 'Brand tidak ditemukan', 404);
    }

    const data = {};
    if (name !== undefined) data.name = name;
    if (isActive !== undefined) data.isActive = isActive;

    const brand = await prisma.brand.update({
      where: { id },
      data,
    });

    await createLog({
      userId: req.user.id,
      action: ACTION_TYPES.UPDATE,
      tableName: 'brands',
      recordId: brand.id,
      oldData: existing,
      newData: brand,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, brand, 'Brand berhasil diperbarui');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) {
      return errorResponse(res, 'Brand tidak ditemukan', 404);
    }

    if (existing._count.products > 0) {
      // Soft delete - set inactive
      await prisma.brand.update({
        where: { id },
        data: { isActive: false },
      });

      return successResponse(res, null, 'Brand berhasil dinonaktifkan (memiliki produk terkait)');
    }

    await prisma.brand.delete({ where: { id } });

    await createLog({
      userId: req.user.id,
      action: ACTION_TYPES.DELETE,
      tableName: 'brands',
      recordId: id,
      oldData: existing,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, null, 'Brand berhasil dihapus');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

module.exports = { getAll, getById, create, update, remove };
