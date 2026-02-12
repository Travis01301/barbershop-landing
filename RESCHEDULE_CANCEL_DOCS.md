# Reschedule & Cancel Feature Documentation

## 🎯 Overview

Customers can now reschedule or cancel their appointments through a secure link without needing to log in. The feature includes:

- **Cancel appointments** with optional reason
- **Reschedule to new date/time** with real-time availability
- **Time-based restrictions** (24-hour notice required)
- **Token-based security** (no login needed, secure links)
- **Management link** displayed in booking confirmation

---

## 📋 Feature Specifications

### Cancel Appointment
- ✅ Can cancel future appointments only
- ✅ Requires 24-hour notice (prevents last-minute cancellations)
- ✅ Records cancellation reason (optional)
- ✅ Updates appointment status to "cancelled"
- ✅ Prevents re-cancellation of already cancelled appointments

### Reschedule Appointment
- ✅ Can reschedule future appointments only
- ✅ Requires 24-hour notice before original appointment
- ✅ Shows real-time available slots (same barber, different date/time)
- ✅ Prevents rescheduling to already-booked slots
- ✅ Updates appointment to new date/time
- ✅ Automatically confirms rescheduled appointments

### Security
- ✅ Token-based access (no user login required)
- ✅ Tokens generated server-side and sent in confirmation
- ✅ Tokens validated on every action
- ✅ Prevents unauthorized access to other customers' appointments
- ✅ Works across devices (shareable link)

---

## 🔄 Data Flow

### Step 1: Booking Confirmation
```
Customer completes booking
        ↓
API generates management token (SHA256 hash)
        ↓
Token returned with appointment data
        ↓
Confirmation screen displays "Manage Appointment" button
        ↓
Link includes: /appointments/{id}?token={token}
```

### Step 2: Accessing Management Page
```
Customer clicks "Manage Appointment" link
        ↓
Page loads appointment details (public access, no login)
        ↓
Token validated against appointment ID + email
        ↓
Shows current appointment + action buttons
```

### Step 3: Cancel Flow
```
Customer clicks "Cancel" button
        ↓
Form appears with optional reason field
        ↓
Customer confirms cancellation
        ↓
PATCH /api/appointments/{id}/cancel
  - Validate token
  - Check if appointment is in future
  - Check 24-hour rule
  - Update status to "cancelled"
        ↓
Success message shown
        ↓
Page refreshes to show cancelled state
```

### Step 4: Reschedule Flow
```
Customer clicks "Reschedule" button
        ↓
Form shows: Date picker + Time slots
        ↓
Customer selects date
        ↓
API fetches available slots for that date
        ↓
Customer selects time
        ↓
PATCH /api/appointments/{id}/reschedule
  - Validate token
  - Check if original appointment is in future
  - Check 24-hour rule
  - Check if new time is available
  - Update appointment dates
        ↓
Success message shown
        ↓
Page refreshes with new appointment details
```

---

## 🔐 API Endpoints

### Get Appointment Details (with token)
```
GET /api/appointments/{id}/details?token={token}

Response:
{
  "success": true,
  "appointment": {
    "id": 123,
    "customer_name": "John",
    "customer_email": "john@example.com",
    "customer_phone": "555-1234",
    "start_time": "2024-02-15T10:00:00Z",
    "end_time": "2024-02-15T10:30:00Z",
    "status": "confirmed",
    "barber_id": 5,
    "barber_name": "Mike",
    "shop_id": 1,
    "shop_name": "Joe's Barbershop"
  }
}
```

### Cancel Appointment
```
PATCH /api/appointments/{id}/cancel

Request Body:
{
  "token": "hash...",
  "reason": "Something came up" (optional)
}

Response (Success):
{
  "success": true,
  "message": "Appointment cancelled successfully",
  "appointment": { ...updated appointment... }
}

Response (Errors):
- 401: Invalid token
- 400: Appointment already cancelled
- 400: Cannot cancel past appointments
- 400: Cannot reschedule within 24 hours
```

