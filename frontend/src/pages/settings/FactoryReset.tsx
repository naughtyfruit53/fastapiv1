// Revised: v1/frontend/src/pages/settings/FactoryReset.tsx

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext'; // Assume AuthContext provides user role
import { requestResetOTP, confirmReset } from '../../services/resetService';
import { Modal, Button, Input, message, Select } from 'antd'; // Assuming Ant Design for UI

const FactoryReset: React.FC = () => {
  const { user } = useAuth(); // Get current user from context
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<'organization' | 'all_organizations'>('organization');
  const [orgId, setOrgId] = useState<number | undefined>(undefined);

  const isSuperAdmin = user?.is_super_admin || user?.role === 'super_admin';
  const isOrgAdmin = user?.role === 'org_admin';

  if (!isSuperAdmin && !isOrgAdmin) {
    return null; // Hide if not authorized
  }

  const handleRequestOTP = async () => {
    setLoading(true);
    try {
      const response = await requestResetOTP(scope, orgId);
      message.success('OTP sent to your email');
      setIsModalVisible(true);
    } catch (error) {
      message.error('Failed to request OTP');
    }
    setLoading(false);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const response = await confirmReset(otp);
      message.success('Factory reset successful');
      setIsModalVisible(false);
    } catch (error) {
      message.error('Invalid OTP or reset failed');
    }
    setLoading(false);
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <Button 
        type="primary" 
        danger 
        onClick={handleRequestOTP} 
        disabled={loading}
      >
        Factory Reset
      </Button>
      {isSuperAdmin && (
        <Select 
          defaultValue="organization" 
          onChange={(value) => setScope(value)} 
          style={{ marginLeft: '10px' }}
        >
          <Select.Option value="organization">Organization</Select.Option>
          <Select.Option value="all_organizations">All Organizations</Select.Option>
        </Select>
      )}
      {scope === 'organization' && isSuperAdmin && (
        <Input 
          placeholder="Organization ID" 
          type="number" 
          onChange={(e) => setOrgId(parseInt(e.target.value))} 
          style={{ marginLeft: '10px', width: '150px' }}
        />
      )}
      <Modal
        title="Enter OTP to Confirm Factory Reset"
        visible={isModalVisible}
        onOk={handleConfirm}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
      >
        <Input 
          placeholder="Enter OTP" 
          value={otp} 
          onChange={(e) => setOtp(e.target.value)} 
        />
      </Modal>
    </div>
  );
};

export default FactoryReset;