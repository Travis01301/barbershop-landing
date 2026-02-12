# User Guide - Booking with Calendar Sync

## 📱 Booking Flow (Step by Step)

### Screen 1: Email Entry
```
┌─────────────────────────────────────┐
│         Book Your Appointment       │
├─────────────────────────────────────┤
│                                     │
│  Email *                            │
│  ┌─────────────────────────────────┐│
│  │ your@email.com                  ││
│  └─────────────────────────────────┘│
│                                     │
│  [If returning customer]            │
│  ┌─────────────────────────────────┐│
│  │ Welcome back! John              ││
│  │ Notes: Fade on top              │││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```
✨ **Feature**: Form checks if you've booked before and shows your saved preferences

---

### Screen 2: Select Barber & Date
```
┌─────────────────────────────────────┐
│                                     │
│  Select Barber                      │
│  ┌─────────────────────────────────┐│
│  │ ▼ Mike Johnson                  ││
│  └─────────────────────────────────┘│
│                                     │
│  Date                               │
│  ┌─────────────────────────────────┐│
│  │ 2024-02-15                      ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```
✨ **Feature**: Once you select a barber and date, available times load automatically

---

### Screen 3: Select Time (Dynamic Availability)
```
┌─────────────────────────────────────┐
│                                     │
│  Time                               │
│                                     │
│  Loading available times...         │
│                                     │
│  [After API loads]                  │
│                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │9:00 │ │9:30 │ │10:00│ │10:30│   │
│  └─────┘ └─────┘ └─────┘ └─────┘   │
│                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │11:00│ │11:30│ │12:00│ │ X   │   │
│  └─────┘ └─────┘ └─────┘ └─────┘   │
│                                     │
│  (X = Already booked)               │
│                                     │
│  ┌─────────────────────────────────┐│
│  │   ✓ 10:30 AM is selected       ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```
✨ **Key Improvement**: 
- Times are **real** based on barber schedule & existing bookings
- Shows exactly when the barber is available
- No more picking booked times

---

### Screen 4: Your Details
```
┌─────────────────────────────────────┐
│                                     │
│  Your Name *                        │
│  ┌─────────────────────────────────┐│
│  │ John Smith                      ││
│  └─────────────────────────────────┘│
│                                     │
│  Phone *                            │
│  ┌─────────────────────────────────┐│
│  │ (555) 123-4567                 ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │     Confirm Booking             │││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

---

## ✅ Confirmation Screen (NEW!)

```
┌──────────────────────────────────────────┐
│                                          │
│              ✓                           │
│                                          │
│     Booking Confirmed!                   │
│   We will see you soon                   │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Appointment Details                │  │
│  ├────────────────────────────────────┤  │
│  │ Date:     Thursday, Feb 15, 2024   │  │
│  │ Time:     10:30 AM                 │  │
│  │ Barber:   Mike Johnson             │  │
│  │ Customer: John Smith               │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Add to your calendar:                   │
│                                          │
│  ┌────────────────────┐┌───────────────┐ │
│  │📅 Add to Google    ││📥 Download    │ │
│  │   Calendar         ││   for Apple   │ │
│  │                    ││   /Outlook    │ │
│  └────────────────────┘└───────────────┘ │
│                                          │
│  A confirmation email has been sent to   │
│  john@example.com                        │
│                                          │
└──────────────────────────────────────────┘
```

---

## 📅 Calendar Sync Options

### Option 1: Google Calendar (One-Click)
1. Click **"Add to Google Calendar"** button
2. Google Calendar opens with appointment pre-filled
3. Click "Save" to add to your calendar
4. ✨ Appointment syncs across all your devices

### Option 2: Apple Calendar / Outlook (Download)
1. Click **"Download for Apple/Outlook"** button
2. File `barbershop-appointment-XXXX.ics` downloads
3. Open the file → Select your calendar app
4. ✨ Appointment is imported and synced

### Option 3: Subscribe to Shop Calendar (Advanced)
1. Get the shop's calendar URL: `/api/shops/{shop-slug}/calendar`
2. In your calendar app, choose "Subscribe to calendar"
3. Paste the URL
4. ✨ See ALL upcoming appointments (always up to date!)
5. Perfect for sharing with staff or family

---

## 🎯 What's Different Now?

| Feature | Before | After |
|---------|--------|-------|
| **Available Times** | Hardcoded (same for everyone) | Real-time, based on actual availability |
| **Time Selection** | Pick any time, might be booked | Only see available times |
| **Calendar Sync** | Manual copy/paste | One-click Google / Download iCal |
| **Booking Confirmation** | Text only | Full details + calendar options |
| **Returning Customers** | Enter all info again | Auto-filled from previous bookings |

---

## ❓ Frequently Asked Questions

### Q: Why do my available times keep changing?
**A:** Times update automatically as bookings are made. This ensures you never double-book!

### Q: Does Google Calendar button work on my phone?
**A:** Yes! It opens your default calendar app (Google Calendar, Apple, etc.)

### Q: Can I export to other calendar apps?
**A:** Yes! The `.ics` file format works with virtually all calendar apps:
- Apple Calendar ✓
- Outlook ✓
- Thunderbird ✓
- Nextcloud ✓
- Most others (iCal compatible)

### Q: If I download the .ics, will it update automatically?
**A:** No, the .ics file is a snapshot. To get live updates, subscribe to the shop's calendar feed instead.

### Q: How do I subscribe to the barbershop's calendar?
**A:** 
1. Ask your barber for the shop's calendar link
2. In your calendar app, choose "Add calendar" or "Subscribe"
3. Paste the link: `https://yourshop.com/api/shops/shop-slug/calendar`
4. Done! See all appointments in real-time

---

## 🔄 Booking Again?

### Your Profile
When you book again with the same email:
- We remember your name & phone
- We show any styling notes or preferences you left
- You can still edit all details
- Super fast booking for returning customers!

---

## 💾 Your Data
- ✓ Email, name, phone stored securely
- ✓ Your styling preferences/notes saved
- ✓ Can be managed in your customer profile
- ✓ Used only to personalize your experience

---

## 🆘 Troubleshooting

### "No available times for this date"
**Fix:** 
- Try a different date
- Try a different barber
- Or check with the barbershop directly

### Google Calendar button doesn't work
**Fix:**
- Make sure you're logged into Google
- Try a different browser if issue persists
- Use the download option instead

### Can't import .ics file
**Fix:**
- Make sure your calendar app supports iCal
- Try right-clicking and "Open with..." your calendar app
- Contact support if issues continue

---

## ✨ Tips & Tricks

**Pro Tip #1**: Subscribe to the shop's calendar to see when they're busiest
**Pro Tip #2**: Add appointment to phone calendar for automatic reminders
**Pro Tip #3**: Save shop's calendar link for future bookings (see availability anytime)
**Pro Tip #4**: Download .ics file as backup even if using Google Calendar

---

*Last Updated: February 8, 2026*
