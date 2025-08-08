// purchase-voucher.tsx - Based on sales-voucher.tsx with Customer replaced by Vendor
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { Box, Button, TextField, Typography, Grid, IconButton, Alert, CircularProgress, Container, Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Autocomplete, createFilterOptions, InputAdornment } from '@mui/material';
import { Add, Remove, Edit, Visibility } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { voucherService } from '../../../services/authService';
import { getVendors, getProducts } from '../../../services/masterService';
import jsPDF from 'jspdf';
import api from '../../../lib/api';

const numberToWordsInteger = (num: number): string => {
  if (num === 0) return '';
  const belowTwenty = [' ', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = [' ', ' ', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const thousands = ['', 'Thousand', 'Million', 'Billion'];
  let word = '';
  let i = 0;
  while (num > 0) {
    const chunk = num % 1000;
    if (chunk) {
      let chunkWord = '';
      if (chunk >= 100) {
        chunkWord += belowTwenty[Math.floor(chunk / 100)] + ' Hundred ';
      }
      let remain = chunk % 100;
      if (remain >= 20) {
        chunkWord += tens[Math.floor(remain / 10)] + ' ';
        remain %= 10;
      }
      if (remain > 0) {
        chunkWord += belowTwenty[remain] + ' ';
      }
      word = chunkWord + thousands[i] + ' ' + word;
    }
    num = Math.floor(num / 1000);
    i++;
  }
  return word.trim();
};

const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero only';
  const integer = Math.floor(num);
  const decimal = Math.round((num - integer) * 100);
  let word = numberToWordsInteger(integer);
  if (decimal > 0) {
    word += ' point ' + numberToWordsInteger(decimal);
  }
  return word ? word + ' only' : '';
};

const generatePDF = (voucherData: any) => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('Purchase Voucher', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`Voucher Number: ${voucherData.voucher_number}`, 20, 40);
  doc.text(`Date: ${voucherData.date}`, 20, 50);
  doc.text(`Vendor ID: ${voucherData.vendor_id}`, 20, 60);
  doc.text(`Payment Terms: ${voucherData.payment_terms}`, 20, 70);
  doc.text(`Notes: ${voucherData.notes}`, 20, 80);
  
  let y = 100;
  doc.text('Items:', 20, y);
  y += 10;
  
  voucherData.items.forEach((item: any, index: number) => {
    doc.text(`Item ${index + 1}:`, 20, y);
    doc.text(`Product ID: ${item.product_id}`, 30, y + 10);
    doc.text(`HSN Code: ${item.hsn_code}`, 30, y + 20);
    doc.text(`Quantity: ${item.quantity} ${item.unit}`, 30, y + 30);
    doc.text(`Unit Price: ${item.unit_price}`, 30, y + 40);
    doc.text(`GST Rate: ${item.gst_rate}%`, 30, y + 50);
    doc.text(`Total Amount: ${item.total_amount}`, 30, y + 60);
    y += 70;
  });
  
  doc.text(`Grand Total: ${voucherData.total_amount}`, 20, y + 10);
  doc.text(`Amount in Words: ${numberToWords(voucherData.total_amount || 0)}`, 20, y + 20);
  
  doc.save(`purchase_voucher_${voucherData.voucher_number}.pdf`);
};

const GST_SLABS = [0, 5, 12, 18, 28];  // Add cess if needed, e.g., [0, 5, 12, 18, 28, '28 + 12% Cess']

