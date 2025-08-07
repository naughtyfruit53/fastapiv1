# Excel Import/Export Feature Documentation

## Overview

The FastAPI v1 application provides comprehensive Excel import/export functionality for the following modules:
- **Stock Management**
- **Product Management** 
- **Vendor Management**
- **Customer Management**

Each module supports three Excel operations:
1. **Template Download** - Download a properly formatted Excel template
2. **Data Import** - Upload and import data from Excel files
3. **Data Export** - Export existing data to Excel files

## Available Endpoints

### Stock Module
- `GET /api/v1/stock/template/excel` - Download stock import template
- `POST /api/v1/stock/import/excel` - Import stock data from Excel
- `GET /api/v1/stock/export/excel` - Export stock data to Excel
- `POST /api/v1/stock/bulk` - Bulk import (alias for import)

### Products Module  
- `GET /api/v1/products/template/excel` - Download products import template
- `POST /api/v1/products/import/excel` - Import products data from Excel
- `GET /api/v1/products/export/excel` - Export products data to Excel

### Vendors Module
- `GET /api/v1/vendors/template/excel` - Download vendors import template  
- `POST /api/v1/vendors/import/excel` - Import vendors data from Excel
- `GET /api/v1/vendors/export/excel` - Export vendors data to Excel

### Customers Module
- `GET /api/v1/customers/template/excel` - Download customers import template
- `POST /api/v1/customers/import/excel` - Import customers data from Excel  
- `GET /api/v1/customers/export/excel` - Export customers data to Excel

## Template Structure

### Stock Template
Required columns:
- Product Name (required)
- Quantity (required) 
- Unit (required)
- HSN Code (optional)
- Part Number (optional)
- Unit Price (optional)
- GST Rate (optional)
- Reorder Level (optional)
- Location (optional)

### Products Template
Required columns:
- Product Name (required)
- Unit (required)
- HSN Code (optional)
- Part Number (optional)  
- Unit Price (optional)
- GST Rate (optional)
- Is GST Inclusive (TRUE/FALSE)
- Reorder Level (optional)
- Description (optional)
- Is Manufactured (TRUE/FALSE)
- Initial Quantity (optional - for stock creation)
- Initial Location (optional - for stock creation)

### Vendors Template
Required columns:
- Name (required)
- Contact Number (required)
- Address Line 1 (required)
- City (required)
- State (required)
- Pin Code (required)
- State Code (required)
- Email (optional)
- Address Line 2 (optional)
- GST Number (optional)
- PAN Number (optional)

### Customers Template
Required columns:
- Name (required)
- Contact Number (required)
- Address Line 1 (required)
- City (required)
- State (required)
- Pin Code (required)
- State Code (required)
- Email (optional)
- Address Line 2 (optional)
- GST Number (optional)
- PAN Number (optional)

## How to Use

### 1. Download Template
```bash
curl -o template.xlsx http://your-api-url/api/v1/{module}/template/excel
```

### 2. Fill Template
- Open the downloaded Excel file
- Navigate to the data sheet (e.g., "Stock Import Template")
- Fill in your data following the sample row provided
- Save the file

### 3. Import Data
```bash
curl -X POST -F "file=@your_data.xlsx" http://your-api-url/api/v1/{module}/import/excel
```

### 4. Export Data
```bash
curl -o export.xlsx http://your-api-url/api/v1/{module}/export/excel
```

## Key Features Fixed

### 1. Dynamic Sheet Detection
The Excel parser now automatically detects the correct data sheet:
- Looks for module-specific sheet names (e.g., "Stock Import Template")
- Falls back to common patterns like "Data" or "Sheet1"
- Provides clear error messages when sheets are not found

### 2. Column Name Normalization
- Template column names are automatically normalized to match database fields
- Handles variations in spacing and capitalization
- Example: "Product Name" → "product_name"

### 3. Comprehensive Validation
- Required field validation
- Data type validation  
- Business rule validation (e.g., non-negative quantities)
- Detailed error reporting with row numbers

### 4. Error Handling
- Clear error messages indicating specific issues
- Row-by-row error reporting
- Graceful handling of invalid data

### 5. Product-Stock Integration
- Products import can create initial stock entries
- Stock import can auto-create missing products
- Maintains data consistency across modules

## Technical Implementation

### Services Used
- `ExcelService` - Base service with parsing and response utilities
- `StockExcelService` - Stock-specific template/import/export logic
- `ProductExcelService` - Product-specific template/import/export logic  
- `VendorExcelService` - Vendor-specific template/import/export logic
- `CustomerExcelService` - Customer-specific template/import/export logic

### Dependencies
- `pandas` - Excel file parsing and data manipulation
- `openpyxl` - Excel file creation and styling
- `fastapi` - File upload handling and streaming responses

### Security Considerations
- File type validation (only .xlsx and .xls allowed)
- Organization-level data isolation
- User authentication required for all operations
- Input sanitization and validation

## Error Response Format
```json
{
  "message": "Import completed. 5 records created, 2 errors.",
  "total_processed": 7,
  "created": 5,
  "updated": 0,
  "errors": [
    "Row 3: Product Name is required",
    "Row 6: Invalid quantity value: abc"
  ]
}
```

## Best Practices

1. **Always download the latest template** - Templates may be updated with new fields
2. **Validate data before import** - Check required fields and data formats
3. **Use meaningful names** - Product names, vendor names should be descriptive and unique
4. **Test with small batches** - Import a few records first to verify the format
5. **Backup existing data** - Export current data before large imports

## Troubleshooting

### Common Issues

1. **"Missing required columns" error**
   - Ensure you're using the data sheet, not the instructions sheet
   - Check that column headers match exactly (case-insensitive)
   - Don't modify the header row in templates

2. **"Invalid data format" errors**
   - Check numeric fields (quantities, prices) don't contain text
   - Boolean fields should be TRUE/FALSE or YES/NO
   - Dates should be in proper Excel date format

3. **"Product not found" errors in stock import**
   - Either create products first, or use stock import which auto-creates products
   - Ensure product names match exactly

4. **Organization access errors**
   - Ensure you're logged in with proper organization access
   - Data is isolated per organization

### Getting Help

If you encounter issues with Excel import/export functionality:
1. Check the error messages for specific guidance
2. Verify your template format matches the downloaded template
3. Test with a small sample of data first
4. Contact support with specific error messages and sample data
