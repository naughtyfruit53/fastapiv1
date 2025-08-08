// Manufacturing Production Voucher (Placeholder)
import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button
} from '@mui/material';
import { useRouter } from 'next/router';
import MegaMenu from '../../../components/MegaMenu';

const ProductionVoucher: React.FC = () => {
  const router = useRouter();
  
  const handleLogout = () => {
    // Handle logout
  };

  const user = { email: 'demo@example.com', role: 'admin' };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <MegaMenu user={user} onLogout={handleLogout} />
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Production Voucher (Manufacturing)
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
            This is a placeholder for the Production Voucher functionality.
          </Typography>
          
          <Typography variant="h6" sx={{ mb: 2 }}>
            Coming Soon
          </Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>
            The Production Voucher will allow you to:
          </Typography>
          <ul>
            <li>Track production orders and jobs</li>
            <li>Manage raw material consumption</li>
            <li>Record finished goods production</li>
            <li>Calculate production costs</li>
          </ul>
          
          <Button 
            variant="contained" 
            sx={{ mt: 3 }}
            onClick={() => router.push('/vouchers')}
          >
            Back to Vouchers
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default ProductionVoucher;