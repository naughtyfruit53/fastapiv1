// Revised: v1/frontend/src/lib/api.ts

// frontend/src/lib/api.ts

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token and organization ID to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const orgId = localStorage.getItem('org_id');
    if (orgId) {
      config.headers['X-Organization-ID'] = orgId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('org_id');
      window.location.href = '/';
    }
    
    // Extract error message with proper handling for arrays and objects
    let errorMessage = 'An unexpected error occurred';
    
    const detail = error.response?.data?.detail;
    const message = error.response?.data?.message;
    
    if (typeof detail === 'string' && detail) {
      errorMessage = detail;
    } else if (typeof message === 'string' && message) {
      errorMessage = message;
    } else if (Array.isArray(detail) && detail.length > 0) {
      // Handle Pydantic validation errors (array of objects)
      const messages = detail.map(err => err.msg || `${err.loc?.join(' -> ')}: ${err.type}`).filter(Boolean);
      errorMessage = messages.length > 0 ? messages.join(', ') : 'Validation error';
    } else if (detail && typeof detail === 'object') {
      // Handle object error details
      errorMessage = detail.error || detail.message || JSON.stringify(detail);
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    console.error('API Error:', errorMessage);
    return Promise.reject({
      ...error,
      userMessage: errorMessage,
      status: error.response?.status
    });
  }
);

export default api;