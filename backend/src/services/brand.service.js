const { PrismaClient } = require('@prisma/client');
const { DEFAULT_PAGE_SIZE } = require('../utils/constants');

const prisma = new PrismaClient();

const getAll = async ({ page = 1, limit = DEFAULT_PAGE_SIZE, search, isActive } = {}) => {
  const where = {};

  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }
  if (typeof isActive === 'boolean') {
    where.isActive = isActive;
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.brand.findMany({
      where,
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.brand.count({ where }),
  ]);

  return { data, total, page, limit };
};

const getById = async (id) => {
  const brand = await prisma.brand.findUnique({
    where: { id },
    include: {
      products: {
        select: { id: true, name: true, sku: true, stock: true, isActive: true },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!brand) {
    throw Object.assign(new Error('Brand tidak ditemukan'), { status: 404 });
  }

  return brand;
};

const create = async ({ name }) => {
  return prisma.brand.create({
    data: { name },
  });
};

const update = async (id, { name, isActive }) => {
  const existing = await prisma.brand.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error('Brand tidak ditemukan'), { status: 404 });
  }

  const data = {};
  if (name !== undefined) data.name = name;
  if (isActive !== undefined) data.isActive = isActive;

  const brand = await prisma.brand.update({
    where: { id },
    data,
  });

  return { brand, oldData: existing };
};

const remove = async (id) => {
  const existing = await prisma.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (!existing) {
    throw Object.assign(new Error('Brand tidak ditemukan'), { status: 404 });
  }

  if (existing._count.products > 0) {
    await prisma.brand.update({
      where: { id },
      data: { isActive: false },
    });
    return { softDeleted: true, oldData: existing };
  }

  await prisma.brand.delete({ where: { id } });
  return { softDeleted: false, oldData: existing };
};

module.exports = { getAll, getById, create, update, remove };
