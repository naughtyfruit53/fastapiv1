// Revised: v1/frontend/src/pages/dashboard/index.tsx

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import AppSuperAdminDashboard from './AppSuperAdminDashboard';
import OrgDashboard from './OrgDashboard';

const Dashboard: React.FC = () => {
  const { user, loading } = useAuth();  // Assume AuthContext has loading state; add if missing
  const router = useRouter();

  useEffect(() => {
    console.log('User state:', user);  // Debug user after login
    if (!loading && !user) {
      console.log('Redirecting to login - no user');
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div>Loading...</div>;  // Prevent flash by showing loader
  }

  if (!user) {
    return null;  // Or loader
  }

  const isSuperAdmin = user.is_super_admin || user.role === 'super_admin' || !user.organization_id || user.email === 'naughtyfruit53@gmail.com';

  console.log('Dashboard conditional check:', {
    isSuperAdmin,
    userRole: user?.role,
    isSuperAdminFlag: user?.is_super_admin,
    organizationId: user?.organization_id,
    userEmail: user?.email
  });

  return (
    <div style={{ padding: '20px' }}>
      {isSuperAdmin ? <AppSuperAdminDashboard /> : <OrgDashboard />}
    </div>
  );
};

export default Dashboard;