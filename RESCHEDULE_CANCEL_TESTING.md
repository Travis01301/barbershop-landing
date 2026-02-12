# Testing Checklist - Reschedule & Cancel Feature

## ✅ Pre-Test Setup

- [ ] Database is updated with appointments table
- [ ] Appointments have proper timestamps (UTC)
- [ ] At least 5 test appointments created (various dates/times)
- [ ] At least 2 appointments within next 2 weeks
- [ ] Dev server running: `npm run dev`
- [ ] Test routes accessible: `/book/{slug}` and `/appointments/{id}`

---

## 🧪 Test Suite 1: Basic Cancellation

### Test 1.1: Cancel a Future Appointment
```
Setup: Create booking for 5+ days from now
 1. [ ] Complete booking and get confirmation page
 2. [ ] Click "Manage Appointment" button
 3. [ ] Verify appointment details display correctly
 4. [ ] Click "Cancel" button (red button)
 5. [ ] Modal/form appears asking for confirmation
 6. [ ] Leave reason blank and click "Confirm Cancellation"
 Expected: 
  - Success message appears
  - Page refreshes
  - Status shows "Cancelled" (red text)
  - Cancel/Reschedule buttons disappear
```

### Test 1.2: Cancel with Reason
```
Setup: Previous test
 1. [ ] Click "Cancel" again (or repeat Test 1.1)
 2. [ ] Fill in reason: "Schedule conflict"
 3. [ ] Click "Confirm Cancellation"
 Expected:
  - Cancellation recorded with reason
  - Reason visible in admin dashboard (if implemented)
```

### Test 1.3: Cannot Cancel Within 24 Hours
```
Setup: Create booking for tomorrow at 10 AM
 1. [ ] Complete booking
 2. [ ] Click "Manage Appointment"
 3. [ ] Verify "Cancel" button is disabled or grayed out
 4. [ ] Hover over button to see message (if present)
 Expected:
  - Button is disabled/grayed out
  - Message: "Cannot modify within 24 hours"
  - Form cannot be submitted
```

### Test 1.4: Cannot Cancel Within 24 Hours (Specific Error)
```
Setup: Using browser DevTools
 1. [ ] Try to manually call PATCH /api/appointments/1/cancel
 2. [ ] Include token from URL
 3. [ ] Include test booking < 24 hours away
 Expected:
  - Returns 400 status
  - Error message about 24-hour rule
  - Appointment still confirmed (not cancelled)
```

### Test 1.5: Cannot Re-cancel Cancelled Appointment
```
Setup: Previous cancelled appointment
 1. [ ] Access management page for cancelled appointment
 2. [ ] Verify no Cancel button shown
 3. [ ] Try to manually call cancel API
 Expected:
  - Error: "Appointment already cancelled"
  - Status remains "cancelled"
```

---

## 🧪 Test Suite 2: Basic Rescheduling

### Test 2.1: Reschedule to Different Date & Time
```
Setup: Create booking for July 15 at 2 PM, today is July 5
 1. [ ] Complete booking
 2. [ ] Click "Manage Appointment"
 3. [ ] Click "Reschedule" button (blue button)
 4. [ ] Date picker appears, pre-filled with next day
 5. [ ] Select different date (July 20)
 6. [ ] Wait for "Loading available times..."
 7. [ ] Verify slots appear (should be different from original)
 8. [ ] Click a time slot (e.g., 3:00 PM)
 9. [ ] Verify slot is highlighted
 10. [ ] Click "Confirm Reschedule"
 Expected:
  - Success message appears
  - Page refreshes
  - New time shown: "Thursday, July 20, 2024" - "3:00 PM"
  - Old time no longer shown
```

### Test 2.2: Reschedule Releases Original Slot
```
Setup: Previous rescheduled appointment
 1. [ ] Create NEW booking for the original date/time (July 15, 2 PM)
 2. [ ] Verify it can be booked (slot is free)
 Expected:
  - Original slot is now available for others
  - No conflict error when booking
```

