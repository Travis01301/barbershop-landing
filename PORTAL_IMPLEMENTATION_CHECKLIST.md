# Customer Portal - Implementation Checklist

## Pre-Implementation

- [ ] Read CUSTOMER_PORTAL_GUIDE.md completely
- [ ] Read PORTAL_README.md for overview
- [ ] Review API endpoint structure
- [ ] Understand database schema
- [ ] Set up development environment
- [ ] Verify PostgreSQL connection works

---

## Phase 1: Database Setup

### 1.1 Migration
- [ ] Run database migration: `psql -f db_migration_customer_portal.sql`
- [ ] Verify all 7 new tables created
- [ ] Verify schema modifications applied to existing tables
- [ ] Create backups before production

### 1.2 Data Configuration
- [ ] Enable portal on first shop:
  ```sql
  UPDATE shops SET portal_enabled = true, portal_slug = 'shop-name' WHERE id = 1;
  ```
- [ ] Add barber profiles:
  ```sql
  UPDATE users SET bio = '...', profile_photo_url = '...' WHERE role = 'barber';
  ```
- [ ] Configure service add-ons (if needed)
- [ ] Set up promo codes (test with "LAUNCH50")

---

## Phase 2: Environment Configuration

### 2.1 Stripe
- [ ] Generate Stripe API keys (test + live)
- [ ] Set `STRIPE_SECRET_KEY` in .env
- [ ] Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in .env.local
- [ ] Test with Stripe test card: `4242 4242 4242 4242`
- [ ] Configure webhook endpoint (future)

### 2.2 Email (Resend)
- [ ] Create Resend account
- [ ] Generate API key
- [ ] Set `RESEND_API_KEY` in .env
- [ ] Verify sender email configured
- [ ] Test email delivery

### 2.3 SMS (Twilio)
- [ ] Create Twilio account
- [ ] Generate credentials
- [ ] Set environment variables:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER`
- [ ] Verify phone number configured
- [ ] Test SMS delivery

### 2.4 Database
- [ ] Verify `DATABASE_URL` is correct
- [ ] Test database connection
- [ ] Verify all tables created
- [ ] Check indices are present

---

## Phase 3: API Testing

### 3.1 Availability Endpoint
```bash
curl -X POST http://localhost:3000/api/public/shops/test-shop/check-availability \
  -H "Content-Type: application/json" \
  -d '{
    "barberId": 1,
    "date": "2026-03-15",
    "serviceId": 1
  }'
```
- [ ] Returns available slots
- [ ] Handles barber time-off correctly
- [ ] Respects service duration
- [ ] 15-minute intervals generated

### 3.2 Barbers Endpoint
```bash
curl http://localhost:3000/api/public/shops/test-shop/barbers
```
- [ ] Returns all barbers with ratings
- [ ] Includes specialties
- [ ] Shows upcoming availability
- [ ] Displays profile photos

### 3.3 Services Endpoint
```bash
curl http://localhost:3000/api/public/shops/test-shop/services
```
- [ ] Lists all services with pricing
- [ ] Includes add-ons for each service
- [ ] Correct prices displayed
- [ ] Add-on prices correct

### 3.4 Create Booking
```bash
curl -X POST http://localhost:3000/api/public/bookings/create \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "test-shop",
    "barberId": 1,
    "serviceId": 1,
    "scheduledDate": "2026-03-15T10:00:00Z",
    "customerEmail": "test@example.com",
    "customerPhone": "555-0000",
    "customerName": "Test User"
  }'
