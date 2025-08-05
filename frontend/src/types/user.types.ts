// Revised: v1/frontend/src/types/user.types.ts

export interface User {
  id: number;
  email: string;
  role: string;
  is_super_admin?: boolean;
  organization_id?: number;
  // Add other fields
}

export const getDisplayRole = (role: string, isSuperAdmin?: boolean): string => {
  if (isSuperAdmin || role === 'super_admin') {
    return 'App Super Admin';
  } else if (role === 'org_admin') {
    return 'Org Super Admin';
  } else if (role === 'admin') {
    return 'Admin';
  } else if (role === 'standard_user') {
    return 'Standard User';
  } else if (role === 'user') {
    return 'User';  // Handle if role is 'user'
  }
  return role.charAt(0).toUpperCase() + role.slice(1);  // Capitalize unknown roles
};

// Permission utility functions to replace hardcoded role checks
export const canManageUsers = (user: User | null): boolean => {
  if (!user) return false;
  return user.is_super_admin === true || user.role === 'org_admin';
};

export const canResetPasswords = (user: User | null): boolean => {
  if (!user) return false;
  return user.is_super_admin === true || user.role === 'org_admin';
};

export const canFactoryReset = (user: User | null): boolean => {
  if (!user) return false;
  return user.is_super_admin === true || user.role === 'org_admin';
};

export const canAccessAdvancedSettings = (user: User | null): boolean => {
  if (!user) return false;
  return user.is_super_admin === true || ['org_admin', 'admin'].includes(user.role);
};

export const isAppSuperAdmin = (user: User | null): boolean => {
  if (!user) return false;
  return user.is_super_admin === true;
};

export const isOrgSuperAdmin = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === 'org_admin';
};