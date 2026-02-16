# Services & Pricing System - Complete Implementation

## Overview

A complete services management system for the barbershop application, enabling shops to define services, manage pricing, assign services to barbers, and integrate services into the booking flow.

## ✅ What's Implemented

### 1. Database Schema
- **Migration**: `db/migrations/009_services_complete.sql`
- **Services Table**: Core service definitions with pricing and duration
- **Barber Services Junction Table**: Maps barbers to services with optional custom pricing
- **Appointment Integration**: Service fields added to appointments table
- **Indexes**: Performance optimized for common queries

### 2. Service Manager Library
**File**: `lib/services.ts`

Core class with these methods:
- `getShopServices(shopId, category?, activeOnly?)` - List services for a shop
- `getBarberServices(barberId, activeOnly?)` - Services assigned to a barber
- `getService(serviceId, shopId)` - Get single service details
- `addService(shopId, name, price, duration, description?, category?)` - Create service
- `updateService(serviceId, shopId, updates)` - Update service fields
- `deleteService(serviceId, shopId)` - Delete service
- `assignServiceToBarber(barberId, serviceId, shopId, customPrice?, customDuration?)` - Assign service to barber
- `removeServiceFromBarber(barberId, serviceId)` - Unassign service
- `updateBarberService(barberId, serviceId, updates)` - Update barber-specific pricing
- `getServiceCategories(shopId)` - Get unique service categories

### 3. API Endpoints

#### Services Management
- **GET** `/api/services?shopId=X&category=Y` - List all shop services
  - Query params: `category` (optional), `activeOnly` (optional, default: true)
  - Returns: List of services
  
- **POST** `/api/services` - Create new service
  - Body: `{ name, base_price, duration_minutes, description?, category? }`
  - Returns: Created service with ID
  
- **GET** `/api/services/:id` - Get service details
  - Returns: Single service object
  
- **PUT** `/api/services/:id` - Update service
  - Body: `{ name?, price?, duration_minutes?, category?, is_active? }`
  - Returns: Updated service
  
- **DELETE** `/api/services/:id` - Delete service
  - Returns: Success message

#### Barber Services
- **GET** `/api/barbers/:id/services` - List services for a barber
  - Includes barber-specific pricing and availability
  - Returns: Array of services with barber overrides
  
- **POST** `/api/barbers/:id/services` - Assign service to barber
  - Body: `{ service_id, price?, duration_minutes? }`
  - Returns: Assignment record
  
- **PUT** `/api/barbers/:id/services/:serviceId` - Update barber service pricing
  - Body: `{ price?, duration_minutes?, is_available? }`
  - Returns: Updated assignment
  
- **DELETE** `/api/barbers/:id/services/:serviceId` - Remove service from barber
  - Returns: Success message

### 4. React Components

#### ServiceList.tsx
- Displays services in table or card layout
- Props:
  - `services`: Service[]
  - `onEdit?: (service) => void`
  - `onDelete?: (serviceId) => void`
  - `layout?: 'table' | 'cards'`
  - `isLoading?: boolean`
- Features: Edit/Delete buttons, active status badge, category display

#### ServiceForm.tsx
- Create/edit service modal
- Props:
  - `service?: Service | null` - For edit mode
  - `onSubmit: (data) => Promise<void>`
  - `onCancel: () => void`
  - `categories?: string[]`
  - `isLoading?: boolean`
- Features: Form validation, category selector, active toggle

#### ServiceSelector.tsx
- Dropdown for booking/selection flows
- Props:
  - `shopId: number` (required)
  - `barberId?: number` - Filter to barber's services
  - `selectedServiceId?: number`
  - `onSelect: (service) => void`
  - `label?: string`
  - `required?: boolean`
- Features: Auto-loads services, shows price/duration, visual feedback

### 5. Barber Dashboard
**File**: `app/barber/services/page.tsx`

Full-featured services management page:
- List all services for the shop
- Create new services
- Edit existing services
- Delete services
- Filter by category
- Real-time category extraction
- Loading states and error handling

