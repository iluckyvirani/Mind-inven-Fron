import axiosInstance from './axiosInstance';

// ============================================
// Auth APIs
// ============================================
export const authAPI = {
  login: (data: { username: string; password: string }) =>
    axiosInstance.post('/auth/login', data),

  getProfile: () =>
    axiosInstance.get('/auth/me'),

  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    axiosInstance.post('/auth/change-password', data),

  refreshToken: () =>
    axiosInstance.post('/auth/refresh-token'),

  logout: () =>
    axiosInstance.post('/auth/logout'),
};

// =============================================
// Customer API
// =============================================
export const customerAPI = {
  getAll: (params?: Record<string, any>) =>
    axiosInstance.get('/customers', { params }),

  getById: (id: string) =>
    axiosInstance.get(`/customers/${id}`),

  create: (data: { name: string; phone: string; age?: number; address?: string; email?: string; bankName?: string; accountNo?: string; gstNo?: string }) =>
    axiosInstance.post('/customers', data),

  update: (id: string, data: { name?: string; phone?: string; age?: number; address?: string; email?: string; bankName?: string; accountNo?: string; gstNo?: string }) =>
    axiosInstance.put(`/customers/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`/customers/${id}`),

  getPurchaseHistory: (id: string, params?: Record<string, any>) =>
    axiosInstance.get(`/customers/${id}/purchases`, { params }),
};

// ============================================
// Pharmacy Dashboard API
// ============================================
export const pharmacyDashboardAPI = {
  getStats: () =>
    axiosInstance.get('/pharmacy/dashboard/stats'),

  getRecentSales: () =>
    axiosInstance.get('/pharmacy/dashboard/recent-sales'),

  getLowStockAlerts: () =>
    axiosInstance.get('/pharmacy/dashboard/low-stock'),

  getExpiryAlerts: () =>
    axiosInstance.get('/pharmacy/dashboard/expiry-alerts'),

  getRevenueChart: (params?: Record<string, any>) =>
    axiosInstance.get('/pharmacy/dashboard/revenue-chart', { params }),
};

// =============================================
// Sales / Billing API
// =============================================
// On create: takes customer name + phone, backend auto-creates/links
// customer by phone, creates the sale, returns invoice.
// =============================================
export const salesAPI = {
  create: (data: {
    customerName: string;
    customerPhone: string;
    items: Array<{
      medicineId: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
    }>;
    paymentMode: 'cash' | 'card' | 'upi';
    amountPaid: number;
    notes?: string;
  }) => axiosInstance.post('/sales', data),

  getAll: (params?: Record<string, any>) =>
    axiosInstance.get('/sales', { params }),

  getById: (id: string) =>
    axiosInstance.get(`/sales/${id}`),

  getReceipt: (id: string) =>
    axiosInstance.get(`/sales/${id}/receipt`),

  update: (id: string, data: Record<string, any>) =>
    axiosInstance.put(`/sales/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`/sales/${id}`),

  updatePayment: (id: string, data: Record<string, any>) =>
    axiosInstance.patch(`/sales/${id}/payment`, data),

  getDailySummary: (date: string) =>
    axiosInstance.get(`/sales/summary/${date}`),

  getByPhone: (phone: string, params?: Record<string, any>) =>
    axiosInstance.get(`/sales/by-phone/${phone}`, { params }),

  exportPdf: (params?: Record<string, any>) =>
    axiosInstance.get('/sales/export/pdf', { params, responseType: 'blob' }),

  // Sale Returns
  createReturn: (saleId: string, data: { items: Array<{ medicineId: string; quantity: number }>; reason?: string }) =>
    axiosInstance.post(`/sales/${saleId}/return`, data),

  getReturns: (saleId: string) =>
    axiosInstance.get(`/sales/${saleId}/returns`),

  getAllReturns: (params?: Record<string, any>) =>
    axiosInstance.get('/sales/returns', { params }),
};

