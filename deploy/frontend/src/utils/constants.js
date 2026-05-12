// ==================== Enums ====================

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

export const MOVEMENT_TYPES = {
  IN: 'IN',
  OUT: 'OUT',
  ADJUSTMENT: 'ADJUSTMENT',
  OPNAME: 'OPNAME',
};

export const REFERENCE_TYPES = {
  PO: 'PO',
  TRANSACTION: 'TRANSACTION',
  OPNAME: 'OPNAME',
  MANUAL: 'MANUAL',
};

export const PO_STATUS = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
};

export const PROJECT_STATUS = {
  PLANNING: 'PLANNING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const OPNAME_STATUS = {
  DRAFT: 'DRAFT',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
};

export const NOTIFICATION_STATUS = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
};

export const DEFAULT_PAGE_SIZE = 20;

// ==================== Labels Bahasa Indonesia ====================

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

export const MOVEMENT_TYPE_LABELS = {
  [MOVEMENT_TYPES.IN]: 'Masuk',
  [MOVEMENT_TYPES.OUT]: 'Keluar',
  [MOVEMENT_TYPES.ADJUSTMENT]: 'Penyesuaian',
  [MOVEMENT_TYPES.OPNAME]: 'Opname',
};

export const REFERENCE_TYPE_LABELS = {
  [REFERENCE_TYPES.PO]: 'Purchase Order',
  [REFERENCE_TYPES.TRANSACTION]: 'Transaksi',
  [REFERENCE_TYPES.OPNAME]: 'Stock Opname',
  [REFERENCE_TYPES.MANUAL]: 'Manual',
};

export const PO_STATUS_LABELS = {
  [PO_STATUS.DRAFT]: 'Draft',
  [PO_STATUS.SENT]: 'Terkirim',
  [PO_STATUS.RECEIVED]: 'Diterima',
  [PO_STATUS.CANCELLED]: 'Dibatalkan',
};

export const PROJECT_STATUS_LABELS = {
  [PROJECT_STATUS.PLANNING]: 'Perencanaan',
  [PROJECT_STATUS.IN_PROGRESS]: 'Sedang Berjalan',
  [PROJECT_STATUS.COMPLETED]: 'Selesai',
  [PROJECT_STATUS.CANCELLED]: 'Dibatalkan',
};

export const OPNAME_STATUS_LABELS = {
  [OPNAME_STATUS.DRAFT]: 'Draft',
  [OPNAME_STATUS.IN_PROGRESS]: 'Sedang Berjalan',
  [OPNAME_STATUS.COMPLETED]: 'Selesai',
};

export const NOTIFICATION_STATUS_LABELS = {
  [NOTIFICATION_STATUS.PENDING]: 'Menunggu',
  [NOTIFICATION_STATUS.SENT]: 'Terkirim',
  [NOTIFICATION_STATUS.FAILED]: 'Gagal',
};

// ==================== Badge Colors (Tailwind classes) ====================

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

export const PO_STATUS_COLORS = {
  [PO_STATUS.DRAFT]: 'bg-gray-100 text-gray-800',
  [PO_STATUS.SENT]: 'bg-blue-100 text-blue-800',
  [PO_STATUS.RECEIVED]: 'bg-green-100 text-green-800',
  [PO_STATUS.CANCELLED]: 'bg-red-100 text-red-800',
};

export const PROJECT_STATUS_COLORS = {
  [PROJECT_STATUS.PLANNING]: 'bg-gray-100 text-gray-800',
  [PROJECT_STATUS.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [PROJECT_STATUS.COMPLETED]: 'bg-green-100 text-green-800',
  [PROJECT_STATUS.CANCELLED]: 'bg-red-100 text-red-800',
};

export const OPNAME_STATUS_COLORS = {
  [OPNAME_STATUS.DRAFT]: 'bg-gray-100 text-gray-800',
  [OPNAME_STATUS.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [OPNAME_STATUS.COMPLETED]: 'bg-green-100 text-green-800',
};

export const MOVEMENT_TYPE_COLORS = {
  [MOVEMENT_TYPES.IN]: 'bg-green-100 text-green-800',
  [MOVEMENT_TYPES.OUT]: 'bg-red-100 text-red-800',
  [MOVEMENT_TYPES.ADJUSTMENT]: 'bg-yellow-100 text-yellow-800',
  [MOVEMENT_TYPES.OPNAME]: 'bg-purple-100 text-purple-800',
};

export const ROLE_COLORS = {
  [ROLES.ADMIN]: 'bg-red-100 text-red-800',
  [ROLES.OPERATOR]: 'bg-blue-100 text-blue-800',
  [ROLES.VIEWER]: 'bg-gray-100 text-gray-800',
};
