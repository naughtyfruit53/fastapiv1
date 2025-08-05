// Revised: v1/frontend/src/components/UserProfile.tsx
// Assuming a component where role is displayed; adjust as per actual file

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { getDisplayRole } from '../types/user.types';
import { Card, Avatar, Typography } from 'antd';

const { Title, Text } = Typography;

const UserProfile: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const displayRole = getDisplayRole(user.role, user.is_super_admin);

  return (
    <Card>
      <Avatar size={64} src={user.avatar_path} />
      <Title level={4}>{user.full_name || user.username}</Title>
      <Text>Role: {displayRole}</Text>
      <Text>Email: {user.email}</Text>
      {/* Other profile info */}
    </Card>
  );
};

export default UserProfile;