import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { organizationService } from '../services/authService';
import axios from 'axios';

interface CreateOrganizationLicenseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

interface LicenseFormData {
  organization_name: string;
  superadmin_email: string;
  primary_phone: string;
  admin_password: string;
  address: string;
  pin_code: string;
  city: string;
  state: string;
  state_code: string;
  gst_number?: string;
}

// Indian states for dropdown selection
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
  'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep',
  'Delhi', 'Puducherry', 'Ladakh'
];

// State to GST state code mapping
const stateToCodeMap: { [key: string]: string } = {
  'Andhra Pradesh': '37',
  'Arunachal Pradesh': '12',
  'Assam': '18',
  'Bihar': '10',
  'Chhattisgarh': '22',
  'Goa': '30',
  'Gujarat': '24',
  'Haryana': '06',
  'Himachal Pradesh': '02',
  'Jammu and Kashmir': '01',
  'Jharkhand': '20',
  'Karnataka': '29',
  'Kerala': '32',
  'Madhya Pradesh': '23',
  'Maharashtra': '27',
  'Manipur': '14',
  'Meghalaya': '17',
  'Mizoram': '15',
  'Nagaland': '13',
  'Odisha': '21',
  'Punjab': '03',
  'Rajasthan': '08',
  'Sikkim': '11',
  'Tamil Nadu': '33',
  'Telangana': '36',
  'Tripura': '16',
  'Uttar Pradesh': '09',
  'Uttarakhand': '05',
  'West Bengal': '19',
  'Andaman and Nicobar Islands': '35',
  'Chandigarh': '04',
  'Dadra and Nagar Haveli and Daman and Diu': '26',
  'Lakshadweep': '31',
  'Delhi': '07',
  'Puducherry': '34',
  'Ladakh': '38',
};