### Reschedule Appointment
```
PATCH /api/appointments/{id}/reschedule

Request Body:
{
  "token": "hash...",
  "newDate": "2024-02-20",
  "newTime": "02:00 PM" (or "14:00" 24-hour format)
}

Response (Success):
{
  "success": true,
  "message": "Appointment rescheduled successfully",
  "appointment": { ...updated appointment... }
}

Response (Errors):
- 401: Invalid token
- 400: Cannot reschedule cancelled appointments
- 400: Cannot reschedule past appointments
- 400: Cannot reschedule within 24 hours
- 400: Cannot schedule in the past
- 400: Time slot already booked
```

---

## 📄 Database Schema Changes

### Appointments Table
Existing fields used:
- `id` - Appointment ID
- `customer_id` - Link to customer profile
- `customer_email` - For token generation
- `barber_id` - For availability checking
- `shop_id` - For availability checking
- `start_time` - Appointment start (UTC)
- `end_time` - Appointment end (UTC)
- `status` - "confirmed" or "cancelled"
- `updated_at` - TIMESTAMP (auto-updated)

No new columns needed, existing structure is sufficient.

---

## 🔧 Implementation Details

### Token Generation (Server-Side)
```typescript
function generateManagementToken(appointmentId: number, email: string): string {
  const data = `${appointmentId}:${email}:${process.env.TOKEN_SECRET || 'secret'}`
  return crypto.createHash('sha256').update(data).digest('hex')
}
```

### Token Validation
```typescript
const appointmentResult = await pool.query(
  `SELECT * FROM appointments WHERE id = $1`,
  [id]
)

const apt = appointmentResult.rows[0]
const expectedToken = generateManagementToken(apt.id, apt.customer_email)

if (token !== expectedToken) {
  return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
}
```

### 24-Hour Notice Validation
```typescript
const hoursUntil = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)
if (hoursUntil < 24) {
  return NextResponse.json(
    { error: 'Cannot reschedule within 24 hours of appointment' },
    { status: 400 }
  )
}
```

### Time Slot Conflict Detection
```typescript
const conflictResult = await pool.query(
  `SELECT COUNT(*) as conflict_count FROM appointments
   WHERE barber_id = $1
   AND shop_id = $2
   AND id != $3
   AND status != 'cancelled'
   AND start_time < $5
   AND end_time > $4`,
  [barber_id, shop_id, appointment_id, newStartTime, newEndTime]
)
```

---

## 📱 User Interface

### Confirmation Screen
After booking, shows:
- ✓ "Booking Confirmed!" header
- 📋 Appointment details (date, time, barber, location)
- 📅 Calendar sync buttons (Google Calendar, iCal download)
- 🔗 "Manage Appointment" button (with token in URL)
- 📧 Confirmation email notice

### Management Page
Shows:
- Full appointment details (read-only)
- Customer information (read-only)
- Three modes:
  1. **View Mode**: Shows details + action buttons
  2. **Reschedule Mode**: Date picker + time slots
  3. **Cancel Mode**: Confirmation + optional reason field

### States
- **Normal appointment**: Full reschedule/cancel options
- **Within 24 hours**: "Cannot modify within 24 hours" message
- **Past appointment**: "This appointment is completed" message
- **Cancelled appointment**: "This appointment was cancelled" message

---

## 🧪 Testing Scenarios

### Scenario 1: Cancel an Upcoming Appointment
1. Complete a booking
2. Click "Manage Appointment"
3. Click "Cancel" button
4. Enter optional reason
5. Confirm cancellation
6. ✅ Status changes to "Cancelled"
7. ✅ No reschedule/cancel buttons shown anymore

### Scenario 2: Reschedule to Different Date
1. Complete a booking (for date X)
2. Click "Manage Appointment"
3. Click "Reschedule" button
4. Select new date (date Y, 5+ days away)
5. Wait for slots to load
6. Select an available time
7. Confirm reschedule
8. ✅ Appointment moves to new date/time
9. ✅ Slot on old date is freed up

