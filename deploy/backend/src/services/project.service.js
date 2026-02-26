const prisma = require('../config/database');
const { DEFAULT_PAGE_SIZE } = require('../utils/constants');
const { createLog, ACTION_TYPES } = require('./auditLog.service');

// ─── shared includes ────────────────────────────────────────────────

const projectIncludes = {
  creator: { select: { id: true, fullName: true } },
  updater: { select: { id: true, fullName: true } },
  materials: {
    include: {
      product: {
        select: { id: true, name: true, sku: true, unit: true, sellPrice: true, stock: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
  transactions: {
    select: { id: true, transactionNumber: true, total: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  },
};

// ─── public API ─────────────────────────────────────────────────────

/**
 * List projects with pagination and optional status filter.
 */
const getAll = async ({ page = 1, limit = DEFAULT_PAGE_SIZE, status } = {}) => {
  const where = { isActive: true };
  if (status) where.status = status;

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        creator: { select: { id: true, fullName: true } },
        materials: {
          include: {
            product: { select: { id: true, name: true, unit: true } },
          },
        },
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.project.count({ where }),
  ]);

  // Enrich with progress summary
  const enriched = data.map((p) => {
    const totalEstimated = p.materials.reduce((s, m) => s + m.estimatedQty, 0);
    const totalUsed = p.materials.reduce((s, m) => s + m.usedQty, 0);
    const progressPercent = totalEstimated > 0 ? Math.round((totalUsed / totalEstimated) * 100) : 0;

    return {
      ...p,
      progressPercent,
      budgetRemaining: Number(p.budget) - Number(p.spent),
    };
  });

  return { data: enriched, total, page, limit };
};

/**
 * Get a single project with full detail: materials, transactions, budget summary.
 */
const getById = async (id) => {
  const project = await prisma.project.findUnique({
    where: { id },
    include: projectIncludes,
  });

  if (!project) throw Object.assign(new Error('Proyek tidak ditemukan'), { status: 404 });

  // Build budget summary
  const totalEstimatedCost = project.materials.reduce(
    (sum, m) => sum + m.estimatedQty * Number(m.unitPrice),
    0
  );
  const totalUsedCost = project.materials.reduce(
    (sum, m) => sum + m.usedQty * Number(m.unitPrice),
    0
  );
  const totalEstimatedQty = project.materials.reduce((s, m) => s + m.estimatedQty, 0);
  const totalUsedQty = project.materials.reduce((s, m) => s + m.usedQty, 0);
  const progressPercent = totalEstimatedQty > 0
    ? Math.round((totalUsedQty / totalEstimatedQty) * 100)
    : 0;

  return {
    ...project,
    summary: {
      budget: Number(project.budget),
      spent: Number(project.spent),
      budgetRemaining: Number(project.budget) - Number(project.spent),
      totalEstimatedCost,
      totalUsedCost,
      totalEstimatedQty,
      totalUsedQty,
      progressPercent,
      materialCount: project.materials.length,
      transactionCount: project.transactions.length,
    },
  };
};

/**
 * Create a new project with optional materials list.
 *
 * data shape:
 * {
 *   name, description?, budget?, startDate?, endDate?,
 *   materials?: [{ productId, estimatedQty, unitPrice?, notes? }]
 * }
 */
const create = async (data, userId) => {
  const { materials, ...header } = data;

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        name: header.name,
        description: header.description || null,
        status: header.status || 'PLANNING',
        budget: header.budget || 0,
        startDate: header.startDate ? new Date(header.startDate) : null,
        endDate: header.endDate ? new Date(header.endDate) : null,
        createdBy: userId,
      },
    });

    // Add materials if provided
    if (materials && materials.length > 0) {
      for (const m of materials) {
        // Fetch product price if unitPrice not specified
        let unitPrice = m.unitPrice;
        if (unitPrice === undefined || unitPrice === null) {
          const product = await tx.product.findUnique({
            where: { id: m.productId },
            select: { sellPrice: true },
          });
          unitPrice = product ? product.sellPrice : 0;
        }

        await tx.projectMaterial.create({
          data: {
            projectId: created.id,
            productId: m.productId,
            estimatedQty: m.estimatedQty,
            unitPrice,
            notes: m.notes || null,
          },
        });
      }
    }

    return tx.project.findUnique({
      where: { id: created.id },
      include: projectIncludes,
    });
  });

  await createLog({
    userId,
    action: ACTION_TYPES.CREATE,
    tableName: 'projects',
    recordId: project.id,
    newData: { name: project.name, budget: project.budget, materialCount: materials?.length || 0 },
  });

  return project;
};