const PurchaseVoucherPage: React.FC = () => {
  const router = useRouter();
  const { id, mode: queryMode } = router.query;
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>((queryMode as any) || 'create');
  const [selectedId, setSelectedId] = useState<number | null>(id ? Number(id) : null);
  const queryClient = useQueryClient();

  const defaultValues = {
    voucher_number: '',
    date: new Date().toISOString().slice(0, 10),
    vendor_id: null,
    payment_terms: '',
    notes: '',
    items: [{ product_id: null, hsn_code: '', quantity: 0, unit: '', unit_price: 0, discount_percentage: 0, discount_amount: 0, taxable_amount: 0, gst_rate: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0, total_amount: 0 }],
    total_amount: 0,
    discount_amount: 0,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
  };

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const itemsWatch = useWatch({ control, name: 'items' });

  useEffect(() => {
    let totalSubtotal = 0;
    let totalGst = 0;
    let totalDiscount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    itemsWatch.forEach((item, index) => {
      const subtotal = (item.quantity || 0) * (item.unit_price || 0);
      const discountAmount = subtotal * ((item.discount_percentage || 0) / 100);
      const taxableAmount = subtotal - discountAmount;
      const gstAmount = taxableAmount * ((item.gst_rate || 0) / 100);
      // Assuming intra-state transaction for simplicity (CGST + SGST); adjust if needed for IGST
      const cgstAmount = gstAmount / 2;
      const sgstAmount = gstAmount / 2;
      const igstAmount = 0;
      const itemTotal = taxableAmount + gstAmount;

      setValue(`items.${index}.discount_amount`, discountAmount);
      setValue(`items.${index}.taxable_amount`, taxableAmount);
      setValue(`items.${index}.cgst_amount`, cgstAmount);
      setValue(`items.${index}.sgst_amount`, sgstAmount);
      setValue(`items.${index}.igst_amount`, igstAmount);
      setValue(`items.${index}.total_amount`, itemTotal);

      totalSubtotal += subtotal;
      totalDiscount += discountAmount;
      totalGst += gstAmount;
      totalCgst += cgstAmount;
      totalSgst += sgstAmount;
      totalIgst += igstAmount;
    });
    const calculatedTotalAmount = totalSubtotal - totalDiscount + totalGst;
    setValue('total_amount', calculatedTotalAmount);
    setValue('discount_amount', totalDiscount);
    setValue('cgst_amount', totalCgst);
    setValue('sgst_amount', totalSgst);
    setValue('igst_amount', totalIgst);
  }, [itemsWatch, setValue]);

  const totalAmount = watch('total_amount');

  const { data: voucherList, isLoading: isLoadingList } = useQuery(
    ['purchaseVouchers'],
    () => voucherService.getVouchers('purchase-vouchers'),
    {
      onSuccess: (data) => console.log('Voucher list fetched successfully:', data),
      onError: (error: any) => {
        console.error('Failed to fetch voucher list:', error);
        alert('Failed to fetch voucher list: ' + (error.message || 'Unknown error'));
      }
    }
  );

  const { data: vendorList } = useQuery(
    ['vendors'],
    () => getVendors()
  );

  const { data: productList } = useQuery(
    ['products'],
    () => getProducts()
  );

  const { data: voucherData, isLoading: isFetching } = useQuery(
    ['purchaseVoucher', selectedId],
    () => voucherService.getVoucherById('purchase-vouchers', selectedId!),
    { enabled: !!selectedId }
  );

  const { data: nextVoucherNumber, refetch: refetchNextNumber } = useQuery(
    'nextPurchaseVoucherNumber',
    () => api.get('/v1/purchase-vouchers/next-number').then(res => res.data),
    { 
      enabled: mode === 'create',
      onSuccess: (data) => console.log('Next voucher number fetched successfully:', data),
      onError: (error: any) => {
        console.error('Failed to fetch next voucher number:', error);
        alert('Failed to fetch next voucher number: ' + (error.message || 'Unknown error'));
      }
    }
  );

  const createMutation = useMutation(
    (data: any) => voucherService.createVoucher('purchase-vouchers', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['purchaseVouchers']);
        alert('Purchase voucher created successfully!');
        setMode('view');
        refetchNextNumber();
      },
      onError: (error: any) => {
        console.error('Failed to create voucher:', error);
        alert('Failed to create voucher: ' + (error.message || 'Unknown error'));
      }
    }
  );

  const updateMutation = useMutation(
    (data: any) => voucherService.updateVoucher('purchase-vouchers', selectedId!, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['purchaseVouchers']);
        queryClient.invalidateQueries(['purchaseVoucher', selectedId]);
        alert('Purchase voucher updated successfully!');
        setMode('view');
      },
      onError: (error: any) => {
        console.error('Failed to update voucher:', error);
        alert('Failed to update voucher: ' + (error.message || 'Unknown error'));
      }
    }
  );

  const handleCreateNew = () => {
    setMode('create');
    setSelectedId(null);
    reset(defaultValues);
    refetchNextNumber();
  };

  const handleEdit = (id: number) => {
    setMode('edit');
    setSelectedId(id);
  };

  const handleView = (id: number) => {
    setMode('view');
    setSelectedId(id);
  };

  const addItem = () => {
    append({ product_id: null, hsn_code: '', quantity: 0, unit: '', unit_price: 0, discount_percentage: 0, discount_amount: 0, taxable_amount: 0, gst_rate: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0, total_amount: 0 });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const onSubmit = (data: any) => {
    console.log('Form data:', data);
    const submitData = {
      ...data,
      items: data.items.filter((item: any) => item.product_id)
    };
    
    if (mode === 'create') {
      createMutation.mutate(submitData);
    } else if (mode === 'edit') {
      updateMutation.mutate(submitData);
    }
  };

  const handlePrint = () => {
    const formData = watch();
    generatePDF(formData);
  };

  // Auto-fill voucher number for new vouchers
  useEffect(() => {
    if (mode === 'create' && nextVoucherNumber?.voucher_number) {
      setValue('voucher_number', nextVoucherNumber.voucher_number);
    }
  }, [mode, nextVoucherNumber, setValue]);

  // Auto-fill form when editing
  useEffect(() => {
    if (voucherData && (mode === 'edit' || mode === 'view')) {
      reset({
        ...voucherData,
        vendor_id: voucherData.vendor?.id || voucherData.vendor_id,
        items: voucherData.items && voucherData.items.length > 0 
          ? voucherData.items 
          : [{ product_id: null, hsn_code: '', quantity: 0, unit: '', unit_price: 0, discount_percentage: 0, discount_amount: 0, taxable_amount: 0, gst_rate: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0, total_amount: 0 }]
      });
    }
  }, [voucherData, mode, reset]);

  const filterOptions = createFilterOptions({
    matchFrom: 'start',
    stringify: (option: any) => option.name || option.product_name || '',
  });

  if (isLoadingList) return <CircularProgress />;

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Purchase Voucher Management
        </Typography>

        {/* Mode Toggle Buttons */}
        <Box sx={{ mb: 3 }}>
          <Button 
            variant={mode === 'create' ? 'contained' : 'outlined'} 
            onClick={handleCreateNew}
            sx={{ mr: 2 }}
          >
            Create New
          </Button>
          <Button 
            variant={mode === 'view' ? 'contained' : 'outlined'} 
            sx={{ mr: 2 }}
            disabled={!selectedId}
            onClick={() => setMode('view')}
          >
            View
          </Button>
          <Button 
            variant={mode === 'edit' ? 'contained' : 'outlined'} 
            disabled={!selectedId}
            onClick={() => setMode('edit')}
          >
            Edit
          </Button>
        </Box>

        {/* Voucher List */}
        {mode === 'view' && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Existing Purchase Vouchers
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 4 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Voucher Number</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Vendor</TableCell>
                    <TableCell>Total Amount</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {voucherList?.map((voucher: any) => (
                    <TableRow key={voucher.id}>
                      <TableCell>{voucher.voucher_number}</TableCell>
                      <TableCell>{new Date(voucher.date).toLocaleDateString()}</TableCell>
                      <TableCell>{voucher.vendor?.name || 'N/A'}</TableCell>
                      <TableCell>₹{voucher.total_amount?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleView(voucher.id)} color="primary">
                          <Visibility />
                        </IconButton>
                        <IconButton onClick={() => handleEdit(voucher.id)} color="secondary">
                          <Edit />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Form */}
        {(mode === 'create' || mode === 'edit' || (mode === 'view' && selectedId)) && (
          <Paper sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom>
              {mode === 'create' ? 'Create New Purchase Voucher' : 
               mode === 'edit' ? 'Edit Purchase Voucher' : 
               'View Purchase Voucher'}
            </Typography>
            
            {isFetching ? (
              <CircularProgress />
            ) : (
              <form onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={3}>
                  {/* Header Fields */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Voucher Number"
                      {...control.register('voucher_number')}
                      disabled={mode === 'view'}
                      fullWidth
                      error={!!errors.voucher_number}
                      helperText={errors.voucher_number?.message as string}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Date"
                      type="date"
                      {...control.register('date')}
                      disabled={mode === 'view'}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.date}
                      helperText={errors.date?.message as string}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      options={vendorList || []}
                      getOptionLabel={(option) => option?.name || ''}
                      filterOptions={filterOptions}
                      value={vendorList?.find(vendor => vendor.id === watch('vendor_id')) || null}
                      onChange={(_, newValue) => {
                        setValue('vendor_id', newValue?.id || null);
                      }}
                      disabled={mode === 'view'}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Vendor"
                          error={!!errors.vendor_id}
                          helperText={errors.vendor_id?.message as string}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Payment Terms"
                      {...control.register('payment_terms')}
                      disabled={mode === 'view'}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Notes"
                      {...control.register('notes')}
                      disabled={mode === 'view'}
                      fullWidth
                      multiline
                      rows={3}
                    />
                  </Grid>

                  {/* Items Table */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Items
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Product</TableCell>
                            <TableCell>HSN Code</TableCell>
                            <TableCell>Quantity</TableCell>
                            <TableCell>Unit</TableCell>
                            <TableCell>Unit Price</TableCell>
                            <TableCell>Discount %</TableCell>
                            <TableCell>Taxable Amount</TableCell>
                            <TableCell>GST Rate</TableCell>
                            <TableCell>CGST</TableCell>
                            <TableCell>SGST</TableCell>
                            <TableCell>Total</TableCell>
                            {mode !== 'view' && <TableCell>Actions</TableCell>}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {fields.map((field, index) => (
                            <TableRow key={field.id}>
                              <TableCell>
                                <Autocomplete
                                  options={productList || []}
                                  getOptionLabel={(option) => option?.product_name || ''}
                                  filterOptions={filterOptions}
                                  value={productList?.find(product => product.id === watch(`items.${index}.product_id`)) || null}
                                  onChange={(_, newValue) => {
                                    setValue(`items.${index}.product_id`, newValue?.id || null);
                                    if (newValue) {
                                      setValue(`items.${index}.hsn_code`, newValue.hsn_code || '');
                                      setValue(`items.${index}.unit`, newValue.unit || '');
                                      setValue(`items.${index}.unit_price`, newValue.unit_price || 0);
                                      setValue(`items.${index}.gst_rate`, newValue.gst_rate || 0);
                                    }
                                  }}
                                  disabled={mode === 'view'}
                                  size="small"
                                  sx={{ minWidth: 150 }}
                                  renderInput={(params) => (
                                    <TextField {...params} size="small" />
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  {...control.register(`items.${index}.hsn_code`)}
                                  disabled={mode === 'view'}
                                  size="small"
                                  sx={{ width: 100 }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  {...control.register(`items.${index}.quantity`, { valueAsNumber: true })}
                                  type="number"
                                  disabled={mode === 'view'}
                                  size="small"
                                  sx={{ width: 80 }}
                                  inputProps={{ step: 0.01 }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  {...control.register(`items.${index}.unit`)}
                                  disabled={mode === 'view'}
                                  size="small"
                                  sx={{ width: 80 }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  {...control.register(`items.${index}.unit_price`, { valueAsNumber: true })}
                                  type="number"
                                  disabled={mode === 'view'}
                                  size="small"
                                  sx={{ width: 100 }}
                                  inputProps={{ step: 0.01 }}
                                  InputProps={{
                                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  {...control.register(`items.${index}.discount_percentage`, { valueAsNumber: true })}
                                  type="number"
                                  disabled={mode === 'view'}
                                  size="small"
                                  sx={{ width: 80 }}
                                  inputProps={{ step: 0.01, max: 100 }}
                                  InputProps={{
                                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  value={watch(`items.${index}.taxable_amount`)?.toFixed(2) || '0.00'}
                                  disabled
                                  size="small"
                                  sx={{ width: 100 }}
                                  InputProps={{
                                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Autocomplete
                                  options={GST_SLABS}
                                  value={watch(`items.${index}.gst_rate`) || 0}
                                  onChange={(_, newValue) => {
                                    setValue(`items.${index}.gst_rate`, newValue || 0);
                                  }}
                                  disabled={mode === 'view'}
                                  size="small"
                                  sx={{ width: 80 }}
                                  renderInput={(params) => (
                                    <TextField 
                                      {...params} 
                                      size="small"
                                      InputProps={{
                                        ...params.InputProps,
                                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                      }}
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  value={watch(`items.${index}.cgst_amount`)?.toFixed(2) || '0.00'}
                                  disabled
                                  size="small"
                                  sx={{ width: 80 }}
                                  InputProps={{
                                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  value={watch(`items.${index}.sgst_amount`)?.toFixed(2) || '0.00'}
                                  disabled
                                  size="small"
                                  sx={{ width: 80 }}
                                  InputProps={{
                                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  value={watch(`items.${index}.total_amount`)?.toFixed(2) || '0.00'}
                                  disabled
                                  size="small"
                                  sx={{ width: 100 }}
                                  InputProps={{
                                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                                  }}
                                />
                              </TableCell>
                              {mode !== 'view' && (
                                <TableCell>
                                  <IconButton
                                    onClick={() => removeItem(index)}
                                    disabled={fields.length === 1}
                                    size="small"
                                    color="error"
                                  >
                                    <Remove />
                                  </IconButton>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    
                    {mode !== 'view' && (
                      <Button
                        startIcon={<Add />}
                        onClick={addItem}
                        sx={{ mt: 2 }}
                      >
                        Add Item
                      </Button>
                    )}
                  </Grid>

                  {/* Totals */}
                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="h6">
                            Total Amount: ₹{totalAmount?.toFixed(2) || '0.00'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Amount in Words: {numberToWords(totalAmount || 0)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2">
                            CGST: ₹{watch('cgst_amount')?.toFixed(2) || '0.00'}
                          </Typography>
                          <Typography variant="body2">
                            SGST: ₹{watch('sgst_amount')?.toFixed(2) || '0.00'}
                          </Typography>
                          <Typography variant="body2">
                            Total Discount: ₹{watch('discount_amount')?.toFixed(2) || '0.00'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>

                  {/* Form Actions */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                      {mode !== 'view' && (
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={createMutation.isLoading || updateMutation.isLoading}
                        >
                          {createMutation.isLoading || updateMutation.isLoading ? (
                            <CircularProgress size={20} />
                          ) : (
                            mode === 'create' ? 'Create Voucher' : 'Update Voucher'
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outlined"
                        onClick={handlePrint}
                      >
                        Print PDF
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => router.push('/vouchers')}
                      >
                        Back to Vouchers
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            )}
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default PurchaseVoucherPage;