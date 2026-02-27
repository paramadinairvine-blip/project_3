const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ==================== UnitOfMeasure ====================

const getAllUnits = async () => {
  return prisma.unitOfMeasure.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
};

const createUnit = async ({ name, abbreviation }) => {
  if (!name || !abbreviation) {
    throw Object.assign(new Error('Nama dan singkatan wajib diisi'), { status: 400 });
  }

  const unit = await prisma.unitOfMeasure.create({
    data: { name, abbreviation },
  });

  return {
    result: unit,
    oldData: null,
    newData: { name, abbreviation },
  };
};

const updateUnit = async (id, { name, abbreviation, isActive }) => {
  const existing = await prisma.unitOfMeasure.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error('Satuan tidak ditemukan'), { status: 404 });
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (abbreviation !== undefined) updateData.abbreviation = abbreviation;
  if (isActive !== undefined) updateData.isActive = isActive;

  const unit = await prisma.unitOfMeasure.update({
    where: { id },
    data: updateData,
  });

  return {
    result: unit,
    oldData: { name: existing.name, abbreviation: existing.abbreviation },
    newData: updateData,
  };
};

const deleteUnit = async (id) => {
  const existing = await prisma.unitOfMeasure.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error('Satuan tidak ditemukan'), { status: 404 });
  }

  await prisma.unitOfMeasure.update({
    where: { id },
    data: { isActive: false },
  });

  return {
    result: null,
    oldData: { name: existing.name, isActive: true },
    newData: null,
  };
};

// ==================== UnitLembaga ====================

const getAllUnitLembaga = async () => {
  return prisma.unitLembaga.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
};

const createUnitLembaga = async ({ name }) => {
  if (!name) {
    throw Object.assign(new Error('Nama unit lembaga wajib diisi'), { status: 400 });
  }

  const unit = await prisma.unitLembaga.create({
    data: { name },
  });

  return {
    result: unit,
    oldData: null,
    newData: { name },
  };
};

const updateUnitLembaga = async (id, { name, isActive }) => {
  const existing = await prisma.unitLembaga.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error('Unit lembaga tidak ditemukan'), { status: 404 });
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (isActive !== undefined) updateData.isActive = isActive;

  const unit = await prisma.unitLembaga.update({
    where: { id },
    data: updateData,
  });

  return {
    result: unit,
    oldData: { name: existing.name },
    newData: updateData,
  };
};

const deleteUnitLembaga = async (id) => {
  const existing = await prisma.unitLembaga.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error('Unit lembaga tidak ditemukan'), { status: 404 });
  }

  await prisma.unitLembaga.update({
    where: { id },
    data: { isActive: false },
  });

  return {
    result: null,
    oldData: { name: existing.name, isActive: true },
    newData: null,
  };
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
