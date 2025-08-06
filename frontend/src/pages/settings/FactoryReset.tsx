// Revised: v1/frontend/src/pages/settings/FactoryReset.tsx

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Divider,
  Grid
} from '@mui/material';
import {
  RestartAlt,
  Warning,
  Security
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { requestResetOTP, confirmReset } from '../../services/resetService';
import { canFactoryReset, isAppSuperAdmin, isOrgSuperAdmin } from '../../types/user.types';

const FactoryReset: React.FC = () => {
  const { user } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetType, setResetType] = useState<'organization_data' | 'factory_default'>('organization_data');

  const isSuperAdmin = isAppSuperAdmin(user);
  const isOrgAdmin = isOrgSuperAdmin(user);
  const canReset = canFactoryReset(user);

  if (!canReset) {
    return (
      <Alert severity="error">
        You don&apos;t have permission to access reset functionality. Only organization administrators and app super administrators can perform resets.
      </Alert>
    );
  }

  const handleRequestOTP = async (type: 'organization_data' | 'factory_default') => {
    setResetType(type);
    setLoading(true);
    try {
      const scope = type === 'organization_data' ? 'organization' : 'all_organizations';
      const response = await requestResetOTP(scope);
      // Success message would be handled by the service
      setIsModalVisible(true);
    } catch (error) {
      console.error('Failed to request OTP:', error);
    }
    setLoading(false);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const response = await confirmReset(otp, resetType);
      // Success would be handled by the service
      setIsModalVisible(false);
      setOtp('');
    } catch (error) {
      console.error('Invalid OTP or reset failed:', error);
    }
    setLoading(false);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Reset & Recovery Options
      </Typography>
      
      <Grid container spacing={3}>
        {/* Organization Super Admin - Reset All Data */}
        {isOrgAdmin && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <RestartAlt color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Reset All Data</Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Removes all business data (customers, vendors, products, stock, vouchers) 
                from your organization while keeping users and organization settings intact.
              </Typography>
              
              <Alert severity="warning" sx={{ mb: 2 }}>
                This action cannot be undone. All your business data will be permanently deleted.
              </Alert>
              
              <Button
                variant="contained"
                color="warning"
                fullWidth
                startIcon={<RestartAlt />}
                onClick={() => handleRequestOTP('organization_data')}
                disabled={loading}
              >
                Reset All Data
              </Button>
            </Paper>
          </Grid>
        )}

        {/* App Super Admin - Factory Default */}
        {isSuperAdmin && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Security color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">Factory Default</Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Complete system reset that removes ALL organizations, licenses, users, 
                and data. Resets the entire application to initial state.
              </Typography>
              
              <Alert severity="error" sx={{ mb: 2 }}>
                <strong>DANGER:</strong> This will delete everything in the system including 
                all organizations and users. Only use for complete system recovery.
              </Alert>
              
              <Button
                variant="contained"
                color="error"
                fullWidth
                startIcon={<Security />}
                onClick={() => handleRequestOTP('factory_default')}
                disabled={loading}
              >
                Factory Default
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* OTP Confirmation Dialog */}
      <Dialog 
        open={isModalVisible} 
        onClose={() => setIsModalVisible(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Warning color="error" sx={{ mr: 1 }} />
            Confirm {resetType === 'organization_data' ? 'Data Reset' : 'Factory Default'}
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            An OTP has been sent to your email. Enter it below to confirm this irreversible action.
          </Alert>
          
          <TextField
            fullWidth
            label="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter the 6-digit OTP"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setIsModalVisible(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            variant="contained"
            color="error"
            disabled={loading || otp.length !== 6}
          >
            {loading ? 'Processing...' : 'Confirm Reset'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FactoryReset;