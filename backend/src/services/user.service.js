const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { hashPassword } = require('./auth.service');
const { DEFAULT_PAGE_SIZE, ROLES } = require('../utils/constants');
const AppError = require('../utils/AppError');

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

const getAll = async ({ page = 1, limit = DEFAULT_PAGE_SIZE, search, role } = {}) => {
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

  return { data, total, page, limit };
};

const getById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });

  if (!user) {
    throw new AppError('User tidak ditemukan', 404);
  }

  return user;
};

const create = async ({ username, email, password, fullName, phone, role }) => {
  const hashedPassword = await hashPassword(password);
  // Auto-generate username from email if not provided
  const finalUsername = username || email.split('@')[0];

  const user = await prisma.user.create({
    data: { username: finalUsername, email, password: hashedPassword, fullName, phone, role },
    select: userSelect,
  });

  return {
    result: user,
    oldData: null,
    newData: { username: finalUsername, email, fullName, role },
  };
};

const update = async (id, { username, email, fullName, phone, role, isActive }) => {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('User tidak ditemukan', 404);
  }

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

  return {
    result: user,
    oldData: { username: existing.username, email: existing.email, fullName: existing.fullName, role: existing.role },
    newData: updateData,
  };
};

const remove = async (id, requestingUserId) => {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('User tidak ditemukan', 404);
  }

  if (existing.id === requestingUserId) {
    throw new AppError('Tidak dapat menghapus akun sendiri', 400);
  }

  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  return {
    result: null,
    oldData: { username: existing.username, email: existing.email, isActive: true },
    newData: null,
  };
};

const changePassword = async (id, { oldPassword, newPassword, requestingUser }) => {
  // Allow: ADMIN can change anyone's password, non-admin can only change own
  if (requestingUser.role !== ROLES.ADMIN && requestingUser.id !== id) {
    throw new AppError('Anda tidak memiliki izin untuk mengubah password user lain', 403);
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError('User tidak ditemukan', 404);
  }

  // Non-admin must provide old password
  if (requestingUser.role !== ROLES.ADMIN) {
    if (!oldPassword) {
      throw new AppError('Password lama wajib diisi', 400);
    }
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new AppError('Password lama tidak sesuai', 400);
    }
  }

  if (!newPassword || newPassword.length < 6) {
    throw new AppError('Password baru minimal 6 karakter', 400);
  }

  const hashedPassword = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });

  return {
    result: null,
    oldData: null,
    newData: { passwordChanged: true },
  };
};

module.exports = {
  userSelect,
  getAll,
  getById,
  create,
  update,
  remove,
  changePassword,
};
