// Revised inventory.stock.tsx

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { authService, masterDataService, companyService } from '../../services/authService';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  FormControl
} from '@mui/material';
import {
  Add,
  Edit,
  Visibility,
  GetApp,
  Publish,
  Print
} from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Type declaration for jsPDF autoTable extension
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const StockManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [showZero, setShowZero] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'add' | 'replace'>('replace');
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [manualFormData, setManualFormData] = useState({ product_id: 0, quantity: 0, unit: '' });
  const [editFormData, setEditFormData] = useState({ quantity: 0 });

  const { data: stockData, isLoading } = useQuery(['stock', searchText, showZero], () => masterDataService.getStock({ search: searchText, show_zero: showZero }));
  const { data: products } = useQuery('products', masterDataService.getProducts);
  const { data: companyData } = useQuery('company', companyService.getCurrentCompany);

  const updateStockMutation = useMutation((data: any) => masterDataService.updateStock(data.product_id, data), {
    onSuccess: () => {
      queryClient.invalidateQueries('stock');
      setEditDialogOpen(false);
      setManualDialogOpen(false);
    }
  });

  const bulkImportMutation = useMutation(({ file, mode }: { file: File; mode: 'add' | 'replace' }) => masterDataService.bulkImportStock(file, mode), {
    onSuccess: () => {
      queryClient.invalidateQueries('stock');
      alert('Stock import completed successfully.');
    },
    onError: (error: any) => {
      console.error('Bulk import error:', error);
      alert(`Import failed: ${error.userMessage || 'Please check the file format and required columns.'}`);
    }
  });

  const handleEditStock = (stock: any) => {
    setSelectedStock(stock);
    setEditFormData({ quantity: stock.quantity });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    updateStockMutation.mutate({ product_id: selectedStock.product_id, quantity: editFormData.quantity });
  };

  const handleManualEntry = () => {
    setManualDialogOpen(true);
  };

  const handleSaveManual = () => {
    updateStockMutation.mutate(manualFormData);
  };

  const handleDownloadTemplate = () => {
    masterDataService.downloadStockTemplate();
  };

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        setSelectedFile(file);
        setImportDialogOpen(true);  // Show prompt
      }
    };
    input.click();
  };

  const handleImportConfirm = (mode: 'add' | 'replace') => {
    if (selectedFile) {
      bulkImportMutation.mutate({ file: selectedFile, mode });
    }
    setImportDialogOpen(false);
    setSelectedFile(null);
  };

  const handleExport = async () => {
    try {
      await masterDataService.exportStock({ search: searchText, show_zero: showZero });
    } catch (error) {
      alert('Failed to export stock data. Please try again.');
    }
  };

  const handlePrint = () => {
    generateStockReport('stock_report.pdf', companyData, stockData);
  };

  const generateStockReport = (filePath: string, companyData: any, items: any[]) => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Stock Report", 14, 20);

    let yPosition = 30;
    companyData.forEach(([key, value]: [string, string]) => {
      doc.text(`${key}: ${value}`, 14, yPosition);
      yPosition += 10;
    });

    yPosition += 20;
    doc.autoTable({
      startY: yPosition,
      head: [['S.No', 'Product Name', 'Quantity', 'Unit Price', 'Total Value', 'Reorder Level', 'Last Updated']],
      body: items.map((item, idx) => [
        idx + 1,
        item.product_name,
        item.quantity,
        item.unit_price,
        item.total_value,
        item.reorder_level,
        item.last_updated
      ]),
      theme: 'striped',
      styles: { cellPadding: 2, fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] }
    });

    doc.save(filePath);
  };

  const resetForm = () => {
    setManualFormData({ product_id: 0, quantity: 0, unit: '' });
    setEditFormData({ quantity: 0 });
  };

  // Handle ESC key for canceling import dialog
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setImportDialogOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Stock Management
        </Typography>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={<Checkbox checked={showZero} onChange={(e) => setShowZero(e.target.checked)} />}
                label="Show Zero Stock"
              />
            </Grid>
          </Grid>
        </Paper>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product Name</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Unit Price</TableCell>
                <TableCell>Total Value</TableCell>
                <TableCell>Reorder Level</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stockData?.map((stock: any) => (
                <TableRow key={stock.id} sx={{ backgroundColor: stock.quantity <= stock.reorder_level ? 'yellow.main' : 'inherit' }}>
                  <TableCell>{stock.product_name}</TableCell>
                  <TableCell>{stock.quantity} {stock.unit}</TableCell>
                  <TableCell>{stock.unit_price}</TableCell>
                  <TableCell>{stock.total_value}</TableCell>
                  <TableCell>{stock.reorder_level}</TableCell>
                  <TableCell>{stock.last_updated}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => alert(`Details: ${stock.description}`)}>
                      <Visibility />
                    </IconButton>
                    <IconButton onClick={() => handleEditStock(stock)}>
                      <Edit />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      {/* Floating button bar at bottom */}
      <Box sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        bgcolor: 'background.paper',
        boxShadow: 3,
        p: 2,
        display: 'flex',
        justifyContent: 'center',
        gap: 2,
        zIndex: 1000
      }}>
        <Button variant="contained" startIcon={<Add />} onClick={handleManualEntry}>
          Manual Entry
        </Button>
        <Button variant="contained" startIcon={<GetApp />} onClick={handleDownloadTemplate}>
          Download Template
        </Button>
        <Button variant="contained" startIcon={<Publish />} onClick={handleImportClick}>
          Import
        </Button>
        <Button variant="contained" startIcon={<GetApp />} onClick={handleExport}>
          Export
        </Button>
        <Button variant="contained" startIcon={<Print />} onClick={handlePrint}>
          Print Stock
        </Button>
      </Box>

      {/* Edit Stock Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Stock</DialogTitle>
        <DialogContent>
          <TextField
            label="Quantity"
            type="number"
            value={editFormData.quantity}
            onChange={(e) => setEditFormData({ quantity: parseFloat(e.target.value) })}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Manual Entry Dialog */}
      <Dialog open={manualDialogOpen} onClose={() => setManualDialogOpen(false)}>
        <DialogTitle>Manual Stock Entry</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Product</InputLabel>
            <Select
              value={manualFormData.product_id}
              onChange={(e) => {
                const product = products.find(p => p.id === e.target.value);
                setManualFormData({ ...manualFormData, product_id: product.id, unit: product.unit });
              }}
            >
              {products?.map((p: any) => (
                <MenuItem key={p.id} value={p.id}>{p.product_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Quantity"
            type="number"
            value={manualFormData.quantity}
            onChange={(e) => setManualFormData({ ...manualFormData, quantity: parseFloat(e.target.value) })}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Unit"
            value={manualFormData.unit}
            disabled
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveManual}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Import Mode Prompt Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Stock</DialogTitle>
        <DialogContent>
          <Typography>Existing stock found. Do you want to:</Typography>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={6}>
              <Button variant="contained" color="primary" fullWidth onClick={() => handleImportConfirm('replace')}>
                Replace Stock
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button variant="contained" color="primary" fullWidth onClick={() => handleImportConfirm('add')}>
                Add to Stock
              </Button>
            </Grid>
          </Grid>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button variant="text" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default StockManagement;