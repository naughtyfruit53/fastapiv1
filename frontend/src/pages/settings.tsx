/**
 * Settings Page Component
 * 
 * This component provides the main settings interface for users with different roles.
 * It uses centralized role and permission functions from user.types.ts to ensure
 * consistent behavior across the application.
 * 
 * Role Display:
 * - Uses getDisplayRole(user.role, user.is_super_admin) for consistent role naming
 * - Prioritizes is_super_admin flag over role string for App Super Admin detection
 * 
 * Permission Checks:
 * - isAppSuperAdmin(user): Determines if user is an app-level super admin
 * - canFactoryReset(user): Determines if user can perform reset operations  
 * - canManageUsers(user): Determines if user can manage other users
 * 
 * Features shown based on permissions:
 * - App Super Admin: All features including cross-org management
 * - Org Admin: Organization-level management and reset options
 * - Standard User: Basic profile and company detail access only
 */

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
import { useAuth } from '../context/AuthContext';
import { 
  getDisplayRole, 
  isAppSuperAdmin, 
  canFactoryReset, 
  canManageUsers, 
  canAccessOrganizationSettings,
  canShowFactoryResetOnly,
  canShowOrgDataResetOnly
} from '../types/user.types';

export default function Settings() {
  const router = useRouter();
  const { user } = useAuth();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [factoryResetDialogOpen, setFactoryResetDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [factoryLoading, setFactoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get token for API calls
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  // Use centralized permission and role functions
  const displayRole = getDisplayRole(user?.role || '', user?.is_super_admin);
  const isSuperAdmin = isAppSuperAdmin(user);
  const canReset = canFactoryReset(user);
  const canManage = canManageUsers(user);
  const canAccessOrgSettings = canAccessOrganizationSettings(user);
  const showFactoryResetOnly = canShowFactoryResetOnly(user);
  const showOrgDataResetOnly = canShowOrgDataResetOnly(user);
  const organizationName = typeof window !== 'undefined' ? localStorage.getItem('organizationName') : null;

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
          <strong>Current Role:</strong> {displayRole} {organizationName && `• Organization: ${organizationName}`}
        </Typography>
        {canManage && (
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
        {/* Organization Settings - Hidden from App Super Admins */}
        {canAccessOrgSettings && (
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

              {/* User Management for Organization Admins - Now in Settings */}
              {canManage && (
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
        )}

        {/* User Profile for App Super Admins (when Organization Settings is hidden) */}
        {!canAccessOrgSettings && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Business sx={{ mr: 1 }} />
                User Profile
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Button
                variant="outlined"
                onClick={() => router.push('/profile')}
                sx={{ mb: 2 }}
              >
                Edit Profile
              </Button>
            </Paper>
          </Grid>
        )}

        {/* Data Management */}
        {canReset && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Security sx={{ mr: 1 }} />
                Data Management
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Warning:</strong> Database reset will permanently delete data
                  {showFactoryResetOnly ? ' for all organizations' : ' for your organization'}. 
                  This action cannot be undone.
                </Typography>
              </Alert>

              {/* App Super Admin: Only Factory Reset */}
              {showFactoryResetOnly && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Warning />}
                  onClick={() => setFactoryResetDialogOpen(true)}
                  disabled={loading || factoryLoading}
                  sx={{ mt: 1 }}
                >
                  {factoryLoading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    'Restore to Factory Defaults'
                  )}
                </Button>
              )}

              {/* Org Super Admin: Only Reset Organization Data */}
              {showOrgDataResetOnly && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteSweep />}
                  onClick={() => setResetDialogOpen(true)}
                  disabled={loading || factoryLoading}
                  sx={{ mt: 1 }}
                >
                  {loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    'Reset Organization Data'
                  )}
                </Button>
              )}

              {/* Legacy: Both options for other admin types */}
              {!showFactoryResetOnly && !showOrgDataResetOnly && (
                <>
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
                </>
              )}

              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {showFactoryResetOnly 
                  ? 'Restore to Factory Defaults: Wipes all app data including organizations, licenses, and license holders'
                  : showOrgDataResetOnly
                  ? 'Reset Organization Data: Removes all business data but keeps organization settings'
                  : isSuperAdmin 
                  ? 'As app super admin, this will reset all organization data'
                  : 'Reset data: removes all business data but keeps organization settings'
                }
              </Typography>
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
            Are you sure you want to reset {showOrgDataResetOnly ? 'your organization&apos;s' : isSuperAdmin ? 'all' : 'your organization&apos;s'} data? 
            This action will permanently delete:
          </DialogContentText>
          <Box component="ul" sx={{ mt: 2, mb: 2 }}>
            <li>All companies</li>
            <li>All vendors and customers</li>
            <li>All products and inventory</li>
            <li>All vouchers and transactions</li>
            <li>All audit logs</li>
            {isSuperAdmin && !showOrgDataResetOnly && (
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
          {showFactoryResetOnly ? 'Confirm Restore to Factory Defaults' : 'Confirm Factory Default Reset'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {showFactoryResetOnly ? (
              <>
                Are you sure you want to restore the entire application to factory defaults? 
                This action will permanently delete:
              </>
            ) : (
              <>
                Are you sure you want to perform a factory default reset? 
                This action will permanently restore your organization to its initial state:
              </>
            )}
          </DialogContentText>
          <Box component="ul" sx={{ mt: 2, mb: 2 }}>
            {showFactoryResetOnly ? (
              <>
                <li>All organizations and their data</li>
                <li>All licenses and license holders</li>
                <li>All users (except the primary super admin)</li>
                <li>All companies, vendors, customers</li>
                <li>All products and inventory</li>
                <li>All vouchers and transactions</li>
                <li>All audit logs</li>
                <li>System returns to initial installation state</li>
              </>
            ) : (
              <>
                <li>All business data will be deleted (same as data reset)</li>
                <li>Organization settings will be reset to defaults</li>
                <li>Business type will be set to &quot;Other&quot;</li>
                <li>Timezone will be set to &quot;Asia/Kolkata&quot;</li>
                <li>Currency will be set to &quot;INR&quot;</li>
                <li>Company details status will be reset</li>
              </>
            )}
          </Box>
          <DialogContentText color={showFactoryResetOnly ? 'error' : 'warning.main'}>
            <strong>
              {showFactoryResetOnly 
                ? 'This action cannot be undone and will completely reset the entire application!'
                : 'This action cannot be undone and will reset both data and settings!'
              }
            </strong>
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
            color={showFactoryResetOnly ? 'error' : 'warning'} 
            variant="contained"
            disabled={factoryLoading}
            startIcon={factoryLoading ? <CircularProgress size={16} /> : <Warning />}
          >
            {factoryLoading ? 'Resetting...' : (showFactoryResetOnly ? 'Restore to Factory Defaults' : 'Factory Default Reset')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}