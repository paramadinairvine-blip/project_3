const { PrismaClient } = require('@prisma/client');
const { DEFAULT_PAGE_SIZE } = require('../utils/constants');

const prisma = new PrismaClient();

/**
 * Valid action types for audit logging.
 */
const ACTION_TYPES = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  ROLLBACK: 'ROLLBACK',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
};

/**
 * Map entity/tableName string to the corresponding Prisma model delegate.
 * Used by rollback to update the correct table.
 */
const getModelDelegate = (tableName) => {
  const map = {
    users: prisma.user,
    categories: prisma.category,
    products: prisma.product,
    suppliers: prisma.supplier,
    transactions: prisma.transaction,
    transaction_items: prisma.transactionItem,
    purchase_orders: prisma.purchaseOrder,
    purchase_order_items: prisma.purchaseOrderItem,
    stock_movements: prisma.stockMovement,
    stock_opnames: prisma.stockOpname,
    stock_opname_items: prisma.stockOpnameItem,
    projects: prisma.project,
    brands: prisma.brand,
    unit_of_measures: prisma.unitOfMeasure,
    unit_lembaga: prisma.unitLembaga,
    notifications: prisma.notification,
  };

  return map[tableName] || null;
};

/**
 * Create an audit log entry.
 *
 * @param {object} params
 * @param {string}  params.userId     - ID of the user performing the action
 * @param {string}  params.action     - Action type (CREATE, UPDATE, DELETE, etc.)
 * @param {string}  params.tableName  - Target table / entity name
 * @param {string}  [params.recordId] - ID of the affected record
 * @param {object}  [params.oldData]  - Previous state (for UPDATE / DELETE)
 * @param {object}  [params.newData]  - New state (for CREATE / UPDATE)
 * @param {string}  [params.ipAddress]
 * @param {string}  [params.userAgent]
 * @returns {Promise<object>} Created audit log record
 */
const createLog = async ({ userId, action, tableName, recordId, oldData, newData, ipAddress, userAgent }) => {
  return prisma.auditLog.create({
    data: {
      userId: userId || null,
      action,
      entity: tableName,
      entityId: recordId || null,
      oldData: oldData || undefined,
      newData: newData || undefined,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    },
  });
};

/**
 * Get paginated audit logs with optional filters.
 *
 * @param {object}  params
 * @param {number}  [params.page=1]
 * @param {number}  [params.limit=DEFAULT_PAGE_SIZE]
 * @param {string}  [params.userId]
 * @param {string}  [params.tableName]
 * @param {string}  [params.action]
 * @param {string}  [params.startDate]
 * @param {string}  [params.endDate]
 * @returns {Promise<{ data: object[], total: number, page: number, limit: number }>}
 */
const getLogs = async ({ page = 1, limit = DEFAULT_PAGE_SIZE, userId, tableName, action, startDate, endDate } = {}) => {
  const where = {};

  if (userId) {
    where.userId = userId;
  }
  if (tableName) {
    where.entity = tableName;
  }
  if (action) {
    where.action = action;
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { data, total, page, limit };
};

/**
 * Get a single audit log by ID.
 *
 * @param {string} id
 * @returns {Promise<object|null>}
 */
const getLogById = async (id) => {
  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, fullName: true, email: true, role: true },
      },
    },
  });

  if (!log) {
    throw Object.assign(new Error('Log audit tidak ditemukan'), { status: 404 });
  }

  return log;
};

/**
 * Rollback a change by restoring oldData from an audit log entry.
 *
 * Steps:
 * 1. Read the audit log and its oldData
 * 2. Update the record in the target table with oldData
 * 3. Create a new audit log with action "ROLLBACK"
 *
 * @param {string} logId  - ID of the audit log to rollback
 * @param {string} userId - ID of the user performing the rollback
 * @returns {Promise<object>} The restored record
 */
const rollback = async (logId, userId) => {
  const log = await prisma.auditLog.findUnique({ where: { id: logId } });

  if (!log) {
    throw Object.assign(new Error('Log audit tidak ditemukan'), { status: 404 });
  }

  if (!log.oldData) {
    throw Object.assign(new Error('Tidak ada data lama untuk di-rollback'), { status: 400 });
  }

  if (!log.entityId) {
    throw Object.assign(new Error('ID record tidak ditemukan pada log ini'), { status: 400 });
  }

  const model = getModelDelegate(log.entity);
  if (!model) {
    throw Object.assign(new Error(`Tabel "${log.entity}" tidak dikenali untuk rollback`), { status: 400 });
  }

  // Get current state before rollback for the new audit log
  const currentRecord = await model.findUnique({ where: { id: log.entityId } });

  if (!currentRecord) {
    throw Object.assign(new Error('Record yang akan di-rollback tidak ditemukan'), { status: 404 });
  }

  // Strip metadata fields that shouldn't be overwritten via rollback
  const restoreData = { ...log.oldData };
  delete restoreData.id;
  delete restoreData.createdAt;
  delete restoreData.updatedAt;

  // Update the record with old data
  const restored = await model.update({
    where: { id: log.entityId },
    data: restoreData,
  });

  // Create rollback audit log
  await createLog({
    userId,
    action: ACTION_TYPES.ROLLBACK,
    tableName: log.entity,
    recordId: log.entityId,
    oldData: currentRecord,
    newData: restored,
  });

  return restored;
};

module.exports = {
  ACTION_TYPES,
  createLog,
  getLogs,
  getLogById,
  rollback,
};
