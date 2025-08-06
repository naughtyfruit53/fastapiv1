// New: v1/frontend/src/services/resetService.ts

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const requestResetOTP = async (scope: string, organization_id?: number): Promise<any> => {
  try {
    const token = localStorage.getItem('token');
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
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || 'Failed to request reset OTP');
  }
};

export const confirmReset = async (otp: string, resetType: string): Promise<any> => {
  try {
    const token = localStorage.getItem('token');
    
    const endpoint = resetType === 'factory_default' 
      ? '/organizations/factory-default'
      : '/organizations/reset-data';
    
    const response = await axios.post(
      `${API_BASE_URL}${endpoint}`,
      { confirm_reset: true },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || 'Failed to confirm reset');
  }
};