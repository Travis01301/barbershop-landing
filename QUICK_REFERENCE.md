# Analytics Quick Reference Guide

Fast lookup guide for common analytics tasks.

---

## 🚀 Quick Start (15 minutes)

```bash
# 1. Add environment variables
NEXT_PUBLIC_GA4_MAIN_APP_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GA4_DEBUG_MODE=true
NEXT_PUBLIC_GA4_ENABLE_CONSENT=true

# 2. Wrap app with provider
// app/layout.tsx
<AnalyticsProvider config={{...}}>
  <CookieConsent />
  {children}
</AnalyticsProvider>

# 3. Import hook in any component
import { useAnalytics } from '@/hooks/useAnalytics';

# 4. Track events
const { trackSignUp, trackPaymentCompleted } = useAnalytics();
trackSignUp('email', true);
trackPaymentCompleted(9999, 'USD', 'pro');

# 5. Test in console
// DevTools > Console should show:
// [Analytics] Event tracked: sign_up {...}
```

---

## 📱 Common Events

### User Events
```typescript
// Signup
trackSignUp('email', true, errorMsg?);

// Login  
trackLogin('email', true, errorMsg?);

// Set user ID
setUserId('user_123');

// Set custom dimensions
setCustomDimensions({ user_type: 'shop_owner', plan_tier: 'pro' });
```

### Shop Events
```typescript
// Create shop
trackShopCreated('My Barbershop', 5); // name, barber_count

// Set shop ID
setCustomDimensions({ shop_id: 'shop_123' });
```

### Appointment Events
```typescript
// Book appointment
trackAppointmentBooked(
  'Haircut',           // service_type
  'John',              // barber_name
  2500,                // booking_value (cents)
  true                 // is_first_booking
);

// Track waitlist
trackEvent({
  name: 'waitlist_joined',
  timestamp: Date.now(),
  session_id: '',
  additionalParams: {
    service_type: 'Haircut',
    queue_position: 5,
  },
});
```

### Payment Events
```typescript
// Successful payment
trackPaymentCompleted(9999, 'USD', 'pro'); // amount (cents), currency, plan

// Failed payment
trackPaymentFailed('DECLINED', 'Card declined');

// Apply promo code
trackPromoCodeApplied('LAUNCH50', 2000, 9999); // code, discount, original_amount
```

### Plan Events
```typescript
// Upgrade plan
trackPlanUpgrade('free', 'pro'); // from_tier, to_tier

// Downgrade plan
trackPlanDowngrade('pro', 'free');
```

### Feature Events
```typescript
// Use feature
trackFeatureUsed('recurring', 120); // feature_name, duration_seconds
trackFeatureUsed('waitlist');
trackFeatureUsed('loyalty');
trackFeatureUsed('sms');
trackFeatureUsed('email');
trackFeatureUsed('analytics');
```

### Landing Page Events
```typescript
// CTA click
trackCTAClick('Start Free Trial', 'hero'); // button_text, page_section

// View pricing
trackPricingTierViewed('pro', 9900); // tier, price_in_cents

// View page section
trackPageView(location.href, 'My Page'); // url, title
```

### Portal Events
```typescript
// Portal booking
trackPortalBooking('shop_123', 'Haircut'); // shop_id, service_type

// Rate review
trackEvent({
  name: 'review_submitted',
  timestamp: Date.now(),
  session_id: '',
  additionalParams: {
    rating: 5,
    platform: 'in_app',
  },
});
```

---

## 🔧 Configuration

### Environment Variables
```env
# Required
NEXT_PUBLIC_GA4_MAIN_APP_ID=G-XXXXXXXXXX

# Optional
NEXT_PUBLIC_GA4_LANDING_PAGE_ID=G-YYYYYYYYYY
NEXT_PUBLIC_GA4_CUSTOMER_PORTAL_ID=G-ZZZZZZZZZZ
NEXT_PUBLIC_GTM_CONTAINER_ID=GTM-XXXXXXX

# Debug/Testing
NEXT_PUBLIC_GA4_DEBUG_MODE=true

# Privacy
NEXT_PUBLIC_GA4_ENABLE_CONSENT=true
```

### Provider Setup
```tsx
import { AnalyticsProvider } from '@/components/providers/AnalyticsProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AnalyticsProvider
          config={{
            ga4PropertyId: process.env.NEXT_PUBLIC_GA4_MAIN_APP_ID || '',
            gtmContainerId: process.env.NEXT_PUBLIC_GTM_CONTAINER_ID,
            debugMode: process.env.NEXT_PUBLIC_GA4_DEBUG_MODE === 'true',
            enableCookieConsent: true,
          }}
        >
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}
```

---

## 📊 Common Patterns

### Track Form Submission
```tsx
const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    const response = await api.submit(data);
    
    if (response.ok) {
      trackEvent({ name: 'form_submitted', ... });
      // Redirect
    } else {
      trackException(`Form error: ${response.message}`);
    }
  } catch (error) {
    trackException(error.message);
  }
};
```

### Track Button Click
```tsx
const handleClick = () => {
  trackCTAClick('Button Text', 'section_name');
  performAction();
};

<button onClick={handleClick}>Click Me</button>
```

### Track Multi-Step Form
```tsx
// Step 1
trackEvent({ name: 'step_1_started', ... });

// Step 2
trackEvent({ name: 'step_2_completed', ... });

// Complete
trackEvent({ name: 'form_completed', ... });
```

### Track with Error Handling
```tsx
try {
  const result = await api.action();
  trackEvent({ name: 'action_success', ... });
} catch (error) {
  trackEvent({ name: 'action_failed', additionalParams: { error: error.message } });
  trackException(error.message);
}
```

---

## 🧪 Testing

### Enable Debug Mode
```env
NEXT_PUBLIC_GA4_DEBUG_MODE=true
```

### Check Console
```
DevTools > Console
Look for: [Analytics] Event tracked: ...
```

### Verify in GA4
```
1. Open Google Analytics
2. Reports > Real-time
3. Perform action
4. Should appear within 2 seconds
```

### Install Browser Extension
```
Google Analytics Debugger
- Chrome Web Store
- Shows all events in DevTools
```

---

## 📈 Custom Dimensions

### Setting Dimensions
```typescript
setCustomDimensions({
  shop_id: 'shop_123',           // Track shop
  user_type: 'shop_owner',       // Track user role
  plan_tier: 'pro',              // Track plan
  barber_id: 'barber_456',       // Track barber
  customer_id: 'customer_789',   // Track customer
  device_type: 'mobile',         // Track device
});
```

### Safe to Track
✅ shop_id
✅ user_type (shop_owner, barber, customer)
✅ plan_tier (free, pro, enterprise)
✅ barber_id
✅ customer_id
✅ device_type (mobile, desktop, tablet)

### Never Track
❌ user_email
❌ passwords
❌ credit_card_number
❌ phone_number
❌ social_security_number
❌ health_information

---

## 💰 Custom Metrics

### Setting Metrics
```typescript
setCustomMetrics({
  revenue: 9999,              // Amount in cents
  appointments_booked: 5,     // Count
  commission_amount: 2500,    // Amount in cents
  booking_value: 4999,        // Amount in cents
});
```

### In Events
```typescript
trackPaymentCompleted(9999, 'USD', 'pro');
// Automatically sets: revenue: 9999

trackAppointmentBooked('Haircut', 'John', 2500);
// Automatically sets: booking_value: 2500
```

---

## 🔗 API Reference

### useAnalytics Hook Methods

```typescript
// Core methods
trackEvent(event)           // Track any event
setUserId(userId)           // Set authenticated user
setCustomDimensions(dims)   // Set dimensions
setCustomMetrics(metrics)   // Set metrics
trackException(msg, fatal)  // Track error

// Convenience methods
trackSignUp(method, success, errorMsg)
trackLogin(method, success, errorMsg)
trackShopCreated(name, barberCount)
trackAppointmentBooked(service, barber, value, isFirst)
trackPaymentCompleted(amount, currency, planTier)
trackPaymentFailed(errorCode, errorMessage)
trackPromoCodeApplied(code, discount, originalAmount)
trackFeatureUsed(featureName, durationSeconds)
trackPlanUpgrade(fromTier, toTier)
trackCTAClick(buttonText, pageSection)
trackPricingTierViewed(tier, price)
trackPortalBooking(shopId, serviceType)

// Properties
isReady: boolean            // Analytics initialized
analytics: AnalyticsService // Service instance
```

---

## 🚨 Common Mistakes

### ❌ Wrong: Amount as string
```typescript
trackPaymentCompleted('99.99', 'USD', 'pro');
```
### ✅ Correct: Amount as cents
```typescript
trackPaymentCompleted(9999, 'USD', 'pro');
```

### ❌ Wrong: Track email
```typescript
setCustomDimensions({ user_email: 'john@example.com' });
```
### ✅ Correct: Track user type
```typescript
setCustomDimensions({ user_type: 'shop_owner' });
```

### ❌ Wrong: Only track success
```typescript
if (response.ok) {
  trackSignUp('email', true);
}
```
### ✅ Correct: Track success and failure
```typescript
if (response.ok) {
  trackSignUp('email', true);
} else {
  trackSignUp('email', false, response.error);
}
```

### ❌ Wrong: Duplicate tracking
```typescript
trackSignUp('email', true);
trackSignUp('email', true); // Duplicate!
```
### ✅ Correct: Single track
```typescript
trackSignUp('email', true);
```

---

## 🎯 Event Checklist

- [ ] **Signup** - trackSignUp() after registration
- [ ] **Login** - trackLogin() after authentication
- [ ] **Shop Create** - trackShopCreated() + setCustomDimensions(shop_id)
- [ ] **Appointment** - trackAppointmentBooked() + is_first_booking flag
- [ ] **Payment** - trackPaymentCompleted() with revenue metric
- [ ] **Payment Error** - trackPaymentFailed() + trackException()
- [ ] **Promo Code** - trackPromoCodeApplied() with discount amount
- [ ] **Plan Change** - trackPlanUpgrade/Downgrade()
- [ ] **Feature Use** - trackFeatureUsed() with duration
- [ ] **CTA Click** - trackCTAClick() on landing page
- [ ] **Pricing View** - trackPricingTierViewed()
- [ ] **User ID** - setUserId() after login
- [ ] **Custom Dims** - setCustomDimensions() with shop_id, user_type, plan_tier

---

## 📚 Documentation Map

| Guide | Time | Purpose |
|-------|------|---------|
| GA4_SETUP_GUIDE.md | 30 min | Configure GA4 properties |
| INTEGRATION_GUIDE.md | 1-2 hours | Add to your app |
| CUSTOM_EVENTS_REFERENCE.md | 1 hour | Understand all events |
| DASHBOARD_SETUP.md | 2-3 hours | Create dashboards |
| TESTING_AND_IMPLEMENTATION.md | 1-2 hours | Test & verify |
| PRIVACY_AND_GDPR.md | 1 hour | Ensure compliance |

---

## 🔍 Troubleshooting

### Events not appearing?
1. Check GA4 ID in .env.local
2. Enable debug mode: NEXT_PUBLIC_GA4_DEBUG_MODE=true
3. Check console for [Analytics] messages
4. Go to GA4 > Reports > Real-time
5. Wait 1-2 seconds and perform action

### Custom dimensions missing?
1. Create in GA4 Admin > Custom definitions
2. Verify event includes dimension
3. Wait 24-48 hours for GA4 to process
4. Check name matches exactly (case-sensitive)

### No data flowing?
1. Verify GA4 ID is correct
2. Check browser console for errors
3. Verify user consent is given
4. Check if browser is blocking requests
5. Disable ad blockers

### Consent banner not showing?
1. Check NEXT_PUBLIC_GA4_ENABLE_CONSENT=true
2. Clear localStorage
3. Check browser console for errors
4. Verify CookieConsent component is imported

---

## 💡 Pro Tips

1. **Always track failures** - Both success AND error states
2. **Use session IDs** - Groups related events
3. **Minimize data** - Only track what you need
4. **Test thoroughly** - Use debug mode before production
5. **Monitor alerts** - Set up GA4 notifications
6. **Review weekly** - Check dashboards regularly
7. **Document changes** - Keep privacy policy updated
8. **Respect consent** - Always ask before tracking
9. **Check compliance** - GDPR/CCPA requirements
10. **Optimize funnels** - Use data to improve UX

---

## 🆘 Get Help

**Read the full guides:**
- GA4_SETUP_GUIDE.md - Step-by-step setup
- INTEGRATION_GUIDE.md - Detailed integration
- CUSTOM_EVENTS_REFERENCE.md - All events
- PRIVACY_AND_GDPR.md - Legal/compliance
- TESTING_AND_IMPLEMENTATION.md - Testing guide

**External help:**
- [GA4 Support](https://support.google.com/analytics)
- [GDPR Info](https://gdpr-info.eu)
- [Privacy Policy Generator](https://www.termly.io)

---

## ⚡ One-Liners

```typescript
// Quick setup in any component
import { useAnalytics } from '@/hooks/useAnalytics';
const { trackEvent } = useAnalytics();

// Track signup
trackSignUp('email', true);

// Track payment
trackPaymentCompleted(9999, 'USD', 'pro');

// Track booking
trackAppointmentBooked('Haircut', 'John', 2500, true);

// Set user
setUserId('user_123');

// Set shop
setCustomDimensions({ shop_id: 'shop_123' });

// Track feature
trackFeatureUsed('recurring', 120);

// Track CTA
trackCTAClick('Sign Up', 'hero');
```

---

## 🎓 Learning Path

### Beginner (1 day)
1. Read README.md overview
2. Read INTEGRATION_GUIDE.md quick start
3. Set up environment variables
4. Add AnalyticsProvider to app
5. Test in debug mode

### Intermediate (2-3 days)
1. Read GA4_SETUP_GUIDE.md
2. Create GA4 properties
3. Add tracking to key components
4. Verify in GA4 real-time
5. Read CUSTOM_EVENTS_REFERENCE.md

### Advanced (1 week)
1. Create dashboards (DASHBOARD_SETUP.md)
2. Set up alerts
3. Implement all event tracking
4. Enable BigQuery export
5. Create custom SQL queries

### Expert (Ongoing)
1. Monitor dashboards daily
2. Create custom reports
3. Perform funnel analysis
4. Optimize conversion rates
5. Track ROI and LTV

---

## ✨ You've Got This!

This quick reference covers 80% of what you need.
For detailed info, check the full documentation.

**Happy tracking!** 📊