### Scenario 3: Cannot Modify Within 24 Hours
1. Complete a booking for tomorrow at 10 AM
2. Try to access manage page (< 24 hours before)
3. ✅ Buttons are disabled
4. ✅ Message shows: "Cannot modify within 24 hours"

### Scenario 4: Invalid Token
1. User tries to access: `/appointments/123?token=invalid`
2. ✅ Shows error: "Invalid access link"
3. ✅ Directs to contact barbershop

### Scenario 5: Past Appointment
1. Complete a booking for yesterday
2. Click "Manage Appointment"
3. ✅ Shows: "This appointment is completed"
4. ✅ No modification options

---

## 📧 Email Integration (Future)

When cancelling or rescheduling, consider sending emails:

**On Cancel:**
```
Subject: Your appointment at {shop_name} has been cancelled
- Cancelled appointment details
- Option to rebook
- Shop contact info
```

**On Reschedule:**
```
Subject: Your appointment has been rescheduled
- Old appointment date/time (cancelled)
- New appointment date/time (confirmed)
- Calendar sync links
- Option to manage again
```

---

## 🔒 Security Considerations

1. **Token Expiration**: (Optional) Add expiration time to tokens
   ```typescript
   // Token includes timestamp
   const data = `${appointmentId}:${email}:${timestamp}:${secret}`
   // Validate timestamp hasn't expired (30 days?)
   ```

2. **Rate Limiting**: Add rate limiting to prevent brute force
   ```typescript
   // Limit reschedule/cancel attempts per hour per appointment
   ```

3. **Audit Trail**: (Optional) Log all changes
   ```typescript
   // Insert into audit_log table on cancel/reschedule
   ```

4. **Customer Verification**: (Optional) Send confirmation email before processing
   ```typescript
   // Send "Confirm your reschedule" email with one-time link
   ```

---

## 📊 Database Queries Reference

### Check appointment conflicts
```sql
SELECT COUNT(*) FROM appointments
WHERE barber_id = $1 AND shop_id = $2 AND id != $3
AND status != 'cancelled'
AND start_time < $4 AND end_time > $5;
```

### Cancel appointment
```sql
UPDATE appointments 
SET status = 'cancelled', updated_at = NOW(), notes = $1
WHERE id = $2
RETURNING *;
```

### Reschedule appointment
```sql
UPDATE appointments 
SET start_time = $1, end_time = $2, status = 'confirmed', updated_at = NOW()
WHERE id = $3
RETURNING *;
```

---

## 🚀 Environment Variables Needed

Add to `.env.local` (if using):
```
TOKEN_SECRET=your-secret-key-change-in-production
```

---

## ✅ Checklist for Deployment

- [ ] Test all 5 scenarios above
- [ ] Verify token generation is consistent
- [ ] Test cancellation logic (24-hour rule)
- [ ] Test rescheduling with conflicts
- [ ] Test with different browsers/devices
- [ ] Check mobile responsiveness
- [ ] Verify error messages are clear
- [ ] Test accessibility (keyboard navigation)
- [ ] Performance test with many slots
- [ ] Security review of token generation
- [ ] Update customer-facing help docs
- [ ] Brief barbers on new feature

---

## 📚 Files Modified/Created

**Created:**
- `app/api/appointments/[id]/details/route.ts` - Get appointment with token
- `app/api/appointments/[id]/cancel/route.ts` - Cancel appointment
- `app/api/appointments/[id]/reschedule/route.ts` - Reschedule appointment
- `app/api/appointments/token/route.ts` - Generate token
- `app/appointments/[id]/page.tsx` - Management page (UI)

**Modified:**
- `app/api/book/route.ts` - Generate token on booking
- `app/book/[slug]/BookingForm.tsx` - Show manage link in confirmation

---

*Last Updated: February 8, 2026*
*Feature: Reschedule & Cancel Bookings*
