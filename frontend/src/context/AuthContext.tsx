// Revised: v1/frontend/src/context/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { authService } from '../services/authService';
import { User } from '../types/user.types';  // Import User type

interface AuthContextType {
  user: User | null;
  loading: boolean;
  displayRole: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const getDisplayRole = (user: User): string => {
    if (user.is_super_admin) {
      return 'App SuperAdmin';
    } else if (user.role === 'org_admin') {
      return 'Org SuperAdmin';
    } else if (user.role === 'admin') {
      return 'Admin';
    } else if (user.role === 'standard_user') {
      return 'User';
    } else {
      return 'User';  // Default fallback
    }
  };

  const fetchUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser({
        id: userData.id,
        email: userData.email,
        role: userData.role,
        is_super_admin: userData.is_super_admin,
        organization_id: userData.organization_id,
        must_change_password: userData.must_change_password,
      });
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
      localStorage.removeItem('token');
      router.push('/login');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [router]);

  // Add this useEffect to handle mandatory password change redirect
  useEffect(() => {
    if (user && user.must_change_password && router.pathname !== '/change-password') {
      router.push('/change-password');
    }
  }, [user, router]);

  const login = async (token: string) => {
    localStorage.setItem('token', token);
    await fetchUser();
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('orgId');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      displayRole: user ? getDisplayRole(user) : null,
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (undefined === context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};