/**
 * Update project header fields.
 */
const update = async (id, data, userId) => {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Proyek tidak ditemukan'), { status: 404 });

  const project = await prisma.project.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name : undefined,
      description: data.description !== undefined ? data.description : undefined,
      status: data.status !== undefined ? data.status : undefined,
      budget: data.budget !== undefined ? data.budget : undefined,
      startDate: data.startDate !== undefined ? (data.startDate ? new Date(data.startDate) : null) : undefined,
      endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
      updatedBy: userId,
    },
    include: projectIncludes,
  });

  await createLog({
    userId,
    action: ACTION_TYPES.UPDATE,
    tableName: 'projects',
    recordId: id,
    oldData: existing,
    newData: project,
  });

  return project;
};

/**
 * Soft-delete a project.
 */
const remove = async (id, userId) => {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Proyek tidak ditemukan'), { status: 404 });

  const project = await prisma.project.update({
    where: { id },
    data: { isActive: false, updatedBy: userId },
  });

  await createLog({
    userId,
    action: ACTION_TYPES.DELETE,
    tableName: 'projects',
    recordId: id,
    oldData: existing,
  });

  return project;
};

/**
 * Add a material to a project.
 *
 * materialData: { productId, estimatedQty, unitPrice?, notes? }
 */
const addMaterial = async (projectId, materialData, userId) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw Object.assign(new Error('Proyek tidak ditemukan'), { status: 404 });

  let unitPrice = materialData.unitPrice;
  if (unitPrice === undefined || unitPrice === null) {
    const product = await prisma.product.findUnique({
      where: { id: materialData.productId },
      select: { sellPrice: true },
    });
    unitPrice = product ? product.sellPrice : 0;
  }

  const material = await prisma.projectMaterial.create({
    data: {
      projectId,
      productId: materialData.productId,
      estimatedQty: materialData.estimatedQty,
      unitPrice,
      notes: materialData.notes || null,
    },
    include: {
      product: { select: { id: true, name: true, sku: true, unit: true } },
    },
  });

  await createLog({
    userId,
    action: ACTION_TYPES.CREATE,
    tableName: 'project_materials',
    recordId: material.id,
    newData: material,
  });

  return material;
};

/**
 * Update the used quantity of a material in a project.
 */
const updateMaterialUsage = async (projectId, materialId, usedQty, userId) => {
  const material = await prisma.projectMaterial.findUnique({ where: { id: materialId } });
  if (!material || material.projectId !== projectId) {
    throw Object.assign(new Error('Material proyek tidak ditemukan'), { status: 404 });
  }

  const oldUsedQty = material.usedQty;

  const updated = await prisma.projectMaterial.update({
    where: { id: materialId },
    data: { usedQty },
    include: {
      product: { select: { id: true, name: true, sku: true, unit: true } },
    },
  });

  await createLog({
    userId,
    action: ACTION_TYPES.UPDATE,
    tableName: 'project_materials',
    recordId: materialId,
    oldData: { usedQty: oldUsedQty },
    newData: { usedQty },
  });

  return updated;
};

/**
 * Get a progress summary for a project.
 */
