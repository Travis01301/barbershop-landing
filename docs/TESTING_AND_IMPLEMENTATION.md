# Analytics Testing & Implementation Guide

Complete guide to testing analytics events, verifying data collection, and implementing tracking across the app.

## Part 1: Testing Setup

### Enable Debug Mode

Set in `.env.local`:
```env
NEXT_PUBLIC_GA4_DEBUG_MODE=true
```

This enables:
- Console logging of all events
- Event parameters displayed in browser console
- No network requests to GA4 (in debug mode)
- Real-time validation

### Install Browser Extensions

1. **Google Analytics Debugger**
   - [Install from Chrome Web Store](https://chrome.google.com/webstore)
   - Shows all GA4 events in DevTools
   - Displays custom dimensions/metrics
   - Validates event structure

2. **GTM Debugger** (if using GTM)
   - Shows GTM tags firing
   - Displays data layer values
   - Validates variable values

### Browser DevTools Setup

1. Open DevTools (F12)
2. Go to **Console** tab
3. All analytics events logged with `[Analytics]` prefix
4. Look for format: `[Analytics] Event tracked: event_name { ...params }`

---

## Part 2: Real-Time Verification

### GA4 Real-Time Report

1. Open [Google Analytics](https://analytics.google.com)
2. Go to Admin > Reports > Real-time
3. Perform action in your app
4. Should see event appear within 1-2 seconds
5. Verify event name and parameters

### Testing Checklist by Component

#### Signup Form

```javascript
// 1. Fill form and submit
// Expected events:
// - sign_up (success=true)
// - user ID set

// 2. Try invalid password
// Expected event:
// - sign_up (success=false, error_message set)

// 3. Check custom dimensions
// setCustomDimensions called with:
// - user_type: 'shop_owner' | 'barber' | 'customer'
// - plan_tier: 'free'
```

**Test Cases:**
- [ ] Valid email/password → sign_up success
- [ ] Invalid email format → validation error
- [ ] Weak password → password error
- [ ] Email already exists → signup fails
- [ ] Network error → sign_up fails
- [ ] Check user ID is set after success

#### Login Form

```javascript
// Expected events:
// - login (success=true/false)
// - user ID set (on success)

// Test with different login methods
// - Email/password
// - Google OAuth
// - Apple Sign-In
```

**Test Cases:**
- [ ] Valid credentials → login success
- [ ] Invalid password → login fails
- [ ] User not found → login fails
- [ ] OAuth flow → login success with method
- [ ] MFA flow (if applicable) → tracked separately

#### Shop Creation

```javascript
// Expected events:
// - shop_created event
// - custom dimension shop_id set

// Verify:
// - shop_name parameter
// - barber_count parameter
// - custom dimension shop_id set
```

**Test Cases:**
- [ ] Create shop with valid data → shop_created
- [ ] Verify shop_id is set
- [ ] Verify metrics are correct

#### Appointment Booking

```javascript
// Expected events:
// - page_view (section='booking_service_selected')
// - page_view (section='booking_barber_selected')
// - appointment_booked event
// - page_view (section='booking_confirmed')

// Verify:
// - Custom metric: booking_value
// - is_first_booking parameter
// - service_type parameter
```

**Test Cases:**
- [ ] Select service → section event fired
- [ ] Select barber → section event fired
- [ ] Select date/time → events fired
- [ ] Submit booking → appointment_booked fired
- [ ] First booking flag correct
- [ ] Booking value is in cents

#### Payment Form

```javascript
// Expected events:
// - payment_completed (success) OR payment_failed (failure)
// - If success + promo: promo_code_applied event

// Verify:
// - Custom metric: revenue
// - Amount in cents
// - Plan tier parameter
// - Promo code details (if applicable)
```

**Test Cases:**
- [ ] Valid payment → payment_completed + revenue metric
- [ ] Declined card → payment_failed + error_code
- [ ] Network error → payment_failed + exception
- [ ] Promo code applied → promo_code_applied fired
- [ ] Revenue custom metric updated
- [ ] Payment method recorded

#### Landing Page CTAs

```javascript
// Expected events:
// - cta_click event for each button
// - Correct button_text parameter

// Verify:
// - button_text matches enum
// - page_section parameter set
// - Occurs before navigation
```

**Test Cases:**
- [ ] "Start Free Trial" click → cta_click event
- [ ] "Schedule Demo" click → cta_click event
- [ ] "Sign Up" click → cta_click event
- [ ] Each CTA has correct section
- [ ] All buttons tracked

#### Pricing Tier Views

```javascript
// Expected events:
// - pricing_tier_viewed event for each tier

// Verify:
// - pricing_tier parameter (free/pro/enterprise)
// - price_amount in cents
```

**Test Cases:**
- [ ] View free tier → pricing_tier_viewed (free)
- [ ] View pro tier → pricing_tier_viewed (pro)
- [ ] View enterprise tier → pricing_tier_viewed (enterprise)
- [ ] Prices are correct
- [ ] All tiers tracked

---

## Part 3: Validation Tests

### Event Parameter Validation

Create test file `__tests__/analytics.test.ts`:

```typescript
import { initializeAnalytics, getAnalytics } from '@/lib/analytics';
import { SignUpEvent, PaymentCompletedEvent } from '@/lib/analytics/types';

describe('Analytics Events', () => {
  beforeEach(() => {
    // Mock GA4
    window.gtag = jest.fn();
  });

  describe('SignUpEvent', () => {
    it('should track signup with all required parameters', () => {
      const analytics = initializeAnalytics({
        ga4PropertyId: 'G-TEST123',
        debugMode: true,
      });

      const event: SignUpEvent = {
        name: 'sign_up',
        timestamp: Date.now(),
        session_id: 'test-session',
        additionalParams: {
          signup_method: 'email',
          success: true,
        },
      };

      analytics.trackEvent(event);

      expect(window.gtag).toHaveBeenCalledWith(
        'event',
        'sign_up',
        expect.objectContaining({
          signup_method: 'email',
          success: true,
        })
      );
    });

    it('should track signup failure with error message', () => {
      const event: SignUpEvent = {
        name: 'sign_up',
        timestamp: Date.now(),
        session_id: 'test-session',
        additionalParams: {
          signup_method: 'email',
          success: false,
          error_message: 'Email already exists',
        },
      };

      getAnalytics().trackEvent(event);

      expect(window.gtag).toHaveBeenCalledWith(
        'event',
        'sign_up',
        expect.objectContaining({
          success: false,
          error_message: 'Email already exists',
        })
      );
    });
  });

  describe('PaymentCompletedEvent', () => {
    it('should track payment with revenue metric', () => {
      const event: PaymentCompletedEvent = {
        name: 'payment_completed',
        timestamp: Date.now(),
        session_id: 'test-session',
        customMetrics: {
          revenue: 9999, // $99.99
        },
        additionalParams: {
          currency: 'USD',
          plan_tier: 'pro',
        },
      };

      getAnalytics().trackEvent(event);

      expect(window.gtag).toHaveBeenCalledWith(
        'event',
        'payment_completed',
        expect.objectContaining({
          custom_metric_revenue: 9999,
          currency: 'USD',
        })
      );
    });
  });
});
```

Run tests:
```bash
npm test -- analytics.test.ts
```

### Funnel Completion Test

```typescript
describe('Conversion Funnels', () => {
  it('should track complete acquisition funnel', async () => {
    const { trackEvent, setUserId } = useAnalytics();

    // Step 1: Page view
    trackEvent({
      name: 'page_view',
      timestamp: Date.now(),
      session_id: 'test',
      additionalParams: {
        section: 'hero',
      },
    });

    // Step 2: CTA click
    trackEvent({
      name: 'cta_click',
      timestamp: Date.now(),
      session_id: 'test',
      additionalParams: {
        button_text: 'Start Free Trial',
      },
    });

    // Step 3: Sign up
    setUserId('user123');
    trackEvent({
      name: 'sign_up',
      timestamp: Date.now(),
      session_id: 'test',
      additionalParams: {
        success: true,
        signup_method: 'email',
      },
    });

    // Step 4: Shop created
    trackEvent({
      name: 'shop_created',
      timestamp: Date.now(),
      session_id: 'test',
      additionalParams: {
        shop_name: 'Test Barber Shop',
      },
    });

    // Verify all events fired
    expect(window.gtag).toHaveBeenCalledTimes(4);
  });
});
```

---

## Part 4: Data Accuracy Validation

### User ID Consistency

1. Log in user
2. Perform actions
3. Check all events have same `user_id`
4. Verify in GA4 > Reports > User-ID feature report

### Custom Dimension Persistence

1. Set custom dimension: `shop_id: "shop123"`
2. Perform 10 actions
3. All should include `shop_id: "shop123"`
4. Verify in GA4 admin > Custom dimensions

### Revenue Calculation

1. Create payment for $99.99 → custom metric: `revenue: 9999`
2. Create payment for $49.99 → custom metric: `revenue: 4999`
3. GA4 should show total: $149.98
4. Verify in GA4 > Metrics comparison

### Session ID Uniqueness

1. Open app in incognito window
2. Session ID should be generated
3. Perform actions
4. All events in session should have same session_id
5. Close and reopen → new session_id

---

## Part 5: E2E Testing

### Complete User Journey Test

```typescript
// cypress/e2e/analytics-journey.cy.ts

describe('Analytics Tracking - Complete User Journey', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should track complete conversion funnel', () => {
    // 1. Track landing page view
    cy.get('[data-testid="hero-section"]').should('be.visible');
    
    // 2. Click CTA
    cy.get('[data-testid="cta-start-free-trial"]').click();
    
    // 3. Verify redirected to signup
    cy.url().should('include', '/signup');
    
    // 4. Fill signup form
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('TestPassword123!');
    cy.get('button[type="submit"]').click();
    
    // 5. Verify signup success
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="welcome-message"]').should('contain', 'Welcome');
    
    // 6. Verify analytics events in GA4
    cy.window().then((win) => {
      // In debug mode, check gtag calls
      expect(win.gtag).toHaveBeenCalledWith(
        'event',
        'sign_up',
        expect.any(Object)
      );
    });
  });

  it('should track booking funnel through completion', () => {
    // Login first
    cy.login('test@example.com', 'TestPassword123!');
    
    // Navigate to bookings
    cy.get('[data-testid="nav-bookings"]').click();
    
    // Select service
    cy.get('[data-testid="service-haircut"]').click();
    
    // Select barber
    cy.get('[data-testid="barber-john"]').click();
    
    // Select date/time
    cy.get('input[type="date"]').type('2024-02-20');
    cy.get('input[type="time"]').type('10:00');
    
    // Submit
    cy.get('button[type="submit"]').click();
    
    // Verify booking confirmation
    cy.get('[data-testid="confirmation-message"]').should('be.visible');
    
    // Verify analytics
    cy.window().then((win) => {
      expect(win.gtag).toHaveBeenCalledWith(
        'event',
        'appointment_booked',
        expect.any(Object)
      );
    });
  });

  it('should track payment events', () => {
    // Login and navigate to payment
    cy.login('test@example.com', 'TestPassword123!');
    cy.get('[data-testid="nav-plans"]').click();
    cy.get('[data-testid="upgrade-to-pro"]').click();
    
    // Fill payment form
    cy.get('input[placeholder="Card number"]').type('4242 4242 4242 4242');
    cy.get('input[placeholder="MM/YY"]').type('12/25');
    cy.get('input[placeholder="CVC"]').type('123');
    cy.get('button[type="submit"]').click();
    
    // Verify success
    cy.get('[data-testid="payment-success"]').should('be.visible');
    
    // Verify analytics
    cy.window().then((win) => {
      expect(win.gtag).toHaveBeenCalledWith(
        'event',
        'payment_completed',
        expect.objectContaining({
          custom_metric_revenue: expect.any(Number),
        })
      );
    });
  });
});
```

Run E2E tests:
```bash
npx cypress run
```

---

## Part 6: Implementation Checklist

When adding analytics to a new component:

- [ ] **Import hook**: `import { useAnalytics } from '@/hooks/useAnalytics';`
- [ ] **Call at init**: `const { trackEvent, setUserId } = useAnalytics();`
- [ ] **Track action**: `trackEvent({ name: '...', ... })`
- [ ] **Handle errors**: Track both success and failure states
- [ ] **Set custom dims**: `setCustomDimensions({ ... })` after key events
- [ ] **Add test ID**: `data-testid="component-name"` for E2E testing
- [ ] **Add console log**: Debug mode will show events
- [ ] **Verify in GA4**: Check real-time report
- [ ] **Test on mobile**: Device type should be captured
- [ ] **Test consent**: Verify tracking respects consent setting

---

## Part 7: Common Issues & Fixes

### Events not appearing in GA4?

**Checklist:**
1. [ ] GA4 ID is correct in `.env.local`
2. [ ] Check Real-time report (Admin > Real-time)
3. [ ] Verify event name matches GA4 configuration
4. [ ] Enable debug mode to see console logs
5. [ ] Check if browser is blocking requests to google-analytics.com
6. [ ] Check user consent status
7. [ ] Verify time zone is set correctly in GA4

**Debug:**
```typescript
// Check if analytics is loaded
const { analytics, isReady } = useAnalytics();
console.log('Analytics ready:', isReady);
console.log('Consent given:', analytics?.isConsentGiven());
console.log('Session ID:', analytics?.getSessionId());
```

### Custom dimensions not showing?

1. Verify dimension is created in GA4 admin
2. Event includes the dimension in parameters
3. Wait 24-48 hours for GA4 to process
4. Check dimension name matches exactly (case-sensitive)

### Session ID not persisting?

1. Check localStorage is enabled
2. Verify cookie settings in GA4
3. Check browser privacy mode (might block storage)
4. Clear cache and try again

### Revenue metrics not calculating?

1. Verify custom metric `revenue` is created in GA4
2. Event includes `customMetrics: { revenue: number }`
3. Amount is in cents (multiply by 100)
4. Wait 24-48 hours for historical calculation

---

## Part 8: Performance Testing

### Check for Impact

```typescript
// Measure analytics overhead
const start = performance.now();
trackEvent({ name: 'test_event', ... });
const end = performance.now();
console.log(`Event tracking took ${end - start}ms`);
```

**Expected:** < 5ms per event (tracked asynchronously)

### Monitor Bundle Size

```bash
npm run build
# Check dist/analytics files are < 10KB gzipped
```

### Lighthouse Testing

```bash
npm run lighthouse
# Should not impact Core Web Vitals
```

---

## Part 9: Ongoing Validation

### Weekly Checks

- [ ] Review GA4 real-time report
- [ ] Check event counts are increasing
- [ ] Verify top events are expected
- [ ] Check for error spikes in payment_failed
- [ ] Review conversion rates

### Monthly Reviews

- [ ] Audit custom dimensions/metrics usage
- [ ] Check data quality in dashboards
- [ ] Review GA4 admin for anomalies
- [ ] Validate against business metrics
- [ ] Update documentation as needed

---

## Next Steps

1. Run all test cases above
2. Set up CI/CD to run analytics tests
3. Create monitoring alerts for key metrics
4. Schedule monthly data quality audits
5. Train team on analytics usage

See CUSTOM_EVENTS_REFERENCE.md for event-specific details.
