# Group Bookings Admin Guide

## Overview

This guide helps barbershop owners and managers configure and manage the Group Bookings system.

## Setup & Configuration

### 1. Enable Group Bookings

Add to your environment:
```env
GROUP_BOOKINGS_ENABLED=true
STRIPE_SECRET_KEY=your_stripe_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
RESEND_API_KEY=your_resend_key
```

### 2. Configure Discount Tiers

Access the admin panel and set discount rules for your shop:

```
Shop Settings → Group Bookings → Discount Tiers

Default Recommended:
- 4+ people: 10% discount
- 6+ people: 15% discount
- 10+ people: 20% discount
```

**API Configuration**:
```bash
curl -X POST https://yourapi.com/api/groups/discounts \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "your-shop-id",
    "minGroupSize": 4,
    "discountPercent": 10,
    "description": "4+ people discount"
  }'
```

### 3. Database Migration

Run the migration to create tables:
```bash
psql -U user -d barbershop_booking < db/migrations/011_group_bookings.sql
```

## Managing Groups

### View All Groups

Dashboard → Groups

Filter by:
- Status (pending, partial-confirmed, confirmed, completed, cancelled)
- Date range
- Shop location
- Organizer

### Check Group Details

Click on a group to see:
- Organizer info
- All members and their assignments
- Barber assignments
- Service costs and discount
- Payment status
- Appointment status

### Edit Group Information

Groups → [Group ID] → Edit

Can modify:
- Group name
- Notes
- Description

**Cannot modify:**
- Group size (fixed at creation)
- Members count (adjust by removing members)

### Member Management

#### Assign Barbers

For pending members:
1. Click member
2. Select "Assign Barber"
3. Choose barber and time slot
4. System checks for conflicts
5. Confirm assignment

#### Reassign Barber

If customer requests a different barber:
1. Find member in group
2. Click "Change Barber"
3. Select new barber and time
4. Save (appointments auto-update)

#### Remove Member

1. Find member in group list
2. Click "Remove"
3. Confirm removal
4. Pricing automatically recalculated

**Note**: Removing a member may affect the discount tier!

### Confirming Groups

#### Manual Confirmation

When all members have barbers assigned:
1. Click "Confirm Group"
2. Review all assignments
3. Click "Create Appointments"
4. System creates appointments for all members

#### Auto-confirmation (if enabled)

Configure in settings to automatically create appointments when:
- All members have barbers assigned
- All slot times are confirmed

### Handling Group Payments

#### Payment Status Tracking

Groups Dashboard → [Group ID] → Payment Tab

Track:
- Total amount due
- Amount paid
- Payment method
- Payment date
- Stripe transaction ID

#### Process Refunds

If group is cancelled:
1. Navigate to group
2. Click "Refund"
3. Choose refund type:
   - **Full**: 100% refund
   - **Partial**: 50% (cancellation fee)
   - **None**: Keep payment
4. Confirm and process

#### Manual Payment Entry

For cash/check payments:
1. Group → Payment Tab
2. Click "Record Payment"
3. Enter amount and date
4. Save

### Cancellation Management

#### Cancel Individual Member

1. Member List → [Member]
2. Click "Cancel Membership"
3. Choose reason
4. Confirm (pricing updated)

#### Cancel Entire Group

1. Group View → "Cancel Group"
2. Choose cancellation reason:
   - Customer requested
   - Staff error
   - Barber unavailable
   - Other
3. Select refund type
4. Confirm
5. System automatically:
   - Cancels all member appointments
   - Processes refunds
   - Sends cancellation notification

### Rescheduling

If group needs to move to different times:

1. Group → "Reschedule"
2. Choose new date/time
3. System checks availability for all barbers
4. If available, updates all assignments
5. Sends new appointment confirmations

## Communication & Notifications

### SMS/Email Management

#### Send Group Invite

Manually send to specific member:
1. Member List → [Member]
2. Click "Send Invite"
3. Choose SMS, Email, or Both
4. Confirm

#### Send Reminder

All members or specific members:
1. Group → "Send Reminder"
2. Choose message type:
   - Appointment reminder (24h before)
   - Same-day reminder
   - Custom message
3. Confirm send

#### View Communication History

Group → Communications Tab

See all sent:
- Invites (status: sent, viewed, accepted, declined)
- Reminders
- Cancellation notices
- Payment receipts

### Customize Message Templates

Settings → Notifications → Group Booking Templates

Configure:
- Invite message
- Reminder message
- Confirmation message
- Cancellation message
- Payment receipt

Variables available:
- {groupName}
- {memberName}
- {slotTime}
- {totalCost}
- {discount}
- {barberName}
- {shopName}
- {inviteLink}

## Reporting & Analytics

### Group Statistics

Dashboard → Analytics → Groups

Metrics:
- Total group bookings
- Average group size
- Discount usage rate
- Revenue from groups
- Cancellation rate
- Member confirmation rate

### Export Data

Groups → Export

Export options:
- CSV
- PDF
- JSON

Fields:
- Group info (name, size, status)
- Members and assignments
- Pricing and discounts
- Payment information
- Dates and times

### Custom Reports

Create reports for:
- Groups by date range
- Groups by discount tier used
- Barber utilization (groups vs individual)
- Revenue impact of discounts
- Most popular group sizes
- Cancellation reasons

## Troubleshooting

### Common Issues

#### "Barber is not available"

Solution:
- Check barber's schedule for conflicts
- Try different time slot
- Assign different barber
- Confirm existing appointments don't overlap

#### "Group is at capacity"

Solution:
- Check group size vs members
- Increase group size (if editing during setup)
- Remove members to make room
- Create new group if needed

#### "Member has no barber assigned"

Solution:
- Before confirming group, assign barbers to all members
- Check filter isn't hiding members
- Remove members without barbers or assign them

#### Payment failed

Solution:
- Check Stripe configuration
- Verify customer payment method
- Try different payment method
- Process refund and retry

#### SMS/Email not sending

Solution:
- Check Twilio/Resend credentials
- Verify phone numbers/emails are valid
- Check system logs for errors
- Manually send message to troubleshoot

### Contact Support

Issues not covered above:
1. Check system logs
2. Verify all configuration is correct
3. Contact support with:
   - Error message
   - Group ID
   - Steps to reproduce
   - Logs

## Best Practices

### Setup

1. **Configure discounts** before promoting group bookings
2. **Test with small group** first
3. **Brief staff** on new group booking process
4. **Set clear policies** on modifications

### Pricing

1. **Review discount impact** on revenue
2. **Consider minimum service prices**
3. **Monitor cancellation refunds**
4. **Track group vs individual booking revenue**

### Operations

1. **Assign barbers early** to catch conflicts
2. **Send reminders** 24h and 1h before
3. **Confirm payment** before group date
4. **Keep notes** on custom requests
5. **Follow up** after group appointment

### Communication

1. **Be responsive** to organizer changes
2. **Proactive problem-solving** for conflicts
3. **Clear refund policy** stated upfront
4. **Track communications** for disputes

### Quality

1. **Monitor member experience** (reviews)
2. **Track no-shows** by group vs individual
3. **Solicit feedback** from organizers
4. **Continuous improvement** based on data

## Performance Optimization

### Database Optimization

Ensure indexes exist:
```sql
CREATE INDEX idx_group_bookings_shop_id ON group_bookings(shop_id);
CREATE INDEX idx_group_bookings_status ON group_bookings(status);
CREATE INDEX idx_group_booking_members_barber_id ON group_booking_members(barber_id);
CREATE INDEX idx_group_booking_members_slot_time ON group_booking_members(slot_time);
```

### Batch Operations

For large groups:
1. Add members in bulk via import
2. Assign barbers in batch
3. Confirm all at once
4. Reduces API calls

### Caching

Recommended caches:
- Discount rules (per shop)
- Barber availability (updated hourly)
- Group templates (if using)

## Compliance & Policies

### Cancellation Policy

Example policy:
- Free cancellation up to 48 hours before
- 50% refund 24-48 hours before
- No refund within 24 hours
- Full refund for shop cancellations

### Data Privacy

Ensure compliance:
- Don't share group details without consent
- GDPR: Delete data on request
- PCI: Don't store credit cards
- Secure phone/email data

### Group Size Limits

Configure based on:
- Shop capacity
- Barber availability
- Typical group bookings

## Advanced Features

### Group Templates

Save common group types:
- Bachelor party (Friday night, 8 people)
- Family gathering (weekend, 6 people)
- Corporate event (weekday lunch, 12 people)

Quickly create groups from templates.

### Group Scheduling

Set group availability rules:
- Specific days for groups
- Minimum advance booking
- Blackout dates
- Group-only time slots

### Deposit System

Collect deposits before confirming:
- Require 25-50% deposit
- Apply to final payment
- Track deposit status

## Reporting Examples

### Monthly Report

```
November 2024 Group Bookings:
- Total groups: 12
- Total members: 72
- Avg group size: 6 people
- Revenue: $1,850
- Discounts given: $280 (15%)
- Cancellations: 2
- Avg satisfaction: 4.8/5
```

### Barber Utilization

```
Group Bookings vs Individual Appointments:
- Groups: 72 appointments (20%)
- Individual: 288 appointments (80%)
- Group bookings higher satisfaction: +0.5 stars
- Group cancellation rate: 16% vs 8% individual
```

## Conclusion

The Group Bookings system provides:
- Increased revenue per appointment
- Higher customer satisfaction
- Better barber utilization
- Easier management with automation

Success requires:
- Proper configuration
- Clear communication
- Staff training
- Continuous optimization
