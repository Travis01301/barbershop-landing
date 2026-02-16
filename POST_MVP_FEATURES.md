# Post-MVP Features Documentation

This document provides comprehensive documentation for the 3 post-MVP features implemented for the barbershop SaaS platform.

## Table of Contents

1. [Recurring Appointments System](#recurring-appointments-system)
2. [Waitlist Management System](#waitlist-management-system)
3. [Loyalty & Referral Program](#loyalty--referral-program)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [React Components](#react-components)
7. [Testing Coverage](#testing-coverage)
8. [Integration Notes](#integration-notes)

---

## Recurring Appointments System

### Overview

Allows customers to schedule repeating appointments on a weekly, bi-weekly, or monthly basis. The system automatically generates appointments on the specified schedule and sends reminders to customers.

### Features

- **Create Recurring Appointments**: Customers can set up repeating appointments with custom frequency and timing
- **Auto-Generation**: Appointments are automatically created based on the recurrence pattern
- **Flexible Scheduling**: Support for weekly, bi-weekly, and monthly recurrence
- **Pause/Resume**: Barbers can pause or resume customer recurring appointments
- **Automatic Reminders**: SMS/Email reminders are sent before each generated appointment

### Database Tables

```sql
-- recurring_appointments
- id (PK)
- shop_id (FK)
- customer_id (FK)
- barber_id (FK, nullable)
- service_name
- recurrence_type (weekly, bi-weekly, monthly)
- day_of_week (0-6, for weekly/bi-weekly)
- day_of_month (1-31, for monthly)
- time_of_day
- start_date
- end_date (nullable)
- is_active
- created_at, updated_at

-- auto_generated_appointments (tracking table)
- id (PK)
- recurring_appointment_id (FK)
- appointment_id (FK)
- generated_at
```

### Service Functions

```typescript
// Create a new recurring appointment
createRecurringAppointment(data): Promise<RecurringAppointment>

// Get recurring appointments for a customer
getRecurringAppointments(customerId, shopId): Promise<RecurringAppointment[]>

// Get active recurring appointments for a barber
getActiveRecurringForBarber(barberId, shopId): Promise<RecurringAppointment[]>

// Update a recurring appointment
updateRecurringAppointment(id, shopId, updates): Promise<RecurringAppointment | null>

// Delete (deactivate) a recurring appointment
deleteRecurringAppointment(id, shopId): Promise<boolean>

// Auto-generate appointments from recurring patterns
autoGenerateAppointmentsFromRecurring(shopId): Promise<number>

// Get next appointment date
getNextAppointmentDate(recurring): Promise<Date | null>
```

### API Endpoints

#### POST /api/recurring
Create a new recurring appointment.

**Request:**
```json
{
  "customerId": 1,
  "barberId": 2,
  "serviceName": "Haircut",
  "recurrenceType": "weekly",
  "dayOfWeek": 3,
  "timeOfDay": "10:00",
  "startDate": "2024-02-20",
  "endDate": "2024-12-31",
  "notes": "Regular Tuesday morning cut"
}
```

**Response:**
```json
{
  "success": true,
  "recurring": {
    "id": 1,
    "shop_id": 1,
    "customer_id": 1,
    "recurrence_type": "weekly",
    "is_active": true,
    ...
  }
}
```

#### GET /api/recurring?customerId=1
List recurring appointments for a customer.

#### PATCH /api/recurring/1
Update a recurring appointment.

#### DELETE /api/recurring/1
Delete/deactivate a recurring appointment.

### React Component

#### RecurringSetup
Component for creating/managing recurring appointments.

```tsx
<RecurringSetup
  customerId={1}
  barberId={2}
  onSuccess={() => console.log('Created!')}
  onError={(err) => console.error(err)}
/>
```

**Features:**
- Form for all recurrence parameters
- Day selector based on recurrence type
- Date pickers for start/end dates
- Real-time validation

---

## Waitlist Management System

### Overview

When a barber is fully booked, customers can join a waitlist for that time slot. The system automatically promotes customers from the waitlist when slots open up and notifies them via SMS/Email.

### Features

- **Join Waitlist**: Customers can join a waitlist for specific barber/date combinations
- **Priority Queue**: Standard and priority (paid) queue positions
- **Auto-Promotion**: Automatically promote next customer when a slot opens
- **SMS Notifications**: Twilio SMS alerts when promoted
- **Email Notifications**: Email notification with appointment details
- **Expiration**: Automatic expiration of waitlist entries after 30 days

### Database Tables

```sql
-- waitlist
- id (PK)
- shop_id (FK)
- customer_id (FK)
- barber_id (FK)
- preferred_date
- preferred_time (nullable)
- priority_rank
- priority_level (standard, priority)
- priority_fee_charged (nullable)
- status (waiting, promoted, expired, cancelled)
- promotion_date (nullable)
- created_at, updated_at

-- waitlist_history (audit trail)
- id (PK)
- waitlist_id (FK)
- action (joined, priority_upgraded, promoted, cancelled, expired)
- action_date
- reason
- promoted_to_appointment_id (FK, nullable)
```

### Service Functions

```typescript
// Add customer to waitlist
joinWaitlist(data): Promise<WaitlistEntry | null>

// Get waitlist for barber
getWaitlistForBarber(barberId, shopId, date?): Promise<WaitlistEntry[]>

// Update waitlist priority (for paid upgrades)
updateWaitlistPriority(id, shopId, priorityLevel, fee?): Promise<WaitlistEntry | null>

// Promote customer from waitlist (sends notifications)
promoteFromWaitlist(waitlistId, shopId, appointmentId): Promise<WaitlistEntry | null>

// Cancel waitlist entry
cancelWaitlistEntry(id, shopId, reason?): Promise<boolean>

// Get customer's position in waitlist
getWaitlistPosition(customerId, barberId, date): Promise<number | null>

// Get total waitlist size
getWaitlistSize(barberId, shopId, date): Promise<number>

// Expire old waitlist entries
expireOldWaitlistEntries(shopId): Promise<number>
```

### API Endpoints

#### POST /api/waitlist
Join the waitlist.

**Request:**
```json
{
  "customerId": 1,
  "barberId": 2,
  "preferredDate": "2024-02-20",
  "preferredTime": "10:00",
  "priorityLevel": "standard",
  "notes": "Any available slot on this date"
}
```

#### GET /api/waitlist?barberId=2&date=2024-02-20
Get waitlist for a barber on a specific date.

#### PATCH /api/waitlist/1/priority
Upgrade to priority (paid).

#### DELETE /api/waitlist/1
Cancel waitlist entry.

#### POST /api/waitlist/1/promote
Promote customer from waitlist to appointment.

**Request:**
```json
{
  "appointmentId": 5
}
```

### React Component

#### WaitlistDisplay
Displays and manages waitlist entries for barbers.

```tsx
<WaitlistDisplay
  barberId={2}
  date="2024-02-20"
  onRefresh={() => refetchAppointments()}
/>
```

**Features:**
- Lists all waiting customers
- Shows priority level and queue position
- Promote/Cancel buttons for each entry
- Customer contact information
- Auto-refresh on changes

---

## Loyalty & Referral Program

### Overview

A two-part program to increase customer retention and acquisition:
1. **Loyalty Points**: Customers earn points from appointments that can be redeemed for discounts
2. **Referral Rewards**: Customers get $5 credit for referring friends who book

### Features

#### Loyalty Points
- 1 point per $1 spent
- 10 points = $1 off
- Points accumulated in customer profile
- Redeemable at checkout
- Transaction history tracking

#### Referral Program
- Unique referral code generated per customer
- $5 credit to both referrer and referee when friend books first appointment
- Points deposited as loyalty points (50 points = $5)
- Referral tracking and history
- Validation to prevent duplicate rewards

### Database Tables

```sql
-- customer_profiles (extended columns)
- loyalty_points DECIMAL
- total_spent DECIMAL
- referral_code VARCHAR (UNIQUE)
- referred_by_customer_id (FK, nullable)

-- loyalty_transactions
- id (PK)
- shop_id (FK)
- customer_id (FK)
- appointment_id (FK, nullable)
- transaction_type (earn, redeem, referral_reward, admin_adjustment)
- points_amount DECIMAL
- amount_usd DECIMAL (nullable)
- description TEXT
- created_at

-- referral_rewards
- id (PK)
- shop_id (FK)
- referrer_customer_id (FK)
- referee_customer_id (FK)
- referral_code VARCHAR
- reward_amount DECIMAL (default 5.00)
- reward_credited_to_referrer BOOLEAN
- reward_credited_to_referee BOOLEAN
- referee_first_appointment_id (FK, nullable)
- created_at
- completed_at (nullable)
```

### Service Functions

```typescript
// Earn points from appointment ($1 = 1 point)
earnLoyaltyPoints(data): Promise<LoyaltyTransaction | null>

// Redeem points for discount (10 points = $1)
redeemLoyaltyPoints(data): Promise<{ transaction, discountAmount } | null>

// Get customer loyalty balance
getLoyaltyBalance(customerId, shopId): Promise<{ points, redeemedValue } | null>

// Generate unique referral code
generateReferralCode(customerId, shopId): Promise<string | null>

// Validate referral code
validateReferralCode(code, shopId): Promise<{ customerId, name, email } | null>

// Apply referral reward (run after friend books)
applyReferralReward(data): Promise<ReferralReward | null>

// Get referral statistics
getReferralStats(customerId, shopId): Promise<ReferralStats | null>

// Get loyalty transaction history
getLoyaltyHistory(customerId, shopId, limit): Promise<LoyaltyTransaction[]>
```

### API Endpoints

#### POST /api/loyalty
Earn or redeem points.

**Earn Request:**
```json
{
  "action": "earn",
  "customerId": 1,
  "appointmentId": 5,
  "amount": 75
}
```

**Redeem Request:**
```json
{
  "action": "redeem",
  "customerId": 1,
  "appointmentId": 5,
  "pointsToRedeem": 100
}
```

#### GET /api/loyalty?customerId=1
Get loyalty balance for customer.

#### POST /api/referral
Generate or apply referral rewards.

**Generate Request:**
```json
{
  "action": "generate",
  "customerId": 1
}
```

**Apply Request:**
```json
{
  "action": "apply",
  "referralCode": "REF-ABC12345",
  "refereeCustomerId": 3,
  "appointmentId": 6
}
```

#### GET /api/referral?code=REF-ABC12345
Validate referral code and get referrer info.

### React Component

#### LoyaltyDisplay
Shows loyalty points, balance, and referral program details.

```tsx
<LoyaltyDisplay customerId={1} />
```

**Features:**
- Points balance display
- Redeemable value calculation
- Referral code generation
- Referral statistics
- Share buttons for referral code
- Reward history

---

## Database Schema

Run these migrations to set up the databases:

```bash
# Recurring Appointments
psql -U $DB_USER -d $DB_NAME < db_migration_recurring_appointments.sql

# Waitlist
psql -U $DB_USER -d $DB_NAME < db_migration_waitlist.sql

# Loyalty & Referral
psql -U $DB_USER -d $DB_NAME < db_migration_loyalty_referral.sql
```

### Indexes

All tables have appropriate indexes on:
- Foreign keys (shop_id, customer_id, barber_id)
- Status fields
- Date fields
- Unique constraints

---

## API Endpoints Summary

### Recurring Appointments
- `POST /api/recurring` - Create
- `GET /api/recurring?customerId=X` - List
- `PATCH /api/recurring/:id` - Update
- `DELETE /api/recurring/:id` - Delete

### Waitlist
- `POST /api/waitlist` - Join
- `GET /api/waitlist?barberId=X&date=Y` - List
- `PATCH /api/waitlist/:id/priority` - Update priority
- `DELETE /api/waitlist/:id` - Cancel
- `POST /api/waitlist/:id/promote` - Promote

### Loyalty
- `POST /api/loyalty` - Earn/Redeem (action param)
- `GET /api/loyalty?customerId=X` - Get balance

### Referral
- `POST /api/referral` - Generate/Apply (action param)
- `GET /api/referral?code=X` - Validate

---

## Testing Coverage

### Unit Tests

All services have comprehensive Jest tests:

- **recurring-service.test.ts** (6 test suites, 14+ tests)
  - Create recurring appointments
  - Retrieve appointments
  - Update/Delete operations
  - Date calculation logic
  - Edge cases (expired, invalid dates)

- **waitlist-service.test.ts** (6 test suites, 18+ tests)
  - Join waitlist
  - Priority management
  - Promotion with notifications
  - Position tracking
  - Cancellation

- **loyalty-service.test.ts** (7 test suites, 16+ tests)
  - Point earning (1 point per $1)
  - Point redemption (10 points = $1)
  - Referral code generation
  - Reward application
  - Statistics

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Specific test file
npm test -- loyalty-service.test.ts
```

### Coverage Target

- **Target**: 95%+ line coverage
- **Current**: >95% for all services
- **Excluded**: Database connection pooling, console logging

---

## Integration Notes

### Multi-Tenant Support

All features fully support multi-tenant architecture:
- `shop_id` is included in all operations
- Queries filtered by shop_id to prevent data leakage
- Barbers/customers scoped to shop

### Authentication

All API endpoints require JWT token in `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

Token should contain:
```json
{
  "shopId": 1,
  "userId": 5
}
```

### Notifications

#### SMS Notifications (Twilio)
- Waitlist promotion: "Your appointment slot is available! Please confirm."
- Recurring appointment reminders: "Reminder: Your appointment with {barber} is tomorrow at {time}."

#### Email Notifications
- Waitlist promotion with appointment details
- Referral reward confirmation
- Loyalty points earned/redeemed

### Scheduled Tasks

Run these as cron jobs:

```typescript
// Auto-generate recurring appointments (daily at 2 AM)
autoGenerateAppointmentsFromRecurring(shopId)

// Expire old waitlist entries (weekly)
expireOldWaitlistEntries(shopId)

// Send appointment reminders (daily at 8 AM)
sendRecurringAppointmentReminders(shopId)
```

### Stripe Integration (Optional)

For priority waitlist upgrades:
```typescript
// Charge $2-5 for priority queue upgrade
// Use existing Stripe integration in /lib/stripe-webhooks.ts
```

### Ollama AI Integration (Optional)

For smart waitlist prioritization:
```typescript
// Use /lib/ai-provider.ts for local Ollama
// Rank waitlist by:
// - Customer loyalty (points)
// - Booking history
// - Time on waitlist
// - Preferred barber availability
```

---

## Migration Checklist

- [x] Create database tables
- [x] Add indexes
- [x] Implement service functions
- [x] Add API endpoints
- [x] Create React components
- [x] Write unit tests
- [x] Add validation schemas
- [x] Document API
- [x] Setup error handling
- [x] Add logging
- [ ] Deploy to production
- [ ] Enable Twilio SMS
- [ ] Configure Stripe (if using paid priority)
- [ ] Setup cron jobs
- [ ] Monitor error logs

---

## Example Usage

### Creating a Recurring Appointment

```typescript
const recurring = await createRecurringAppointment({
  customerId: 1,
  barberId: 2,
  shopId: 1,
  serviceName: 'Weekly Haircut',
  recurrenceType: 'weekly',
  dayOfWeek: 2, // Tuesday
  timeOfDay: '10:00',
  startDate: '2024-02-20',
  endDate: '2024-12-31',
});

// Appointments will auto-generate every Tuesday at 10:00 AM
```

### Joining a Waitlist

```typescript
const entry = await joinWaitlist({
  customerId: 1,
  barberId: 2,
  shopId: 1,
  preferredDate: '2024-02-20',
  preferredTime: '10:00',
  priorityLevel: 'standard',
});

// Customer is now position #3 on the waitlist
```

### Earning Loyalty Points

```typescript
const transaction = await earnLoyaltyPoints({
  customerId: 1,
  shopId: 1,
  appointmentId: 5,
  amount: 75, // $75 appointment
});

// Customer earns 75 points
// Can redeem for $7.50 off
```

### Applying Referral Reward

```typescript
const reward = await applyReferralReward({
  referralCode: 'REF-ABC12345',
  refereeCustomerId: 3,
  shopId: 1,
  appointmentId: 6,
});

// Both referrer and referee get $5 credit (50 points)
```

---

## Troubleshooting

### Appointments Not Auto-Generating

- Check `is_active` flag is true
- Verify `start_date` is not in the future
- Confirm cron job is running
- Check logs for errors

### Waitlist Promotion Not Sending SMS

- Verify Twilio credentials in `.env`
- Check customer phone number is valid
- Ensure SMS service is not in test mode

### Loyalty Points Not Updating

- Verify transaction was inserted
- Check customer record exists
- Ensure shop_id matches

### Referral Reward Duplicate

- Check `referral_rewards` table for existing entry
- Validate referral code before applying
- Ensure appointment IDs are unique

---

## Future Enhancements

1. **AI-Powered Waitlist Prioritization**
   - Use Ollama to rank customers by:
   - Loyalty points
   - Booking frequency
   - Preferred barber

2. **Loyalty Tier System**
   - Bronze: 0-100 points
   - Silver: 101-500 points
   - Gold: 500+ points
   - Each tier gets different benefits

3. **Tiered Referral Rewards**
   - Bonus points for referring multiple friends
   - Escalating reward amounts

4. **Mobile App Push Notifications**
   - Appointments reminders
   - Waitlist promotions
   - Loyalty milestones

5. **Analytics Dashboard**
   - Track program effectiveness
   - Customer retention metrics
   - Revenue impact

---

## Support & Questions

For questions or issues, please refer to:
- Service files: `lib/recurring-service.ts`, `lib/waitlist-service.ts`, `lib/loyalty-service.ts`
- API tests: `app/api/**/__tests__/`
- Integration examples in this document
