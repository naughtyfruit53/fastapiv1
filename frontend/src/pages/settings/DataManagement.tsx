import React from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';
import { useMutation } from 'react-query';

const DataManagement: React.FC = () => {
  // Placeholder mutation - would need to add factoryDefault method to organizationService
  const factoryResetMutation = useMutation(() => 
    fetch('/api/v1/organizations/factory-default', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    }).then(res => res.json()), {
    onSuccess: () => alert('Factory default reset completed. All data has been erased.'),
  });

  const handleFactoryDefault = () => {
    if (window.confirm('Are you sure? This will delete ALL data in the entire app, including all organizations and licenses. This action cannot be undone.')) {
      factoryResetMutation.mutate();
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Data Management
      </Typography>
      <Alert severity="warning" sx={{ mb: 2 }}>
        As super admin, you can perform a factory default reset which erases all app data.
      </Alert>
      <Button variant="contained" color="error" onClick={handleFactoryDefault}>
        Factory Default - Reset Entire App
      </Button>
    </Box>
  );
};

export default DataManagement;