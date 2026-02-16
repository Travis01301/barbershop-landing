# Group Bookings Integration Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                           │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │ GroupBookingForm │  │ GroupBookingDashboard            │ │
│  │                  │  │ - View groups                    │ │
│  │ - Create group   │  │ - Add/remove members             │ │
│  │ - Set size       │  │ - Confirm appointments           │ │
│  │ - Add notes      │  │ - Track payments                 │ │
│  └──────────────────┘  └──────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                              ↓ HTTP
┌──────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ /create  │ │ /[id]    │ │ /members │ │ /confirm │ ...    │
│  │ route    │ │ route    │ │ route    │ │ route    │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                  Business Logic (Services)                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  GroupBookingService                                   │  │
│  │  ├─ createGroupBooking()                               │  │
│  │  ├─ addGroupMember()                                   │  │
│  │  ├─ assignBarberToMember()                             │  │
│  │  ├─ recalculateGroupCosts()                            │  │
│  │  ├─ getApplicableDiscount()                            │  │
│  │  ├─ confirmGroupMembers()                              │  │
│  │  ├─ cancelGroupBooking()                               │  │
│  │  └─ getAvailableSlots()                                │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                    Data Layer & Services                      │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐   │
│  │  PostgreSQL  │ │ Stripe       │ │ Twilio / Resend    │   │
│  │  Database    │ │ Payments     │ │ Notifications      │   │
│  └──────────────┘ └──────────────┘ └────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Component Integration

### 1. Database Schema Integration

The group bookings system uses existing tables:
- `shops` - Shop information
- `customers` - Customer/organizer information
- `barbers` - Barber assignments
- `appointments` - Individual appointments (created from group members)
- `payments` - Payment tracking

Plus new tables:
- `group_bookings` - Main group record
- `group_booking_members` - Individual members in group
- `group_booking_discounts` - Discount rules per shop
- `group_booking_invites` - Invite tracking
- `group_booking_payments` - Group payment intents

### 2. Service Layer Integration

**GroupBookingService** integrates with:
- `db.ts` - All database queries
- `logger.ts` - Logging and monitoring
- `smsService` - Send SMS invites
- `emailService` - Send email invites
- Existing `appointments` creation logic

### 3. API Layer Integration

All endpoints require JWT authentication via `verifyJWT()`.

Common patterns:
- Validate input with Zod schemas
- Check authorization (owner verification)
- Call service methods
- Return JSON responses with success flag

### 4. Frontend Integration

React components use:
- `localStorage` for auth token
- `fetch` API for HTTP requests
- Local state management (useState)
- Reusable form patterns

## Extending the System

### Add New Endpoint

1. Create route file: `/app/api/groups/[endpoint]/route.ts`
2. Implement POST/GET/PATCH/DELETE handlers
3. Add validation schema to `group-booking-validation.ts`
4. Add service method to `group-booking-service.ts`
5. Update tests

Example:
```typescript
// lib/group-booking-validation.ts
export const MyNewEndpointSchema = z.object({
  groupId: z.string().uuid(),
  // ... other fields
})

// app/api/groups/my-endpoint/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json()
  const validation = validateInput(MyNewEndpointSchema, body, 'my-endpoint')
  
  // Call service method
  const result = await groupBookingService.myNewMethod()
  
  return NextResponse.json({ success: true, result })
}

// lib/group-booking-service.ts
async myNewMethod(): Promise<void> {
  // Implementation
}
```

### Add New Service Feature

1. Add method to `GroupBookingService` class
2. Call database via `query()` from `db.ts`
3. Use logger for monitoring
4. Add comprehensive tests
5. Update documentation

### Customize Discounts

Override `getApplicableDiscount()` or modify `setDiscountRule()`:

```typescript
// Different discount logic
async getApplicableDiscount(shopId, groupSize) {
  // Custom logic here
  // e.g., time-based discounts, service-based discounts
}
```

### Add Custom Notifications

Extend `sendGroupInvite()` or create new methods:

```typescript
async sendSlackNotification(groupId: string) {
  // Notify shop staff of new group
}

async sendPostConfirmationEmail(groupId: string) {
  // Send detailed itinerary to organizer
}
```

## Multi-Tenant Support

The system is fully multi-tenant via `shop_id`:

- Groups are scoped to shops
- Discounts are per-shop
- All queries filter by shop_id
- Users see only their shop's groups

Verify shop ownership before operations:
```typescript
if (group.shopId !== decoded.shopId) {
  return error("Unauthorized")
}
```

## Performance Optimization

### Query Optimization

