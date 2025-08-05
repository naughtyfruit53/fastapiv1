// fastapi_migration/frontend/src/components/RoleGate.tsx

import React, { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';

interface RoleGateProps {
  allowedRoles: string[];
  children: ReactNode;
}

const RoleGate: React.FC<RoleGateProps> = ({ allowedRoles, children }) => {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) {
    router.push('/login');
    return null;
  }

  // Check if user has super admin privileges or their role is in allowed roles
  const hasAccess = user.is_super_admin === true || allowedRoles.includes(user.role);
  
  if (!hasAccess) {
    router.push('/login');
    return null;
  }

  return <>{children}</>;
};

export default RoleGate;