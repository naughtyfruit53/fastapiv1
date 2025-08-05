// Revised to exactly match form layout/order from image (Address full row, City/State/PIN row, State Code/GST row), with PIN code autofill for City/State/State Code, State change autofills State Code.

import React, { useState } from 'react';
import { TextField, Button, Grid, CircularProgress } from '@mui/material';
import axios from 'axios';

// State to GST state code map (mirrored from backend for autofill)
const STATE_CODE_MAP: { [key: string]: string } = {
  "Andaman & Nicobar Islands": "35",
  "Andhra Pradesh": "37",
  "Arunachal Pradesh": "12",
  "Assam": "18",
  "Bihar": "10",
  "Chandigarh": "04",
  "Chhattisgarh": "22",
  "Dadra & Nagar Haveli & Daman & Diu": "26",
  "Delhi": "07",
  "Goa": "30",
  "Gujarat": "24",
  "Haryana": "06",
  "Himachal Pradesh": "02",
  "Jammu & Kashmir": "01",
  "Jharkhand": "20",
  "Karnataka": "29",
  "Kerala": "32",
  "Ladakh": "38",
  "Lakshadweep": "31",
  "Madhya Pradesh": "23",
  "Maharashtra": "27",
  "Manipur": "14",
  "Meghalaya": "17",
  "Mizoram": "15",
  "Nagaland": "13",
  "Odisha": "21",
  "Puducherry": "34",
  "Punjab": "03",
  "Rajasthan": "08",
  "Sikkim": "11",
  "Tamil Nadu": "33",
  "Telangana": "36",
  "Tripura": "16",
  "Uttar Pradesh": "09",
  "Uttarakhand": "05",
  "West Bengal": "19",
  "Other Territory": "97",
  "Other Country": "99"
};

const OrganizationForm: React.FC<{ onSubmit: (data: any) => void }> = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    organization_name: '',
    admin_password: '',
    superadmin_email: '',
    primary_phone: '',
    address: '',
    city: '',
    state: '',
    pin_code: '',
    state_code: '',
    gst_number: ''
  });
  const [pincodeLoading, setPincodeLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'state' ? { state_code: STATE_CODE_MAP[value] || '' } : {}),  // Autofill state_code based on state change
    }));
  };

  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleChange(e as any);
    if (value.length === 6) {
      setPincodeLoading(true);
      try {
        const response = await axios.get(`/api/pincode/lookup/${value}`);
        const { city, state, state_code } = response.data;
        setFormData((prev) => ({
          ...prev,
          city,
          state,
          state_code
        }));
      } catch (error) {
        console.error('Failed to lookup pincode:', error);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Organization Name"
            name="organization_name"
            value={formData.organization_name}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Admin Password"
            name="admin_password"
            type="password"
            value={formData.admin_password}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Primary Email"
            name="superadmin_email"
            value={formData.superadmin_email}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Primary Phone"
            name="primary_phone"
            value={formData.primary_phone}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="City"
            name="city"
            value={formData.city}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="State"
            name="state"
            value={formData.state}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="PIN Code"
            name="pin_code"
            value={formData.pin_code}
            onChange={handlePincodeChange}
            required
            InputProps={{
              endAdornment: pincodeLoading ? <CircularProgress size={20} /> : null,
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="State Code"
            name="state_code"
            value={formData.state_code}
            onChange={handleChange}
            disabled  // Autofilled, so disabled for user input
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="GST No."
            name="gst_number"
            value={formData.gst_number}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={12}>
          <Button type="submit" variant="contained" color="primary">
            Create License
          </Button>
        </Grid>
      </Grid>
    </form>
  );
};

export default OrganizationForm;