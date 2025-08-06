import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Alert
} from '@mui/material';
import { Home, Refresh, ArrowBack } from '@mui/icons-material';
import { useRouter } from 'next/router';
import { NextPageContext } from 'next';

interface ErrorProps {
  statusCode?: number;
  hasGetInitialProps?: boolean;
  err?: Error;
}

interface ErrorPageComponent extends React.FC<ErrorProps> {
  getInitialProps?: (ctx: NextPageContext) => Promise<ErrorProps> | ErrorProps;
}

const ErrorPage: ErrorPageComponent = ({ statusCode, err }) => {
  const router = useRouter();

  const handleGoHome = () => {
    router.push('/');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h3" color="error" gutterBottom>
          {statusCode ? `Error ${statusCode}` : 'Application Error'}
        </Typography>
        
        <Typography variant="h6" color="textSecondary" gutterBottom>
          {statusCode === 404
            ? 'The page you are looking for was not found.'
            : statusCode === 500
            ? 'An internal server error occurred.'
            : 'An unexpected error occurred.'}
        </Typography>

        {err && process.env.NODE_ENV === 'development' && (
          <Alert severity="error" sx={{ mt: 2, mb: 2, textAlign: 'left' }}>
            <Typography variant="body2">
              <strong>Debug Information:</strong><br />
              {err.message}
            </Typography>
          </Alert>
        )}

        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={<Home />}
            onClick={handleGoHome}
          >
            Go Home
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={handleGoBack}
          >
            Go Back
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </Box>

        <Typography variant="body2" color="textSecondary" sx={{ mt: 3 }}>
          If this problem persists, please contact support.
        </Typography>
      </Paper>
    </Container>
  );
};

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default ErrorPage;