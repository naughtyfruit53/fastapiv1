// New: v1/frontend/src/pages/dashboard/OrgDashboard.tsx

import React from 'react';
import { Card, Typography, Grid, CardContent, Box } from '@mui/material';

const OrgDashboard: React.FC = () => {
  // Mock org-specific data
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Organization Dashboard</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary">
                1128
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active Vouchers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary">
                93
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Stock Items
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary">
                15
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Products
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OrgDashboard;