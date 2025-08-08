// frontend/src/services/authService.ts (Revised for detailed error handling in companyService)
import api from '../lib/api';  // Use the api client

export const authService = {
  login: async (username: string, password: string) => {
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      const response = await api.post('/v1/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      if (response.data.user?.organization_id) {
        localStorage.setItem('org_id', response.data.user.organization_id);
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Login failed');
    }
  },
  loginWithEmail: async (email: string, password: string) => {
    try {
      const response = await api.post('/v1/auth/login/email', { email, password });
      if (response.data.user?.organization_id) {
        localStorage.setItem('org_id', response.data.user.organization_id);
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Email login failed');
    }
  },
  getCurrentUser: async () => {
    try {
      const response = await api.get('/v1/users/me');
      if (response.data.organization_id) {
        localStorage.setItem('org_id', response.data.organization_id);
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to get user information');
    }
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('org_id');
    window.location.href = '/';
  },
  requestOTP: async (email: string, purpose: string = 'login') => {
    try {
      const response = await api.post('/v1/auth/otp/request', { email, purpose });
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to send OTP');
    }
  },
  verifyOTP: async (email: string, otp: string, purpose: string = 'login') => {
    try {
      const response = await api.post('/v1/auth/otp/verify', { email, otp, purpose });
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'OTP verification failed');
    }
  },
  setupAdminAccount: async () => {
    try {
      const response = await api.post('/v1/auth/admin/setup');
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Admin setup failed');
    }
  },
};

export const voucherService = {
  // Generic function for CRUD
  getVouchers: async (type: string, params?: any) => {
    try {
      const response = await api.get(`/v1/vouchers/${type}/`, { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || `Failed to fetch ${type}`);
    }
  },
  createVoucher: async (type: string, data: any, sendEmail = false) => {
    try {
      const response = await api.post(`/v1/vouchers/${type}/`, data, { params: { send_email: sendEmail } });
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || `Failed to create ${type}`);
    }
  },
  getVoucherById: async (type: string, id: number) => {
    try {
      const response = await api.get(`/v1/vouchers/${type}/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || `Failed to fetch ${type}`);
    }
  },
  updateVoucher: async (type: string, id: number, data: any) => {
    try {
      const response = await api.put(`/v1/vouchers/${type}/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || `Failed to update ${type}`);
    }
  },
  deleteVoucher: async (type: string, id: number) => {
    try {
      const response = await api.delete(`/v1/vouchers/${type}/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || `Failed to delete ${type}`);
    }
  },
  sendVoucherEmail: async (voucherType: string, voucherId: number, customEmail?: string) => {
    let params = '';
    if (customEmail) {
      params = `?custom_email=${customEmail}`;
    }
    try {
      const response = await api.post(`/v1/${voucherType}/${voucherId}/send-email${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to send email');
    }
  },
  getSalesVouchers: async (params?: any) => {
    return voucherService.getVouchers('sales', params);
  },
  // Purchase Order specific methods
  getPurchaseOrders: async (params?: any) => {
    return voucherService.getVouchers('purchase_order', params);
  },
  getPurchaseOrderById: async (id: number) => {
    return voucherService.getVoucherById('purchase_order', id);
  },
  createPurchaseOrder: async (data: any, sendEmail = false) => {
    return voucherService.createVoucher('purchase_order', data, sendEmail);
  },
  updatePurchaseOrder: async (id: number, data: any) => {
    return voucherService.updateVoucher('purchase_order', id, data);
  },
  // GRN specific methods
  getGrns: async (params?: any) => {
    return voucherService.getVouchers('grn', params);
  },
  getGrnById: async (id: number) => {
    return voucherService.getVoucherById('grn', id);
  },
  createGrn: async (data: any, sendEmail = false) => {
    return voucherService.createVoucher('grn', data, sendEmail);
  },
  updateGrn: async (id: number, data: any) => {
    return voucherService.updateVoucher('grn', id, data);
  },
  // Access to master data for vouchers
  getVendors: async (params?: any) => {
    return masterDataService.getVendors(params);
  },
  getProducts: async (params?: any) => {
    return masterDataService.getProducts(params);
  },
  getCustomers: async (params?: any) => {
    return masterDataService.getCustomers(params);
  },
};

export const masterDataService = {
  getVendors: async (params?: any) => {
    try {
      const response = await api.get('/v1/vendors/', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to fetch vendors');
    }
  },
  createVendor: async (data: any) => {
    try {
      const response = await api.post('/v1/vendors/', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to create vendor');
    }
  },
  updateVendor: async (id: number, data: any) => {
    try {
      const response = await api.put(`/v1/vendors/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to update vendor');
    }
  },
  deleteVendor: async (id: number) => {
    try {
      const response = await api.delete('/v1/vendors/' + id);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to delete vendor');
    }
  },
  getCustomers: async (params?: any) => {
    try {
      const response = await api.get('/v1/customers/', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to fetch customers');
    }
  },
  createCustomer: async (data: any) => {
    try {
      const response = await api.post('/v1/customers/', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to create customer');
    }
  },
  updateCustomer: async (id: number, data: any) => {
    try {
      const response = await api.put(`/v1/customers/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to update customer');
    }
  },
  deleteCustomer: async (id: number) => {
    try {
      const response = await api.delete('/v1/customers/' + id);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to delete customer');
    }
  },
  getProducts: async (params?: any) => {
    try {
      const response = await api.get('/v1/products/', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to fetch products');
    }
  },
  createProduct: async (data: any) => {
    try {
      const response = await api.post('/v1/products/', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to create product');
    }
  },
  updateProduct: async (id: number, data: any) => {
    try {
      const response = await api.put(`/v1/products/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to update product');
    }
  },
  deleteProduct: async (id: number) => {
    try {
      const response = await api.delete('/v1/products/' + id);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to delete product');
    }
  },
  getStock: async (params?: any) => {
    try {
      const response = await api.get('/v1/stock/', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to fetch stock data');
    }
  },
  getLowStock: async () => {
    try {
      const response = await api.get('/v1/stock/low-stock');
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to fetch low stock data');
    }
  },
  updateStock: async (productId: number, data: any) => {
    try {
      const response = await api.put(`/v1/stock/product/${productId}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to update stock');
    }
  },
  adjustStock: async (productId: number, quantityChange: number, reason: string) => {
    try {
      const response = await api.post(`/v1/stock/adjust/${productId}`, null, {
        params: { quantity_change: quantityChange, reason }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to adjust stock');
    }
  },
  bulkImportStock: async (file: File, mode: string = 'replace') => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post(`/v1/stock/bulk?mode=${mode}`, formData, {
        headers: {
          'Content-Type': undefined,
        },
        transformRequest: (data) => data,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to bulk import stock');
    }
  },
  downloadStockTemplate: async () => {
    try {
      const response = await api.get('/v1/stock/template/excel', {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'stock_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to download stock template');
    }
  },
  exportStock: async (params?: any) => {
    try {
      const response = await api.get('/v1/stock/export/excel', {
        params,
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'stock_export.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to export stock');
    }
  },
};

export const companyService = {
  getCurrentCompany: async () => {
    try {
      const response = await api.get('/v1/companies/current');
      return response.data;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw new Error(error.userMessage || 'Failed to get current company');
    }
  },
  createCompany: async (data: any) => {
    try {
      const response = await api.post('/v1/companies/', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to create company');
    }
  },
  updateCompany: async (id: number, data: any) => {
    try {
      const response = await api.put(`/v1/companies/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to update company');
    }
  },
};

export const reportsService = {
  getDashboardStats: async () => {
    try {
      const response = await api.get('/v1/reports/dashboard-stats');
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to get dashboard stats');
    }
  },
  getSalesReport: async (params?: any) => {
    try {
      const response = await api.get('/v1/reports/sales-report', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to get sales report');
    }
  },
  getPurchaseReport: async (params?: any) => {
    try {
      const response = await api.get('/v1/reports/purchase-report', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to get purchase report');
    }
  },
  getInventoryReport: async (lowStockOnly = false) => {
    try {
      const response = await api.get('/v1/reports/inventory-report', {
        params: { low_stock_only: lowStockOnly }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to get inventory report');
    }
  },
  getPendingOrders: async (orderType = 'all') => {
    try {
      const response = await api.get('/v1/reports/pending-orders', {
        params: { order_type: orderType }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to get pending orders');
    }
  },
};

export const organizationService = {
  createLicense: async (data: any) => {
    try {
      const response = await api.post('/v1/organizations/license/create', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to create organization license');
    }
  },
  getCurrentOrganization: async () => {
    try {
      const response = await api.get('/v1/organizations/current');
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to get current organization');
    }
  },
  updateOrganization: async (data: any) => {
    try {
      const response = await api.put('/v1/organizations/current', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to update organization');
    }
  },
  // Admin-only endpoints
  getAllOrganizations: async (params?: any) => {
    try {
      const response = await api.get('/v1/organizations/', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to get organizations');
    }
  },
  getOrganization: async (id: number) => {
    try {
      const response = await api.get(`/v1/organizations/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to get organization');
    }
  },
  updateOrganizationById: async (id: number, data: any) => {
    try {
      const response = await api.put(`/v1/organizations/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to update organization');
    }
  },
};

export const passwordService = {
  changePassword: async (currentPassword: string | null, newPassword: string, confirmPassword?: string) => {
    try {
      console.log('🔐 passwordService.changePassword called with:', {
        currentPassword: currentPassword ? 'PROVIDED' : 'NOT_PROVIDED',
        newPassword: 'PROVIDED',
        confirmPassword: confirmPassword ? 'PROVIDED' : 'NOT_PROVIDED'
      });
      
      const payload: { new_password: string; current_password?: string; confirm_password?: string } = {
        new_password: newPassword
      };
      
      if (currentPassword) {
        payload.current_password = currentPassword;
      }
      
      if (confirmPassword) {
        payload.confirm_password = confirmPassword;
      }
      
      console.log('📤 Sending password change request with payload structure:', {
        has_new_password: !!payload.new_password,
        has_current_password: !!payload.current_password,
        has_confirm_password: !!payload.confirm_password
      });
      
      const response = await api.post('/v1/auth/password/change', payload);
      console.log('✅ Password change request successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Password change request failed:', error);
      throw new Error(error.userMessage || 'Failed to change password');
    }
  },
  forgotPassword: async (email: string) => {
    try {
      const response = await api.post('/v1/auth/password/forgot', { email });
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to send password reset email');
    }
  },
  resetPassword: async (email: string, otp: string, newPassword: string) => {
    try {
      const response = await api.post('/v1/auth/password/reset', {
        email,
        otp,
        new_password: newPassword
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to reset password');
    }
  },
};

export const userService = {
  // Organization user management (for org admins)
  getOrganizationUsers: async (params?: any) => {
    try {
      const response = await api.get('/v1/users/', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to get organization users');
    }
  },
  createUser: async (data: any) => {
    try {
      const response = await api.post('/v1/users/', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to create user');
    }
  },
  updateUser: async (id: number, data: any) => {
    try {
      const response = await api.put(`/v1/users/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to update user');
    }
  },
  deleteUser: async (id: number) => {
    try {
      const response = await api.delete(`/v1/users/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to delete user');
    }
  },
  resetUserPassword: async (userId: number) => {
    try {
      const response = await api.post(`/v1/auth/reset/${userId}/password`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to reset user password');
    }
  },
  toggleUserStatus: async (userId: number, isActive: boolean) => {
    try {
      const response = await api.put(`/v1/users/${userId}`, { is_active: isActive });
      return response.data;
    } catch (error: any) {
      throw new Error(error.userMessage || 'Failed to update user status');
    }
  },
};