### Test 2.3: Show Only Available Slots
```
Setup: Appointment on July 15, 5 test appointments scheduled for July 20
 Booked slots on July 20: 9:00 AM, 9:30 AM, 2:00 PM, 2:30 PM
 1. [ ] Start rescheduling to July 20
 2. [ ] Wait for slots to load
 3. [ ] Verify these times are NOT shown: 9:00, 9:30, 2:00, 2:30
 4. [ ] Verify open times ARE shown: 10:00, 10:30, 11:00, etc.
 Expected:
  - Conflict times are filtered out
  - Only truly available times shown
```

### Test 2.4: Cannot Reschedule Within 24 Hours
```
Setup: Create booking for tomorrow at 2 PM
 1. [ ] Access management page
 2. [ ] Verify "Reschedule" button is disabled/grayed
 3. [ ] Message shows 24-hour rule
 Expected:
  - Button disabled
  - Cannot submit reschedule
```

### Test 2.5: Cannot Reschedule to Already-Booked Time
```
Setup: 
 - Appointment A: July 15, 2:00 PM (with Mike)
 - Appointment B: July 20, 10:00 AM (with Mike)
 1. [ ] Start rescheduling Appointment A to July 20
 2. [ ] Verify 10:00 AM is NOT available (grayed out or missing)
 3. [ ] Try to manually submit reschedule to 10:00 AM (API call)
 Expected:
  - Slot not shown in UI
  - API returns 400 error: "Time slot already booked"
  - Appointment A still on July 15
```

### Test 2.6: Cannot Reschedule to Past Date
```
Setup: Any upcoming appointment
 1. [ ] Start rescheduling
 2. [ ] Try to select yesterday's date in date picker
 3. [ ] Try to select today's date
 Expected:
  - Past dates are grayed out/disabled
  - Cannot select them
```

### Test 2.7: Cannot Reschedule Past Appointment
```
Setup: Create booking for yesterday
 1. [ ] Access management page
 2. [ ] Verify no Reschedule button shown
 3. [ ] Message shows appointment is completed
 Expected:
  - Button hidden
  - Cannot modify past appointment
```

---

## 🧪 Test Suite 3: Token & Security

### Test 3.1: Token Validation
```
Using browser DevTools or curl:
 1. [ ] Complete booking, copy token from URL
 2. [ ] Call GET /api/appointments/{id}/details?token=VALID_TOKEN
 3. [ ] Verify returns appointment data
 Expected:
  - Success response with appointment details
```

### Test 3.2: Invalid Token Rejected
```
Using curl:
 1. [ ] Call GET /api/appointments/{id}/details?token=invalid123
 Expected:
  - 401 Unauthorized
  - Error message
  - No appointment data returned
```

### Test 3.3: Modified Token Rejected
```
Using curl:
 1. [ ] Take valid token, change last character
 2. [ ] Call API with modified token
 Expected:
  - 401 Unauthorized
  - Rejection (token hash doesn't match)
```

### Test 3.4: Token Works Across Devices
```
Setup: Complete booking on Device A, get token
 1. [ ] Copy URL to Device B (phone, tablet, etc.)
 2. [ ] Paste URL in different browser
 3. [ ] Verify management page loads
 4. [ ] Verify appointment details show
 Expected:
  - Token works without re-authentication
  - Works across different browsers/devices
```

### Test 3.5: Wrong Appointment ID with Right Token
```
Using curl:
 1. [ ] Get token for appointment ID 5
 2. [ ] Try to access appointment ID 8 with token from ID 5
 3. [ ] Call: /api/appointments/8/details?token=TOKEN_FROM_5
 Expected:
  - 401 Unauthorized
  - Token doesn't match appointment ID
```

### Test 3.6: Token Time-Invariance
```
Setup: Complete booking, copy URL
 1. [ ] Access management page immediately
 2. [ ] Wait 1 hour
 3. [ ] Use same link again
 Expected:
  - Token still works (no expiration, if baseline)
  - Appointment still accessible
```

---

## 🧪 Test Suite 4: UI/UX

### Test 4.1: Appointment Details Display
```
Setup: Any upcoming appointment
 1. [ ] Access management page
 2. [ ] Verify all details shown:
    - [ ] Date displayed correctly
    - [ ] Time displayed in 12-hour format
    - [ ] Barber name shown
    - [ ] Location (shop name) shown
    - [ ] Customer name shown
    - [ ] Status shown ("Confirmed" or "Cancelled")
 Expected:
  - All fields populated
  - Dates/times match booking
```

