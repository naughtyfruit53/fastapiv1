import React from 'react';
import { Box, TextField, MenuItem, FormControl, InputLabel, Select, Button } from '@mui/material';
import { useForm } from 'react-hook-form';

interface AdminUserFormProps {
  onSubmit: (data: any) => void;
}

const AdminUserForm: React.FC<AdminUserFormProps> = ({ onSubmit }) => {
  const { register, handleSubmit, formState: { errors } } = useForm();

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
      <TextField
        fullWidth
        label="Email"
        {...register('email', { required: 'Email is required' })}
        error={!!errors.email}
        helperText={errors.email?.message as string}
        margin="normal"
      />
      <TextField
        fullWidth
        label="Full Name"
        {...register('full_name')}
        margin="normal"
      />
      <FormControl fullWidth margin="normal">
        <InputLabel>Role</InputLabel>
        <Select
          label="Role"
          {...register('role', { required: 'Role is required' })}
          defaultValue="platform_admin"
        >
          <MenuItem value="platform_admin">Platform Admin</MenuItem>
        </Select>
      </FormControl>
      <TextField
        fullWidth
        label="Password"
        type="password"
        {...register('password', { required: 'Password is required' })}
        error={!!errors.password}
        helperText={errors.password?.message as string}
        margin="normal"
      />
      <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
        Create User
      </Button>
    </Box>
  );
};

export default AdminUserForm;