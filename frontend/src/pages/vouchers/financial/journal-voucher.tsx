// journal-voucher.tsx - Financial Voucher for Journal Entry Management
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { Box, Button, TextField, Typography, Grid, IconButton, Alert, CircularProgress, Container, Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Autocomplete, createFilterOptions, InputAdornment } from '@mui/material';
import { Add, Remove, Edit, Visibility } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { voucherService } from '../../../services/vouchersService';
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
  doc.text('Journal Voucher', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`Voucher Number: ${voucherData.voucher_number}`, 20, 40);
  doc.text(`Date: ${voucherData.date}`, 20, 50);
  doc.text(`Description: ${voucherData.description}`, 20, 60);
  
  let y = 80;
  doc.text('Journal Entries:', 20, y);
  y += 10;
  
  voucherData.entries.forEach((entry: any, index: number) => {
    doc.text(`Entry ${index + 1}:`, 20, y);
    doc.text(`Account: ${entry.account}`, 30, y + 10);
    doc.text(`Type: ${entry.entry_type}`, 30, y + 20);
    doc.text(`Amount: ₹${entry.amount}`, 30, y + 30);
    y += 40;
  });
  
  doc.text(`Total Amount: ₹${voucherData.total_amount}`, 20, y + 10);
  
  doc.save(`journal_voucher_${voucherData.voucher_number}.pdf`);
};

const JournalVoucherPage: React.FC = () => {
  const router = useRouter();
  const { id, mode: queryMode } = router.query;
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>((queryMode as any) || 'create');
  const [selectedId, setSelectedId] = useState<number | null>(id ? Number(id) : null);
  const queryClient = useQueryClient();

  const defaultValues = {
    voucher_number: '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    entries: [{ account: '', entry_type: 'debit', amount: 0 }],
    total_amount: 0,
  };

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'entries'
  });

  const entriesWatch = useWatch({ control, name: 'entries' });

  useEffect(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    entriesWatch.forEach((entry, index) => {
      if (entry.entry_type === 'debit') {
        totalDebit += entry.amount || 0;
      } else {
        totalCredit += entry.amount || 0;
      }
    });
    setValue('total_amount', Math.max(totalDebit, totalCredit));
  }, [entriesWatch, setValue]);

  const { data: voucherList, isLoading: isLoadingList } = useQuery(
    ['journalVouchers'],
    () => voucherService.getVouchers('journal-vouchers'),
    {
      onError: (error: any) => {
        console.error('Failed to fetch voucher list:', error);
      }
    }
  );

  const { data: voucherData, isLoading: isFetching } = useQuery(
    ['journalVoucher', selectedId],
    () => voucherService.getVoucherById('journal-vouchers', selectedId!),
    { enabled: !!selectedId }
  );

  const { data: nextVoucherNumber, refetch: refetchNextNumber } = useQuery(
    'nextJournalVoucherNumber',
    () => api.get('/v1/journal-vouchers/next-number').then(res => res.data),
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

  const createMutation = useMutation((data: any) => voucherService.createVoucher('journal-vouchers', data), {
    onSuccess: async (newVoucher) => {
      console.log('Journal voucher created successfully:', newVoucher);
      queryClient.invalidateQueries('journalVouchers');
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
      console.error('Failed to create journal voucher:', error);
      alert(error.userMessage || 'Failed to create journal voucher');
    }
  });

  const updateMutation = useMutation((data: any) => voucherService.updateVoucher('journal-vouchers', selectedId!, data), {
    onSuccess: () => {
      queryClient.invalidateQueries('journalVouchers');
      setMode('view');
    },
    onError: (error: any) => {
      alert(error.userMessage || 'Failed to update journal voucher');
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

  const accounts = [
    'Cash', 'Bank', 'Accounts Receivable', 'Accounts Payable', 'Sales', 'Purchases',
    'Rent Expense', 'Salary Expense', 'Office Supplies', 'Equipment', 'Other Income',
    'Other Expenses'
  ];

  return (
    <Container maxWidth="xl">
      <Grid container spacing={2}>
        <Grid item xs={12} md={5} lg={4.8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Journal Vouchers
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Voucher #</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {voucherList?.map((voucher: any) => (
                    <TableRow key={voucher.id}>
                      <TableCell>{voucher.voucher_number}</TableCell>
                      <TableCell>{new Date(voucher.date).toLocaleDateString()}</TableCell>
                      <TableCell>{voucher.description || ''}</TableCell>
                      <TableCell>₹{voucher.total_amount?.toFixed(2) || '0.00'}</TableCell>
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
              {mode === 'create' ? 'Create Journal Voucher' : mode === 'edit' ? 'Edit Journal Voucher' : 'View Journal Voucher'}
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
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    {...control.register('description', { required: true })}
                    error={!!errors.description}
                    helperText={errors.description ? 'Required' : ''}
                    disabled={isViewMode}
                    InputLabelProps={{ style: { fontSize: 15 } }}
                    inputProps={{ style: { fontSize: 13 } }}
                    sx={{ width: '80%' }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ fontSize: 16, mb: 2 }}>Journal Entries</Typography>
                  {fields.map((field, index) => (
                    <Grid container spacing={1} key={field.id} sx={{ mb: 1 }}>
                      <Grid item xs={4}>
                        <Autocomplete
                          options={accounts}
                          value={watch(`entries.${index}.account`)}
                          onChange={(_, newValue) => {
                            setValue(`entries.${index}.account`, newValue || '');
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Account"
                              error={!!errors.entries?.[index]?.account}
                              helperText={errors.entries?.[index]?.account ? 'Required' : ''}
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
                        <Autocomplete
                          options={['debit', 'credit']}
                          value={watch(`entries.${index}.entry_type`)}
                          onChange={(_, newValue) => {
                            setValue(`entries.${index}.entry_type`, newValue || 'debit');
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Type"
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
                      <Grid item xs={3}>
                        <TextField
                          fullWidth
                          label="Amount"
                          type="number"
                          {...control.register(`entries.${index}.amount`, { required: true, valueAsNumber: true })}
                          error={!!errors.entries?.[index]?.amount}
                          helperText={errors.entries?.[index]?.amount ? 'Required' : ''}
                          disabled={isViewMode}
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
                        onClick={() => append({ account: '', entry_type: 'debit', amount: 0 })}
                      >
                        Add Journal Entry
                      </Typography>
                    </Box>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Total Amount"
                    value={`₹${watch('total_amount')?.toFixed(2) || '0.00'}`}
                    disabled
                    InputLabelProps={{ style: { fontSize: 15 } }}
                    inputProps={{ style: { fontSize: 13 } }}
                    sx={{ width: '40%' }}
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

export default JournalVoucherPage;