### Test 4.2: Mode Switching Works
```
Setup: Management page open
 1. [ ] Start in View mode
 2. [ ] Click "Cancel" → switches to Cancel mode
 3. [ ] Click "Cancel" button in modal → stays in Cancel mode
 4. [ ] Click "Keep Appointment" → back to View mode
 5. [ ] Click "Reschedule" → switches to Reschedule mode
 6. [ ] Change date → slots load
 7. [ ] Click "Cancel" button → back to View mode
 Expected:
  - Mode switching is smooth
  - Data persists appropriately
  - Buttons appear/disappear based on mode
```

### Test 4.3: Error Messages are Clear
```
Setup: Various error scenarios
 1. [ ] Invalid token → Shows: "Invalid access link"
 2. [ ] 24-hour rule violation → "Cannot reschedule within 24 hours"
 3. [ ] Time slot taken → "Time slot is already booked"
 4. [ ] Cancelled appointment → "Cannot reschedule cancelled appointment"
 Expected:
  - Error messages are user-friendly
  - Messages suggest solutions
  - No technical jargon
```

### Test 4.4: Success Messages Appear
```
Setup: Cancel or reschedule successfully
 1. [ ] After action, check for success message
 2. [ ] Verify message is green and visible
 3. [ ] Message disappears after 3-5 seconds (if auto-dismiss)
 Expected:
  - Clear confirmation of success
  - Page updates to reflect change
```

### Test 4.5: Loading States
```
Setup: Management page with slow network
 1. [ ] Open DevTools → Network tab → Slow 3G
 2. [ ] Click reschedule date
 3. [ ] Verify "Loading available times..." appears
 4. [ ] Wait for slots to load
 Expected:
  - Loading state visible
  - No duplicate requests sent
  - Slots appear when ready
```

### Test 4.6: Responsive Design Mobile
```
Setup: Management page on mobile device/viewport
 1. [ ] Resize to mobile (375px width)
 2. [ ] Verify layout adapts
 3. [ ] Buttons stack vertically if needed
 4. [ ] Time slots grid works on small screen
 5. [ ] Text is readable (no overflow)
 Expected:
  - Works on mobile
  - Buttons clickable
  - No horizontal scroll
```

---

## 🧪 Test Suite 5: Slot Availability

### Test 5.1: Slots Load Correctly
```
Setup: Appointment for barber with known schedule
 Barber Mike works: 9 AM - 5 PM, 30-min slots
 1. [ ] Reschedule to date Mike works
 2. [ ] Verify time slots appear
 3. [ ] Count slots (should be ~16 for 8 hour day)
 4. [ ] Verify times are 30-min increments
 Expected:
  - Correct number of slots
  - Proper spacing (9:00, 9:30, 10:00, etc.)
  - No gaps or duplicates
```

### Test 5.2: Barber Off Days Have No Slots
```
Setup: Barber doesn't work on Sundays
 1. [ ] Try to reschedule to a Sunday
 2. [ ] Wait for slots to load
 3. [ ] Verify message: "No available times for this date"
 Expected:
  - No slots shown
  - Clear message
```

### Test 5.3: Fully Booked Day
```
Setup: Fill entire day with appointments (9:00 AM - 4:30 PM)
 1. [ ] 16 appointments, each 30 min, no gaps
 2. [ ] Try to reschedule to that day
 3. [ ] Verify message: "No available times for this date"
 Expected:
  - No slots available
  - Clear message
```

### Test 5.4: Partially Booked Day
```
Setup: Appointments at: 9:00, 9:30, 2:00, 2:30
 Available: 10:00, 10:30, 11:00, 11:30, 12:00, 1:00, 1:30, 3:00, 3:30, 4:00, 4:30
 1. [ ] Reschedule to that day
 2. [ ] Verify available slots shown
 3. [ ] Verify booked slots NOT shown
 Expected:
  - 11 available slots shown
  - 4 booked slots hidden
```

---

## 🧪 Test Suite 6: Edge Cases

### Test 6.1: Multiple Barbers Selection
```
Setup: Appointment with Barber A
 1. [ ] Reschedule to date both A and B work
 2. [ ] Note available times for A
 3. [ ] CANNOT change barber (no UI for it)
 Expected:
  - Slots are for original barber only
  - Reschedule keeps same barber
```

