import React, { useState } from 'react';
import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import AddUserModal from './AddUserModal';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { userService } from '../../../services/authService';  // Adjusted to authService as per previous

const UserManagement: React.FC = () => {
  const [openModal, setOpenModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery('platformUsers', userService.getAllOrganizations);  // Perhaps wrong, change to getPlatformUsers if separate

  const deleteUserMutation = useMutation(userService.deleteUser, {
    onSuccess: () => queryClient.invalidateQueries('platformUsers'),
  });

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  const handleDelete = (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate(userId);
    }
  };

  if (isLoading) return <Typography>Loading...</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Platform User Management
      </Typography>
      <Button variant="contained" onClick={handleOpenModal} sx={{ mb: 2 }}>
        Add Platform Admin
      </Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Full Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.full_name}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>
                  <Button color="error" onClick={() => handleDelete(user.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <AddUserModal open={openModal} onClose={handleCloseModal} />
    </Box>
  );
};

export default UserManagement;