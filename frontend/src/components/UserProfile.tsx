// Revised: v1/frontend/src/components/UserProfile.tsx
// Assuming a component where role is displayed; adjust as per actual file

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { getDisplayRole } from '../types/user.types';
import { Card, Avatar, Typography, Box } from '@mui/material';

const UserProfile: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const displayRole = getDisplayRole(user.role, user.is_super_admin);

  return (
    <Card>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
        <Avatar 
          sx={{ width: 64, height: 64, mr: 2 }} 
          src={user.avatar_path}
        >
          {user.full_name?.charAt(0)}
        </Avatar>
        <Box>
          <Typography variant="h6">
            {user.full_name}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {displayRole}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {user.email}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};

export default UserProfile;