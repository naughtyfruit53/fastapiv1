// receipt-voucher.tsx - Financial Voucher for Receipt Management
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { Box, Button, TextField, Typography, Grid, IconButton, Alert, CircularProgress, Container, Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Autocomplete, createFilterOptions, InputAdornment } from '@mui/material';
import { Add, Remove, Edit, Visibility } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { voucherService } from '../../../services/vouchersService';
import { getVendors, getCustomers } from '../../../services/masterService';
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
  doc.text('Receipt Voucher', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`Voucher Number: ${voucherData.voucher_number}`, 20, 40);
  doc.text(`Date: ${voucherData.date}`, 20, 50);
  doc.text(`From: ${voucherData.from_party}`, 20, 60);
  doc.text(`Receipt Method: ${voucherData.receipt_method}`, 20, 70);
  doc.text(`Amount: ₹${voucherData.amount}`, 20, 80);
  doc.text(`Notes: ${voucherData.notes}`, 20, 90);
  
  doc.text(`Amount in Words: ${numberToWords(voucherData.amount || 0)}`, 20, 110);
  
  doc.save(`receipt_voucher_${voucherData.voucher_number}.pdf`);
};

const ReceiptVoucherPage: React.FC = () => {
  const router = useRouter();
  const { id, mode: queryMode } = router.query;
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>((queryMode as any) || 'create');
  const [selectedId, setSelectedId] = useState<number | null>(id ? Number(id) : null);
  const queryClient = useQueryClient();

  const defaultValues = {
    voucher_number: '',
    date: new Date().toISOString().slice(0, 10),
    from_party: '',
    receipt_method: 'cash',
    amount: 0,
    notes: '',
  };

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues
  });

  const amount = watch('amount');

  const { data: voucherList, isLoading: isLoadingList } = useQuery(
    ['receiptVouchers'],
    () => voucherService.getVouchers('receipt-vouchers'),
    {
      onError: (error: any) => {
        console.error('Failed to fetch voucher list:', error);
      }
    }
  );

  const { data: vendorList } = useQuery(
    ['vendors'],
    () => getVendors()
  );

  const { data: customerList } = useQuery(
    ['customers'],
    () => getCustomers()
  );

  const { data: voucherData, isLoading: isFetching } = useQuery(
    ['receiptVoucher', selectedId],
    () => voucherService.getVoucherById('receipt-vouchers', selectedId!),
    { enabled: !!selectedId }
  );

  const { data: nextVoucherNumber, refetch: refetchNextNumber } = useQuery(
    'nextReceiptVoucherNumber',
    () => api.get('/v1/receipt-vouchers/next-number').then(res => res.data),
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

  const createMutation = useMutation((data: any) => voucherService.createVoucher('receipt-vouchers', data), {
    onSuccess: async (newVoucher) => {
      console.log('Receipt voucher created successfully:', newVoucher);
      queryClient.invalidateQueries('receiptVouchers');
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
      console.error('Failed to create receipt voucher:', error);
      alert(error.userMessage || 'Failed to create receipt voucher');
    }
  });

  const updateMutation = useMutation((data: any) => voucherService.updateVoucher('receipt-vouchers', selectedId!, data), {
    onSuccess: () => {
      queryClient.invalidateQueries('receiptVouchers');
      setMode('view');
    },
    onError: (error: any) => {
      alert(error.userMessage || 'Failed to update receipt voucher');
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
  const allParties = [...(vendorList || []), ...(customerList || [])];

  return (
    <Container maxWidth="xl">
      <Grid container spacing={2}>
        <Grid item xs={12} md={5} lg={4.8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Receipt Vouchers
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Voucher #</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>From</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {voucherList?.map((voucher: any) => (
                    <TableRow key={voucher.id}>
                      <TableCell>{voucher.voucher_number}</TableCell>
                      <TableCell>{new Date(voucher.date).toLocaleDateString()}</TableCell>
                      <TableCell>{voucher.from_party || ''}</TableCell>
                      <TableCell>₹{voucher.amount?.toFixed(2) || '0.00'}</TableCell>
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
              {mode === 'create' ? 'Create Receipt Voucher' : mode === 'edit' ? 'Edit Receipt Voucher' : 'View Receipt Voucher'}
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
                    options={allParties}
                    getOptionLabel={(option) => option.name}
                    value={allParties.find((opt) => opt.name === watch('from_party')) || null}
                    onChange={(_, newValue) => {
                      setValue('from_party', newValue ? newValue.name : '');
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="From (Customer/Vendor)"
                        error={!!errors.from_party}
                        helperText={errors.from_party ? 'Required' : ''}
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
                    options={['cash', 'bank', 'cheque', 'online']}
                    value={watch('receipt_method')}
                    onChange={(_, newValue) => {
                      setValue('receipt_method', newValue || 'cash');
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Receipt Method"
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
                  <TextField
                    fullWidth
                    label="Amount"
                    type="number"
                    {...control.register('amount', { required: true, valueAsNumber: true })}
                    error={!!errors.amount}
                    helperText={errors.amount ? 'Required' : ''}
                    disabled={isViewMode}
                    InputLabelProps={{ style: { fontSize: 15 } }}
                    inputProps={{ style: { fontSize: 13 } }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    }}
                    sx={{ width: '40%' }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Amount in Words"
                    value={numberToWords(amount || 0)}
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

export default ReceiptVoucherPage;