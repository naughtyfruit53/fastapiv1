// fastapi_migration/frontend/src/pages/admin/organizations/create.tsx

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import OrganizationForm from '../../../components/OrganizationForm';
import api from '../../../utils/api';
import RoleGate from '../../../components/RoleGate';
import { Alert, Snackbar, CircularProgress } from '@mui/material';
import { useAuth } from '../../../context/AuthContext';

const CreateOrganizationPage: React.FC = () => {
  const { loading } = useAuth();
  const router = useRouter();
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  if (loading) {
    return <CircularProgress />;
  }

  const handleSubmit = async (data: any) => {
    try {
      // Post to license/create endpoint instead of /organizations
      const response = await api.post('/organizations/license/create', data);
      setTempPassword(response.data.temp_password);  // Capture and display temp_password from response
      setSnackbarOpen(true);  // Show snackbar with temp password
      router.push('/admin/organizations');
    } catch (error) {
      console.error('Failed to create organization', error);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <RoleGate allowedRoles={['super_admin']}>
      <div>
        <h1>Create New Organization</h1>
        <OrganizationForm onSubmit={handleSubmit} />
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={null}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity="info" onClose={handleSnackbarClose}>
            Organization created successfully. Temporary Admin Password: {tempPassword} (Copy and share manually)
          </Alert>
        </Snackbar>
      </div>
    </RoleGate>
  );
};

export default CreateOrganizationPage;