const CreateOrganizationLicenseModal: React.FC<CreateOrganizationLicenseModalProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<LicenseFormData>();

  const pin_code = watch('pin_code');
  const state = watch('state');

  // Auto-populate city, state, and state_code when pin code changes
  useEffect(() => {
    if (pin_code && pin_code.length === 6 && /^\d{6}$/.test(pin_code)) {
      fetchLocationData(pin_code);
    }
  }, [pin_code]);

  // Auto-populate state_code when state changes
  useEffect(() => {
    if (state) {
      const code = stateToCodeMap[state];
      if (code) {
        setValue('state_code', code, { shouldValidate: true });
      }
    }
  }, [state, setValue]);

  const fetchLocationData = async (pin: string) => {
    try {
      const response = await axios.get(`https://api.postalpincode.in/pincode/${pin}`);
      const data = response.data[0];
      if (data.Status === 'Success' && data.PostOffice && data.PostOffice.length > 0) {
        const postOffice = data.PostOffice[0];
        setValue('city', postOffice.District, { shouldValidate: true });
        setValue('state', postOffice.State, { shouldValidate: true });
      }
    } catch (err) {
      console.warn('Failed to fetch location data for pin code:', pin);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    setSuccess(null);
    onClose();
  };

  const onSubmit = async (data: LicenseFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate required fields that might not be caught by form validation
    if (!data.state) {
      setError('Please select a state');
      setLoading(false);
      return;
    }

    // Prepare the data for submission
    const submissionData = {
      organization_name: data.organization_name.trim(),
      superadmin_email: data.superadmin_email.trim(),
      primary_phone: data.primary_phone?.trim(),
      admin_password: data.admin_password?.trim() || undefined, // Let backend generate if empty
      address: data.address.trim(),
      pin_code: data.pin_code.trim(),
      city: data.city.trim(),
      state: data.state.trim(),
      state_code: data.state_code.trim(),
      gst_number: data.gst_number?.trim() || undefined, // Optional field
    };

    console.log('Submitting license data:', submissionData);

    try {
      const result = await organizationService.createLicense(submissionData);
      setSuccess(result);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: any) {
      console.error('License creation error:', err);
      setError(err.message || 'Failed to create organization license');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Create Organization License</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>License created successfully!</strong>
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Organization:</strong> {success.organization_name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Subdomain:</strong> {success.subdomain}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Admin Email:</strong> {success.superadmin_email}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Temporary Password:</strong> {success.temp_password}
              </Typography>
              <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                Please save these details securely. The password should be changed on first login.
              </Typography>
            </Alert>
          )}

          {!success && (
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Row 1: Organization Name & Primary Phone */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Organization Name"
                    {...register('organization_name', {
                      required: 'Organization name is required',
                      minLength: {
                        value: 3,
                        message: 'Organization name must be at least 3 characters'
                      }
                    })}
                    error={!!errors.organization_name}
                    helperText={errors.organization_name?.message}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Primary Phone"
                    {...register('primary_phone', {
                      required: 'Primary phone is required',
                      pattern: {
                        value: /^[\+]?[0-9\-\s\(\)]{10,15}$/,
                        message: 'Enter a valid phone number'
                      }
                    })}
                    error={!!errors.primary_phone}
                    helperText={errors.primary_phone?.message}
                    disabled={loading}
                    placeholder="+91-1234567890"
                  />
                </Grid>
              </Grid>

              {/* Row 2: Primary/Login Email & Admin Password */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Primary/Login Email"
                    type="email"
                    {...register('superadmin_email', {
                      required: 'Primary email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    error={!!errors.superadmin_email}
                    helperText={errors.superadmin_email?.message}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Admin Password"
                    type="password"
                    {...register('admin_password', {
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters'
                      }
                    })}
                    error={!!errors.admin_password}
                    helperText={errors.admin_password?.message || 'Leave blank to auto-generate password'}
                    disabled={loading}
                  />
                </Grid>
              </Grid>

              {/* Row 3: Address */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Address"
                    multiline
                    rows={2}
                    {...register('address', {
                      required: 'Address is required'
                    })}
                    error={!!errors.address}
                    helperText={errors.address?.message}
                    disabled={loading}
                  />
                </Grid>
              </Grid>

              {/* Row 4: Pin Code, City, State */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Pin Code"
                    {...register('pin_code', {
                      required: 'Pin code is required',
                      pattern: {
                        value: /^\d{6}$/,
                        message: 'Pin code must be 6 digits'
                      }
                    })}
                    error={!!errors.pin_code}
                    helperText={errors.pin_code?.message || 'Auto-populates city & state'}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="City"
                    {...register('city', { required: 'City is required' })}
                    error={!!errors.city}
                    helperText={errors.city?.message}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth error={!!errors.state}>
                    <InputLabel>State</InputLabel>
                    <Select
                      label="State"
                      value={watch('state') || ''}
                      onChange={(e) => setValue('state', e.target.value, { shouldValidate: true })}
                      disabled={loading}
                    >
                      {INDIAN_STATES.map((stateName) => (
                        <MenuItem key={stateName} value={stateName}>
                          {stateName}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.state && (
                      <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                        {errors.state.message}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
              </Grid>

              {/* Row 5: GST Number & State Code */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="GST Number (Optional)"
                    {...register('gst_number', {
                      pattern: {
                        value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                        message: 'Invalid GST number format'
                      }
                    })}
                    error={!!errors.gst_number}
                    helperText={errors.gst_number?.message || 'Optional - Format: 22AAAAA0000A1Z5'}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="State Code"
                    {...register('state_code', {
                      required: 'State code is required',
                      pattern: {
                        value: /^\d{2}$/,
                        message: 'State code must be 2 digits'
                      }
                    })}
                    error={!!errors.state_code}
                    helperText={errors.state_code?.message || 'Auto-filled from state selection'}
                    disabled={loading}
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  This will create a new organization with a trial license and a superadmin user account.
                  City, state, and state code will be auto-populated from the pin code but remain editable.
                  A confirmation email will be sent with login details.
                </Typography>
              </Box>
            </form>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {success ? 'Close' : 'Cancel'}
        </Button>
        {!success && (
          <Button
            onClick={handleSubmit(onSubmit)}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Create License
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateOrganizationLicenseModal;