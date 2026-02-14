# 24-Hour Appointment Reminders

## Overview

The barbershop booking system includes an automated reminder system that sends email notifications to customers 24 hours before their appointments. This helps reduce no-shows and improves customer engagement.

---

## How It Works

### 1. **Appointment Reminder Workflow**

Every hour, the system:
1. Queries appointments scheduled for ~24 hours from now (23.5-24.5 hour window)
2. Filters for **confirmed** appointments only
3. Excludes appointments that have already been reminded
4. Sends email notifications via Resend
5. Records the reminder in the audit table
6. Marks appointment with `reminder_sent_at` timestamp

### 2. **Key Tables**

**`appointments`**
- `reminder_sent_at` - TIMESTAMP (null until reminder is sent)
- `status` - Must be 'confirmed' to receive reminder
- `start_time` - Used to calculate 24-hour window

**`appointment_reminders`** (Audit Log)
- Tracks every reminder sent/failed
- Used for analytics and debugging
- Records customer email, timestamp, status

---

## Setup & Configuration

### Database

The reminder system requires these tables (auto-created):
```sql
-- In appointments table:
ALTER TABLE appointments ADD COLUMN reminder_sent_at TIMESTAMP;

-- In appointment_reminders table:
CREATE TABLE appointment_reminders (
  id UUID PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id),
  customer_email VARCHAR(255),
  sent_at TIMESTAMP,
  status VARCHAR(50), -- 'sent' or 'failed'
  error_message TEXT
);
```

### Email Setup

Reminders are sent using **Resend** (same as booking confirmations).

**Required environment variables:**
```bash
RESEND_API_KEY="re_..."
EMAIL_FROM="Dev@barbershopmvp.com"
```

---

## Usage

### Automatic (Cron Job) - Recommended

The system automatically runs every hour:
```
Schedule: 0 * * * * (hourly at XX:00)
Timezone: America/New_York
```

No manual intervention needed. Check logs to verify it's running.

### Manual Trigger

**Via API (requires admin token):**
```bash
curl -X POST http://localhost:3000/api/reminders/send \
  -H "Authorization: Bearer <admin_jwt_token>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Reminders sent: 3/5",
  "results": {
    "found": 5,
    "sent": 3,
    "failed": 2
  }
}
```

### Standalone Script

Run directly:
```bash
REMINDER_ADMIN_TOKEN=<token> node scripts/run-reminders.js
```

---

## How to Get Admin Token

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Create/login as admin via `/api/auth/login` or `/api/auth/signup`

3. Copy the returned `accessToken` from response

4. Set environment variable:
   ```bash
   export REMINDER_ADMIN_TOKEN="eyJhbGc..."
   ```

---

## Email Template

Customers receive an email like:

```
Subject: Reminder: Your appointment tomorrow at [TIME]

Hi [Customer Name],

This is a reminder that you have an appointment tomorrow at [TIME] with [Barber Name] at [Shop Name].

Service: [Service Type]

If you need to reschedule or cancel, please contact us.

Thanks!
```

---

## Troubleshooting

### Reminders not sending

**Check logs:**
```bash
docker logs -f barbershop-app  # Or your container/service logs
```

**Common issues:**
1. **Resend API key invalid** → Check `.env` file
2. **Email domain not verified** → Verify domain in Resend dashboard
3. **No appointments in 24-hour window** → That's normal, system runs hourly
4. **Payment not confirmed** → Reminders only send for confirmed appointments

### Verify cron is running

Check cron job status:
```bash
# Using OpenClaw cron tool:
cron list  # Shows all scheduled jobs

# Using system cron:
crontab -l  # Shows user cron jobs
```

### Test reminder manually

1. Create test appointment 25 hours in the future
2. Confirm the appointment (update status = 'confirmed')
3. Trigger reminder API or wait for hourly cron
4. Check customer's email

---

## Monitoring

### View sent reminders

```sql
SELECT * FROM appointment_reminders 
ORDER BY sent_at DESC 
LIMIT 20;
```

### Check failed reminders

```sql
SELECT * FROM appointment_reminders 
WHERE status = 'failed'
ORDER BY sent_at DESC;
```

### Appointments overdue for reminder

```sql
SELECT * FROM appointments 
WHERE status = 'confirmed'
  AND reminder_sent_at IS NULL
  AND start_time < NOW() + INTERVAL '24 hours'
ORDER BY start_time ASC;
```

---

## Future Enhancements

- [ ] SMS reminders as alternative to email
- [ ] Reminder time customization (12h, 24h, 48h)
- [ ] Multi-language email templates
- [ ] Reminder response tracking (click-through rates)
- [ ] Integration with calendar apps (Google, Outlook)
- [ ] Automatic rescheduling requests

---

## Performance

**Query Performance:**
- `idx_appointments_reminder_due` index optimizes lookup
- Queries typically complete in <100ms for thousands of appointments
- Scales to millions of appointments with proper indexing

**Email Delivery:**
- Batch processing: 10-20 reminders per second (via Resend)
- Failed reminders retried on next hourly run
- Audit trail for compliance and debugging

---

## Support

For issues or questions:
1. Check logs for specific error messages
2. Verify Resend API key and domain
3. Ensure database is running and accessible
4. Test reminder API manually to isolate issues
