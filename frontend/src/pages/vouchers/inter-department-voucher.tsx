// inter-department-voucher.tsx - Internal Transfer Voucher between departments
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { Box, Button, TextField, Typography, Grid, IconButton, Alert, CircularProgress, Container, Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Autocomplete, createFilterOptions, InputAdornment } from '@mui/material';
import { Add, Remove, Edit, Visibility } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { voucherService } from '../../services/vouchersService';
import { getProducts } from '../../services/masterService';
import jsPDF from 'jspdf';
import api from '../../lib/api';

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
  doc.text('Inter Department Voucher', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`Voucher Number: ${voucherData.voucher_number}`, 20, 40);
  doc.text(`Date: ${voucherData.date}`, 20, 50);
  doc.text(`From Department: ${voucherData.from_department}`, 20, 60);
  doc.text(`To Department: ${voucherData.to_department}`, 20, 70);
  doc.text(`Notes: ${voucherData.notes}`, 20, 80);
  
  let y = 100;
  doc.text('Items:', 20, y);
  y += 10;
  
  voucherData.items.forEach((item: any, index: number) => {
    doc.text(`Item ${index + 1}:`, 20, y);
    doc.text(`Product: ${item.product_name}`, 30, y + 10);
    doc.text(`Quantity: ${item.quantity} ${item.unit}`, 30, y + 20);
    doc.text(`Unit Price: ₹${item.unit_price}`, 30, y + 30);
    doc.text(`Total Value: ₹${item.total_value}`, 30, y + 40);
    y += 50;
  });
  
  doc.text(`Total Value: ₹${voucherData.total_value}`, 20, y + 10);
  doc.text(`Amount in Words: ${numberToWords(voucherData.total_value || 0)}`, 20, y + 20);
  
  doc.save(`inter_department_voucher_${voucherData.voucher_number}.pdf`);
};