### Test 6.2: Daylight Saving Time
```
Setup: Appointment during DST transition (if applicable)
 1. [ ] Schedule across DST boundary
 2. [ ] Verify times display correctly
 Expected:
  - Times adjust for DST
  - No 1-hour shifts in display
```

### Test 6.3: Different Time Zones (Future)
```
Setup: (Currently stores UTC, displays local)
 1. [ ] Book on device in timezone A
 2. [ ] Manage on device in timezone B
 Expected:
  - Times converted to local timezone
  - Same absolute time (different display)
```

### Test 6.4: Very Long Reason Text
```
Setup: Cancel with very long reason (500+ characters)
 1. [ ] Fill reason field with long text
 2. [ ] Submit cancellation
 Expected:
  - Either accepts or truncates gracefully
  - Doesn't crash or error
```

### Test 6.5: Special Characters in Reason
```
Setup: Cancel with reason containing: é, ñ, 中文, emoji 😊
 1. [ ] Fill reason with special characters
 2. [ ] Submit cancellation
 Expected:
  - Characters saved correctly
  - No encoding errors
```

---

## 🧪 Test Suite 7: API Endpoints (Direct Testing)

### Test 7.1: Cancel API Response
```
Using curl or Postman:
 1. [ ] PATCH /api/appointments/1/cancel
 2. [ ] Include valid token and reason
 3. [ ] Check response for:
    - [ ] "success": true
    - [ ] "message": "Appointment cancelled successfully"
    - [ ] Returned appointment has status: "cancelled"
 Expected:
  - 200 status
  - Complete appointment object returned
```

### Test 7.2: Reschedule API Response
```
Using curl or Postman:
 1. [ ] PATCH /api/appointments/1/reschedule
 2. [ ] Include: token, newDate, newTime
 3. [ ] Check response:
    - [ ] "success": true
    - [ ] start_time is new time (UTC)
    - [ ] Status is "confirmed"
 Expected:
  - 200 status
  - Appointment has updated times
```

### Test 7.3: Get Details API Response
```
Using curl:
 curl http://localhost:3000/api/appointments/1/details?token=VALID
 Expected:
  - 200 status
  - Returns full appointment object
  - Includes barber_name and shop_name
```

---

## 📊 Performance Tests

### Test P1: Reschedule Response Time
```
Using DevTools Network tab:
 1. [ ] Click "Reschedule"
 2. [ ] Select date with 50+ bookings
 3. [ ] Measure time to see slots
 4. [ ] Should be < 500ms
 Expected:
  - Availability API responds quickly
  - Slots load without delay
```

### Test P2: Load with Many Appointments
```
Setup: Add 1000 appointments to test day
 1. [ ] Try to fetch slots
 2. [ ] Verify still works (doesn't crash)
 3. [ ] Response time reasonable (< 2 sec)
 Expected:
  - Scaling works
  - No database timeouts
```

---

## ✅ Final Verification Checklist

- [ ] All 7 test suites passed
- [ ] No console errors in browser
- [ ] No errors in server logs
- [ ] Token generation consistent
- [ ] Cancellation logic correct
- [ ] Rescheduling logic correct
- [ ] Slot availability accurate
- [ ] UI is responsive
- [ ] Error messages clear
- [ ] Success messages appear
- [ ] Works on mobile
- [ ] Keyboard navigation works
- [ ] API endpoints all working
- [ ] Database state correct after operations

---

## 🐛 Bug Report Template

If you find issues:

```
Test Case: [which test]
Environment: [browser, OS, network speed]
Expected: [what should happen]
Actual: [what actually happened]
Steps: [exact steps to reproduce]
Token Used: [if relevant]
Screenshot: [if possible]
```

---

## 📝 Notes

- **Database prerequisites**: Ensure `barber_schedules` table is populated
- **Timezone**: All times stored in UTC, displayed in local timezone
- **24-hour rule**: Strict (less than 24 hrs = cannot modify)
- **Same barber**: Rescheduling keeps original barber
- **Status**: New reschedules are "confirmed" not "pending"

---

*Last Updated: February 8, 2026*
*Feature: Reschedule & Cancel Bookings*
