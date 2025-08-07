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
import { searchProducts, createProduct } from '../services/masterService';
import AddProductModal from './AddProductModal';

interface Product {
  id: number;
  product_name: string; // Updated to match API response format
  hsn_code?: string;
  part_number?: string;
  unit: string;
  unit_price: number;
  gst_rate?: number;
  is_gst_inclusive?: boolean;
  reorder_level?: number;
  description?: string;
  is_manufactured?: boolean;
}

interface ProductAutocompleteProps {
  value?: string | number | null;
  onChange: (product: Product | null) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
}

const ProductAutocomplete: React.FC<ProductAutocompleteProps> = ({
  value,
  onChange,
  error = false,
  helperText = '',
  disabled = false,
  label = 'Product',
  placeholder = 'Search or add product...'
}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Debounced search function
  const debouncedSearch = useCallback((searchTerm: string) => {
    if (searchTerm.length >= 2) {
      return searchProducts(searchTerm);
    }
    return Promise.resolve([]);
  }, []);

  // Search query with debouncing
  const { data: searchResults = [], isLoading } = useQuery(
    ['productSearch', inputValue],
    () => {
      if (inputValue.length >= 2) {
        return searchProducts(inputValue);
      }
      return Promise.resolve([]);
    },
    {
      enabled: inputValue.length >= 2,
      keepPreviousData: true,
      staleTime: 300, // Cache for 300ms to debounce
    }
  );

  // Create product mutation
  const createProductMutation = useMutation(createProduct, {
    onSuccess: (newProduct) => {
      // Invalidate search queries
      queryClient.invalidateQueries(['productSearch']);
      queryClient.invalidateQueries(['products']);
      
      // Auto-select the newly created product
      setSelectedProduct(newProduct);
      onChange(newProduct);
      setAddModalOpen(false);
    },
    onError: (error: any) => {
      console.error('Failed to create product:', error);
    }
  });

  // Create options array with "Add Product" option
  const options = React.useMemo(() => {
    const addOption = {
      id: -1,
      product_name: '➕ Add Product',
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
    
    setSelectedProduct(newValue);
    onChange(newValue);
  };

  const handleAddProduct = async (productData: any) => {
    await createProductMutation.mutateAsync(productData);
  };

  return (
    <>
      <Autocomplete
        value={selectedProduct}
        onChange={handleSelectionChange}
        inputValue={inputValue}
        onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
        options={options}
        getOptionLabel={(option) => {
          if (option.isAddOption) return option.product_name;
          return `${option.product_name}${option.part_number ? ` (${option.part_number})` : ''}`;
        }}}
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
                {option.product_name}
              </Box>
            );
          }

          return (
            <Box component="li" {...props}>
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {option.product_name}
                  </Typography>
                  {option.unit_price && (
                    <Chip 
                      label={`₹${option.unit_price}`} 
                      size="small" 
                      variant="outlined" 
                    />
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  {option.hsn_code && (
                    <Typography variant="caption" color="text.secondary">
                      HSN: {option.hsn_code}
                    </Typography>
                  )}
                  {option.part_number && (
                    <Typography variant="caption" color="text.secondary">
                      Part: {option.part_number}
                    </Typography>
                  )}
                  {option.unit && (
                    <Typography variant="caption" color="text.secondary">
                      Unit: {option.unit}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          );
        }}
        noOptionsText={
          inputValue.length < 2 
            ? "Type to search products..." 
            : "No products found"
        }
      />

      <AddProductModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddProduct}
        loading={createProductMutation.isLoading}
        initialName={inputValue}
      />
    </>
  );
};

export default ProductAutocomplete;