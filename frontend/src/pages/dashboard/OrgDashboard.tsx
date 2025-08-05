// New: v1/frontend/src/pages/dashboard/OrgDashboard.tsx

import React from 'react';
import { Card, Statistic, Row, Col, Typography } from 'antd'; // Assuming Ant Design

const { Title } = Typography;

const OrgDashboard: React.FC = () => {
  // Mock org-specific data
  return (
    <div>
      <Title level={2}>Organization Dashboard</Title>
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic title="Active Vouchers" value={1128} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Stock Items" value={93} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Pending Invoices" value={42} />
          </Card>
        </Col>
      </Row>
      {/* Add more org-specific components: charts, recent activity */}
    </div>
  );
};

export default OrgDashboard;