const getProgressSummary = async (projectId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      materials: {
        include: {
          product: { select: { id: true, name: true, unit: true } },
        },
      },
    },
  });

  if (!project) throw Object.assign(new Error('Proyek tidak ditemukan'), { status: 404 });

  const materials = project.materials.map((m) => {
    const estimatedCost = m.estimatedQty * Number(m.unitPrice);
    const usedCost = m.usedQty * Number(m.unitPrice);
    const percentUsed = m.estimatedQty > 0 ? Math.round((m.usedQty / m.estimatedQty) * 100) : 0;
    const remaining = m.estimatedQty - m.usedQty;

    return {
      id: m.id,
      product: m.product,
      estimatedQty: m.estimatedQty,
      usedQty: m.usedQty,
      remaining,
      unitPrice: Number(m.unitPrice),
      estimatedCost,
      usedCost,
      percentUsed,
    };
  });

  const totalEstimatedCost = materials.reduce((s, m) => s + m.estimatedCost, 0);
  const totalUsedCost = materials.reduce((s, m) => s + m.usedCost, 0);
  const totalEstimated = materials.reduce((s, m) => s + m.estimatedQty, 0);
  const totalUsed = materials.reduce((s, m) => s + m.usedQty, 0);
  const overallPercent = totalEstimated > 0 ? Math.round((totalUsed / totalEstimated) * 100) : 0;

  return {
    projectId: project.id,
    projectName: project.name,
    status: project.status,
    budget: Number(project.budget),
    spent: Number(project.spent),
    budgetRemaining: Number(project.budget) - Number(project.spent),
    budgetUsedPercent: Number(project.budget) > 0
      ? Math.round((Number(project.spent) / Number(project.budget)) * 100)
      : 0,
    totalEstimatedCost,
    totalUsedCost,
    overallMaterialPercent: overallPercent,
    materials,
  };
};

/**
 * Get a detailed material report for a project: estimated vs actual, remaining needs.
 */
const getMaterialReport = async (projectId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      materials: {
        include: {
          product: {
            select: { id: true, name: true, sku: true, unit: true, stock: true, sellPrice: true },
          },
        },
      },
    },
  });

  if (!project) throw Object.assign(new Error('Proyek tidak ditemukan'), { status: 404 });

  const report = project.materials.map((m) => {
    const remaining = Math.max(0, m.estimatedQty - m.usedQty);
    const estimatedCost = m.estimatedQty * Number(m.unitPrice);
    const usedCost = m.usedQty * Number(m.unitPrice);
    const remainingCost = remaining * Number(m.unitPrice);
    const percentUsed = m.estimatedQty > 0 ? Math.round((m.usedQty / m.estimatedQty) * 100) : 0;
    const stockSufficient = m.product.stock >= remaining;

    return {
      materialId: m.id,
      product: m.product,
      estimatedQty: m.estimatedQty,
      usedQty: m.usedQty,
      remaining,
      unitPrice: Number(m.unitPrice),
      estimatedCost,
      usedCost,
      remainingCost,
      percentUsed,
      currentStock: m.product.stock,
      stockSufficient,
      shortfall: stockSufficient ? 0 : remaining - m.product.stock,
      notes: m.notes,
    };
  });

  const totalEstimated = report.reduce((s, r) => s + r.estimatedCost, 0);
  const totalUsed = report.reduce((s, r) => s + r.usedCost, 0);
  const totalRemaining = report.reduce((s, r) => s + r.remainingCost, 0);
  const insufficientItems = report.filter((r) => !r.stockSufficient);

  return {
    projectId: project.id,
    projectName: project.name,
    status: project.status,
    materials: report,
    summary: {
      totalItems: report.length,
      totalEstimatedCost: totalEstimated,
      totalUsedCost: totalUsed,
      totalRemainingCost: totalRemaining,
      insufficientStockCount: insufficientItems.length,
      insufficientItems: insufficientItems.map((i) => ({
        product: i.product.name,
        needed: i.remaining,
        available: i.currentStock,
        shortfall: i.shortfall,
      })),
    },
  };
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: remove,
  addMaterial,
  updateMaterialUsage,
  getProgressSummary,
  getMaterialReport,
};
