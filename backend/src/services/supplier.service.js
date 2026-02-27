const { PrismaClient } = require('@prisma/client');
const { DEFAULT_PAGE_SIZE } = require('../utils/constants');

const prisma = new PrismaClient();

const getAll = async ({ page = 1, limit = DEFAULT_PAGE_SIZE, search } = {}) => {
  const where = { isActive: true };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { contactName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.supplier.count({ where }),
  ]);

  return { data, total, page, limit };
};

const getById = async (id) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      purchaseOrders: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          poNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        },
      },
      _count: { select: { products: true, purchaseOrders: true } },
    },
  });

  if (!supplier) {
    throw Object.assign(new Error('Supplier tidak ditemukan'), { status: 404 });
  }

  return supplier;
};

const create = async ({ name, contactName, phone, email, address, userId }) => {
  return prisma.supplier.create({
    data: {
      name,
      contactName,
      phone,
      email,
      address,
      createdBy: userId,
    },
  });
};

const update = async (id, { name, contactName, phone, email, address, userId }) => {
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error('Supplier tidak ditemukan'), { status: 404 });
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (contactName !== undefined) updateData.contactName = contactName;
  if (phone !== undefined) updateData.phone = phone;
  if (email !== undefined) updateData.email = email;
  if (address !== undefined) updateData.address = address;
  updateData.updatedBy = userId;

  const supplier = await prisma.supplier.update({
    where: { id },
    data: updateData,
  });

  return {
    supplier,
    oldData: {
      name: existing.name,
      contactName: existing.contactName,
      phone: existing.phone,
      email: existing.email,
      address: existing.address,
    },
    newData: updateData,
  };
};

const remove = async (id, userId) => {
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error('Supplier tidak ditemukan'), { status: 404 });
  }

  await prisma.supplier.update({
    where: { id },
    data: { isActive: false, updatedBy: userId },
  });

  return { oldData: { name: existing.name, isActive: true } };
};

module.exports = { getAll, getById, create, update, remove };
