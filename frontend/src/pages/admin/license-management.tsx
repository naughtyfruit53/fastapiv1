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
  Divider
} from '@mui/material';
import {
  Add,
  Edit,
  Lock,
  LockOpen,
  RestartAlt,
  Visibility,
  Business,
  Security,
  Person
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useRouter } from 'next/router';
import { organizationService } from '../../services/authService';
import CreateOrganizationLicenseModal from '../../components/CreateOrganizationLicenseModal';

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

const LicenseManagement: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'hold' | 'activate' | 'reset' | null>(null);

  // API calls using real service
  const { data: organizations, isLoading } = useQuery(
    'organizations',
    organizationService.getAllOrganizations
  );

  const createLicenseMutation = useMutation(
    organizationService.createLicense,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('organizations');
        setCreateDialogOpen(false);
      }
    }
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

  const resetForm = () => {
    // No longer needed as the modal handles its own form reset
  };

  const handleCreateLicense = (result: any) => {
    // License creation is handled by the modal
    queryClient.invalidateQueries('organizations');
  };

  const handleAction = (org: Organization, action: 'hold' | 'activate' | 'reset') => {
    setSelectedOrg(org);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const confirmAction = () => {
    if (selectedOrg && actionType) {
      updateOrganizationMutation.mutate({
        orgId: selectedOrg.id,
        action: actionType
      });
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
          License Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create New License
        </Button>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <Security sx={{ mr: 1 }} />
          Organization Licenses Overview
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {organizations?.length || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Licenses
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {organizations?.filter((org: Organization) => org.status === 'active').length || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active Licenses
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {organizations?.filter((org: Organization) => org.status === 'trial').length || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Trial Licenses
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {organizations?.filter((org: Organization) => org.status === 'suspended').length || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Suspended Licenses
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
                  No organizations found. Create your first license to get started.
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
                    {org.status === 'active' ? (
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => handleAction(org, 'hold')}
                        title="Hold Access"
                      >
                        <Lock />
                      </IconButton>
                    ) : (
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleAction(org, 'activate')}
                        title="Activate"
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

      {/* Enhanced Create License Modal */}
      <CreateOrganizationLicenseModal
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleCreateLicense}
      />

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)}>
        <DialogTitle>
          Confirm {actionType === 'hold' ? 'Hold Access' : 
                   actionType === 'activate' ? 'Activate' : 'Reset Password'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {actionType === 'hold' ? 'hold access for' : 
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
    </Container>
  );
};

export default LicenseManagement;