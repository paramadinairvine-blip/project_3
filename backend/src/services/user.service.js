const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { hashPassword } = require('./auth.service');
const { DEFAULT_PAGE_SIZE, ROLES } = require('../utils/constants');

const prisma = new PrismaClient();

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
    throw Object.assign(new Error('User tidak ditemukan'), { status: 404 });
  }

  return user;
};

const create = async ({ username, email, password, fullName, phone, role }) => {
  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: { username, email, password: hashedPassword, fullName, phone, role },
    select: userSelect,
  });

  return {
    result: user,
    oldData: null,
    newData: { username, email, fullName, role },
  };
};

const update = async (id, { username, email, fullName, phone, role, isActive }) => {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error('User tidak ditemukan'), { status: 404 });
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
    throw Object.assign(new Error('User tidak ditemukan'), { status: 404 });
  }

  if (existing.id === requestingUserId) {
    throw Object.assign(new Error('Tidak dapat menghapus akun sendiri'), { status: 400 });
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
    throw Object.assign(new Error('Anda tidak memiliki izin untuk mengubah password user lain'), { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw Object.assign(new Error('User tidak ditemukan'), { status: 404 });
  }

  // Non-admin must provide old password
  if (requestingUser.role !== ROLES.ADMIN) {
    if (!oldPassword) {
      throw Object.assign(new Error('Password lama wajib diisi'), { status: 400 });
    }
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw Object.assign(new Error('Password lama tidak sesuai'), { status: 400 });
    }
  }

  if (!newPassword || newPassword.length < 6) {
    throw Object.assign(new Error('Password baru minimal 6 karakter'), { status: 400 });
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
