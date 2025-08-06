// Enhanced: v1/frontend/src/pages/dashboard/AppSuperAdminDashboard.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Container,
  Paper,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Business,
  People,
  AdminPanelSettings,
  TrendingUp,
  Security,
  MonitorHeart
} from '@mui/icons-material';

interface AppStatistics {
  total_licenses_issued: number;
  active_organizations: number;
  trial_organizations: number;
  total_active_users: number;
  super_admins_count: number;
  new_licenses_this_month: number;
  plan_breakdown: { [key: string]: number };
  system_health: {
    status: string;
    uptime: string;
  };
  generated_at: string;
}

const AppSuperAdminDashboard: React.FC = () => {
  const [statistics, setStatistics] = useState<AppStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAppStatistics();
  }, []);

  const fetchAppStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/organizations/app-statistics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch app statistics');
      }

      const data = await response.json();
      setStatistics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          Error loading dashboard: {error}
        </Alert>
      </Container>
    );
  }

  if (!statistics) {
    return null;
  }

  const statsCards = [
    {
      title: 'Total Licenses Issued',
      value: statistics.total_licenses_issued,
      icon: <Business />,
      color: '#1976D2',
      description: 'Total organization licenses created'
    },
    {
      title: 'Active Organizations',
      value: statistics.active_organizations,
      icon: <Business />,
      color: '#2E7D32',
      description: 'Organizations with active status'
    },
    {
      title: 'Total Active Users',
      value: statistics.total_active_users,
      icon: <People />,
      color: '#7B1FA2',
      description: 'Active users across all organizations'
    },
    {
      title: 'Super Admins',
      value: statistics.super_admins_count,
      icon: <AdminPanelSettings />,
      color: '#F57C00',
      description: 'App-level administrators'
    },
    {
      title: 'New Licenses (30d)',
      value: statistics.new_licenses_this_month,
      icon: <TrendingUp />,
      color: '#5E35B1',
      description: 'Licenses created in last 30 days'
    },
    {
      title: 'System Health',
      value: statistics.system_health.uptime,
      icon: <MonitorHeart />,
      color: statistics.system_health.status === 'healthy' ? '#2E7D32' : '#D32F2F',
      description: 'System uptime percentage'
    }
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          App Super Admin Dashboard
        </Typography>
        
        <Grid container spacing={3}>
          {/* Statistics Cards */}
          {statsCards.map((stat, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ color: stat.color, mr: 2 }}>
                      {stat.icon}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography color="textSecondary" variant="body2">
                        {stat.title}
                      </Typography>
                      <Typography variant="h4" component="h2">
                        {stat.value}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    {stat.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {/* Plan Breakdown */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                License Plan Distribution
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(statistics.plan_breakdown).map(([plan, count]) => (
                  <Chip
                    key={plan}
                    label={`${plan}: ${count}`}
                    color={plan === 'trial' ? 'warning' : 'primary'}
                    variant="outlined"
                  />
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* System Status */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Security sx={{ color: '#2E7D32', mr: 1 }} />
                <Typography>
                  Status: <Chip 
                    label={statistics.system_health.status} 
                    color={statistics.system_health.status === 'healthy' ? 'success' : 'error'}
                    size="small"
                  />
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Last updated: {new Date(statistics.generated_at).toLocaleString()}
              </Typography>
            </Paper>
          </Grid>

          {/* Growth Metrics */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Platform Growth Overview
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box textAlign="center">
                    <Typography variant="h3" color="primary">
                      {statistics.total_licenses_issued}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Organizations
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box textAlign="center">
                    <Typography variant="h3" color="secondary">
                      {statistics.total_active_users}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Platform Users
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box textAlign="center">
                    <Typography variant="h3" color="success.main">
                      {Math.round((statistics.active_organizations / statistics.total_licenses_issued) * 100)}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Activation Rate
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default AppSuperAdminDashboard;