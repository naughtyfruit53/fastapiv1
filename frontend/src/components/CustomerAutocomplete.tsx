import React, { useState, useCallback } from 'react';
import {
  Autocomplete,
  TextField,
  CircularProgress,
  Box,
  Typography,
  Chip
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { searchCustomers, createCustomer } from '../services/masterService';
import AddCustomerModal from './AddCustomerModal';

interface Customer {
  id: number;
  name: string;
  contact_number: string;
  email?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  pin_code: string;
  state_code: string;
  gst_number?: string;
  pan_number?: string;
}

interface CustomerAutocompleteProps {
  value?: string | number | null;
  onChange: (customer: Customer | null) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
}

const CustomerAutocomplete: React.FC<CustomerAutocompleteProps> = ({
  value,
  onChange,
  error = false,
  helperText = '',
  disabled = false,
  label = 'Customer',
  placeholder = 'Search or add customer...'
}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Debounced search function
  const debouncedSearch = useCallback((searchTerm: string) => {
    if (searchTerm.length >= 2) {
      return searchCustomers(searchTerm);
    }
    return Promise.resolve([]);
  }, []);

  // Search query with debouncing
  const { data: searchResults = [], isLoading } = useQuery(
    ['customerSearch', inputValue],
    () => {
      if (inputValue.length >= 2) {
        return searchCustomers(inputValue);
      }
      return Promise.resolve([]);
    },
    {
      enabled: inputValue.length >= 2,
      keepPreviousData: true,
      staleTime: 300, // Cache for 300ms to debounce
    }
  );

  // Create customer mutation
  const createCustomerMutation = useMutation(createCustomer, {
    onSuccess: (newCustomer) => {
      // Invalidate search queries
      queryClient.invalidateQueries(['customerSearch']);
      queryClient.invalidateQueries(['customers']);
      
      // Auto-select the newly created customer
      setSelectedCustomer(newCustomer);
      onChange(newCustomer);
      setAddModalOpen(false);
    },
    onError: (error: any) => {
      console.error('Failed to create customer:', error);
    }
  });

  // Create options array with "Add Customer" option
  const options = React.useMemo(() => {
    const addOption = {
      id: -1,
      name: '➕ Add Customer',
      isAddOption: true,
    };
    
    return inputValue.length >= 2 
      ? [addOption, ...searchResults]
      : searchResults.length > 0 
        ? [addOption, ...searchResults]
        : [addOption];
  }, [searchResults, inputValue]);

  const handleSelectionChange = (_: any, newValue: any) => {
    if (newValue?.isAddOption) {
      setAddModalOpen(true);
      return;
    }
    
    setSelectedCustomer(newValue);
    onChange(newValue);
  };

  const handleAddCustomer = async (customerData: any) => {
    await createCustomerMutation.mutateAsync(customerData);
  };

  return (
    <>
      <Autocomplete
        value={selectedCustomer}
        onChange={handleSelectionChange}
        inputValue={inputValue}
        onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
        options={options}
        getOptionLabel={(option) => {
          if (option.isAddOption) return option.name;
          return option.name;
        }}
        isOptionEqualToValue={(option, value) => option.id === value?.id}
        loading={isLoading}
        disabled={disabled}
        filterOptions={(x) => x} // Disable default filtering since we use backend search
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            error={error}
            helperText={helperText}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => {
          if (option.isAddOption) {
            return (
              <Box component="li" {...props} sx={{ 
                color: 'primary.main', 
                fontWeight: 'bold',
                borderBottom: '1px solid #eee'
              }}>
                <AddIcon sx={{ mr: 1 }} />
                {option.name}
              </Box>
            );
          }

          return (
            <Box component="li" {...props}>
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {option.name}
                  </Typography>
                  {option.gst_number && (
                    <Chip 
                      label={`GST: ${option.gst_number}`} 
                      size="small" 
                      variant="outlined" 
                    />
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  {option.contact_number && (
                    <Typography variant="caption" color="text.secondary">
                      📞 {option.contact_number}
                    </Typography>
                  )}
                  {option.city && (
                    <Typography variant="caption" color="text.secondary">
                      📍 {option.city}, {option.state}
                    </Typography>
                  )}
                  {option.email && (
                    <Typography variant="caption" color="text.secondary">
                      ✉️ {option.email}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          );
        }}
        noOptionsText={
          inputValue.length < 2 
            ? "Type to search customers..." 
            : "No customers found"
        }
      />

      <AddCustomerModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddCustomer}
        loading={createCustomerMutation.isLoading}
        initialName={inputValue}
      />
    </>
  );
};

export default CustomerAutocomplete;