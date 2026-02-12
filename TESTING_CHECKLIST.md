# Testing Checklist - Booking & Calendar Sync Features

## ✅ Pre-Test Setup

- [ ] Database is running with test data
- [ ] Barber schedules are configured (verify `barber_schedules` table)
- [ ] At least 2-3 test appointments exist for demo
- [ ] Next.js dev server is running: `npm run dev`
- [ ] Shop slug is available (e.g., `/book/test-shop`)

---

## 🧪 Test Suite 1: Real-Time Slot Availability

### Test 1.1: Slots Load on Barber Selection
```
Setup: Navigate to /book/{shop-slug}
 1. [ ] Form loads with empty state
 2. [ ] Select a barber
 3. [ ] Select a date (today or tomorrow)
 4. [ ] Wait for "Loading available times..." message
 5. [ ] Verify slots appear (should be multiple)
 Expected: See time buttons like "9:00 AM", "9:30 AM", etc.
```

### Test 1.2: No Slots When Barber Doesn't Work
```
Setup: Know a day the barber doesn't work (e.g., Sunday)
 1. [ ] Select barber + that day
 2. [ ] Wait for load
 3. [ ] See error: "No available times for this date..."
 Expected: Red error message, no time buttons
```

### Test 1.3: Slots Exclude Booked Times
```
Setup: Create 2 test appointments for same barber, same day
 Time slots: 10:00 AM and 2:00 PM (example)
 1. [ ] Select that barber + that date
 2. [ ] Look at available slots
 3. [ ] Verify 10:00 AM is NOT available
 4. [ ] Verify 2:00 PM is NOT available
 5. [ ] Verify other times ARE available
 Expected: Only non-conflicting times shown
```

### Test 1.4: Slots List Updates When Date Changes
```
Setup: Have 2 different dates with different appointments
 1. [ ] Select: Barber X, Date A → See available slots A
 2. [ ] Change to Date B → See "Loading..." then slots B
 3. [ ] Verify slots are different between dates
 Expected: Slots refresh when date changes
```

### Test 1.5: Time Selection Persists
```
Setup: Previous tests
 1. [ ] Select a barber
 2. [ ] Select a date
 3. [ ] Wait for slots to load
 4. [ ] Click on one time slot
 5. [ ] Check that button is highlighted (selected)
 6. [ ] Try clicking another slot → First is deselected
 Expected: Only one slot selected at a time, visual feedback shown
```

---

## 🧪 Test Suite 2: Returning Customer Recognition

### Test 2.1: Existing Customer Welcome Message
```
Setup: Complete a booking with email "test@example.com"
 1. [ ] Make note of the name entered (e.g., "John")
 2. [ ] Return to booking page
 3. [ ] Enter same email: test@example.com
 4. [ ] Wait for "Checking..." message to disappear
 5. [ ] Look for blue box: "Welcome back! John"
 Expected: Shows customer name and saved preferences
```

### Test 2.2: Auto-Fill Customer Info
```
Setup: Previous test (same email)
 1. [ ] Email: test@example.com (triggers customer check)
 2. [ ] Wait for customer data to load
 3. [ ] Verify "Your Name" field is auto-filled
 4. [ ] Verify "Phone" field is auto-filled
 Expected: No need to re-enter name/phone
```

### Test 2.3: New Customer No Message
```
Setup: Use a new email never booked before
 1. [ ] Enter email: newemail12345@test.com
 2. [ ] Wait for "Checking..." to finish
 3. [ ] Verify NO blue welcome box appears
 Expected: Form works normally for new customers
```

---

## 🧪 Test Suite 3: Calendar Sync - Google Calendar

### Test 3.1: Google Calendar Button Generates Correct Link
```
Setup: Complete a booking successfully, see confirmation
 1. [ ] Look for "Add to Google Calendar" button
 2. [ ] Right-click button → "Inspect" (or use dev tools)
 3. [ ] Check the href attribute
 4. [ ] Verify it contains: `calendar.google.com/calendar/render`
 5. [ ] Verify params include appointment date/time
 Expected: Valid Google Calendar URL with proper date format
```

