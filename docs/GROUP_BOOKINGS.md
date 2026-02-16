# Group Bookings System Documentation

## Overview

The Group Bookings system allows barbershop customers to book multiple appointments at once for groups (bachelor parties, families, corporate events, etc.) with automatic discount tiers and flexible member management.

## Features

### 1. Group Creation
- Create groups with 2-100+ people
- Organizer manages the group
- Add custom notes and group names

### 2. Member Management
- Add registered customers or guest members
- Assign barbers to members
- Set appointment slots
- Remove members if needed
- Track individual member status (pending, confirmed, cancelled, completed)

### 3. Smart Discount System
- Automatic discount application based on group size
- Configurable discount tiers per shop:
  - 4+ people: 10% (default)
  - 6+ people: 15% (default)
  - 10+ people: 20% (default)
- Discounts applied automatically to all members
- Real-time cost recalculation

### 4. Conflict Detection
- Prevents double-booking of barbers
- Checks availability before confirming
- Shows available slots for multiple barbers

### 5. Payment Integration
- Stripe payment support
- Pay for entire group at once
- Payment intent creation and management

### 6. Notifications
- SMS invites to group members
- Email invites with accept/decline
- Confirmation reminders
- Cancellation notifications

## Database Schema

### group_bookings
```sql
- id (UUID) - Primary key
- shop_id (UUID) - Shop reference
- organizer_customer_id (UUID) - Who created the group
- group_name (VARCHAR) - Name of the group
- group_size (INT) - Max group size
- total_cost (DECIMAL) - Final cost after discount
- subtotal_cost (DECIMAL) - Before discount
- discount_percent (DECIMAL) - Applied discount %
- discount_amount (DECIMAL) - $ amount discounted
- status - pending, partial-confirmed, confirmed, completed, cancelled
- notes (TEXT) - Additional info
- created_at, updated_at (TIMESTAMP)
```

### group_booking_members
```sql
- id (UUID) - Primary key
- group_booking_id (UUID) - Parent group
- customer_id (UUID) - Registered customer (optional)
- barber_id (UUID) - Assigned barber
- appointment_id (UUID) - Created appointment
- guest_name (VARCHAR) - Guest name
- guest_email (VARCHAR) - Guest email
- guest_phone (VARCHAR) - Guest phone
- slot_time (TIMESTAMP) - Appointment time
- service_type (VARCHAR) - Service booked
- service_price (DECIMAL) - Cost for this person
- status - pending, confirmed, cancelled, no-show, completed
```

### group_booking_discounts
```sql
- id (UUID) - Primary key
- shop_id (UUID) - Which shop rule applies to
- min_group_size (INT) - Minimum group size for this discount
- discount_percent (DECIMAL) - % discount
- description (VARCHAR) - e.g., "4+ people discount"
- is_active (BOOLEAN)
```

### group_booking_invites
```sql
- id (UUID) - Primary key
- group_booking_id (UUID) - Parent group
- group_member_id (UUID) - Target member
- recipient_email (VARCHAR) - Email to send to
- recipient_phone (VARCHAR) - Phone for SMS
- invite_token (VARCHAR) - Unique invite link token
- status - pending, sent, viewed, accepted, declined
- sent_at, responded_at (TIMESTAMP)
```

## API Endpoints

### Create Group Booking
```
POST /api/groups/create
Authorization: Bearer {token}

Request:
{
  "shopId": "uuid",
  "groupName": "Bachelor Party",
  "groupSize": 8,
  "notes": "Friday evening preferred"
}

Response:
{
  "success": true,
  "groupBooking": { ... }
}
```

### Get Group Details
```
GET /api/groups/{id}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "booking": { ... },
  "members": [ ... ]
}
```

### Update Group
```
PATCH /api/groups/{id}
Authorization: Bearer {token}

Request:
{
  "groupName": "New Name",
  "notes": "Updated notes"
}

Response:
{
  "success": true,
  "groupBooking": { ... }
}
```

### Add Member to Group
```
POST /api/groups/{id}/members
Authorization: Bearer {token}

Request:
{
  "customerId": "uuid",  // optional
  "barberId": "uuid",
  "slotTime": "2025-03-15T10:00:00Z",
  "serviceType": "Haircut",
  "servicePrice": 25,
  "guestName": "John Doe",  // optional
  "guestEmail": "john@example.com",  // optional
  "guestPhone": "+1234567890"  // optional
}

Response:
{
  "success": true,
  "member": { ... }
}
```

