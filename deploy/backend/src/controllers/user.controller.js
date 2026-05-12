const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');
const { createLog, ACTION_TYPES } = require('../services/auditLog.service');
const { hashPassword } = require('../services/auth.service');
const { DEFAULT_PAGE_SIZE, ROLES } = require('../utils/constants');

const userSelect = {
  id: true,
  username: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  isActive: true,
  avatar: true,
  createdAt: true,
  updatedAt: true,
};

const getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || DEFAULT_PAGE_SIZE;
    const search = req.query.search || '';
    const role = req.query.role;
    const skip = (page - 1) * limit;

    const where = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({ where, select: userSelect, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.user.count({ where }),
    ]);

    return paginatedResponse(res, data, total, page, limit, 'Daftar user berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const getById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: userSelect,
    });

    if (!user) return errorResponse(res, 'User tidak ditemukan', 404);

    return successResponse(res, user, 'Detail user berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const create = async (req, res) => {
  try {
    const { username, email, password, fullName, phone, role } = req.body;

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: { username, email, password: hashedPassword, fullName, phone, role },
      select: userSelect,
    });

    await createLog({
      userId: req.user.id,
      action: ACTION_TYPES.CREATE,
      tableName: 'users',
      recordId: user.id,
      newData: { username, email, fullName, role },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, user, 'User berhasil dibuat', 201);
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return errorResponse(res, 'User tidak ditemukan', 404);

    const { username, email, fullName, phone, role, isActive } = req.body;

    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: userSelect,
    });

    await createLog({
      userId: req.user.id,
      action: ACTION_TYPES.UPDATE,
      tableName: 'users',
      recordId: id,
      oldData: { username: existing.username, email: existing.email, fullName: existing.fullName, role: existing.role },
      newData: updateData,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, user, 'User berhasil diperbarui');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return errorResponse(res, 'User tidak ditemukan', 404);

    if (existing.id === req.user.id) {
      return errorResponse(res, 'Tidak dapat menghapus akun sendiri', 400);
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await createLog({
      userId: req.user.id,
      action: ACTION_TYPES.DELETE,
      tableName: 'users',
      recordId: id,
      oldData: { username: existing.username, email: existing.email, isActive: true },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, null, 'User berhasil dinonaktifkan');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    // Allow: ADMIN can change anyone's password, non-admin can only change own
    if (req.user.role !== ROLES.ADMIN && req.user.id !== id) {
      return errorResponse(res, 'Anda tidak memiliki izin untuk mengubah password user lain', 403);
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return errorResponse(res, 'User tidak ditemukan', 404);

    // Non-admin must provide old password
    if (req.user.role !== ROLES.ADMIN) {
      if (!oldPassword) {
        return errorResponse(res, 'Password lama wajib diisi', 400);
      }
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return errorResponse(res, 'Password lama tidak sesuai', 400);
      }
    }

    if (!newPassword || newPassword.length < 6) {
      return errorResponse(res, 'Password baru minimal 6 karakter', 400);
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    await createLog({
      userId: req.user.id,
      action: ACTION_TYPES.UPDATE,
      tableName: 'users',
      recordId: id,
      newData: { passwordChanged: true },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return successResponse(res, null, 'Password berhasil diubah');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

module.exports = { getAll, getById, create, update, remove, changePassword };
