// sales-voucher.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { Box, Button, TextField, Typography, Grid, IconButton, Alert, CircularProgress, Container, Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Autocomplete, createFilterOptions, InputAdornment } from '@mui/material';
import { Add, Remove, Edit, Visibility } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { voucherService } from '../../../services/authService';
import { getCustomers, getProducts } from '../../../services/masterService';
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
  doc.text('Sales Voucher', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`Voucher Number: ${voucherData.voucher_number}`, 20, 40);
  doc.text(`Date: ${voucherData.date}`, 20, 50);
  doc.text(`Customer ID: ${voucherData.customer_id}`, 20, 60);
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
  
  doc.save(`sales_voucher_${voucherData.voucher_number}.pdf`);
};

const GST_SLABS = [0, 5, 12, 18, 28];  // Add cess if needed, e.g., [0, 5, 12, 18, 28, '28 + 12% Cess']

const SalesVoucherPage: React.FC = () => {
  const router = useRouter();
  const { id, mode: queryMode } = router.query;
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>((queryMode as any) || 'create');
  const [selectedId, setSelectedId] = useState<number | null>(id ? Number(id) : null);
  const queryClient = useQueryClient();

  const defaultValues = {
    voucher_number: '',
    date: new Date().toISOString().slice(0, 10),
    customer_id: null,
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
    ['salesVouchers'],
    () => voucherService.getVouchers('sales-vouchers'),
    {
      onSuccess: (data) => console.log('Voucher list fetched successfully:', data),
      onError: (error: any) => {
        console.error('Failed to fetch voucher list:', error);
        alert('Failed to fetch voucher list: ' + (error.message || 'Unknown error'));
      }
    }
  );

  const { data: customerList } = useQuery(
    ['customers'],
    () => getCustomers()
  );

  const { data: productList } = useQuery(
    ['products'],
    () => getProducts()
  );

  const { data: voucherData, isLoading: isFetching } = useQuery(
    ['salesVoucher', selectedId],
    () => voucherService.getVoucherById('sales-vouchers', selectedId!),
    { enabled: !!selectedId }
  );

  const { data: nextVoucherNumber, refetch: refetchNextNumber } = useQuery(
    'nextSalesVoucherNumber',
    () => api.get('/v1/sales-vouchers/next-number').then(res => res.data),
    { 
      enabled: mode === 'create',
      onSuccess: (data) => console.log('Next voucher number fetched successfully:', data),
      onError: (error: any) => {
        console.error('Failed to fetch next voucher number:', error);
        alert('Failed to fetch next voucher number: ' + (error.message || 'Unknown error'));
      }
    }
  );

  useEffect(() => {
    if (mode === 'create' && nextVoucherNumber) {
      setValue('voucher_number', nextVoucherNumber);
    } else if (voucherData) {
      reset(voucherData);
    } else if (mode === 'create') {
      reset(defaultValues);
    }
  }, [voucherData, mode, reset, nextVoucherNumber]);

  const createMutation = useMutation((data: any) => voucherService.createVoucher('sales-vouchers', data), {
    onSuccess: async (newVoucher) => {
      console.log('Voucher created successfully:', newVoucher);
      queryClient.invalidateQueries('salesVouchers');
      setMode('create');
      setSelectedId(null);
      reset(defaultValues);
      // Immediately refetch and set the next voucher number to avoid blank flash
      const { data: newNextNumber } = await refetchNextNumber();
      setValue('voucher_number', newNextNumber);

      // New workflow
      const savePdf = window.confirm('Do you want to save as PDF?');
      if (savePdf) {
        generatePDF(newVoucher);
      }

      const sendEmail = window.confirm('Do you want to send email to customer?');
      if (sendEmail) {
        const selectedCustomer = customerList.find((c: any) => c.id === newVoucher.customer_id);
        if (selectedCustomer && selectedCustomer.email) {
          try {
            await voucherService.sendVoucherEmail('sales-vouchers', newVoucher.id);
            alert('Email sent successfully');
          } catch (error) {
            alert('Failed to send email: ' + error.message);
          }
        } else {
          alert('Error: Customer email not available');
        }
      }
    },
    onError: (error: any) => {
      console.error('Failed to create voucher:', error);
      alert(error.userMessage || 'Failed to create voucher');
    }
  });

  const updateMutation = useMutation((data: any) => voucherService.updateVoucher('sales-vouchers', selectedId!, data), {
    onSuccess: () => {
      queryClient.invalidateQueries('salesVouchers');
      setMode('view');
    },
    onError: (error: any) => {
      alert(error.userMessage || 'Failed to update voucher');
    }
  });

  const onSubmit = (data: any) => {
    if (mode === 'create') {
      createMutation.mutate(data);
    } else if (mode === 'edit') {
      updateMutation.mutate(data);
    }
  };

  const handleEdit = (voucherId: number) => {
    setSelectedId(voucherId);
    setMode('edit');
    router.push({ query: { id: voucherId, mode: 'edit' } }, undefined, { shallow: true });
  };

  const handleView = (voucherId: number) => {
    setSelectedId(voucherId);
    setMode('view');
    router.push({ query: { id: voucherId, mode: 'view' } }, undefined, { shallow: true });
  };

  const handleAddCustomer = () => {
    window.open('/masters?tab=customers&action=add', '_blank', 'width=800,height=600');
  };

  const handleAddProduct = () => {
    window.open('/masters?tab=products&action=add', '_blank', 'width=800,height=600');
  };

  const refreshMasterData = useCallback(() => {
    queryClient.invalidateQueries('customers');
    queryClient.invalidateQueries('products');
  }, [queryClient]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'refreshMasterData') {
        refreshMasterData();
        localStorage.removeItem('refreshMasterData');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshMasterData]);

  if (isLoadingList || isFetching) {
    return <CircularProgress />;
  }

  const isViewMode = mode === 'view';

  const filter = createFilterOptions<any>();

  const customerOptions = customerList || [];
  const productOptions = productList || [];

  let totalSubtotal = 0;
  let totalGst = 0;
  itemsWatch.forEach((item) => {
    const subtotal = (item.quantity || 0) * (item.unit_price || 0);
    const discountAmount = subtotal * ((item.discount_percentage || 0) / 100);
    const taxableAmount = subtotal - discountAmount;
    const gstAmount = taxableAmount * ((item.gst_rate || 0) / 100);
    totalSubtotal += subtotal;
    totalGst += gstAmount;
  });
  const calculatedTotalAmount = totalSubtotal + totalGst;

  return (
    <Container maxWidth="xl">
      <Grid container spacing={2}>
        <Grid item xs={12} md={5} lg={4.8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Sales Vouchers
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Voucher #</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {voucherList?.map((voucher: any) => (
                    <TableRow key={voucher.id}>
                      <TableCell>{voucher.voucher_number}</TableCell>
                      <TableCell>{new Date(voucher.date).toLocaleDateString()}</TableCell>
                      <TableCell>{voucher.customer?.name || ''}</TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleView(voucher.id)}>
                          <Visibility />
                        </IconButton>
                        <IconButton onClick={() => handleEdit(voucher.id)}>
                          <Edit />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7} lg={7.2}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h1" gutterBottom sx={{ fontSize: 35, textAlign: 'center' }}>
              {mode === 'create' ? 'Create Sales Voucher' : mode === 'edit' ? 'Edit Sales Voucher' : 'View Sales Voucher'}
            </Typography>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Voucher Number"
                    {...control.register('voucher_number')}
                    error={!!errors.voucher_number}
                    helperText={mode === 'create' ? 'Auto-generated on save' : errors.voucher_number ? 'Required' : ''}
                    disabled={mode === 'create' || isViewMode}
                    InputLabelProps={{ style: { fontSize: 15 } }}
                    inputProps={{ style: { fontSize: 13 } }}
                    sx={{ width: '80%' }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Date"
                    type="date"
                    {...control.register('date', { required: true })}
                    error={!!errors.date}
                    helperText={errors.date ? 'Required' : ''}
                    disabled={isViewMode}
                    InputLabelProps={{ style: { fontSize: 15 } }}
                    inputProps={{ style: { fontSize: 13 } }}
                    sx={{ width: '80%' }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Autocomplete
                    options={customerOptions}
                    getOptionLabel={(option) => option.name}
                    value={customerOptions.find((opt) => opt.id === watch('customer_id')) || null}
                    onChange={(_, newValue) => {
                      if (newValue && newValue.id === -1) {
                        handleAddCustomer();
                      } else {
                        setValue('customer_id', newValue ? newValue.id : '');
                      }
                    }}
                    openOnFocus
                    filterOptions={(options, params) => {
                      const filtered = filter(options, params);
                      if (params.inputValue !== '') {
                        filtered.unshift({ id: -1, name: `Add "${params.inputValue}"` });
                      } else {
                        filtered.unshift({ id: -1, name: 'Add Customer' });
                      }
                      return filtered;
                    }}
                    renderOption={(props, option) => (
                      <li {...props} style={{ fontSize: 13 }}>
                        {option.id === -1 ? (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Add sx={{ mr: 1 }} />
                            {option.name}
                          </Box>
                        ) : (
                          option.name
                        )}
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Customer"
                        error={!!errors.customer_id}
                        helperText={errors.customer_id ? 'Required' : ''}
                        InputLabelProps={{ style: { fontSize: 15 } }}
                        inputProps={{
                          ...params.inputProps,
                          style: { fontSize: 13 }
                        }}
                      />
                    )}
                    disabled={isViewMode}
                    sx={{ width: '80%' }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Payment Terms"
                    {...control.register('payment_terms')}
                    disabled={isViewMode}
                    InputLabelProps={{ style: { fontSize: 15 } }}
                    inputProps={{ style: { fontSize: 13 } }}
                    sx={{ width: '80%' }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ fontSize: 10 }}>Items</Typography>
                  {fields.map((field, index) => (
                    <Grid container spacing={0.0625} key={field.id} sx={{ mb: 0.0625 }}>
                      <Grid item xs={3}>
                        <Autocomplete
                          options={productOptions}
                          getOptionLabel={(option) => option.product_name}
                          value={productOptions.find((opt) => opt.id === watch(`items.${index}.product_id`)) || null}
                          onChange={(_, newValue) => {
                            if (newValue && newValue.id === -1) {
                              handleAddProduct();
                            } else {
                              setValue(`items.${index}.product_id`, newValue ? newValue.id : '');
                              if (newValue) {
                                setValue(`items.${index}.hsn_code`, newValue.hsn_code || '');
                                setValue(`items.${index}.unit_price`, newValue.unit_price || 0);
                                setValue(`items.${index}.gst_rate`, newValue.gst_rate || 0);
                                setValue(`items.${index}.unit`, newValue.unit || '');
                              }
                            }
                          }}
                          openOnFocus
                          filterOptions={(options, params) => {
                            const filtered = filter(options, params);
                            if (params.inputValue !== '') {
                              filtered.unshift({ id: -1, product_name: `Add "${params.inputValue}"` });
                            } else {
                              filtered.unshift({ id: -1, product_name: 'Add Product' });
                            }
                            return filtered;
                          }}
                          renderOption={(props, option) => (
                            <li {...props} style={{ fontSize: 13 }}>
                              {option.id === -1 ? (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Add sx={{ mr: 1 }} />
                                  {option.product_name}
                                </Box>
                              ) : (
                                option.product_name
                              )}
                            </li>
                          )}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Product"
                              error={!!errors.items?.[index]?.product_id}
                              helperText={errors.items?.[index]?.product_id ? 'Product is required' : ''}
                              InputLabelProps={{ style: { fontSize: 15 } }}
                              inputProps={{
                                ...params.inputProps,
                                style: { fontSize: 13 }
                              }}
                            />
                          )}
                          disabled={isViewMode}
                          sx={{ width: '100%' }}
                        />
                      </Grid>
                      <Grid item xs={1.5}>
                        <TextField
                          fullWidth
                          label="HSN Code"
                          {...control.register(`items.${index}.hsn_code`)}
                          disabled={isViewMode}
                          InputLabelProps={{ style: { fontSize: 15 } }}
                          inputProps={{ style: { fontSize: 13 } }}
                          sx={{ width: '100%' }}
                        />
                      </Grid>
                      <Grid item xs={1.5}>
                        <TextField
                          fullWidth
                          label="Qty"
                          type="number"
                          {...control.register(`items.${index}.quantity`, { required: true, valueAsNumber: true })}
                          error={!!errors.items?.[index]?.quantity}
                          helperText={errors.items?.[index]?.quantity ? 'Required' : ''}
                          disabled={isViewMode}
                          InputLabelProps={{ style: { fontSize: 15 } }}
                          inputProps={{ style: { fontSize: 13 } }}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">{watch(`items.${index}.unit`) || ''}</InputAdornment>,
                          }}
                          sx={{ 
                            width: '100%',
                            '& input[type=number]': {
                              MozAppearance: 'textfield',
                            },
                            '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                              display: 'none',
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={1.5}>
                        <TextField
                          fullWidth
                          label="Unit Price"
                          type="number"
                          {...control.register(`items.${index}.unit_price`, { required: true, valueAsNumber: true })}
                          error={!!errors.items?.[index]?.unit_price}
                          helperText={errors.items?.[index]?.unit_price ? 'Required' : ''}
                          disabled={isViewMode}
                          InputLabelProps={{ style: { fontSize: 15 } }}
                          inputProps={{ style: { fontSize: 13 } }}
                          sx={{ 
                            width: '100%',
                            '& input[type=number]': {
                              MozAppearance: 'textfield',
                            },
                            '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                              display: 'none',
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={1}>
                        <Autocomplete
                          disableClearable
                          options={GST_SLABS}
                          value={watch(`items.${index}.gst_rate`)}
                          onChange={(_, newValue) => {
                            setValue(`items.${index}.gst_rate`, newValue);
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="GST %"
                              InputLabelProps={{ style: { fontSize: 15 } }}
                              inputProps={{
                                ...params.inputProps,
                                style: { fontSize: 13 }
                              }}
                            />
                          )}
                          disabled={isViewMode}
                          sx={{ width: '100%' }}
                        />
                      </Grid>
                      <Grid item xs={2}>
                        <TextField
                          fullWidth
                          label="Amount"
                          type="number"
                          value={watch(`items.${index}.total_amount`)}
                          disabled
                          InputLabelProps={{ style: { fontSize: 15 } }}
                          inputProps={{ style: { fontSize: 13 } }}
                          sx={{ width: '100%' }}
                        />
                      </Grid>
                      {!isViewMode && (
                        <Grid item xs={0.5}>
                          <IconButton sx={{ backgroundColor: 'error.main', color: 'white' }} onClick={() => remove(index)} disabled={fields.length === 1}>
                            <Remove />
                          </IconButton>
                        </Grid>
                      )}
                    </Grid>
                  ))}
                  {!isViewMode && (
                    <Box sx={{ mb: 0.0625 }}>
                      <Typography sx={{ color: 'green', cursor: 'pointer', fontSize: 10 }} onClick={() => append({ product_id: null, hsn_code: '', quantity: 0, unit: '', unit_price: 0, discount_percentage: 0, discount_amount: 0, taxable_amount: 0, gst_rate: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0, total_amount: 0 })}>
                        Add Item
                      </Typography>
                    </Box>
                  )}
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="Total Amt"
                    type="number"
                    value={totalSubtotal}
                    disabled
                    InputLabelProps={{ style: { fontSize: 15 } }}
                    inputProps={{ style: { fontSize: 13 } }}
                    sx={{ width: '100%' }}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="GST Amt"
                    type="number"
                    value={totalGst}
                    disabled
                    InputLabelProps={{ style: { fontSize: 15 } }}
                    inputProps={{ style: { fontSize: 13 } }}
                    sx={{ width: '100%' }}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="Grand Total"
                    type="number"
                    value={calculatedTotalAmount}
                    disabled
                    InputLabelProps={{ style: { fontSize: 15 } }}
                    inputProps={{ style: { fontSize: 13 } }}
                    sx={{ width: '100%' }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Amount in Words"
                    value={numberToWords(calculatedTotalAmount || 0)}
                    disabled
                    InputLabelProps={{ style: { fontSize: 15 } }}
                    inputProps={{ style: { fontSize: 13 } }}
                    sx={{ width: '100%' }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    rows={4}
                    {...control.register('notes')}
                    disabled={isViewMode}
                    InputLabelProps={{ style: { fontSize: 15 } }}
                    inputProps={{ style: { fontSize: 13 } }}
                    sx={{ width: '100%' }}
                  />
                </Grid>
              </Grid>
              <Box sx={{ mt: 2 }}>
                {!isViewMode && (
                  <Button type="submit" variant="contained" color="success" disabled={createMutation.isLoading || updateMutation.isLoading} sx={{ mr: 2, fontSize: 10 }}>
                    Save
                  </Button>
                )}
                <Button variant="contained" color="error" onClick={() => router.push('/dashboard')} sx={{ mr: 2, fontSize: 10 }}>
                  Cancel
                </Button>
                <Button variant="contained" color="primary" sx={{ fontSize: 10 }}>
                  Manage Column
                </Button>
              </Box>
            </form>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SalesVoucherPage;