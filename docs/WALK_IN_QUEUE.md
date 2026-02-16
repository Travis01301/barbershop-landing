# Walk-in Queue Mode Documentation

## Overview

The Walk-in Queue Mode is a tablet/kiosk interface that allows barbershops to efficiently manage drop-in customers. Customers check in at a kiosk, receive a position in queue, and are notified via SMS when their turn arrives.

## Features

### 1. Customer Check-In
- **Tablet/Kiosk Interface**: QR code or touchscreen check-in
- **Customer Information**: Name, phone number, service type, estimated duration
- **Quick Check-In**: Get position in queue immediately
- **Multi-language Support**: Interface available in multiple languages

### 2. Real-Time Queue Display
- **Live Queue Status**: Current position, estimated wait time, average wait time
- **Analytics Dashboard**: View queue trends and peak hours
- **Barber Availability**: See which barbers are available
- **Auto-Refresh**: Updates every 30 seconds

### 3. Auto-Assignment System
- **First Available Barber**: Automatically assign customers to barbers
- **Service-Based Routing**: Assign based on service type and barber expertise
- **SMS Notification**: Customer receives SMS when barber is ready
- **Position Updates**: Queue positions update automatically

### 4. Queue Management
- **Mark Complete**: Barbers mark service as completed
- **Mark No-Show**: Remove customers who don't show up
- **Cancel Entry**: Remove customers from queue
- **Manual Override**: Manually assign to specific barber

### 5. Analytics & Tracking
- **Wait Time Analytics**: Average, max, and min wait times
- **Throughput Metrics**: Customers served per hour
- **Peak Hour Analysis**: Identify busy times
- **No-Show Tracking**: Monitor customer reliability
- **Daily Reports**: Comprehensive daily queue statistics

## Database Schema

### `waitlist_queue` Table
```sql
CREATE TABLE waitlist_queue (
  id UUID PRIMARY KEY,
  shop_id UUID NOT NULL,
  customer_id UUID,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  service_type VARCHAR(100) NOT NULL,
  estimated_duration INT,
  position_in_queue INT NOT NULL,
  barber_id UUID,
  status VARCHAR(50), -- waiting, in-service, completed, no-show, cancelled
  checked_in_at TIMESTAMP,
  assigned_at TIMESTAMP,
  service_started_at TIMESTAMP,
  completed_at TIMESTAMP,
  wait_time_minutes INT,
  sms_notified BOOLEAN,
  sms_notified_at TIMESTAMP,
  notes TEXT
);
```

### `queue_analytics` Table
```sql
CREATE TABLE queue_analytics (
  id UUID PRIMARY KEY,
  shop_id UUID NOT NULL,
  date DATE NOT NULL,
  total_walk_ins INT,
  total_completed INT,
  total_no_shows INT,
  total_cancelled INT,
  avg_wait_time_minutes INT,
  max_wait_time_minutes INT,
  peak_hour VARCHAR(5),
  peak_hour_count INT
);
```

## API Endpoints

### Check-In Customer
```
POST /api/queue/check-in
Authorization: Bearer {token}

{
  "customerName": "John Doe",
  "customerPhone": "555-1234",
  "serviceType": "haircut",
  "estimatedDuration": 30,
  "customerId": "cust-123" (optional)
}

Response:
{
  "success": true,
  "entry": {
    "id": "queue-1",
    "position_in_queue": 5,
    "wait_time_minutes": 120,
    ...
  }
}
```

### Get Queue Status
```
GET /api/queue/status
Authorization: Bearer {token}

Response:
{
  "success": true,
  "status": {
    "total_waiting": 5,
    "avg_wait_time": 25,
    "estimated_wait_time": 45,
    "queue_display": [...]
  }
}
```

### Assign to Barber
```
POST /api/queue/[id]/assign
Authorization: Bearer {token}

{
  "action": "assign",
  "barberId": "barber-1"
}

Response:
{
  "success": true,
  "entry": {
    "id": "queue-1",
    "status": "in-service",
    "barber_id": "barber-1",
    ...
  }
}
```

### Complete Service
```
POST /api/queue/[id]/assign
Authorization: Bearer {token}

{
  "action": "complete"
}

Response:
{
  "success": true,
  "entry": {
    "id": "queue-1",
    "status": "completed",
    "wait_time_minutes": 23,
    ...
  }
}
```

