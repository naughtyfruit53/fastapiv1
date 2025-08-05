// Revised: v1/frontend/src/pages/dashboard/Dashboard.tsx

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import AppSuperAdminDashboard from './AppSuperAdminDashboard';
import OrgDashboard from './OrgDashboard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.is_super_admin || user?.role === 'super_admin';

  return (
    <div style={{ padding: '20px' }}>
      {isSuperAdmin ? <AppSuperAdminDashboard /> : <OrgDashboard />}
    </div>
  );
};

export default Dashboard;