```
- [ ] Booking created successfully
- [ ] Returns booking token
- [ ] Payment intent created
- [ ] Confirmation email sent
- [ ] Analytics event tracked

### 3.5 Get Booking
- [ ] Fetch booking with valid token
- [ ] Deny access without token
- [ ] Deny access with expired token
- [ ] Show all booking details

### 3.6 Reschedule Booking
- [ ] Reschedule to future date
- [ ] Deny past dates
- [ ] Check barber availability
- [ ] Send confirmation email
- [ ] Update booking status

### 3.7 Cancel Booking
- [ ] Cancel successfully
- [ ] Apply fee if within 48 hours
- [ ] Process refund via Stripe
- [ ] Send cancellation email
- [ ] Update booking status

### 3.8 Rate Booking
- [ ] Submit 5-star rating
- [ ] Include comment (optional)
- [ ] Update barber average rating
- [ ] Prevent duplicate reviews
- [ ] Show on barber profile

### 3.9 Barber Profile
- [ ] Fetch barber details
- [ ] Show all reviews
- [ ] Display ratings
- [ ] List services
- [ ] Show upcoming availability

---

## Phase 4: Component Testing

### 4.1 PublicBookingFlow
- [ ] Mount without errors
- [ ] Navigate through all steps
- [ ] Handle back navigation
- [ ] Display step titles correctly
- [ ] Manage internal state

### 4.2 BarberSelector
- [ ] Load barbers from API
- [ ] Display photos and names
- [ ] Show ratings and reviews count
- [ ] Filter by specialty (if implemented)
- [ ] Select barber triggers next step

### 4.3 ServiceSelector
- [ ] Load services from API
- [ ] Display pricing
- [ ] Show add-ons available
- [ ] Select service triggers next step
- [ ] Navigate back to barber selection

### 4.4 TimeSlotPicker
- [ ] Load availability for barber+date
- [ ] Display calendar correctly
- [ ] Show time slots as buttons
- [ ] Highlight selected time
- [ ] Prevent past dates
- [ ] Handle "no slots available"

### 4.5 CustomerForm
- [ ] Collect name, email, phone
- [ ] Validate email format
- [ ] Allow styling notes
- [ ] Handle first-time customer flag
- [ ] Submit to payment step

### 4.6 PublicPaymentForm
- [ ] Load Stripe correctly
- [ ] Display deposit amount ($10)
- [ ] Accept promo code input
- [ ] Validate promo codes
- [ ] Process payment with test card
- [ ] Show error on invalid card
- [ ] Success navigates to confirmation

### 4.7 ConfirmationScreen
- [ ] Display booking details
- [ ] Generate QR code
- [ ] Show booking management link
- [ ] Display confirmation email message
- [ ] Allow rating submission
- [ ] "Book Another" resets flow

### 4.8 BookingManagement
- [ ] Load booking with token
- [ ] Deny access without token
- [ ] Show booking details tab
- [ ] Allow reschedule with new date/time
- [ ] Allow cancellation with reason
- [ ] Show cancellation fee policy
- [ ] Update UI after changes

### 4.9 PublicBarberProfile
- [ ] Load barber data
- [ ] Display profile photo
- [ ] Show rating and review count
- [ ] List specialties
- [ ] List services with pricing
- [ ] Display reviews
- [ ] "Book" button functional

### 4.10 ShopDisplay
- [ ] Show shop logo and name
- [ ] Display address and phone
- [ ] Show availability status
- [ ] Sticky positioning on scroll
- [ ] Mobile responsive

---

## Phase 5: End-to-End Testing

### 5.1 Full Booking Flow
- [ ] Start at `/book/test-shop`
- [ ] Select barber
- [ ] Choose service
- [ ] Pick date and time
- [ ] Enter customer info
- [ ] Apply promo code "LAUNCH50"
- [ ] Complete Stripe payment
- [ ] See confirmation screen
- [ ] Receive confirmation email
- [ ] Receive confirmation SMS

### 5.2 Booking Management
- [ ] Access booking via token link
- [ ] Reschedule to different date/time
- [ ] Verify email notification sent
- [ ] Cancel booking
- [ ] Verify refund initiated
- [ ] Verify cancellation email sent

### 5.3 Review System
- [ ] Submit 5-star rating
- [ ] Add detailed comment
- [ ] Verify barber average rating updated
- [ ] See review on barber profile
- [ ] Count shows in barber list

### 5.4 Promo Code
- [ ] Test LAUNCH50 code
- [ ] Verify 50% discount applied
- [ ] Check total amount reduced
- [ ] Test invalid code
- [ ] Verify error message shown

### 5.5 Multiple Shops
- [ ] Enable portal on 2nd shop
- [ ] Access via different slug
- [ ] Verify data is shop-scoped
- [ ] No data leakage between shops

---

## Phase 6: Mobile Testing

### 6.1 Responsiveness
- [ ] Test on iPhone SE (small)
- [ ] Test on iPhone 12 (medium)
- [ ] Test on iPad (tablet)
- [ ] Test on Android phones
- [ ] All forms fit on screen
- [ ] Buttons are thumb-friendly

### 6.2 Performance
- [ ] Page load < 2 seconds
- [ ] API responses < 500ms
- [ ] Images optimized
- [ ] No layout shift
- [ ] Smooth animations

### 6.3 Payment on Mobile
- [ ] Stripe form displays correctly
- [ ] Apple Pay works (iOS)
- [ ] Google Pay works (Android)
- [ ] Test card entry works
- [ ] Error messages visible

---

## Phase 7: Security Testing

### 7.1 Authentication
- [ ] No login required for browsing
- [ ] Booking token required for management
- [ ] Token expires after 24 hours
- [ ] Invalid token denied
- [ ] Expired token denied

### 7.2 Payment
- [ ] HTTPS enforced
- [ ] No card data in logs
- [ ] Stripe API key not exposed
- [ ] Test vs live keys separated
- [ ] Test card not stored

### 7.3 Data Protection
- [ ] SQL injection attempts fail
- [ ] XSS payload neutralized
- [ ] CSRF token on forms
- [ ] Rate limiting works
- [ ] No sensitive data in URLs

### 7.4 Rate Limiting
- [ ] Block after 100 bookings/hour from same IP
- [ ] CAPTCHA on suspicious activity
- [ ] Log blocked attempts

---

## Phase 8: Analytics Setup

### 8.1 Google Analytics
- [ ] Create GA property for portal
- [ ] Add tracking code
- [ ] Track page views
- [ ] Track booking_step events
- [ ] Track booking_completed conversion
- [ ] Track booking_abandoned event

### 8.2 Dashboard Metrics
- [ ] Total bookings per day
- [ ] Conversion funnel (views → bookings)
- [ ] Popular barbers
- [ ] Popular time slots
- [ ] Revenue by day
- [ ] Average rating by barber

### 8.3 UTM Tracking
- [ ] Capture utm_source
- [ ] Capture utm_medium
- [ ] Capture utm_campaign
- [ ] Store in analytics table
- [ ] Report on in dashboard

---

## Phase 9: Deployment

### 9.1 Staging
- [ ] Deploy to staging environment
- [ ] Run full test suite
- [ ] Test all payment flows
- [ ] Verify email/SMS delivery
- [ ] Performance test
- [ ] Security scan

### 9.2 Production
- [ ] Database migration applied
- [ ] Environment variables set
- [ ] Stripe live keys configured
- [ ] Email provider active
- [ ] SMS provider active
- [ ] Backups configured
- [ ] Error logging configured
- [ ] Deploy code
- [ ] Run smoke tests
- [ ] Monitor for errors

### 9.3 Launch
- [ ] Public URL live
- [ ] Test full booking flow
- [ ] Monitor conversion rate
- [ ] Track error rates
- [ ] Check performance metrics
- [ ] Share link to customers

---

## Phase 10: Post-Launch

### 10.1 Monitoring
- [ ] Check API response times daily
- [ ] Monitor error rates
- [ ] Track payment success rate
- [ ] Monitor email delivery
- [ ] Check SMS delivery
- [ ] Review customer feedback

### 10.2 Optimization
- [ ] Analyze user drop-off points
- [ ] Improve UI based on feedback
- [ ] Optimize slow API endpoints
- [ ] A/B test variations
- [ ] Reduce form steps if possible

### 10.3 Maintenance
- [ ] Update dependencies monthly
- [ ] Patch security vulnerabilities
- [ ] Optimize database queries
- [ ] Archive old analytics data
- [ ] Review and update documentation

---

## Success Criteria

- [ ] All 9 API endpoints working
- [ ] All 10 components rendering correctly
- [ ] Full booking flow completable end-to-end
- [ ] Payment processing working (test + live)
- [ ] Emails and SMS delivered
- [ ] Mobile responsive on all devices
- [ ] Conversion rate tracking active
- [ ] No critical security issues
- [ ] 95%+ test coverage
- [ ] Documentation complete

---

## Handoff Notes

### For Future Maintenance

1. **Database**: All migrations in `db_migration_customer_portal.sql`
2. **API**: Well-documented endpoints under `/api/public/`
3. **Components**: Reusable React components in `/components/`
4. **Tests**: 30+ unit tests in `lib/portal-service.test.ts`
5. **Docs**: Complete guides in `CUSTOMER_PORTAL_GUIDE.md`

### Critical Files

- `db_migration_customer_portal.sql` - Database schema
- `app/api/public/*/route.ts` - API endpoints
- `components/*` - React components
- `CUSTOMER_PORTAL_GUIDE.md` - Setup and integration
- `PORTAL_README.md` - Quick reference

### Common Issues & Solutions

See **CUSTOMER_PORTAL_GUIDE.md** "Troubleshooting" section for:
- Shop not found
- No available slots
- Payment failures
- Email delivery issues
- Booking token problems

---

## Questions?

Refer to the complete documentation:
- **CUSTOMER_PORTAL_GUIDE.md** - Setup & integration
- **PORTAL_README.md** - Quick reference
- **Code comments** - Detailed implementation notes
- **API examples** - Curl commands for testing

---

**Status: Ready for Implementation** ✅

Total estimated time: 2-3 days for full deployment and testing.
