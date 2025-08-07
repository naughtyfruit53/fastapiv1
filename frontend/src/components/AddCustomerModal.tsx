import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useForm } from 'react-hook-form';

interface AddCustomerModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (customerData: any) => Promise<void>;
  loading?: boolean;
  initialName?: string;
}

interface CustomerFormData {
  name: string;
  contact_number: string;
  email: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  pin_code: string;
  state_code: string;
  gst_number: string;
  pan_number: string;
}

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  open,
  onClose,
  onAdd,
  loading = false,
  initialName = ''
}) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerFormData>({
    defaultValues: {
      name: initialName,
      contact_number: '',
      email: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      pin_code: '',
      state_code: '',
      gst_number: '',
      pan_number: '',
    }
  });

  React.useEffect(() => {
    if (open && initialName) {
      reset({ 
        name: initialName,
        contact_number: '',
        email: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        pin_code: '',
        state_code: '',
        gst_number: '',
        pan_number: '',
      });
    }
  }, [open, initialName, reset]);

  const onSubmit = async (data: CustomerFormData) => {
    try {
      // Remove empty fields to match backend schema
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value && value.trim() !== '')
      );
      await onAdd(cleanData);
      reset();
    } catch (error) {
      console.error('Error adding customer:', error);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle>
        <Typography variant="h6" component="div">
          Add New Customer
        </Typography>
      </DialogTitle>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Customer Name"
                {...register('name', { required: 'Customer name is required' })}
                error={!!errors.name}
                helperText={errors.name?.message}
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contact Number"
                {...register('contact_number', { 
                  required: 'Contact number is required',
                  pattern: {
                    value: /^[0-9]{10}$/,
                    message: 'Please enter a valid 10-digit phone number'
                  }
                })}
                error={!!errors.contact_number}
                helperText={errors.contact_number?.message}
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                {...register('email', {
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email address'
                  }
                })}
                error={!!errors.email}
                helperText={errors.email?.message}
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="GST Number"
                {...register('gst_number', {
                  pattern: {
                    value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                    message: 'Please enter a valid GST number'
                  }
                })}
                error={!!errors.gst_number}
                helperText={errors.gst_number?.message}
                disabled={loading}
                placeholder="22AAAAA0000A1Z5"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address Line 1"
                {...register('address1', { required: 'Address is required' })}
                error={!!errors.address1}
                helperText={errors.address1?.message}
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address Line 2"
                {...register('address2')}
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
              <TextField
                fullWidth
                label="State"
                {...register('state', { required: 'State is required' })}
                error={!!errors.state}
                helperText={errors.state?.message}
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="PIN Code"
                {...register('pin_code', { 
                  required: 'PIN code is required',
                  pattern: {
                    value: /^[0-9]{6}$/,
                    message: 'Please enter a valid 6-digit PIN code'
                  }
                })}
                error={!!errors.pin_code}
                helperText={errors.pin_code?.message}
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
                    value: /^[0-9]{2}$/,
                    message: 'Please enter a valid 2-digit state code'
                  }
                })}
                error={!!errors.state_code}
                helperText={errors.state_code?.message}
                disabled={loading}
                placeholder="e.g., 27 for Maharashtra"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="PAN Number"
                {...register('pan_number', {
                  pattern: {
                    value: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
                    message: 'Please enter a valid PAN number'
                  }
                })}
                error={!!errors.pan_number}
                helperText={errors.pan_number?.message}
                disabled={loading}
                placeholder="ABCDE1234F"
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleClose}
            disabled={loading}
            color="inherit"
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Adding...' : 'Add Customer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddCustomerModal;