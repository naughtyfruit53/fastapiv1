// Revised: v1/frontend/src/utils/apiUtils.ts

import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add error handling interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const handleApiError = (error: any): string => {
  if (error.response) {
    return error.response.data?.message || error.response.data?.detail || 'An error occurred';
  } else if (error.request) {
    return 'No response received from server';
  } else {
    return error.message || 'Unknown error';
  }
};

export const getApiParams = (params: any): URLSearchParams => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  return searchParams;
};

export const uploadStockBulk = async (file: File): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', file); // Ensure field name matches backend expectation ('file')

    const response = await api.post('/stock/bulk', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export default api;