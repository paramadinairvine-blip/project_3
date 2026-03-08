// ==================== Store Info ====================

export const STORE_INFO = {
  NAME: 'TOKO MATERIAL PESANTREN DARUNNAJAH 2',
  SHORT_NAME: 'TOKO MATERIAL',
  SUBTITLE: 'PESANTREN DARUNNAJAH 2',
  COPYRIGHT: 'Pesantren Darunnajah 2',
};

// ==================== Enums ====================

export const ROLES = {
  ADMIN: 'ADMIN',
  KASIR: 'KASIR',
  VIEWER: 'VIEWER',
};

export const TRANSACTION_TYPES = {
  CASH: 'CASH',
  BON: 'BON',
};

export const TRANSACTION_STATUS = {
  COMPLETED: 'COMPLETED',
  PENDING: 'PENDING',
  CANCELLED: 'CANCELLED',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.KASIR]: 'Kasir',
  [ROLES.VIEWER]: 'Viewer',
};

export const TRANSACTION_TYPE_LABELS = {
  [TRANSACTION_TYPES.CASH]: 'Tunai',
  [TRANSACTION_TYPES.BON]: 'Overbooking TU',
};

export const TRANSACTION_STATUS_LABELS = {
  [TRANSACTION_STATUS.COMPLETED]: 'Selesai',
  [TRANSACTION_STATUS.PENDING]: 'Tertunda',
  [TRANSACTION_STATUS.CANCELLED]: 'Dibatalkan',
};

export const TRANSACTION_STATUS_COLORS = {
  [TRANSACTION_STATUS.COMPLETED]: 'bg-green-100 text-green-800',
  [TRANSACTION_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800',
  [TRANSACTION_STATUS.CANCELLED]: 'bg-red-100 text-red-800',
};

export const TRANSACTION_TYPE_COLORS = {
  [TRANSACTION_TYPES.CASH]: 'bg-blue-100 text-blue-800',
  [TRANSACTION_TYPES.BON]: 'bg-orange-100 text-orange-800',
};
