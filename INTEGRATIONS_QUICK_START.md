# Integrations Quick Start

## 5-Minute Setup

### 1. Add to `.env.local`

```env
# Zapier
ZAPIER_CLIENT_ID=
ZAPIER_CLIENT_SECRET=
ZAPIER_REDIRECT_URI=http://localhost:3000/integrations/zapier/callback

# Google Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/integrations/google/callback

# Outlook Calendar
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=http://localhost:3000/integrations/outlook/callback

# Shopify
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
SHOPIFY_REDIRECT_URI=http://localhost:3000/integrations/shopify/callback

# Encryption
ENCRYPTION_KEY=your-32-char-encryption-key
```

### 2. Run Database Migration

```bash
npx prisma migrate dev --name add_oauth_connections
npx prisma generate
```

### 3. Use in Your Code

```typescript
import { GoogleCalendarConnector } from '@/app/components/integrations/GoogleCalendarConnector';

export function SettingsPage({ organizationId }) {
  return (
    <div className="space-y-4">
      <GoogleCalendarConnector organizationId={organizationId} />
    </div>
  );
}
```

## Available Integrations

### Zapier (Workflow Automation)
- **Triggers**: appointment_created, appointment_cancelled, payment_completed, customer_created
- **Actions**: create_appointment, send_sms, send_email, create_customer
- **Auth**: POST `/api/integrations/zapier/authorize`
- **Status**: GET `/api/integrations/zapier/authorize`

### Google Calendar (Calendar Sync)
- **Sync**: Create, update, delete appointment events
- **Auth**: POST `/api/integrations/google/authorize`
- **Sync**: POST `/api/integrations/google/sync`
- **Status**: GET `/api/integrations/google/sync`

### Outlook Calendar (Calendar Sync)
- **Sync**: Create, update, delete appointment events
- **Auth**: POST `/api/integrations/outlook/authorize`
- **Sync**: POST `/api/integrations/outlook/sync`
- **Status**: GET `/api/integrations/outlook/sync`

### Shopify POS (Sales Tracking)
- **Sync**: Product sales → Appointments
- **Webhooks**: Order created/updated events
- **Auth**: POST `/api/integrations/shopify/authorize`
- **Webhook**: POST `/api/integrations/shopify/webhooks/orders/created`

## Common Tasks

### Create Google Calendar Event

```typescript
import { GoogleCalendarIntegration } from '@/lib/integrations/google-calendar-service';

const google = new GoogleCalendarIntegration({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: process.env.GOOGLE_REDIRECT_URI!,
});

const event = await google.createEvent(accessToken, {
  appointmentId: 'apt-123',
  customerId: 'cust-1',
  barberId: 'barber-1',
  serviceName: 'Haircut',
  startTime: new Date('2024-02-20T10:00:00'),
  endTime: new Date('2024-02-20T10:30:00'),
  customerEmail: 'customer@example.com',
  notes: 'Regular haircut',
});
```

### Check Integration Status

```typescript
const response = await fetch(
  `/api/integrations/google/authorize?organizationId=${orgId}`
);
const status = await response.json();
console.log(status.connected); // true/false
console.log(status.email); // user@gmail.com
```

### Sync Event

```typescript
const response = await fetch('/api/integrations/google/sync', {
  method: 'POST',
  body: JSON.stringify({
    organizationId: 'org-123',
    action: 'create',
    appointmentData: {
      appointmentId: 'apt-123',
      customerId: 'cust-1',
      barberId: 'barber-1',
      serviceName: 'Haircut',
      startTime: '2024-02-20T10:00:00',
      endTime: '2024-02-20T10:30:00',
      customerEmail: 'customer@example.com',
    },
  }),
});
```

### Get Shopify Orders

```typescript
import { ShopifyIntegration } from '@/lib/integrations/shopify-service';

const shopify = new ShopifyIntegration({...});
const orders = await shopify.getOrders(accessToken, 'mystore.myshopify.com');

orders.forEach((order) => {
  console.log(`Order #${order.order_number}: $${order.total_price}`);
});
```

## Testing

```bash
# Run all tests
npm test

# Run integration tests only
npm test -- __tests__/integrations/

# Watch mode
npm test -- --watch

# Coverage
npm run test:coverage
```

## Troubleshooting

**OAuth code exchange fails**
- Check client ID and secret
- Verify redirect URI matches exactly
- Check environment variables

**Calendar event not syncing**
- Verify access token is valid
- Check calendar permissions
- Review logs in `IntegrationLog` table

**Shopify webhook not received**
- Register webhook first via API
- Verify HMAC signature
- Check redirect URI is public

## Docs

- Full guide: `INTEGRATIONS_GUIDE.md`
- Database schema: `white-label-system/prisma/schema.prisma`
- Services: `/lib/integrations/`
- Components: `/app/components/integrations/`
- Tests: `/__tests__/integrations/`
