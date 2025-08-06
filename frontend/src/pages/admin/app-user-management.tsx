import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
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
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Lock,
  LockOpen,
  RestartAlt,
  AdminPanelSettings,
  Security,
  AccountCircle,
  Shield
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

interface AppUser {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: string;
  department?: string;
  designation?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  department?: string;
  designation?: string;
  phone?: string;
}

const AppUserManagement: React.FC = () => {
  const { user } = useAuth();
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [createUserData, setCreateUserData] = useState<CreateUserData>({
    email: '',
    password: '',
    full_name: '',
    department: '',
    designation: '',
    phone: ''
  });

  // Check if current user is the god account
  const isGodAccount = user?.email === 'naughtyfruit53@gmail.com';

  useEffect(() => {
    fetchAppUsers();
  }, []);

  const fetchAppUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/app-users/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch app users');
      }

      const data = await response.json();
      setAppUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/app-users/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...createUserData,
          role: 'super_admin'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create user');
      }

      setCreateDialogOpen(false);
      setCreateUserData({
        email: '',
        password: '',
        full_name: '',
        department: '',
        designation: '',
        phone: ''
      });
      fetchAppUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleToggleUserStatus = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/app-users/${userId}/toggle-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to toggle user status');
      }

      fetchAppUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle user status');
    }
  };

  const handleResetPassword = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/app-users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to reset password');
      }

      const result = await response.json();
      alert(`Password reset successfully. New password: ${result.new_password}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/app-users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete user');
      }

      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchAppUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const getStatusChip = (isActive: boolean) => {
    return (
      <Chip
        label={isActive ? 'Active' : 'Inactive'}
        color={isActive ? 'success' : 'default'}
        size="small"
      />
    );
  };

  if (!isGodAccount) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Access denied. App User Management is restricted to the primary super admin.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center' }}>
          <AdminPanelSettings sx={{ mr: 2 }} />
          App User Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Add App User
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <Security sx={{ mr: 1 }} />
          App-Level User Overview
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {appUsers.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total App Users
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {appUsers.filter(u => u.is_active).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active Users
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                1
              </Typography>
              <Typography variant="body2" color="textSecondary">
                God Account
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {appUsers.map((appUser) => (
              <TableRow key={appUser.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AccountCircle sx={{ mr: 1, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {appUser.full_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        @{appUser.username}
                      </Typography>
                    </Box>
                    {appUser.email === 'naughtyfruit53@gmail.com' && (
                      <Tooltip title="God Account - Cannot be deleted">
                        <Shield sx={{ ml: 1, color: 'gold' }} />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{appUser.email}</TableCell>
                <TableCell>
                  <Chip label="Super Admin" color="primary" size="small" />
                </TableCell>
                <TableCell>{appUser.department || '-'}</TableCell>
                <TableCell>{getStatusChip(appUser.is_active)}</TableCell>
                <TableCell>
                  {new Date(appUser.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleResetPassword(appUser.id)}
                    title="Reset Password"
                  >
                    <RestartAlt />
                  </IconButton>
                  {appUser.email !== 'naughtyfruit53@gmail.com' && (
                    <>
                      <IconButton
                        size="small"
                        color={appUser.is_active ? 'warning' : 'success'}
                        onClick={() => handleToggleUserStatus(appUser.id)}
                        title={appUser.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {appUser.is_active ? <Lock /> : <LockOpen />}
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setSelectedUser(appUser);
                          setDeleteDialogOpen(true);
                        }}
                        title="Delete User"
                      >
                        <Delete />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New App User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={createUserData.email}
                onChange={(e) => setCreateUserData({ ...createUserData, email: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={createUserData.password}
                onChange={(e) => setCreateUserData({ ...createUserData, password: e.target.value })}
                required
                helperText="User will be forced to change password on first login"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Name"
                value={createUserData.full_name}
                onChange={(e) => setCreateUserData({ ...createUserData, full_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Department"
                value={createUserData.department}
                onChange={(e) => setCreateUserData({ ...createUserData, department: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Designation"
                value={createUserData.designation}
                onChange={(e) => setCreateUserData({ ...createUserData, designation: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone"
                value={createUserData.phone}
                onChange={(e) => setCreateUserData({ ...createUserData, phone: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained">
            Create User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete App User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email})?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. The user will lose all access to the application.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteUser} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AppUserManagement;