### Test 3.2: Google Calendar Button Opens New Tab
```
Setup: Confirmation screen visible
 Prerequisites: Must be logged into Google account
 1. [ ] Click "Add to Google Calendar" button
 2. [ ] Give it 2-3 seconds
 3. [ ] Check if new tab opened
 4. [ ] Verify it goes to google.com/calendar
 Expected: Google Calendar opens in new tab, appointment pre-filled
```

### Test 3.3: Appointment Details in Google Calendar
```
Setup: Google Calendar opened from previous test
 1. [ ] Look at the appointment preview
 2. [ ] Verify title contains shop name
 3. [ ] Verify date is correct
 4. [ ] Verify time is correct
 5. [ ] Verify location shows shop name
 6. [ ] Click "Save" to add to your calendar
 Expected: Can successfully add to Google Calendar
```

---

## 🧪 Test Suite 4: Calendar Sync - iCal Download

### Test 4.1: Download Button Works
```
Setup: Confirmation screen visible
 1. [ ] Click "Download for Apple/Outlook" button
 2. [ ] Wait 1-2 seconds
 3. [ ] Check downloads folder
 4. [ ] Look for file like: "barbershop-appointment-XXXX.ics"
 Expected: File downloads to default folder
```

### Test 4.2: iCal File Content is Valid
```
Setup: .ics file downloaded from previous test
 1. [ ] Open .ics file in text editor
 2. [ ] Verify it starts with "BEGIN:VCALENDAR"
 3. [ ] Verify it ends with "END:VCALENDAR"
 4. [ ] Look for "DTSTART:" with your appointment time
 5. [ ] Look for "SUMMARY:" with shop name
 6. [ ] Verify "DESCRIPTION:" has customer name
 Expected: Valid iCal format (.ics file)
```

### Test 4.3: iCal File Imports to Apple Calendar
```
Setup: .ics file downloaded, Mac/iPhone with Apple Calendar
 1. [ ] Double-click the .ics file
 2. [ ] Calendar app should open
 3. [ ] Select which calendar to add to
 4. [ ] Click "Add Event"
 5. [ ] Verify appointment appears in calendar
 Expected: Successfully imported to Apple Calendar
```

### Test 4.4: iCal File Imports to Outlook
```
Setup: .ics file downloaded, Windows/Mac with Outlook
 1. [ ] Double-click the .ics file
 2. [ ] Outlook should open or show import dialog
 3. [ ] Confirm import
 4. [ ] Verify appointment appears in calendar
 Expected: Successfully imported to Outlook
```

---

## 🧪 Test Suite 5: API Endpoints

### Test 5.1: Available Slots API
```
Using browser/curl:
 1. [ ] Call: GET http://localhost:3000/api/available-slots?shopId=1&barberId=1&date=2024-02-15
 2. [ ] Verify response has "success": true
 3. [ ] Verify "availableSlots" is an array
 4. [ ] Each slot should have "startTime" and "endTime"
 5. [ ] All times should be in ISO format (2024-02-15T09:00:00Z)
 Expected: Valid JSON response with slots
```

### Test 5.2: Appointment iCal API
```
Using browser/curl:
 1. [ ] Call: GET http://localhost:3000/api/appointments/1/ical
 2. [ ] Verify response Content-Type is "text/calendar"
 3. [ ] Verify file downloads as "appointment-1.ics"
 4. [ ] Verify content is valid iCal format
 Expected: File downloads with correct format
```

### Test 5.3: Shop Calendar Feed API
```
Using browser/curl:
 1. [ ] Call: GET http://localhost:3000/api/shops/test-shop/calendar
 2. [ ] Verify response Content-Type is "text/calendar"
 3. [ ] Verify content starts with "BEGIN:VCALENDAR"
 4. [ ] Verify it includes multiple "BEGIN:VEVENT" sections
 5. [ ] Verify caching header is present
 Expected: Valid iCal feed with all shop appointments
```

### Test 5.4: Calendar Feed Subscription
```
Setup: Know your shop-slug
 1. [ ] Copy URL: http://localhost:3000/api/shops/test-shop/calendar
 2. [ ] Open your calendar app (Apple/Outlook/Google)
 3. [ ] Look for "Subscribe" or "Add Calendar" option
 4. [ ] Paste the URL
 5. [ ] Verify it accepts it as a valid calendar feed
 6. [ ] Check if appointments appear (might take 1-2 seconds)
 Expected: Can subscribe to shop calendar feed
```

