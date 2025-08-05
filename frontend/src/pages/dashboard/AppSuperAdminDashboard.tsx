// New: v1/frontend/src/pages/dashboard/AppSuperAdminDashboard.tsx

import React from 'react';
import { Card, List, Typography } from 'antd'; // Assuming Ant Design

const { Title } = Typography;

const AppSuperAdminDashboard: React.FC = () => {
  // Mock data or fetch global stats, org list, etc.
  const organizations = [
    { id: 1, name: 'Org A', users: 10, status: 'Active' },
    { id: 2, name: 'Org B', users: 5, status: 'Trial' },
  ];

  return (
    <div>
      <Title level={2}>App Super Admin Dashboard</Title>
      <Card title="Organizations Overview">
        <List
          dataSource={organizations}
          renderItem={(org) => (
            <List.Item>
              <List.Item.Meta
                title={org.name}
                description={`Users: ${org.users} | Status: ${org.status}`}
              />
            </List.Item>
          )}
        />
      </Card>
      {/* Add more super admin features: create org, manage plans, global settings */}
    </div>
  );
};

export default AppSuperAdminDashboard;