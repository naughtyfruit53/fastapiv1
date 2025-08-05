// Revised: v1/frontend/src/types/reset.types.ts

export interface ResetOTPRequest {
  scope: 'organization' | 'all_organizations';
  organization_id?: number;
}

export interface ResetConfirmRequest {
  otp: string;
}

export interface ResetResponse {
  message: string;
  details?: any;
}