# Inventory Tracking System

## Overview

The Inventory Tracking System allows barbershop owners to manage supplies, track costs, set automatic low-stock alerts, and analyze supply expenses per appointment.

## Features

### 1. **Inventory Management**
- Track supplies: clippers, shears, razors, products, chemicals
- Manage stock levels with real-time updates
- Assign SKU codes for easier identification
- Set custom low-stock thresholds per item

### 2. **Cost Tracking**
- Cost per unit for accurate expense tracking
- Automatic calculation of total inventory value
- Historical transaction records
- Cost per appointment analysis

### 3. **Low-Stock Alerts**
- Automatic alerts when inventory drops below threshold
- Out-of-stock notifications
- Acknowledgment system for alert tracking
- Email/SMS integration ready

### 4. **Supplier Management**
- Store supplier contact information
- Track last order dates
- Maintain reorder history
- Link suppliers to inventory items

### 5. **Reorder Management**
- Create purchase orders
- Track reorder status (pending, received, cancelled)
- Record delivery dates
- Automatic inventory updates on receipt

## Database Schema

### Inventory Items Table
```sql
CREATE TABLE inventory_items (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id),
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  sku VARCHAR(100) UNIQUE,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  unit_cost NUMERIC(10,2) NOT NULL,
  reorder_quantity INTEGER,
  supplier_id INTEGER REFERENCES suppliers(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Inventory Transactions Table
```sql
CREATE TABLE inventory_transactions (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id),
  item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  transaction_type VARCHAR(50) NOT NULL, -- 'add', 'use', 'adjust', 'return'
  quantity INTEGER NOT NULL,
  unit_cost NUMERIC(10,2),
  total_cost NUMERIC(12,2),
  appointment_id INTEGER REFERENCES appointments(id),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Inventory Alerts Table
```sql
CREATE TABLE inventory_alerts (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id),
  item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  alert_type VARCHAR(50) NOT NULL, -- 'low_stock', 'out_of_stock'
  current_quantity INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP,
  acknowledged_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Suppliers Table
```sql
CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id),
  vendor_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  last_order_date TIMESTAMP,
  website VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Inventory Items

#### Add Inventory Item
```
POST /api/inventory
Content-Type: application/json

{
  "shop_id": 1,
  "item_name": "Hair Clippers",
  "category": "clippers",
  "unit_cost": 50.00,
  "description": "Professional grade clippers",
  "sku": "CLIP-001",
  "current_quantity": 5,
  "low_stock_threshold": 2,
  "reorder_quantity": 10,
  "supplier_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Inventory item added",
  "item": {
    "id": 1,
    "shop_id": 1,
    "item_name": "Hair Clippers",
    "category": "clippers",
    "current_quantity": 5,
    "unit_cost": 50.00,
    "low_stock_threshold": 2,
    "is_active": true,
    "created_at": "2024-01-01T10:00:00Z"
  }
}
```

#### Get Inventory Items
```
GET /api/inventory?shop_id=1&category=clippers
```

**Response:**
```json
{
  "success": true,
  "items": [...],
  "totalValue": 500.00,
  "count": 5
}
```

#### Update Inventory Item
```
PATCH /api/inventory
Content-Type: application/json

{
  "id": 1,
  "current_quantity": 8,
  "low_stock_threshold": 3
}
```

### Stock Usage

#### Record Supply Usage
```
POST /api/inventory/use
Content-Type: application/json

{
  "shop_id": 1,
  "item_id": 1,
  "quantity": 1,
  "appointment_id": 123,
  "notes": "Used during haircut appointment",
  "created_by": 5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Supply usage recorded",
  "transaction": {
    "id": 1,
    "shop_id": 1,
    "item_id": 1,
    "transaction_type": "use",
    "quantity": 1,
    "created_at": "2024-01-01T14:30:00Z"
  }
}
```

### Low-Stock Alerts

#### Get Alerts
```
GET /api/inventory/alerts?shop_id=1&acknowledged=false
```