Use indexes effectively:
```sql
-- Fast lookups by status
CREATE INDEX ON group_bookings(status, shop_id);

-- Fast barber availability checks
CREATE INDEX ON group_booking_members(barber_id, slot_time);

-- Fast user groups
CREATE INDEX ON group_bookings(organizer_customer_id, created_at);
```

### Caching Strategy

Cache these frequently-accessed items:
```typescript
// Discount rules (changes rarely)
const discounts = await cache.get(`discounts:${shopId}`) || 
  await groupBookingService.getDiscountRules(shopId)

// Available slots (update hourly)
const slots = await cache.get(`slots:${barber}:${date}`, 3600) ||
  await groupBookingService.getAvailableSlots(...)

// Customer's groups (update on change)
const groups = await cache.get(`groups:${customerId}`) ||
  await groupBookingService.getCustomerGroups(customerId)
```

### Batch Operations

For large groups:
```typescript
// Avoid N+1 queries
async confirmGroupMembers(groupId: string) {
  // Get all members at once
  const members = await query(...)
  
  // Batch update appointments
  for (const member of members) {
    // Create appointment
  }
  
  // Single status update
  await query('UPDATE group_bookings SET status = ...')
}
```

## Error Handling

Consistent error patterns:

```typescript
try {
  const result = await operation()
  return NextResponse.json({ success: true, result })
} catch (error) {
  logger.error('Operation failed', error)
  
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: 400 }
    )
  }
  
  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    )
  }
  
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

## Testing Strategy

### Unit Tests
- Service methods in isolation
- Mock database and external services
- Test business logic

### Integration Tests
- Full flow from API → Service → Database
- Use test database
- Clean up after tests

### End-to-End Tests
- React component → API → Database
- Simulate user workflows
- Test with real database

Run tests:
```bash
npm test                              # All tests
npm test -- group-booking             # Group booking tests
npm test -- --coverage                # Coverage report
```

## Monitoring & Logging

All service methods log:
- Info: Actions completed
- Warn: Unusual situations
- Error: Failures and exceptions

Example:
```typescript
gbLogger.info('Creating group booking', { shopId, groupName, groupSize })

try {
  // Operation
} catch (error) {
  gbLogger.error('Error creating group', error, { shopId })
}
```

Monitor metrics:
- Group creation rate
- Member confirmation rate
- Cancellation rate
- Payment success rate
- Average discount used
- Customer satisfaction

## Security Considerations

### Authentication
- All endpoints require JWT token
- Token includes customerId and shopId
- Verify token before operations

### Authorization
- Verify user owns the group
- Check shop ownership
- Validate customer/guest data

### Data Validation
- Validate all input with Zod
- Sanitize string fields
- Enforce constraints (group size, discount %)

### Payment Security
- Never store credit cards
- Use Stripe for payment processing
- Log payment transactions
- Validate amounts

## Deployment Checklist

Before deploying:
- [ ] Run migrations on production database
- [ ] Test all endpoints with production data
- [ ] Verify payment processing works
- [ ] Check SMS/email credentials
- [ ] Configure discount rules
- [ ] Brief staff on new feature
- [ ] Set up monitoring/alerts
- [ ] Update documentation
- [ ] Train customer support

```bash
# Deploy process
git pull origin main
npm install
npm run build
npm run test
npm run migrations
npm start
```

## Rollback Plan

If issues occur:
1. Disable group bookings API endpoints
2. Revert to previous database schema (keep data)
3. Redeploy without group booking changes
4. Investigate issues
5. Fix and redeploy

```bash
# Disable API
export GROUP_BOOKINGS_ENABLED=false

# Restore database
psql ... < backup.sql

# Revert code
git revert <commit-hash>
npm install
npm run build
npm start
```

## Support & Troubleshooting

Common integration issues:

**1. JWT not valid**
- Check token expiration
- Verify secret key matches
- Ensure Authorization header format

**2. Group not found**
- Verify group exists in database
- Check shop_id matches
- Query database directly to verify

**3. Payment failed**
- Check Stripe API keys
- Verify amount is correct (cents)
- Check payment method is valid

**4. Barber conflict**
- Check existing appointments
- Verify time slot is available
- Try different time

## Further Reading

- Group Bookings User Guide: `docs/GROUP_BOOKINGS.md`
- Admin Guide: `docs/GROUP_BOOKINGS_ADMIN_GUIDE.md`
- Database Schema: Check migration file
- Service Implementation: `lib/group-booking-service.ts`
- API Endpoints: `app/api/groups/**/route.ts`
- React Components: `components/GroupBooking*.tsx`
