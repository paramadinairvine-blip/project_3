import api from './axiosInstance';

// ==================== Auth ====================
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
};

// ==================== Product ====================
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getByBarcode: (barcode) => api.get(`/products/barcode/${barcode}`),
};

// ==================== Transaction ====================
export const transactionAPI = {
  getAll: (params) => api.get('/transactions', { params }),
  getById: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
};

// ==================== Stock ====================
export const stockAPI = {
  getAll: (params) => api.get('/stock', { params }),
  getByProduct: (productId) => api.get(`/stock/${productId}`),
};

// ==================== Report ====================
export const reportAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
};

// ==================== Unit ====================
export const unitAPI = {
  getLembaga: () => api.get('/units/lembaga'),
};