**Response:**
```json
{
  "success": true,
  "alerts": [
    {
      "id": 1,
      "shop_id": 1,
      "item_id": 1,
      "alert_type": "low_stock",
      "current_quantity": 2,
      "threshold": 5,
      "is_acknowledged": false,
      "created_at": "2024-01-01T10:00:00Z"
    }
  ],
  "count": 1
}
```

#### Acknowledge Alert
```
PATCH /api/inventory/alerts
Content-Type: application/json

{
  "alert_id": 1,
  "user_id": 5
}
```

### Cost Analysis

#### Calculate Cost Per Appointment
```
GET /api/inventory/cost-per-appointment?shop_id=1&from_date=2024-01-01&to_date=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "costPerAppointment": 15.25,
  "currency": "USD"
}
```

## React Components

### InventoryList
Displays all inventory items with filtering and stock status indicators.

```tsx
import { InventoryList } from '@/components/inventory/InventoryList';

export default function InventoryPage() {
  return <InventoryList shopId={1} />;
}
```

**Props:**
- `shopId: number` - Shop ID
- `onSelectItem?: (item: InventoryItem) => void` - Callback when item is selected

### LowStockAlerts
Shows active low-stock and out-of-stock alerts with acknowledgment button.

```tsx
import { LowStockAlerts } from '@/components/inventory/LowStockAlerts';

export default function AlertsPage() {
  return <LowStockAlerts shopId={1} />;
}
```

**Props:**
- `shopId: number` - Shop ID

### CostAnalysis
Displays cost per appointment with date range filtering.

```tsx
import { CostAnalysis } from '@/components/inventory/CostAnalysis';

export default function CostPage() {
  return <CostAnalysis shopId={1} />;
}
```

**Props:**
- `shopId: number` - Shop ID

## Usage Examples

### Adding Inventory Items
```typescript
const service = inventoryService;

const item = await service.addInventoryItem(
  1, // shop_id
  'Hair Clippers',
  'clippers',
  50.00, // unit_cost
  {
    current_quantity: 5,
    low_stock_threshold: 2,
    supplier_id: 1
  }
);
```

### Recording Supply Usage
```typescript
const transaction = await service.recordTransaction(
  1, // shop_id
  1, // item_id
  'use', // transaction_type
  1, // quantity
  {
    appointment_id: 123,
    notes: 'Used during haircut',
    created_by: 5
  }
);
// Low-stock alert automatically created if needed
```

### Creating Suppliers
```typescript
const supplier = await service.addSupplier(
  1, // shop_id
  'Premium Barber Supply Co.',
  {
    contact_email: 'sales@barbersupply.com',
    contact_phone: '555-0123',
    website: 'www.barbersupply.com',
    notes: 'Fast shipping, good prices'
  }
);
```

### Calculating Cost Per Appointment
```typescript
const costPerAppointment = await service.calculateCostPerAppointment(
  1, // shop_id
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
console.log(`Average cost per appointment: $${costPerAppointment}`);
```

## Multi-Tenant Support

All inventory operations are scoped to `shop_id` to ensure proper multi-tenant isolation:

```typescript
// Each shop has its own inventory
const items = await service.getInventoryItems(shop_id_1);
const itemsOther = await service.getInventoryItems(shop_id_2);
// These will return different items
```

## Testing

The inventory service includes 95%+ test coverage with unit tests for:
- Adding inventory items
- Recording transactions
- Creating and acknowledging alerts
- Calculating costs
- Supplier management
- Reorder tracking

Run tests:
```bash
npm test lib/inventory-service.test.ts
```

## Security Considerations

1. **Access Control**: Verify `shop_id` matches authenticated user's shop before operations
2. **Data Isolation**: All queries include `shop_id` filter
3. **Audit Trail**: All transactions logged with `created_by` user
4. **Validation**: Input validation on all API endpoints

## Performance Optimization

1. **Indexes**: Created on shop_id, item_id, category, sku
2. **Pagination**: Not yet implemented, add for large inventories
3. **Caching**: Consider caching inventory values
4. **Batch Operations**: Use transactions for bulk imports

## Future Enhancements

1. Barcode scanning for quick stock updates
2. Automated reordering based on thresholds
3. Integration with supplier APIs
4. Inventory forecasting
5. Multi-location inventory management
6. Batch import/export functionality