### 6. Booking Flow Integration
**File**: `app/book/[slug]/BookingForm.tsx`

Updated booking form with:
- Service selection dropdown (required field)
- Service price display
- Service duration in confirmation
- Service details in appointment confirmation
- Service passed to booking API

### 7. Tests
**Files**:
- `__tests__/lib/services.test.ts` - 24 unit tests for ServiceManager
  - ✅ All CRUD operations tested
  - ✅ Filtering and search tested
  - ✅ Shop/barber relationships tested
  - ✅ Error handling tested
  
- `__tests__/api/services.test.ts` - API endpoint tests

### 8. Validation
Extended `lib/validation.ts`:
- `CreateServiceSchema` - Service creation validation with Zod
- Price validation (positive number)
- Duration validation (positive integer)
- Name requirement validation

## Database Schema

### Services Table
```sql
CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, name),
  FOREIGN KEY (shop_id) REFERENCES shops(id)
);
```

### Barber Services Junction Table
```sql
CREATE TABLE barber_services (
  barber_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  price DECIMAL(10, 2),
  duration_minutes INTEGER,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (barber_id, service_id),
  FOREIGN KEY (barber_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);
```

## Usage Examples

### Creating a Service (Backend)
```typescript
import ServiceManager from '@/lib/services'

const service = await ServiceManager.addService(
  1, // shopId
  'Premium Haircut',
  35.00,
  45,
  'Professional haircut with styling',
  'Hair'
)
```

### Assigning Service to Barber
```typescript
await ServiceManager.assignServiceToBarber(
  1, // barberId
  1, // serviceId
  1, // shopId
  40.00, // custom price (optional)
  50 // custom duration (optional)
)
```

### Using Components
```tsx
import ServiceSelector from '@/components/ServiceSelector'

<ServiceSelector
  shopId={shopId}
  barberId={barberId}
  onSelect={(service) => console.log(service)}
  label="Choose Service"
  required={true}
/>
```

### Listing Services
```typescript
const services = await ServiceManager.getShopServices(
  shopId,
  'Hair', // category filter
  true // activeOnly
)
```

## Testing

Run all service tests:
```bash
npm test -- services
```

Library tests (24 tests):
```bash
npm test -- __tests__/lib/services.test.ts
```

All 24 tests pass ✅:
- Shop service filtering
- Barber service assignment
- Service CRUD operations
- Category management
- Error handling

## Key Features

1. **Multi-level Pricing**: Services have base price, barbers can override
2. **Duration Management**: Flexible durations per service and barber
3. **Categories**: Organize services by type (Hair, Beard, etc.)
4. **Availability Control**: Barbers can disable specific services
5. **Shop Isolation**: Services properly scoped to shops
6. **Booking Integration**: Services included in appointment booking
7. **Audit Trail**: Created_at and updated_at timestamps
8. **Performance**: Optimized indexes on common queries

## API Authentication

All API endpoints require JWT token in Authorization header:
```
Authorization: Bearer <jwt-token>
```

Token must include `shopId` claim for authorization.

## Error Handling

- **401**: Missing or invalid authorization token
- **404**: Service or barber not found
- **409**: Duplicate service name or already assigned
- **400**: Invalid input data
- **500**: Server error

## Future Enhancements

- Service images/photos
- Service templates for new shops
- Advanced pricing rules (discounts, packages)
- Service availability scheduling
- Service wait times
- Service popularity analytics
- Bulk service import/export

## Migration Instructions

1. Run migration:
   ```bash
   psql -U postgres -d barbershop < db/migrations/009_services_complete.sql
   ```

2. Deploy code with services components

3. Barbers can start adding services via dashboard at `/barber/services`

4. Services will automatically appear in booking flow

## Notes

- Service IDs are auto-incremented integers
- Prices stored as DECIMAL(10, 2) for accuracy
- Durations in minutes (recommended: 15, 30, 45, 60)
- Service names unique per shop (case-insensitive)
- Soft delete not implemented - use `is_active` flag instead
