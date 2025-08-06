// frontend/src/pages/demo.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Receipt,
  Inventory,
  People,
  Business,
  Warning,
  ExitToApp
} from '@mui/icons-material';
import { useRouter } from 'next/router';

// Mock/Sample data for demo mode
const mockData = {
  stats: [
    {
      title: 'Purchase Vouchers',
      value: 15,
      icon: <Receipt />,
      color: '#1976D2'
    },
    {
      title: 'Sales Vouchers',
      value: 23,
      icon: <Receipt />,
      color: '#2E7D32'
    },
    {
      title: 'Low Stock Items',
      value: 5,
      icon: <Warning />,
      color: '#F57C00'
    },
    {
      title: 'Active Products',
      value: 148,
      icon: <People />,
      color: '#7B1FA2'
    }
  ],
  purchaseVouchers: [
    {
      id: 1,
      voucher_number: 'PV-2024-001',
      date: '2024-01-15',
      total_amount: 15750.00,
      status: 'confirmed',
      vendor: 'ABC Suppliers'
    },
    {
      id: 2,
      voucher_number: 'PV-2024-002',
      date: '2024-01-16',
      total_amount: 8950.00,
      status: 'pending',
      vendor: 'XYZ Materials'
    },
    {
      id: 3,
      voucher_number: 'PV-2024-003',
      date: '2024-01-17',
      total_amount: 22100.00,
      status: 'confirmed',
      vendor: 'Best Parts Inc'
    }
  ],
  salesVouchers: [
    {
      id: 1,
      voucher_number: 'SV-2024-001',
      date: '2024-01-15',
      total_amount: 25600.00,
      status: 'confirmed',
      customer: 'Tech Solutions Ltd'
    },
    {
      id: 2,
      voucher_number: 'SV-2024-002',
      date: '2024-01-16',
      total_amount: 18750.00,
      status: 'pending',
      customer: 'Modern Industries'
    },
    {
      id: 3,
      voucher_number: 'SV-2024-003',
      date: '2024-01-17',
      total_amount: 31200.00,
      status: 'confirmed',
      customer: 'Global Corp'
    }
  ],
  companyInfo: {
    name: 'Demo Manufacturing Company',
    address: '123 Demo Street, Sample City',
    phone: '+91-9876543210',
    email: 'demo@example.com',
    gst: '24AAACC1206D1ZV'
  }
};

export default function DemoPage() {
  const router = useRouter();
  const [demoMode, setDemoMode] = useState(true);

  useEffect(() => {
    // Set demo mode flag
    localStorage.setItem('demoMode', demoMode.toString());
  }, [demoMode]);

  const handleExitDemo = () => {
    localStorage.removeItem('demoMode');
    router.push('/dashboard');
  };

  const handleToggleDemo = () => {
    setDemoMode(!demoMode);
    if (!demoMode) {
      localStorage.setItem('demoMode', 'true');
    } else {
      localStorage.removeItem('demoMode');
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Demo Mode Alert */}
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={demoMode}
                    onChange={handleToggleDemo}
                    color="primary"
                  />
                }
                label="Demo Mode"
              />
              <Button
                color="inherit"
                size="small"
                onClick={handleExitDemo}
                startIcon={<ExitToApp />}
              >
                Exit Demo
              </Button>
            </Box>
          }
        >
          <Typography variant="h6" component="div">
            🎭 Demo Mode Active
          </Typography>
          <Typography variant="body2">
            You are viewing the organization dashboard with sample data. This is not real business data. 
            All functionality is simulated for demonstration purposes.
          </Typography>
        </Alert>

        <Typography variant="h4" component="h1" gutterBottom>
          Organization Dashboard - Demo Mode
        </Typography>

        {/* Company Info Card */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <Typography variant="h6" gutterBottom>
            {mockData.companyInfo.name}
          </Typography>
          <Typography variant="body2">
            {mockData.companyInfo.address} • {mockData.companyInfo.phone} • {mockData.companyInfo.email}
          </Typography>
          <Typography variant="body2">
            GST: {mockData.companyInfo.gst}
          </Typography>
        </Paper>

        <Grid container spacing={3}>
          {/* Statistics Cards */}
          {mockData.stats.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ color: stat.color, mr: 2 }}>
                      {stat.icon}
                    </Box>
                   <Box>
                      <Typography color="textSecondary" gutterBottom>
                        {stat.title}
                      </Typography>
                      <Typography variant="h4" component="h2">
                        {stat.value}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {/* Recent Purchase Vouchers */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Recent Purchase Vouchers (Sample Data)
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Voucher #</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mockData.purchaseVouchers.map((voucher) => (
                      <TableRow key={voucher.id}>
                        <TableCell>{voucher.voucher_number}</TableCell>
                        <TableCell>
                          {new Date(voucher.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>₹{voucher.total_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip
                            label={voucher.status}
                            color={voucher.status === 'confirmed' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Recent Sales Vouchers */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Recent Sales Vouchers (Sample Data)
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Voucher #</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mockData.salesVouchers.map((voucher) => (
                      <TableRow key={voucher.id}>
                        <TableCell>{voucher.voucher_number}</TableCell>
                        <TableCell>
                          {new Date(voucher.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>₹{voucher.total_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip
                            label={voucher.status}
                            color={voucher.status === 'confirmed' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Demo Features */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Demo Features Available
              </Typography>
              <Grid container spacing={2}>
                <Grid item>
                  <Button
                    variant="outlined"
                    startIcon={<People />}
                    onClick={() => alert('Demo: Vendors module would show sample vendor data')}
                  >
                    View Sample Vendors
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    startIcon={<Business />}
                    onClick={() => alert('Demo: Customers module would show sample customer data')}
                  >
                    View Sample Customers
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    startIcon={<Inventory />}
                    onClick={() => alert('Demo: Products module would show sample product catalog')}
                  >
                    View Sample Products
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    startIcon={<Receipt />}
                    onClick={() => alert('Demo: Vouchers module would show sample transactions')}
                  >
                    View Sample Vouchers
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}