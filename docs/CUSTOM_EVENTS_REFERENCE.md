# Custom Events Reference

Complete reference of all custom events tracked throughout the barbershop SaaS platform.

## Event Structure

All events follow this structure:

```typescript
{
  name: string;              // Event name (e.g., 'sign_up')
  timestamp: number;         // Unix timestamp
  session_id: string;        // Unique session identifier
  user_id?: string;          // Authenticated user ID
  customDimensions?: {};     // Custom dimensions (shop_id, user_type, etc.)
  customMetrics?: {};        // Custom metrics (revenue, appointments, etc.)
  additionalParams?: {};     // Event-specific parameters
}
```

## Landing Page Events

### `page_view`
**When:** User views any page on the landing page site

**Parameters:**
- `page_location` (string) - Full URL
- `page_title` (string) - Page title
- `page_referrer` (string) - Referrer URL
- `section` (enum) - Page section: `hero`, `features`, `pricing`, `faq`, `footer`

**Example Implementation:**
```typescript
const { trackPageView } = useAnalytics();

useEffect(() => {
  trackPageView(window.location.href, document.title);
}, []);
```

---

### `cta_click`
**When:** User clicks a call-to-action button

**Parameters:**
- `button_text` (enum) - `Start Free Trial` | `Schedule Demo` | `Sign Up`
- `button_name` (string) - Button identifier
- `page_section` (string) - Section where button appears
- `link_url` (string) - Destination URL

**Example Implementation:**
```typescript
const { trackCTAClick } = useAnalytics();

const handleClick = () => {
  trackCTAClick('Start Free Trial', 'hero_section');
  window.location.href = '/signup';
};
```

---

### `pricing_tier_viewed`
**When:** User views a pricing tier option

**Parameters:**
- `pricing_tier` (enum) - `free` | `pro` | `enterprise`
- `price_amount` (number) - Price in cents
- `currency` (string) - Currency code (USD, EUR, etc.)

**Example Implementation:**
```typescript
const { trackPricingTierViewed } = useAnalytics();

const handlePricingView = (tier, price) => {
  trackPricingTierViewed(tier, price * 100); // Convert to cents
};
```

---

### `newsletter_signup`
**When:** User subscribes to newsletter

**Parameters:**
- `email_domain` (string) - Domain of email address
- `signup_source` (string) - Where signup happened (footer, popup, etc.)

**Example Implementation:**
```typescript
const { trackEvent } = useAnalytics();

const handleNewsletterSignup = (email) => {
  trackEvent({
    name: 'newsletter_signup',
    timestamp: Date.now(),
    session_id: '',
    additionalParams: {
      email_domain: email.split('@')[1],
      signup_source: 'footer',
    },
  });
};
```

---

### `promo_code_entered`
**When:** User enters a promo code on landing page

**Parameters:**
- `promo_code` (string) - The code entered
- `discount_amount` (number) - Amount off in cents
- `discount_percentage` (number) - Percentage discount

**Example Implementation:**
```typescript
const { trackEvent } = useAnalytics();

const handlePromoCode = (code, discount) => {
  trackEvent({
    name: 'promo_code_entered',
    timestamp: Date.now(),
    session_id: '',
    additionalParams: {
      promo_code: code,
      discount_percentage: 20, // For LAUNCH50
    },
  });
};
```

---

## App User Events

### `sign_up`
**When:** User completes signup

**Parameters:**
- `signup_method` (enum) - `email` | `google` | `apple`
- `success` (boolean) - Whether signup was successful
- `error_message` (string) - Error message if failed

**Custom Dimensions:**
- `user_type` (enum) - `shop_owner` | `barber` | `customer`
- `plan_tier` (enum) - `free` | `pro` | `enterprise`

**Example Implementation:**
```typescript
const { trackSignUp, setUserId, setCustomDimensions } = useAnalytics();

const handleSignup = async (email, password) => {
  try {
    const response = await api.signup({ email, password });
    trackSignUp('email', true);
    setUserId(response.userId);
    setCustomDimensions({
      user_type: 'shop_owner',
      plan_tier: 'free',
    });
  } catch (error) {
    trackSignUp('email', false, error.message);
  }
};
```

---

### `login`
**When:** User logs in to the app

**Parameters:**
- `login_method` (enum) - `email` | `google` | `apple`
- `success` (boolean) - Whether login was successful
- `error_message` (string) - Error message if failed

**Example Implementation:**
```typescript
const { trackLogin, setUserId } = useAnalytics();

const handleLogin = async (email, password) => {
  try {
    const response = await api.login({ email, password });
    trackLogin('email', true);
    setUserId(response.userId);
  } catch (error) {
    trackLogin('email', false, error.message);
  }
};
```

---

### `shop_created`
**When:** User creates a new barbershop

**Parameters:**
- `shop_name` (string) - Name of the shop
- `location` (string) - Shop location
- `barber_count` (number) - Initial number of barbers
- `initial_services` (number) - Number of services

**Custom Dimensions:**
- `shop_id` (string) - The created shop ID

**Example Implementation:**
```typescript
const { trackShopCreated, setCustomDimensions } = useAnalytics();

const handleCreateShop = async (shopData) => {
  const response = await api.shops.create(shopData);
  trackShopCreated(shopData.name, shopData.barberCount);
  setCustomDimensions({
    shop_id: response.shopId,
  });
};
```

---

## Appointment Events

### `appointment_booked`
**When:** User successfully books an appointment

**Parameters:**
- `service_type` (string) - Type of service (haircut, beard trim, etc.)
- `barber_name` (string) - Name of selected barber
- `appointment_date` (string) - Date of appointment
- `appointment_time` (string) - Time of appointment
- `is_first_booking` (boolean) - Whether this is the user's first booking

**Custom Metrics:**
- `booking_value` (number) - Price in cents

**Example Implementation:**
```typescript
const { trackAppointmentBooked } = useAnalytics();

const handleBooking = async (bookingData) => {
  const response = await api.bookings.create(bookingData);
  trackAppointmentBooked(
    bookingData.service,
    bookingData.barber,
    response.price * 100, // cents
    response.isFirstBooking
  );
};
```

---

### `appointment_cancelled`
**When:** Appointment is cancelled

**Parameters:**
- `cancellation_reason` (string) - Why it was cancelled
- `refund_issued` (boolean) - Whether refund was issued
- `time_until_appointment` (string) - Time until appointment was scheduled

---

### `recurring_appointment_created`
**When:** User creates a recurring appointment

**Parameters:**
- `frequency` (enum) - `weekly` | `biweekly` | `monthly`
- `service_type` (string) - Type of service
- `barber_id` (string) - Assigned barber
- `total_appointments` (number) - Total appointments in series

---

## Payment Events

### `payment_completed`
**When:** Payment is successfully processed

**Parameters:**
- `payment_method` (string) - Method used (card, apple_pay, etc.)
- `currency` (string) - Currency code
- `transaction_id` (string) - Transaction ID from payment processor
- `plan_tier` (enum) - `free` | `pro` | `enterprise`
- `is_recurring` (boolean) - Whether payment is recurring

**Custom Metrics:**
- `revenue` (number) - Amount in cents

**Custom Dimensions:**
- `plan_tier` (enum) - The plan being purchased

**Conversion:** Yes - Mark as conversion in GA4

**Example Implementation:**
```typescript
const { trackPaymentCompleted, setCustomMetrics } = useAnalytics();

const handlePaymentSuccess = (paymentData) => {
  trackPaymentCompleted(paymentData.amount * 100, 'USD', 'pro');
  setCustomMetrics({
    revenue: paymentData.amount * 100,
  });
};
```

---

### `payment_failed`
**When:** Payment fails to process

**Parameters:**
- `payment_method` (string) - Payment method attempted
- `error_code` (string) - Error code from processor
- `error_message` (string) - Error description
- `currency` (string) - Currency attempted
- `amount` (number) - Amount in cents

**Example Implementation:**
```typescript
const { trackPaymentFailed, trackException } = useAnalytics();

const handlePaymentError = (error) => {
  trackPaymentFailed(error.code, error.message);
  trackException(`Payment failed: ${error.message}`);
};
```

---

### `promo_code_applied`
**When:** Promo code is successfully applied to payment

**Parameters:**
- `promo_code` (string) - The code applied
- `discount_amount` (number) - Discount in cents
- `discount_percentage` (number) - Discount percentage
- `original_amount` (number) - Price before discount in cents
- `final_amount` (number) - Price after discount in cents

**Example Implementation:**
```typescript
const { trackPromoCodeApplied } = useAnalytics();

const applyPromoCode = (code, originalPrice) => {
  const discount = originalPrice * 0.2; // 20% off
  trackPromoCodeApplied(
    code,
    discount * 100,
    originalPrice * 100
  );
};
```

---

## Plan Events

### `plan_upgrade`
**When:** User upgrades to a higher tier plan

**Parameters:**
- `from_tier` (enum) - Previous plan
- `to_tier` (enum) - New plan
- `upgrade_cost` (number) - Cost of upgrade in cents
- `currency` (string) - Currency

**Conversion:** Yes

---

### `plan_downgrade`
**When:** User downgrades to a lower tier plan

**Parameters:**
- `from_tier` (enum) - Previous plan
- `to_tier` (enum) - New plan
- `refund_issued` (boolean) - Whether partial refund given
- `refund_amount` (number) - Refund amount in cents

---

## Feature Usage Events

### `feature_used`
**When:** User accesses a feature

**Parameters:**
- `feature_name` (enum) - `recurring` | `waitlist` | `loyalty` | `sms` | `email` | `analytics`
- `feature_section` (string) - Where in app
- `duration_seconds` (number) - How long feature was used

**Example Implementation:**
```typescript
const { trackFeatureUsed } = useAnalytics();
const startTime = useRef(Date.now());

useEffect(() => {
  return () => {
    const duration = Math.round((Date.now() - startTime.current) / 1000);
    trackFeatureUsed('recurring_appointments', duration);
  };
}, []);
```

---

## Communication Events

### `email_sent`
**When:** Marketing or transactional email is sent

**Parameters:**
- `email_type` (enum) - `promotional` | `transactional` | `reminder` | `notification`
- `recipient_count` (number) - Number of recipients
- `template_name` (string) - Email template used

---

### `sms_sent`
**When:** SMS message is sent

**Parameters:**
- `sms_type` (enum) - `promotional` | `reminder` | `notification`
- `recipient_count` (number) - Number of recipients

---

## Review Events

### `review_submitted`
**When:** Customer submits a review/rating

**Parameters:**
- `rating` (number) - 1-5 star rating
- `review_text` (string) - Text of review (optional)
- `platform` (enum) - `in_app` | `google` | `external`

---

## Payout Events

### `commission_payout`
**When:** Barber commission is paid out

**Parameters:**
- `barber_id` (string) - Barber receiving payout
- `payout_method` (string) - Method used (bank transfer, etc.)
- `commission_period` (string) - Period covered (e.g., "2024-01")
- `transaction_id` (string) - Payout transaction ID

**Custom Metrics:**
- `commission_amount` (number) - Amount in cents

---

## Customer Portal Events

### `portal_booking`
**When:** Customer books via the public portal

**Parameters:**
- `shop_id` (string) - Which shop
- `barber_id` (string) - Which barber
- `service_type` (string) - Service booked
- `booking_source` (enum) - `qr` | `link` | `search`

**Custom Dimensions:**
- `shop_id` (string) - Shop ID

**Conversion:** Yes

---

### `waitlist_joined`
**When:** Customer joins service waitlist

**Parameters:**
- `service_type` (string) - Service waitlist for
- `preferred_barber` (string) - Preferred barber (if selected)
- `queue_position` (number) - Position in queue

---

### `loyalty_points_earned`
**When:** Customer earns loyalty points

**Parameters:**
- `points_amount` (number) - Points earned
- `action_type` (enum) - `booking` | `review` | `referral`
- `loyalty_program` (string) - Program name

---

## Event Implementation Checklist

When implementing an event, ensure:

- [ ] Event is defined in `lib/analytics/types.ts`
- [ ] Event is properly typed
- [ ] Custom dimensions/metrics are set
- [ ] Event is tracked at the right time
- [ ] Error states are handled
- [ ] Consent is checked before tracking
- [ ] Debug mode logs the event
- [ ] Event appears in GA4 real-time reports
- [ ] Event is added to appropriate funnels
- [ ] Documentation is updated

## Best Practices

### Timing
- Track events **immediately** after the action
- Don't wait for API responses unless necessary
- Track both success AND failure states

### Parameters
- Always include relevant context
- Use consistent parameter names
- Never include PII (email, password, etc.)
- Include IDs not names when possible

### Performance
- Events are sent asynchronously
- No blocking of user actions
- Use `useCallback` to prevent recreation
- Batch multiple events when possible

### Privacy
- Don't track sensitive data
- Respect user consent settings
- Always anonymize where possible
- Document data collection practices

---

## Troubleshooting Events

### Event not appearing in GA4?
1. Check browser console for errors
2. Open DevTools > Network tab
3. Look for requests to `google-analytics.com`
4. Verify GA4 ID is correct
5. Check user consent status

### Event parameters not showing?
1. Verify parameter name matches GA4 configuration
2. Check custom dimension/metric is registered in GA4
3. Wait 24-48 hours for GA4 to process
4. Check event name is spelled correctly

### Session ID not persisting?
1. Check localStorage for analytics_consent
2. Verify cookie settings in GA4
3. Check if browser is blocking cookies
4. Review cross-domain tracking setup

---

## Export to BigQuery

For advanced analysis, export events to BigQuery:

1. Admin > Property Settings > BigQuery Link
2. Follow setup wizard
3. Events appear in BigQuery within 24 hours
4. Use SQL to analyze custom events
5. Connect to Data Studio for visualization

See DASHBOARD_SETUP.md for queries and examples.
