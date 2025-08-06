/**
 * User Types and Permission Utilities
 * 
 * This module provides centralized user type definitions and permission checking
 * functions to ensure consistent role-based access control across the application.
 * 
 * Key principles:
 * 1. The is_super_admin flag takes precedence over role strings for app-level admin detection
 * 2. Role display names are standardized through getDisplayRole function
 * 3. Permission functions provide clear, reusable access control logic
 * 
 * Usage:
 * - Always use getDisplayRole() for showing user roles in UI
 * - Use isAppSuperAdmin() instead of checking role === 'super_admin' 
 * - Use specific permission functions (canFactoryReset, canManageUsers) for feature access
 */

// Revised: v1/frontend/src/types/user.types.ts

export interface User {
  id: number;
  email: string;
  role: string;
  is_super_admin?: boolean;
  organization_id?: number;
  must_change_password?: boolean;
  full_name?: string;
  avatar_path?: string;
  // Add other fields
}

export const getDisplayRole = (role: string, isSuperAdmin?: boolean): string => {
  // Prioritize is_super_admin flag even if role is mismatched
  if (isSuperAdmin || role === 'super_admin' || role === 'Super Admin' || role.toLowerCase().includes('super')) {
    return 'App Super Admin';
  } else if (role === 'org_admin' || role === 'Org Admin' || role.toLowerCase().includes('org admin')) {
    return 'Org Super Admin';
  } else if (role === 'admin' || role === 'Admin') {
    return 'Admin';
  } else if (role === 'standard_user' || role === 'Standard User') {
    return 'Standard User';
  } else if (role === 'user' || role === 'User') {
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
  return user.is_super_admin === true || user.role === 'super_admin';
};

export const isOrgSuperAdmin = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === 'org_admin';
};

// New permission functions for role-based interface controls
export const canAccessOrganizationSettings = (user: User | null): boolean => {
  if (!user) return false;
  // Organization Settings should be hidden from App Super Admins
  return !isAppSuperAdmin(user);
};

export const canShowFactoryResetOnly = (user: User | null): boolean => {
  if (!user) return false;
  // App Super Admins should only see Factory Reset option in Data Management
  return isAppSuperAdmin(user);
};

export const canShowOrgDataResetOnly = (user: User | null): boolean => {
  if (!user) return false;
  // Org Superadmins should only see Reset Organization Data option
  return isOrgSuperAdmin(user) && !isAppSuperAdmin(user);
};

export const canShowUserManagementInMegaMenu = (user: User | null): boolean => {
  if (!user) return false;
  // User management should not be in mega menu for Org Superadmins
  // Only App Super Admins can have user management in mega menu
  return isAppSuperAdmin(user);
};