// ============================================
// Pharmacy APIs (Medicines + Suppliers)
// ============================================
export const pharmacyAPI = {
  // Medicines
  getDashboard: () => axiosInstance.get('/pharmacy/dashboard'),
  getMedicines: (params?: Record<string, any>) => axiosInstance.get('/pharmacy/medicines', { params }),
  addMedicine: (data: Record<string, any>) => axiosInstance.post('/pharmacy/medicines', data),
  updateMedicine: (id: string, data: Record<string, any>) => axiosInstance.put(`/pharmacy/medicines/${id}`, data),
  deleteMedicine: (id: string) => axiosInstance.delete(`/pharmacy/medicines/${id}`),
  getMedicineById: (id: string) => axiosInstance.get(`/pharmacy/medicines/${id}`),
  addStock: (id: string, data: Record<string, any>) => axiosInstance.post(`/pharmacy/medicines/${id}/stock`, data),
  getCategories: () => axiosInstance.get('/pharmacy/categories'),
  getExpiringMedicines: (params?: Record<string, any>) => axiosInstance.get('/pharmacy/medicines/expiring', { params }),
  getLowStockMedicines: () => axiosInstance.get('/pharmacy/medicines/low-stock'),

  // Suppliers
  getSuppliers: (params?: Record<string, any>) => axiosInstance.get('/pharmacy/suppliers', { params }),
  addSupplier: (data: Record<string, any>) => axiosInstance.post('/pharmacy/suppliers', data),
  updateSupplier: (id: string, data: Record<string, any>) => axiosInstance.put(`/pharmacy/suppliers/${id}`, data),
  deleteSupplier: (id: string) => axiosInstance.delete(`/pharmacy/suppliers/${id}`),
  getSupplierById: (id: string) => axiosInstance.get(`/pharmacy/suppliers/${id}`),
  addSupplierPayment: (id: string, data: Record<string, any>) => axiosInstance.post(`/pharmacy/suppliers/${id}/payment`, data),
  getSupplierPayments: (id: string, params?: Record<string, any>) => axiosInstance.get(`/pharmacy/suppliers/${id}/payments`, { params }),

  // Supplier Returns
  createSupplierReturn: (id: string, data: { items: Array<{ medicineId: string; quantity: number }>; reason?: string }) =>
    axiosInstance.post(`/pharmacy/suppliers/${id}/return`, data),

  getSupplierReturns: (id: string) =>
    axiosInstance.get(`/pharmacy/suppliers/${id}/returns`),
};

// ============================================
// Expense APIs
// ============================================
export const expenseAPI = {
  getAll: (params?: Record<string, any>) => axiosInstance.get('/expenses', { params }),
  create: (data: Record<string, any>) => axiosInstance.post('/expenses', data),
  update: (id: string, data: Record<string, any>) => axiosInstance.put(`/expenses/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/expenses/${id}`),
  getCategories: () => axiosInstance.get('/expenses/categories'),
};

// ============================================
// Report APIs
// ============================================
export const reportAPI = {
  get: (type: string, params?: Record<string, any>) => axiosInstance.get(`/reports/${type}`, { params }),
};

// ============================================
// Settings APIs
// ============================================
export const settingsAPI = {
  getShop: () => axiosInstance.get('/settings/shop'),
  updateShop: (data: Record<string, any>) => axiosInstance.put('/settings/shop', data),
  getTeam: (params?: Record<string, any>) => axiosInstance.get('/settings/team', { params }),
  addTeamMember: (data: Record<string, any>) => axiosInstance.post('/settings/team', data),
  updateTeamMember: (id: string, data: Record<string, any>) => axiosInstance.put(`/settings/team/${id}`, data),
  changeTeamPassword: (id: string, data: { newPassword: string }) => axiosInstance.put(`/settings/team/${id}/password`, data),
  deleteTeamMember: (id: string) => axiosInstance.delete(`/settings/team/${id}`),
};