### Mark No-Show
```
POST /api/queue/[id]/assign
Authorization: Bearer {token}

{
  "action": "no-show"
}

Response:
{
  "success": true,
  "entry": {
    "id": "queue-1",
    "status": "no-show"
  }
}
```

### Cancel Queue Entry
```
DELETE /api/queue/[id]
Authorization: Bearer {token}

Response:
{
  "success": true,
  "entry": {
    "id": "queue-1",
    "status": "cancelled"
  }
}
```

## React Components

### QueueCheckIn
Tablet/kiosk interface for customer check-in.

```tsx
import { QueueCheckIn } from '@/components/QueueCheckIn';

<QueueCheckIn 
  onCheckIn={async (data) => {
    const res = await fetch('/api/queue/check-in', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    return res.json();
  }}
  isLoading={false}
/>
```

### QueueDisplay
Real-time queue display for waiting area screens.

```tsx
import { QueueDisplay } from '@/components/QueueDisplay';

<QueueDisplay
  status={queueStatus}
  isLoading={false}
  refreshInterval={30000}
  onRefresh={handleRefresh}
/>
```

### QueueManagement
Barber management interface for assigning customers.

```tsx
import { QueueManagement } from '@/components/QueueManagement';

<QueueManagement
  queue={queue}
  barbers={barbers}
  onAssignBarber={handleAssignBarber}
  onCompleteService={handleComplete}
  onMarkNoShow={handleNoShow}
  onCancelEntry={handleCancel}
  isLoading={false}
/>
```

## Service Integration

### Queue Service Methods
```typescript
// Check in a customer
await queueService.checkInCustomer(
  shopId,
  customerName,
  customerPhone,
  serviceType,
  estimatedDuration
);

// Get queue status
const status = await queueService.getQueueStatus(shopId);

// Assign to barber
await queueService.assignCustomerToBarber(queueId, barberId);

// Complete service
await queueService.completeService(queueId);

// Mark as no-show
await queueService.markAsNoShow(queueId);

// Get analytics
const analytics = await queueService.getQueueAnalytics(shopId, startDate, endDate);

// Update daily analytics
await queueService.updateDailyAnalytics(shopId, date);
```

## SMS Integration (Twilio)

The system automatically sends SMS notifications using Twilio when:
- Customer is assigned to a barber
- Service is about to start
- Customer is next in queue

Configuration:
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

## Testing

Run tests with 95%+ coverage:
```bash
npm test -- lib/queue-service.test.ts --coverage
```

Test coverage includes:
- Check-in functionality
- Queue status retrieval
- Barber assignment
- Service completion
- Analytics calculation
- Error handling

## Configuration

### Environment Variables
```env
# Queue System
QUEUE_SMS_ENABLED=true
QUEUE_AUTO_ASSIGN=true
QUEUE_REFRESH_INTERVAL=30000
QUEUE_ANALYTICS_ENABLED=true

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

### Shop Settings
Shop administrators can configure:
- Default service duration estimates
- Auto-assignment preferences
- SMS notification templates
- Queue display settings
- Analytics retention period

## Best Practices

1. **Customer Experience**
   - Keep check-in simple and quick (< 1 minute)
   - Display clear wait time estimates
   - Send SMS updates to customers

2. **Queue Management**
   - Mark customers as completed promptly
   - Monitor no-show rates
   - Review peak hours weekly

3. **Analytics**
   - Analyze weekly trends
   - Identify bottlenecks
   - Adjust staff based on peak hours
   - Track no-show rates by time

4. **Troubleshooting**
   - Clear queue when system resets
   - Handle position duplicates
   - Reset daily analytics at 12:00 AM

## Deployment

1. Run migrations:
```bash
psql -d barbershop_booking -f db/migrations/012_walk_in_queue.sql
```

2. Deploy API routes:
```
app/api/queue/route.ts
app/api/queue/[id]/route.ts
```

3. Deploy React components:
```
components/QueueCheckIn.tsx
components/QueueDisplay.tsx
components/QueueManagement.tsx
```

4. Configure SMS (Twilio):
```bash
npm install twilio
```

## Monitoring

Monitor the queue system with:
- Queue length and wait times
- Barber utilization rates
- Customer satisfaction (no-show tracking)
- SMS delivery success rate
- API response times