const InterDepartmentVoucherPage: React.FC = () => {
  const router = useRouter();
  const { id, mode: queryMode } = router.query;
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>((queryMode as any) || 'create');
  const [selectedId, setSelectedId] = useState<number | null>(id ? Number(id) : null);
  const queryClient = useQueryClient();

  const defaultValues = {
    voucher_number: '',
    date: new Date().toISOString().slice(0, 10),
    from_department: '',
    to_department: '',
    notes: '',
    items: [{ product_id: null, product_name: '', quantity: 0, unit: '', unit_price: 0, total_value: 0 }],
    total_value: 0,
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
    let totalValue = 0;
    itemsWatch.forEach((item, index) => {
      const itemValue = (item.quantity || 0) * (item.unit_price || 0);
      setValue(`items.${index}.total_value`, itemValue);
      totalValue += itemValue;
    });
    setValue('total_value', totalValue);
  }, [itemsWatch, setValue]);

  const { data: voucherList, isLoading: isLoadingList } = useQuery(
    ['interDepartmentVouchers'],
    () => voucherService.getVouchers('inter-department-vouchers'),
    {
      onError: (error: any) => {
        console.error('Failed to fetch voucher list:', error);
      }
    }
  );

  const { data: productList } = useQuery(
    ['products'],
    () => getProducts()
  );

  const { data: voucherData, isLoading: isFetching } = useQuery(
    ['interDepartmentVoucher', selectedId],
    () => voucherService.getVoucherById('inter-department-vouchers', selectedId!),
    { enabled: !!selectedId }
  );

  const { data: nextVoucherNumber, refetch: refetchNextNumber } = useQuery(
    'nextInterDepartmentVoucherNumber',
    () => api.get('/v1/inter-department-vouchers/next-number').then(res => res.data),
    { 
      enabled: mode === 'create',
      onError: (error: any) => {
        console.error('Failed to fetch next voucher number:', error);
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

  const createMutation = useMutation((data: any) => voucherService.createVoucher('inter-department-vouchers', data), {
    onSuccess: async (newVoucher) => {
      console.log('Inter department voucher created successfully:', newVoucher);
      queryClient.invalidateQueries('interDepartmentVouchers');
      setMode('create');
      setSelectedId(null);
      reset(defaultValues);
      
      const { data: newNextNumber } = await refetchNextNumber();
      setValue('voucher_number', newNextNumber);

      const savePdf = window.confirm('Do you want to save as PDF?');
      if (savePdf) {
        generatePDF(newVoucher);
      }
    },
    onError: (error: any) => {
      console.error('Failed to create inter department voucher:', error);
      alert(error.userMessage || 'Failed to create inter department voucher');
    }
  });

  const updateMutation = useMutation((data: any) => voucherService.updateVoucher('inter-department-vouchers', selectedId!, data), {
    onSuccess: () => {
      queryClient.invalidateQueries('interDepartmentVouchers');
      setMode('view');
    },
    onError: (error: any) => {
      alert(error.userMessage || 'Failed to update inter department voucher');
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

  if (isLoadingList || isFetching) {
    return <CircularProgress />;
  }

  const isViewMode = mode === 'view';
  const productOptions = productList || [];
  const departments = ['Production', 'Sales', 'Purchase', 'Finance', 'HR', 'IT', 'Quality', 'Maintenance'];

  return (
    <Container maxWidth="xl">
      <Grid container spacing={2}>
        <Grid item xs={12} md={5} lg={4.8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Inter Department Vouchers
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Voucher #</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>From → To</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {voucherList?.map((voucher: any) => (
                    <TableRow key={voucher.id}>
                      <TableCell>{voucher.voucher_number}</TableCell>
                      <TableCell>{new Date(voucher.date).toLocaleDateString()}</TableCell>
                      <TableCell>{voucher.from_department} → {voucher.to_department}</TableCell>
                      <TableCell>₹{voucher.total_value?.toFixed(2) || '0.00'}</TableCell>
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
              {mode === 'create' ? 'Create Inter Department Voucher' : mode === 'edit' ? 'Edit Inter Department Voucher' : 'View Inter Department Voucher'}
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
                    options={departments}
                    value={watch('from_department')}
                    onChange={(_, newValue) => {
                      setValue('from_department', newValue || '');
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="From Department"
                        error={!!errors.from_department}
                        helperText={errors.from_department ? 'Required' : ''}
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
                  <Autocomplete
                    options={departments}
                    value={watch('to_department')}
                    onChange={(_, newValue) => {
                      setValue('to_department', newValue || '');
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="To Department"
                        error={!!errors.to_department}
                        helperText={errors.to_department ? 'Required' : ''}
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
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ fontSize: 16, mb: 2 }}>Items</Typography>
                  {fields.map((field, index) => (
                    <Grid container spacing={1} key={field.id} sx={{ mb: 1 }}>
                      <Grid item xs={3}>
                        <Autocomplete
                          options={productOptions}
                          getOptionLabel={(option) => option.product_name}
                          value={productOptions.find((opt) => opt.id === watch(`items.${index}.product_id`)) || null}
                          onChange={(_, newValue) => {
                            setValue(`items.${index}.product_id`, newValue ? newValue.id : '');
                            setValue(`items.${index}.product_name`, newValue ? newValue.product_name : '');
                            if (newValue) {
                              setValue(`items.${index}.unit_price`, newValue.unit_price || 0);
                              setValue(`items.${index}.unit`, newValue.unit || '');
                            }
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Product"
                              error={!!errors.items?.[index]?.product_id}
                              helperText={errors.items?.[index]?.product_id ? 'Required' : ''}
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
                          label="Quantity"
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
                          sx={{ width: '100%' }}
                        />
                      </Grid>
                      <Grid item xs={2}>
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
                          InputProps={{
                            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                          }}
                          sx={{ width: '100%' }}
                        />
                      </Grid>
                      <Grid item xs={2}>
                        <TextField
                          fullWidth
                          label="Total Value"
                          type="number"
                          value={watch(`items.${index}.total_value`)}
                          disabled
                          InputLabelProps={{ style: { fontSize: 15 } }}
                          inputProps={{ style: { fontSize: 13 } }}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                          }}
                          sx={{ width: '100%' }}
                        />
                      </Grid>
                      {!isViewMode && (
                        <Grid item xs={1}>
                          <IconButton
                            sx={{ backgroundColor: 'error.main', color: 'white' }}
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                          >
                            <Remove />
                          </IconButton>
                        </Grid>
                      )}
                    </Grid>
                  ))}
                  {!isViewMode && (
                    <Box sx={{ mb: 2 }}>
                      <Typography 
                        sx={{ color: 'green', cursor: 'pointer', fontSize: 14 }} 
                        onClick={() => append({ product_id: null, product_name: '', quantity: 0, unit: '', unit_price: 0, total_value: 0 })}
                      >
                        Add Item
                      </Typography>
                    </Box>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Total Value"
                    value={`₹${watch('total_value')?.toFixed(2) || '0.00'}`}
                    disabled
                    InputLabelProps={{ style: { fontSize: 15 } }}
                    inputProps={{ style: { fontSize: 13 } }}
                    sx={{ width: '40%' }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Amount in Words"
                    value={numberToWords(watch('total_value') || 0)}
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
                <Button variant="contained" color="error" onClick={() => router.push('/vouchers')} sx={{ mr: 2, fontSize: 10 }}>
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

export default InterDepartmentVoucherPage;