# Master Data Dropdown APIs

This document describes the API endpoints used to populate customer and product dropdowns in the frontend.

## API Endpoints

### Customer Dropdown
- **Endpoint**: `/api/v1/customers/`
- **Method**: `GET`
- **Authentication**: Required (Bearer token)
- **Query Parameters**:
  - `search` (optional): Search term to filter customers by name, contact number, or email
  - `active_only` (optional, default: `true`): Filter for active customers only
  - `skip` (optional, default: `0`): Number of records to skip for pagination
  - `limit` (optional, default: `100`): Maximum number of records to return

**Response Format:**
```json
[
  {
    "id": 1,
    "name": "Customer Name",
    "contact_number": "1234567890",
    "email": "customer@example.com",
    "address1": "Address Line 1",
    "city": "City",
    "state": "State",
    "pin_code": "123456",
    "is_active": true,
    // ... other fields
  }
]
```

### Product Dropdown
- **Endpoint**: `/api/v1/products/`
- **Method**: `GET`
- **Authentication**: Required (Bearer token)
- **Query Parameters**:
  - `search` (optional): Search term to filter products by name, HSN code, or part number
  - `active_only` (optional, default: `true`): Filter for active products only
  - `skip` (optional, default: `0`): Number of records to skip for pagination
  - `limit` (optional, default: `100`): Maximum number of records to return

**Response Format:**
```json
[
  {
    "id": 1,
    "product_name": "Product Name",
    "hsn_code": "12345678",
    "part_number": "PN-001",
    "unit": "PCS",
    "unit_price": 100.0,
    "gst_rate": 18.0,
    "is_active": true,
    // ... other fields
  }
]
```

### Vendor Dropdown
- **Endpoint**: `/api/v1/vendors/`
- **Method**: `GET`
- **Authentication**: Required (Bearer token)
- **Query Parameters**:
  - `search` (optional): Search term to filter vendors by name, contact number, or email
  - `active_only` (optional, default: `true`): Filter for active vendors only
  - `skip` (optional, default: `0`): Number of records to skip for pagination
  - `limit` (optional, default: `100`): Maximum number of records to return

**Response Format:**
```json
[
  {
    "id": 1,
    "name": "Vendor Name",
    "contact_number": "1234567890",
    "email": "vendor@example.com",
    "address1": "Address Line 1",
    "city": "City",
    "state": "State",
    "pin_code": "123456",
    "is_active": true,
    // ... other fields
  }
]
```

## Frontend Integration

### Customer Autocomplete
Use the `CustomerAutocomplete` component which handles:
- Search with debouncing (searches after 2+ characters)
- "Add Customer" functionality
- Proper error handling for authentication

### Product Autocomplete
Use the `ProductAutocomplete` component which handles:
- Search with debouncing (searches after 2+ characters)
- "Add Product" functionality
- Uses `product_name` field for display
- Proper error handling for authentication

### Error Handling
All APIs return appropriate HTTP status codes:
- `200 OK`: Success
- `401 Unauthorized`: Authentication required
- `400 Bad Request`: Invalid parameters
- `500 Internal Server Error`: Server error

## Authentication
All dropdown APIs require authentication using a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

The token can be obtained via the authentication endpoints and should be stored in localStorage as 'token'.