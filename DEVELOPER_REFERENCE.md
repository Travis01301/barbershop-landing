# Calendar Sync Features - Developer Reference

## 🚀 Quick Start

After pulling the changes, no additional installation is needed. All features use existing dependencies.

## 📊 Data Flow Diagrams

### Real-Time Slot Availability
```
User selects Barber + Date
          ↓
BookingForm triggers fetchAvailableSlots()
          ↓
GET /api/available-slots?shopId=X&barberId=Y&date=YYYY-MM-DD
          ↓
API queries:
  1. barber_schedules (get working hours for day)
  2. appointments (get existing bookings)
          ↓
Calculate 30-min slots, exclude conflicts
          ↓
Return { availableSlots: [{startTime, endTime}, ...] }
          ↓
BookingForm converts to local time display
          ↓
User selects from available times
```

### Calendar Export
```
User clicks "Download" or "Add to Google Calendar"
          ↓
If Google Calendar:
  → getGoogleCalendarLink() generates URL
  → Open https://calendar.google.com/calendar/render?...
  
If Download:
  → getiCalData() generates iCal format
  → Create Blob and trigger download
          ↓
Calendar app receives appointment data (compatible with all major apps)
```

### Public Calendar Feed
```
Calendar app subscribes to: /api/shops/{slug}/calendar
          ↓
API queries confirmed appointments (next 90 days)
          ↓
Returns iCal format with all appointments
          ↓
Calendar app syncs every 1 hour (cache-control header)
          ↓
User sees barbershop availability in their calendar
```

## 🔧 Key Functions

### BookingForm Component
```typescript
// Fetch available slots for selected barber + date
fetchAvailableSlots(): void

// Generate Google Calendar URL
getGoogleCalendarLink(): string

// Generate iCal (.ics) content
getiCalData(): string

// Handle form submission (prevents submission without time selected)
handleSubmit(e: FormEvent): Promise<void>
```

### API Endpoints

#### GET `/api/available-slots`
**Query Params:**
- `shopId` - Shop ID
- `barberId` - Barber ID  
- `date` - Date in YYYY-MM-DD format

**Response:**
```json
{
  "success": true,
  "availableSlots": [
    {
      "startTime": "2024-02-15T09:00:00.000Z",
      "endTime": "2024-02-15T09:30:00.000Z"
    }
  ]
}
```

#### GET `/api/appointments/{id}/ical`
**Response:**
- Content-Type: `text/calendar`
- Downloads as `.ics` file
- Complete iCal format with all event details

#### GET `/api/shops/{slug}/calendar`
**Response:**
- Content-Type: `text/calendar`
- iCal format with all confirmed appointments
- 90-day view
- Cacheable (1 hour)

## 🗄️ Database Queries Used

### Available Slots API
```sql
-- Get barber schedule for specific day
SELECT is_working, start_time, end_time FROM barber_schedules
WHERE barber_id = $1 AND day_of_week = $2

-- Get existing appointments
SELECT start_time, end_time FROM appointments
WHERE barber_id = $1 AND DATE(start_time) = $2 AND shop_id = $3
```

### iCal Appointment API
```sql
-- Get single appointment with barber/shop info
SELECT a.*, s.name as shop_name, u.name as barber_name
FROM appointments a
JOIN shops s ON a.shop_id = s.id
LEFT JOIN users u ON a.barber_id = u.id
WHERE a.id = $1
```

### Public Calendar API
```sql
-- Get shop appointments for next 90 days
SELECT a.*, u.name as barber_name
FROM appointments a
LEFT JOIN users u ON a.barber_id = u.id
WHERE a.shop_id = $1
AND a.status = 'confirmed'
AND a.start_time >= NOW()
AND a.start_time <= NOW() + INTERVAL '90 days'
ORDER BY a.start_time ASC
```

## 🎨 iCal Format Specifications

### Single Appointment (.ics)
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Barbershop Booking//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:{appointment-id}@barbershop
DTSTAMP:timestamp
DTSTART:start-time-utc
DTEND:end-time-utc
SUMMARY:Appointment at {shop-name}
DESCRIPTION:{barber, customer, notes}
LOCATION:{shop-name}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
```

### Public Calendar Feed
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Barbershop Booking//{shop-name}//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:{shop-name}
X-WR-TIMEZONE:UTC
X-WR-CALDESC:Appointments at {shop-name}
BEGIN:VEVENT (multiple events)
...
END:VEVENT
END:VCALENDAR
```

## ⏰ Time Handling

All times are stored in **UTC** in the database:
- `appointment.start_time` → UTC
- `appointment.end_time` → UTC

Client-side display:
- Converted to user's local timezone via `toLocaleTimeString()`
- Google Calendar handles timezone automatically
- iCal files use UTC stamps for compatibility

## 🐛 Debugging Tips

### Check slot availability:
```bash
curl "http://localhost:3000/api/available-slots?shopId=1&barberId=1&date=2024-02-15"
```

### Test iCal generation:
```bash
curl "http://localhost:3000/api/appointments/1/ical" > appointment.ics
open appointment.ics
```

### Test public calendar:
```bash
curl "http://localhost:3000/api/shops/my-barbershop/calendar" > shop.ics
```

### Common issues:
1. **No slots showing** → Check barber_schedules table (day_of_week must match)
2. **Wrong times** → Verify timezone in database (should be stored in UTC)
3. **Google Calendar not opening** → Check URL encoding in params
4. **.ics won't import** → Validate iCal format (check newlines/spacing)

## 📚 Useful Links

- [iCal/iCS Specification](https://tools.ietf.org/html/rfc5545)
- [Google Calendar API](https://developers.google.com/calendar)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [PostgreSQL Date Functions](https://www.postgresql.org/docs/current/functions-datetime.html)
