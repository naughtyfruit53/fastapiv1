import React, { useState } from 'react';
import { Box, TextField, MenuItem, FormControl, InputLabel, Select, Button } from '@mui/material';

interface AdminUserFormProps {
  onSubmit: (data: any) => void;
}

const AdminUserForm: React.FC<AdminUserFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'platform_admin',
    password: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <TextField
        fullWidth
        label="Email"
        value={formData.email}
        onChange={handleChange('email')}
        required
        margin="normal"
      />
      <TextField
        fullWidth
        label="Full Name"
        value={formData.full_name}
        onChange={handleChange('full_name')}
        margin="normal"
      />
      <FormControl fullWidth margin="normal">
        <InputLabel>Role</InputLabel>
        <Select
          label="Role"
          value={formData.role}
          onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
        >
          <MenuItem value="platform_admin">Platform Admin</MenuItem>
        </Select>
      </FormControl>
      <TextField
        fullWidth
        label="Password"
        type="password"
        value={formData.password}
        onChange={handleChange('password')}
        required
        margin="normal"
      />
      <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
        Create User
      </Button>
    </Box>
  );
};

export default AdminUserForm;