### Reassign Barber for Member
```
PATCH /api/groups/{id}/members/{memberId}
Authorization: Bearer {token}

Request:
{
  "barberId": "uuid",
  "slotTime": "2025-03-15T11:00:00Z"
}

Response:
{
  "success": true,
  "member": { ... }
}
```

### Remove Member from Group
```
DELETE /api/groups/{id}/members/{memberId}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Member removed from group"
}
```

### Confirm Group (Create Appointments)
```
POST /api/groups/{id}/confirm
Authorization: Bearer {token}

Request (optional):
{
  "memberIds": ["uuid1", "uuid2"]  // specific members, or all if not specified
}

Response:
{
  "success": true,
  "groupBooking": { ... }
}
```

### Cancel Group
```
POST /api/groups/{id}/cancel
Authorization: Bearer {token}

Request:
{
  "reason": "Customer requested cancellation"
}

Response:
{
  "success": true,
  "groupBooking": { ... }
}
```

### Get Customer's Groups
```
GET /api/groups/my-groups
Authorization: Bearer {token}

Response:
{
  "success": true,
  "groups": [ ... ]
}
```

### Create Payment Intent
```
POST /api/groups/{id}/payment
Authorization: Bearer {token}

Request:
{
  "amount": 225.50,
  "email": "organizer@example.com",
  "paymentMethodType": "card"  // optional
}

Response:
{
  "success": true,
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

### Get Discount Rules
```
GET /api/groups/discounts?shopId={shopId}

Response:
{
  "success": true,
  "discounts": [
    {
      "id": "uuid",
      "minGroupSize": 4,
      "discountPercent": 10,
      "description": "4+ people"
    },
    ...
  ]
}
```

### Set Discount Rule
```
POST /api/groups/discounts
Authorization: Bearer {token}

Request:
{
  "shopId": "uuid",
  "minGroupSize": 6,
  "discountPercent": 15,
  "description": "6+ people discount"
}

Response:
{
  "success": true,
  "discount": { ... }
}
```

## Usage Examples

### Customer Flow: Creating a Group Booking

1. **Create Group**
```javascript
const response = await fetch('/api/groups/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    shopId: 'shop-123',
    groupName: 'Bachelor Party',
    groupSize: 8,
    notes: 'Friday evening preferred'
  })
});

const { groupBooking } = await response.json();
const groupId = groupBooking.id;
```

2. **Add Members**
```javascript
// Add registered customer
await fetch(`/api/groups/${groupId}/members`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    customerId: 'customer-123',
    barberId: 'barber-1',
    slotTime: '2025-03-15T10:00:00Z',
    servicePrice: 25,
    serviceType: 'Haircut'
  })
});

