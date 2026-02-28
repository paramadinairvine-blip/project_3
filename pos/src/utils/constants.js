export const ROLES = {
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  VIEWER: 'VIEWER',
};

export const TRANSACTION_TYPES = {
  CASH: 'CASH',
  BON: 'BON',
  ANGGARAN: 'ANGGARAN',
};

export const TRANSACTION_STATUS = {
  COMPLETED: 'COMPLETED',
  PENDING: 'PENDING',
  CANCELLED: 'CANCELLED',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.OPERATOR]: 'Operator',
  [ROLES.VIEWER]: 'Viewer',
};

export const TRANSACTION_TYPE_LABELS = {
  [TRANSACTION_TYPES.CASH]: 'Tunai',
  [TRANSACTION_TYPES.BON]: 'Bon',
  [TRANSACTION_TYPES.ANGGARAN]: 'Anggaran',
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
  [TRANSACTION_TYPES.ANGGARAN]: 'bg-purple-100 text-purple-800',
};