---

## 🧪 Test Suite 6: Form Validation

### Test 6.1: Time Field Required
```
Setup: Fill all fields except time
 1. [ ] Select barber, date, name, phone, email
 2. [ ] DO NOT select a time
 3. [ ] Try to click "Confirm Booking" button
 4. [ ] Verify button is disabled (grayed out)
 Expected: Cannot submit without selecting time
```

### Test 6.2: Email Required
```
Setup: Fill all fields, skip email
 1. [ ] Leave email empty
 2. [ ] Fill other fields
 3. [ ] Try to submit
 Expected: HTML5 validation prevents submission
```

### Test 6.3: Past Dates Disabled
```
Setup: Booking form visible
 1. [ ] Click date input field
 2. [ ] Try to select a date in the past
 3. [ ] Verify past dates are grayed out
 4. [ ] Can only select today or future
 Expected: Date picker prevents past dates
```

---

## 🧪 Test Suite 7: Edge Cases

### Test 7.1: Multiple Barbers Same Date
```
Setup: Multiple barbers with different schedules
 1. [ ] Select: Barber A, Date X → See times for A
 2. [ ] Change to: Barber B, same Date X → See times for B
 3. [ ] Verify times are different
 Expected: Each barber has independent availability
```

### Test 7.2: All Slots Booked
```
Setup: Create enough appointments to fill whole day
 1. [ ] Select that barber + date
 2. [ ] Verify message: "No available times for this date"
 Expected: Graceful handling of fully booked day
```

### Test 7.3: Network Error Handling
```
Setup: Booking form loaded
 1. [ ] Open dev tools → Network tab
 2. [ ] Set network to "Offline"
 3. [ ] Try to complete booking
 4. [ ] Verify error message appears
 Expected: Handles network failures gracefully
```

### Test 7.4: Very Long Customer Name
```
Setup: Booking form
 1. [ ] Enter extremely long name (100+ characters)
 2. [ ] Try to submit
 Expected: Either accepts or shows validation error (not crash)
```

---

## 📊 Performance Tests

### Test P1: Slot Loading Speed
```
Setup: Dev tools → Network tab
 1. [ ] Select barber + date
 2. [ ] Check how long /api/available-slots takes
 3. [ ] Should be < 500ms
 Expected: Slots load quickly
```

### Test P2: Calendar Feed Response Time
```
Using curl with timing:
 curl -w "Time: %{time_total}s\n" http://localhost:3000/api/shops/test-shop/calendar
 Expected: Response time < 1 second
```

---

## 🔐 Security Tests

### Test S1: User Can't See Other Email's Appointments
```
Setup: Two different customers
 1. [ ] Customer A books appointment with email A
 2. [ ] Customer B tries to use email A
 3. [ ] Verify B sees A's customer profile (expected)
 4. [ ] Customer B should NOT see A's appointment times in calendar
 Expected: Calendar shows shop availability, not individual appointments
```

### Test S2: Invalid Shop Slug
```
Using browser/curl:
 1. [ ] Try: GET /api/shops/nonexistent-shop/calendar
 2. [ ] Verify returns 404 error
 Expected: Non-existent shops return error, not data
```

---

## ✅ Final Verification Checklist

- [ ] All 7 test suites passed
- [ ] No console errors in browser
- [ ] No errors in server logs
- [ ] Database queries execute correctly
- [ ] Calendar files open in target apps
- [ ] Form is fully responsive (test on mobile)
- [ ] No hardcoded times in booking form
- [ ] API endpoints are all accessible
- [ ] Documentation is accurate
- [ ] Code follows project conventions

---

## 🐛 Bug Report Template

If you find issues, use this template:

```
Test Case: [which test]
Environment: [browser, OS, Next.js version]
Expected: [what should happen]
Actual: [what actually happened]
Steps: [how to reproduce]
Screenshot: [if possible]
```

---

*Last Updated: February 8, 2026*
