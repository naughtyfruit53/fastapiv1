// Revised: v1/frontend/src/pages/settings/Settings.tsx

import React from 'react';
import FactoryReset from './FactoryReset';
import { useAuth } from '../../context/AuthContext';
import { getDisplayRole, canAccessAdvancedSettings } from '../../types/user.types';
import { Card, Typography } from 'antd';

const { Title, Text } = Typography;

const Settings: React.FC = () => {
  const { user } = useAuth();
  const displayRole = getDisplayRole(user?.role || 'unknown', user?.is_super_admin);
  const isAuthorized = canAccessAdvancedSettings(user);

  console.log('Current user in Settings:', JSON.stringify(user, null, 2));
  console.log('Display Role:', displayRole);
  console.log('Is Authorized:', isAuthorized);

  return (
    <Card title={<Title level={2}>Settings</Title>} style={{ maxWidth: 800, margin: 'auto' }}>
      <div>
        <Title level={4}>Account Settings</Title>
        <Text>Current Role: {displayRole}</Text>
      </div>
      {isAuthorized && (
        <div>
          <Title level={4}>Advanced Options</Title>
          <FactoryReset />
        </div>
      )}
      {!isAuthorized && (
        <p>Advanced options not available for your role: {displayRole}</p>
      )}
    </Card>
  );
};

export default Settings;