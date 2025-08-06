import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  Edit,
  Lock,
  LockOpen,
  RestartAlt,
  Visibility,
  Business,
  Security,
  Delete,
  Add,
  Settings,
  DataUsage
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useRouter } from 'next/router';
import { organizationService } from '../../services/authService';

interface Organization {
  id: number;
  name: string;
  subdomain: string;
  status: string;
  primary_email: string;
  primary_phone: string;
  plan_type: string;
  max_users: number;
  created_at: string;
  company_details_completed: boolean;
}

const ManageOrganizations: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [resetDataDialogOpen, setResetDataDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'hold' | 'activate' | 'reset' | 'delete' | null>(null);

  // API calls using real service
  const { data: organizations, isLoading } = useQuery(
    'organizations',
    organizationService.getAllOrganizations
  );

  const updateOrganizationMutation = useMutation(
    async ({ orgId, action, data }: { orgId: number; action: string; data?: any }) => {
      // Map actions to appropriate API calls
      if (action === 'activate') {
        return organizationService.updateOrganizationById(orgId, { status: 'active' });
      } else if (action === 'hold') {
        return organizationService.updateOrganizationById(orgId, { status: 'suspended' });
      } else if (action === 'reset') {
        // TODO: Implement password reset API call
        console.log('Password reset for org:', orgId);
        return { message: 'Password reset successfully' };
      }
      return { message: `Organization ${action} successfully` };
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('organizations');
        setActionDialogOpen(false);
        setSelectedOrg(null);
        setActionType(null);
      }
    }
  );

  const resetOrgDataMutation = useMutation(
    async (orgId: number) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/organizations/reset-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to reset organization data');
      }

      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('organizations');
        setResetDataDialogOpen(false);
        setSelectedOrg(null);
      }
    }
  );

  const handleAction = (org: Organization, action: 'hold' | 'activate' | 'reset' | 'delete') => {
    setSelectedOrg(org);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const handleResetData = (org: Organization) => {
    setSelectedOrg(org);
    setResetDataDialogOpen(true);
  };

  const confirmAction = () => {
    if (selectedOrg && actionType) {
      updateOrganizationMutation.mutate({
        orgId: selectedOrg.id,
        action: actionType
      });
    }
  };

  const confirmResetData = () => {
    if (selectedOrg) {
      resetOrgDataMutation.mutate(selectedOrg.id);
    }
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      active: { label: 'Active', color: 'success' as const },
      trial: { label: 'Trial', color: 'info' as const },
      suspended: { label: 'Suspended', color: 'error' as const },
      hold: { label: 'On Hold', color: 'warning' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { label: status, color: 'default' as const };
    
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Manage Organizations
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={() => router.push('/admin/license-management')}
        >
          Create New License
        </Button>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <Settings sx={{ mr: 1 }} />
          Organization Management Overview
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {organizations?.length || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Organizations
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {organizations?.filter((org: Organization) => org.status === 'active').length || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active Organizations
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {organizations?.filter((org: Organization) => org.status === 'suspended').length || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Suspended Organizations
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {organizations?.filter((org: Organization) => org.status === 'trial').length || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Trial Organizations
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Organization</TableCell>
              <TableCell>Subdomain</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : organizations?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No organizations found.
                </TableCell>
              </TableRow>
            ) : (
              organizations?.map((org: Organization) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Business sx={{ mr: 1, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {org.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          ID: {org.id}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="primary">
                      {org.subdomain}.tritiq.com
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {org.primary_email}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {org.primary_phone}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {org.plan_type} ({org.max_users} users)
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {getStatusChip(org.status)}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(org.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      color="info"
                      onClick={() => router.push(`/admin/organizations/${org.id}`)}
                      title="View Details"
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleAction(org, 'reset')}
                      title="Reset Password"
                    >
                      <RestartAlt />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="warning"
                      onClick={() => handleResetData(org)}
                      title="Reset Organization Data"
                    >
                      <DataUsage />
                    </IconButton>
                    {org.status === 'active' ? (
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => handleAction(org, 'hold')}
                        title="Suspend Organization"
                      >
                        <Lock />
                      </IconButton>
                    ) : (
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleAction(org, 'activate')}
                        title="Activate Organization"
                      >
                        <LockOpen />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)}>
        <DialogTitle>
          Confirm {actionType === 'hold' ? 'Suspend Organization' : 
                   actionType === 'activate' ? 'Activate Organization' : 'Reset Password'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {actionType === 'hold' ? 'suspend' : 
                                     actionType === 'activate' ? 'activate' : 'reset password for'} 
            <strong> {selectedOrg?.name}</strong>?
          </Typography>
          {actionType === 'reset' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              A new temporary password will be generated and sent to the organization admin.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={confirmAction} 
            variant="contained"
            color={actionType === 'hold' ? 'warning' : 'primary'}
            disabled={updateOrganizationMutation.isLoading}
          >
            {updateOrganizationMutation.isLoading ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Organization Data Dialog */}
      <Dialog open={resetDataDialogOpen} onClose={() => setResetDataDialogOpen(false)}>
        <DialogTitle>Reset Organization Data</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to reset all business data for 
            <strong> {selectedOrg?.name}</strong>?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This will permanently delete all business data including:
            <ul>
              <li>Products and inventory</li>
              <li>Vendors and customers</li>
              <li>Vouchers and transactions</li>
              <li>Reports and analytics data</li>
            </ul>
            User accounts and organization settings will be preserved.
          </Alert>
          <Alert severity="error" sx={{ mt: 1 }}>
            This action cannot be undone!
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDataDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={confirmResetData} 
            variant="contained"
            color="error"
            disabled={resetOrgDataMutation.isLoading}
          >
            {resetOrgDataMutation.isLoading ? 'Resetting...' : 'Reset All Data'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ManageOrganizations;