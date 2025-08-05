// New: v1/frontend/src/services/resetService.ts

import axios from 'axios';
import { handleApiError } from '../utils/apiUtils';

const API_BASE_URL = 'http://localhost:8000/api/v1'; // Adjust as needed

export const requestResetOTP = async (scope: string, organization_id?: number): Promise<any> => {
  try {
    const token = localStorage.getItem('token'); // Assume token stored in localStorage
    const response = await axios.post(
      `${API_BASE_URL}/settings/factory-reset/request-otp`,
      { scope, organization_id },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const confirmReset = async (otp: string): Promise<any> => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_BASE_URL}/settings/factory-reset/confirm`,
      { otp },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};