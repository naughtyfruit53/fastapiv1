// New: v1/frontend/src/services/resetService.ts

import axios from 'axios';
import { handleApiError } from '../utils/apiUtils';

const API_BASE_URL = 'http://localhost:8000/api/v1'; // Adjust as needed

export const requestResetOTP = async (scope: string, organization_id?: number): Promise<any> => {
  try {
    const token = localStorage.getItem('token'); // Assume token stored in localStorage
    const response = await axios.post(
      `${API_BASE_URL}/reset/data/preview`,
      { 
        scope: scope === 'organization' ? 'ORGANIZATION' : 'ALL_ORGANIZATIONS',
        organization_id,
        reset_type: 'FULL_RESET',
        confirm_reset: false
      },
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

export const confirmReset = async (otp: string, resetType: string): Promise<any> => {
  try {
    const token = localStorage.getItem('token');
    
    // Determine the endpoint based on reset type
    const endpoint = resetType === 'factory_default' 
      ? `${API_BASE_URL}/reset/data/all`
      : `${API_BASE_URL}/organizations/reset-data`;
    
    const response = await axios.post(
      endpoint,
      { 
        confirm_reset: true,
        reset_type: 'FULL_RESET',
        scope: resetType === 'factory_default' ? 'ALL_ORGANIZATIONS' : 'ORGANIZATION'
      },
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