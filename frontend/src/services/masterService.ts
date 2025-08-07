// services/masterService.ts
// masterService.ts - Service to fetch master data like vendors, customers, products

// Assuming you have a base API URL or use relative paths
const API_BASE = '/api/v1'; // Updated to match FastAPI structure

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const getVendors = async () => {
  const response = await fetch(`${API_BASE}/vendors`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required. Please log in.');
    }
    throw new Error(`Failed to fetch vendors: ${response.statusText}`);
  }
  return response.json();
};

export const getCustomers = async () => {
  const response = await fetch(`${API_BASE}/customers`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required. Please log in.');
    }
    throw new Error(`Failed to fetch customers: ${response.statusText}`);
  }
  return response.json();
};

export const getProducts = async () => {
  const response = await fetch(`${API_BASE}/products`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required. Please log in.');
    }
    throw new Error(`Failed to fetch products: ${response.statusText}`);
  }
  return response.json();
};

// Enhanced search functions for autocomplete
export const searchCustomers = async (searchTerm: string, limit = 10) => {
  const params = new URLSearchParams({
    search: searchTerm,
    limit: limit.toString(),
    active_only: 'true'
  });
  
  const response = await fetch(`${API_BASE}/customers?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required. Please log in.');
    }
    throw new Error(`Failed to search customers: ${response.statusText}`);
  }
  return response.json();
};

export const searchProducts = async (searchTerm: string, limit = 10) => {
  const params = new URLSearchParams({
    search: searchTerm,
    limit: limit.toString(),
    active_only: 'true'
  });
  
  const response = await fetch(`${API_BASE}/products?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required. Please log in.');
    }
    throw new Error(`Failed to search products: ${response.statusText}`);
  }
  return response.json();
};

// Create new customer
export const createCustomer = async (customerData: {
  name: string;
  contact_number: string;
  email?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  pin_code: string;
  state_code: string;
  gst_number?: string;
  pan_number?: string;
}) => {
  const response = await fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(customerData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create customer');
  }
  return response.json();
};

// Create new product
export const createProduct = async (productData: {
  name: string;
  hsn_code?: string;
  part_number?: string;
  unit: string;
  unit_price: number;
  gst_rate?: number;
  is_gst_inclusive?: boolean;
  reorder_level?: number;
  description?: string;
  is_manufactured?: boolean;
}) => {
  const response = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(productData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create product');
  }
  return response.json();
};

export const bulkImportVendors = async (data: any[]) => {
  const response = await fetch(`${API_BASE}/vendors/bulk`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to import vendors');
  }
  return response.json();
};

export const bulkImportCustomers = async (data: any[]) => {
  const response = await fetch(`${API_BASE}/customers/bulk`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to import customers');
  }
  return response.json();
};

export const bulkImportProducts = async (data: any[]) => {
  const response = await fetch(`${API_BASE}/products/bulk`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to import products');
  }
  return response.json();
};

export const bulkImportStock = async (data: any[]) => {
  const response = await fetch(`${API_BASE}/stock/bulk`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to import stock');
  }
  return response.json();
};