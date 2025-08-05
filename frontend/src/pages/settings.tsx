import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { 
  Warning,
  DeleteSweep,
  Security,
  Business,
  Add
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function Settings() {
  const router = useRouter();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [factoryResetDialogOpen, setFactoryResetDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [factoryLoading, setFactoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get user info from localStorage or context
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
  const organizationName = typeof window !== 'undefined' ? localStorage.getItem('organizationName') : null;
  
  // Improved role detection
  const isSuperAdmin = userRole === 'super_admin';
  const isOrgAdmin = userRole === 'org_admin';
  const isAdmin = userRole === 'admin';
  const canManageUsers = isOrgAdmin || isSuperAdmin;
  const canResetData = isOrgAdmin || isSuperAdmin;

  const handleResetData = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/organizations/reset-data`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setSuccess(response.data.message);
      setResetDialogOpen(false);
      
      // For organization admins, refresh the page to reflect changes
      if (!isSuperAdmin) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset data');
      setResetDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFactoryReset = async () => {
    setFactoryLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/organizations/factory-default`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setSuccess(response.data.message);
      setFactoryResetDialogOpen(false);
      
      // Refresh the page to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to perform factory reset');
      setFactoryResetDialogOpen(false);
    } finally {
      setFactoryLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      
      {/* User Role Information */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.main', color: 'info.contrastText' }}>
        <Typography variant="body1">
          <strong>Current Role:</strong> {userRole || 'User'} {organizationName && `• Organization: ${organizationName}`}
        </Typography>
        {canManageUsers && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            You have administrative privileges to manage users and organization settings.
          </Typography>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Organization Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <Business sx={{ mr: 1 }} />
              Organization Settings
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Button
              variant="outlined"
              onClick={() => router.push('/masters/company-details')}
              sx={{ mb: 2, mr: 2 }}
            >
              Edit Company Details
            </Button>

            <Button
              variant="outlined"
              onClick={() => router.push('/profile')}
              sx={{ mb: 2 }}
            >
              User Profile
            </Button>

            {/* User Management for Organization Admins */}
            {canManageUsers && (
              <>
                <Button
                  variant="contained"
                  onClick={() => router.push('/settings/user-management')}
                  sx={{ mb: 2, mr: 2 }}
                  startIcon={<Security />}
                  color="primary"
                >
                  Manage Users
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={() => router.push('/settings/add-user')}
                  sx={{ mb: 2 }}
                  startIcon={<Add />}
                >
                  Add User
                </Button>
              </>
            )}
          </Paper>
        </Grid>

        {/* Data Management */}
        {canResetData && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Security sx={{ mr: 1 }} />
                Data Management
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Warning:</strong> Database reset will permanently delete all data 
                  {isSuperAdmin ? ' for all organizations' : ' for your organization'}. 
                  This action cannot be undone.
                </Typography>
              </Alert>

              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteSweep />}
                onClick={() => setResetDialogOpen(true)}
                disabled={loading || factoryLoading}
                sx={{ mt: 1, mr: 2 }}
              >
                {loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  `Reset ${isSuperAdmin ? 'All' : 'Organization'} Data`
                )}
              </Button>

              {/* Factory Default Button for Organization Admins */}
              {isOrgAdmin && (
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<Warning />}
                  onClick={() => setFactoryResetDialogOpen(true)}
                  disabled={loading || factoryLoading}
                  sx={{ mt: 1 }}
                >
                  {factoryLoading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    'Factory Default'
                  )}
                </Button>
              )}

              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {isSuperAdmin 
                  ? 'As super admin, this will reset all organization data'
                  : 'Reset data: removes all business data but keeps organization settings'
                }
              </Typography>

              {isOrgAdmin && (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Factory Default: Resets organization to initial state with default settings
                </Typography>
              )}
            </Paper>
          </Grid>
        )}

        {/* Super Admin Only Settings */}
        {isSuperAdmin && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Warning sx={{ mr: 1, color: 'warning.main' }} />
                Super Admin Controls
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Button
                variant="outlined"
                onClick={() => router.push('/admin/organizations')}
                sx={{ mr: 2, mb: 2 }}
              >
                Manage Organizations
              </Button>

              <Button
                variant="outlined"
                onClick={() => router.push('/admin/users')}
                sx={{ mb: 2 }}
              >
                Manage Users
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <Warning sx={{ mr: 1, color: 'error.main' }} />
          Confirm Data Reset
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to reset {isSuperAdmin ? 'all' : 'your organization&apos;s'} data? 
            This action will permanently delete:
          </DialogContentText>
          <Box component="ul" sx={{ mt: 2, mb: 2 }}>
            <li>All companies</li>
            <li>All vendors and customers</li>
            <li>All products and inventory</li>
            <li>All vouchers and transactions</li>
            <li>All audit logs</li>
            {isSuperAdmin && (
              <>
                <li>All organization users (except super admin)</li>
                <li>All organizations</li>
              </>
            )}
          </Box>
          <DialogContentText color="error">
            <strong>This action cannot be undone!</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setResetDialogOpen(false)} 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleResetData} 
            color="error" 
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <DeleteSweep />}
          >
            {loading ? 'Resetting...' : 'Reset Data'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Factory Default Confirmation Dialog */}
      <Dialog
        open={factoryResetDialogOpen}
        onClose={() => setFactoryResetDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <Warning sx={{ mr: 1, color: 'warning.main' }} />
          Confirm Factory Default Reset
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to perform a factory default reset? 
            This action will permanently restore your organization to its initial state:
          </DialogContentText>
          <Box component="ul" sx={{ mt: 2, mb: 2 }}>
            <li>All business data will be deleted (same as data reset)</li>
            <li>Organization settings will be reset to defaults</li>
            <li>Business type will be set to "Other"</li>
            <li>Timezone will be set to "Asia/Kolkata"</li>
            <li>Currency will be set to "INR"</li>
            <li>Company details status will be reset</li>
          </Box>
          <DialogContentText color="warning.main">
            <strong>This action cannot be undone and will reset both data and settings!</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setFactoryResetDialogOpen(false)} 
            disabled={factoryLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleFactoryReset} 
            color="warning" 
            variant="contained"
            disabled={factoryLoading}
            startIcon={factoryLoading ? <CircularProgress size={16} /> : <Warning />}
          >
            {factoryLoading ? 'Resetting to Defaults...' : 'Factory Default Reset'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}