// Add guest member
await fetch(`/api/groups/${groupId}/members`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    guestName: 'John Doe',
    guestEmail: 'john@example.com',
    guestPhone: '+1234567890',
    barberId: 'barber-2',
    slotTime: '2025-03-15T10:30:00Z',
    servicePrice: 25,
    serviceType: 'Haircut'
  })
});
```

3. **Check Pricing**
```javascript
const response = await fetch(`/api/groups/${groupId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { booking, members } = await response.json();

console.log(`Subtotal: $${booking.subtotalCost}`);
console.log(`Discount (${booking.discountPercent}%): -$${booking.discountAmount}`);
console.log(`Total: $${booking.totalCost}`);
// Output if 6+ members:
// Subtotal: $150.00
// Discount (15%): -$22.50
// Total: $127.50
```

4. **Confirm Group**
```javascript
const response = await fetch(`/api/groups/${groupId}/confirm`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});

const { groupBooking } = await response.json();
// Now appointments are created for all members
```

5. **Pay for Group**
```javascript
const response = await fetch(`/api/groups/${groupId}/payment`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    amount: groupBooking.totalCost,
    email: 'organizer@example.com'
  })
});

const { clientSecret } = await response.json();
// Use Stripe.js to complete payment with clientSecret
```

### Shop Admin Flow: Managing Groups

1. **View All Groups**
```javascript
const response = await fetch('/api/groups/my-shop?status=pending', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
```

2. **Set Discount Rules**
```javascript
await fetch('/api/groups/discounts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    shopId: 'shop-123',
    minGroupSize: 4,
    discountPercent: 10,
    description: '4+ people discount'
  })
});

await fetch('/api/groups/discounts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    shopId: 'shop-123',
    minGroupSize: 6,
    discountPercent: 15,
    description: '6+ people discount'
  })
});
```

## Pricing Logic

The system automatically applies the highest applicable discount based on group size:

```
Base prices (example):
- Haircut: $25 per person
- Beard trim: $15 per person
- Hair wash: $10 per person

Group with 6 members:
- Member 1: Haircut ($25)
- Member 2: Haircut ($25)
- Member 3: Haircut + Beard trim ($40)
- Member 4: Haircut ($25)
- Member 5: Beard trim ($15)
- Member 6: Haircut ($25)

Subtotal: $155
Discount (15% for 6+ people): -$23.25
Total: $131.75

Cost per person: ~$21.96 (vs $25.83 without discount)
```

## Discount Configuration

Each shop can configure custom discount tiers:

```sql
INSERT INTO group_booking_discounts (shop_id, min_group_size, discount_percent)
VALUES 
  ('shop-1', 4, 10),    -- 4+ people get 10%
  ('shop-1', 6, 15),    -- 6+ people get 15%
  ('shop-1', 10, 20);   -- 10+ people get 20%
```

## Member Status Lifecycle

```
pending → confirmed → completed
       ↘              ↗
         cancelled ←
```

- **pending**: Member added, not yet confirmed
- **confirmed**: Member confirmed, appointment created
- **completed**: Appointment completed
- **cancelled**: Member removed or group cancelled
- **no-show**: Member didn't show for appointment

## Group Status Lifecycle

```
pending → partial-confirmed → confirmed → completed
    ↘                                    ↗
       → cancelled ←
```

- **pending**: Group created, no confirmed members
- **partial-confirmed**: Some but not all members confirmed
- **confirmed**: All members confirmed
- **completed**: All appointments completed
- **cancelled**: Group cancelled

## Integration Points

### Existing Systems Used

1. **Appointments Table**
   - Appointments are created when group members are confirmed
   - Each member gets an individual appointment record

2. **Customers Table**
   - Registered customers can be added to groups
   - Guest members don't need customer records

3. **Barbers Table**
   - Conflict detection prevents double-booking
   - Multiple barbers can serve one group

4. **Stripe Integration**
   - Payment intents created for group totals
   - Payment status tracked separately

5. **Email Service (Resend)**
   - Group invites sent to members
   - Confirmation reminders

6. **SMS Service (Twilio)**
   - SMS invites for group members
   - Appointment reminders

## Error Handling

Common errors and solutions:

```javascript
// Group not found
{ error: "Group not found" } → 404

// Insufficient capacity
{ error: "Group is at capacity" } → 400

// Barber conflict
{ error: "Barber is not available at this time" } → 400

// Unauthorized
{ error: "Unauthorized - not group organizer" } → 403

// Invalid data
{ error: "Validation failed", details: {...} } → 400
```

## Testing

Run tests with:
```bash
npm test -- lib/group-booking-service.test.ts
```

Key test scenarios:
- Group creation validation (size constraints)
- Member management (add, remove)
- Discount calculation and tiers
- Barber conflict detection
- Group status transitions
- Payment processing
- Cancellation workflow

## Performance Considerations

1. **Indexes**: Proper indexing on:
   - shop_id (frequent filtering)
   - organizer_customer_id (user groups)
   - status (filtering by state)
   - barber_id and slot_time (conflict detection)

2. **Caching**: Consider caching:
   - Discount rules (per shop)
   - Available slots for barbers
   - Customer's groups

3. **Batch Operations**:
   - Bulk confirm members
   - Bulk cancel members
   - Recalculate costs once after changes

## Future Enhancements

1. **Partial Payments**: Allow organizer to collect deposits from members
2. **Waitlist**: Queue for groups that reach capacity
3. **Group Templates**: Save and reuse group configurations
4. **Analytics**: Track group booking metrics and trends
5. **Calendar Integration**: Sync confirmed bookings to external calendars
6. **Deposit System**: Require deposit before confirming group
7. **Auto-confirmation**: Automatically confirm when all members added
8. **Group Messaging**: Chat between organizer and members

## Support

For issues or questions about the group bookings system:
1. Check error messages and logs
2. Review database schema and constraints
3. Verify JWT token and permissions
4. Check if shop/barber/service exists
5. Ensure all required fields are provided
