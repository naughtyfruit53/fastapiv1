// fastapi_migration/frontend/src/pages/admin/index.tsx

import React from 'react';
import Link from 'next/link';
import { 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Box,
  Chip 
} from '@mui/material';
import {
  Security,
  Business,
  AdminPanelSettings,
  Settings,
  Dashboard
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const isGodAccount = user?.email === 'naughtyfruit53@gmail.com';
  const isSuperAdmin = user?.is_super_admin || user?.role === 'super_admin';

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Admin Dashboard
      </Typography>
      
      <Typography variant="body1" color="textSecondary" paragraph>
        Welcome to the administration panel. Select a module below to manage the application.
      </Typography>

      <Grid container spacing={3}>
        {/* License Management */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Security sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">License Management</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" paragraph>
                Create new organization licenses and view existing licenses. 
                Restricted to license creation and viewing only.
              </Typography>
              <Link href="/admin/license-management" passHref>
                <Button variant="contained" fullWidth>
                  Manage Licenses
                </Button>
              </Link>
            </CardContent>
          </Card>
        </Grid>

        {/* Manage Organizations */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Business sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">Manage Organizations</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" paragraph>
                Full organization management including password resets, status changes, 
                and data operations.
              </Typography>
              <Link href="/admin/manage-organizations" passHref>
                <Button variant="contained" fullWidth>
                  Manage Organizations
                </Button>
              </Link>
            </CardContent>
          </Card>
        </Grid>

        {/* App User Management - Only for God Account */}
        {isGodAccount && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AdminPanelSettings sx={{ mr: 2, color: 'warning.main' }} />
                  <Typography variant="h6">App User Management</Typography>
                  <Chip label="Restricted" color="warning" size="small" sx={{ ml: 1 }} />
                </Box>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Manage app-level users (superadmins and admins). 
                  Only accessible to the primary super admin.
                </Typography>
                <Link href="/admin/app-user-management" passHref>
                  <Button variant="contained" color="warning" fullWidth>
                    Manage App Users
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Dashboard */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Dashboard sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6">Dashboard</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" paragraph>
                View {isSuperAdmin ? 'app-level statistics and metrics' : 'organization dashboard'}.
              </Typography>
              <Link href="/dashboard" passHref>
                <Button variant="outlined" fullWidth>
                  View Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Access Information */}
      <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          Your Access Level
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {isSuperAdmin && (
            <Chip label="App Super Admin" color="primary" />
          )}
          {isGodAccount && (
            <Chip label="God Account" color="warning" />
          )}
          <Chip label={`Role: ${user?.role || 'Unknown'}`} variant="outlined" />
        </Box>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          {isGodAccount 
            ? "You have full access to all administrative functions including app user management."
            : isSuperAdmin 
            ? "You can manage licenses and organizations but cannot manage app-level users."
            : "You have limited administrative access based on your role."
          }
        </Typography>
      </Box>
    </Container>
  );
};

export default AdminDashboard;