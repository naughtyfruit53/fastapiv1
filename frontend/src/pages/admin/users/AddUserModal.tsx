import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import AdminUserForm from '../../components/AdminUserForm';
import { useMutation, useQueryClient } from 'react-query';
import { userService } from '../../services/userService';

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const createUserMutation = useMutation(userService.createPlatformUser, {
    onSuccess: () => {
      queryClient.invalidateQueries('platformUsers');
      onClose();
    },
  });

  const handleSubmit = (data: any) => {
    createUserMutation.mutate(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Platform Admin</DialogTitle>
      <DialogContent>
        <AdminUserForm onSubmit={handleSubmit} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddUserModal;