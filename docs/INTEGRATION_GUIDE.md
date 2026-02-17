# Analytics Integration Guide

Complete step-by-step guide to integrating analytics into your Next.js barbershop SaaS application.

## Quick Start

### 1. Install & Setup (5 minutes)

#### 1.1 Copy Analytics Files

The following files are included in your project:

```
lib/analytics/
  ├── types.ts          # TypeScript definitions for all events
  └── index.ts          # Analytics service implementation

components/providers/
  └── AnalyticsProvider.tsx    # React context provider

hooks/
  └── useAnalytics.ts          # Custom hook for components

components/examples/
  ├── SignupFormExample.tsx
  ├── PaymentFormExample.tsx
  ├── BookingFormExample.tsx
  └── LandingPageExample.tsx

docs/
  ├── GA4_SETUP_GUIDE.md        # GA4 configuration
  ├── CUSTOM_EVENTS_REFERENCE.md # All events documented
  ├── DASHBOARD_SETUP.md         # Creating dashboards
  ├── TESTING_AND_IMPLEMENTATION.md
  ├── PRIVACY_AND_GDPR.md        # Compliance
  └── INTEGRATION_GUIDE.md       # This file
```

#### 1.2 Set Environment Variables

Add to `.env.local`:

```env
# GA4 Property IDs (get from GA4 setup)
NEXT_PUBLIC_GA4_MAIN_APP_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GA4_LANDING_PAGE_ID=G-YYYYYYYYYY
NEXT_PUBLIC_GA4_CUSTOMER_PORTAL_ID=G-ZZZZZZZZZZ

# GTM Container (optional)
NEXT_PUBLIC_GTM_CONTAINER_ID=GTM-XXXXXXX

# Debug mode
NEXT_PUBLIC_GA4_DEBUG_MODE=false

# Consent management
NEXT_PUBLIC_GA4_ENABLE_CONSENT=true
```

**Note:** Get GA4 IDs from [Google Analytics](https://analytics.google.com) - see GA4_SETUP_GUIDE.md

### 2. Wrap App with Provider (5 minutes)

#### 2.1 Update Root Layout

```tsx
// app/layout.tsx
import { AnalyticsProvider } from '@/components/providers/AnalyticsProvider';
import { CookieConsent } from '@/components/CookieConsent';

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {/* Other head content */}
      </head>
      <body>
        <AnalyticsProvider
          config={{
            ga4PropertyId: process.env.NEXT_PUBLIC_GA4_MAIN_APP_ID || '',
            gtmContainerId: process.env.NEXT_PUBLIC_GTM_CONTAINER_ID,
            debugMode: process.env.NEXT_PUBLIC_GA4_DEBUG_MODE === 'true',
            enableCookieConsent: process.env.NEXT_PUBLIC_GA4_ENABLE_CONSENT === 'true',
          }}
        >
          <CookieConsent />
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}
```

#### 2.2 Create Cookie Consent Component

```tsx
// components/CookieConsent.tsx
import React, { useState, useEffect } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const { analytics } = useAnalytics();

  useEffect(() => {
    const consent = localStorage.getItem('analytics_consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('analytics_consent', 'accepted');
    if (analytics) {
      analytics.updateConsent(true);
    }
    setShowBanner(false);
  };

  const handleReject = () => {
    localStorage.setItem('analytics_consent', 'denied');
    if (analytics) {
      analytics.updateConsent(false);
    }
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-50">
      <div className="max-w-4xl mx-auto">
        <h3 className="font-semibold mb-2">Analytics & Cookies</h3>
        <p className="text-sm text-gray-600 mb-4">
          We use analytics to improve your experience. See our{' '}
          <a href="/privacy" className="text-blue-600">privacy policy</a> for details.
        </p>
        <div className="flex gap-4">
          <button
            onClick={handleAccept}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Accept
          </button>
          <button
            onClick={handleReject}
            className="border px-4 py-2 rounded"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Add Tracking to Components (10-30 minutes per component)

For each component that needs tracking, follow this pattern:

#### Example: Signup Form

```tsx
// components/SignupForm.tsx
'use client';

import React, { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { trackSignUp, setUserId, setCustomDimensions } = useAnalytics();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();

        // ✅ Track successful signup
        trackSignUp('email', true);

        // ✅ Set user ID for future tracking
        setUserId(data.userId);

        // ✅ Set custom dimensions
        setCustomDimensions({
          user_type: data.userType,
          plan_tier: 'free',
        });

        // Redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        const errorData = await response.json();
        setError(errorData.message);

        // ✅ Track failed signup
        trackSignUp('email', false, errorData.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);

      // ✅ Track signup error
      trackSignUp('email', false, errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block font-medium">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label htmlFor="password" className="block font-medium">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">
        Sign Up
      </button>
    </form>
  );
}
```

**Key patterns:**
1. ✅ Import hook: `const { trackSignUp, setUserId } = useAnalytics();`
2. ✅ Track success: `trackSignUp('email', true);`
3. ✅ Track failure: `trackSignUp('email', false, errorMessage);`
4. ✅ Set user ID: `setUserId(userId);`
5. ✅ Set custom dims: `setCustomDimensions({ ... });`

---

## Integration Checklist

### By Feature Area

#### Authentication
- [ ] **Signup Form** - `trackSignUp()`, `setUserId()`, `setCustomDimensions()`
- [ ] **Login Form** - `trackLogin()`, `setUserId()`
- [ ] **OAuth flows** - Track provider (google, apple)
- [ ] **Password reset** - Track attempt/success/failure
- [ ] **Logout** - Track logout event

#### Shop Management
- [ ] **Shop Creation** - `trackShopCreated()`, update shop_id dimension
- [ ] **Shop Settings** - `trackFeatureUsed()` for settings page
- [ ] **Staff Management** - Track staff addition/removal
- [ ] **Service Management** - Track service creation

#### Appointment Management
- [ ] **Booking Creation** - `trackAppointmentBooked()` with value & first-booking flag
- [ ] **Booking Cancellation** - Track cancellation event
- [ ] **Recurring Bookings** - Track recurring appointments
- [ ] **Waitlist** - Track waitlist joining

#### Payment
- [ ] **Payment Form** - `trackPaymentCompleted()` on success, `trackPaymentFailed()` on error
- [ ] **Promo Codes** - `trackPromoCodeApplied()` with discount
- [ ] **Plan Upgrades** - `trackPlanUpgrade()` with tier change
- [ ] **Plan Downgrades** - `trackPlanDowngrade()`
- [ ] **Billing Portal** - Track feature usage

#### Features
- [ ] **Recurring Appointments** - `trackFeatureUsed('recurring')`
- [ ] **Waitlist** - `trackFeatureUsed('waitlist')`
- [ ] **Loyalty Program** - `trackLoyaltyPointsEarned()`
- [ ] **SMS Campaigns** - `trackFeatureUsed('sms')`
- [ ] **Email Campaigns** - `trackFeatureUsed('email')`
- [ ] **Payouts** - `trackCommissionPayout()`

#### Landing Page
- [ ] **Page Views** - Auto-tracked via AnalyticsProvider
- [ ] **CTA Buttons** - `trackCTAClick()` for each button
- [ ] **Pricing Section** - `trackPricingTierViewed()` for each tier
- [ ] **Newsletter** - Track signup with `trackEvent()`
- [ ] **Promo Codes** - Track code entry/application

#### Customer Portal
- [ ] **Portal Page Views** - Auto-tracked
- [ ] **Barber Selection** - Custom event for barber view
- [ ] **Service Selection** - Custom event for service view
- [ ] **Time Slot Selection** - Custom event for slot view
- [ ] **Portal Bookings** - `trackPortalBooking()`
- [ ] **Portal Payments** - `trackPaymentCompleted()`
- [ ] **Ratings** - Track review submission

---

## Component-by-Component Implementation

### 1. Form Components

```tsx
// Pattern for all forms
import { useAnalytics } from '@/hooks/useAnalytics';

export function MyForm() {
  const { trackEvent, trackException } = useAnalytics();

  const handleSubmit = async () => {
    try {
      // Your form logic
      trackEvent({
        name: 'form_submitted',  // or other event
        timestamp: Date.now(),
        session_id: '',
        additionalParams: {
          form_name: 'my_form',
          fields_filled: 3,
        },
      });
    } catch (error) {
      trackException(`Form error: ${error.message}`);
    }
  };
}
```

### 2. Page Components

```tsx
// Pattern for pages
'use client';

import { useEffect } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

export function MyPage() {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    // Page view auto-tracked by provider on mount
    // But you can track specific page sections:
    trackPageView(
      window.location.href,
      'My Page Title',
      document.referrer
    );
  }, []);

  return <div>{/* content */}</div>;
}
```

### 3. Button Components

```tsx
// Pattern for CTA buttons
interface CTAButtonProps {
  text: 'Start Free Trial' | 'Schedule Demo' | 'Sign Up';
  section?: string;
  onClick?: () => void;
}

export function CTAButton({ text, section, onClick }: CTAButtonProps) {
  const { trackCTAClick } = useAnalytics();

  const handleClick = () => {
    trackCTAClick(text, section);
    onClick?.();
  };

  return (
    <button onClick={handleClick} className="...">
      {text}
    </button>
  );
}
```

### 4. Modal/Dialog Components

```tsx
// Pattern for modals
export function PricingModal() {
  const { trackPricingTierViewed } = useAnalytics();

  const handleViewTier = (tier: 'free' | 'pro' | 'enterprise', price: number) => {
    trackPricingTierViewed(tier, price * 100); // Convert to cents
  };

  return (
    <div>
      {/* Modal content */}
      <button onClick={() => handleViewTier('pro', 99)}>
        View Pro Plan
      </button>
    </div>
  );
}
```

---

## Testing Your Implementation

### 1. Enable Debug Mode

Set in `.env.local`:
```env
NEXT_PUBLIC_GA4_DEBUG_MODE=true
```

### 2. Check Console Output

Open browser DevTools (F12) > Console

You should see messages like:
```
[Analytics] Initialized in debug mode {ga4PropertyId: 'G-...'}
[Analytics] Event tracked: sign_up {signup_method: 'email', success: true}
[Analytics] User ID set: user_123456
```

### 3. Verify in GA4 Real-Time

1. Open [Google Analytics](https://analytics.google.com)
2. Go to **Reports** > **Real-time**
3. Perform action in your app
4. Should see event within 1-2 seconds

### 4. Check Event Parameters

Install [Google Analytics Debugger](https://chrome.google.com/webstore) extension

Open DevTools > Google Analytics tab

Should see all events and parameters clearly displayed

---

## Performance Optimization

### 1. Reduce Bundle Size

Analytics code is ~15KB minified/gzipped.

To check:
```bash
npm run build
# Check .next/static files
```

### 2. Code Splitting

Analytics provider is lazy-loaded with no impact on initial page load.

### 3. Event Batching

Events are sent asynchronously and batched by GA4 for optimal performance.

### 4. Remove Debug Mode in Production

Always set in `.env.production`:
```env
NEXT_PUBLIC_GA4_DEBUG_MODE=false
```

---

## Common Implementation Mistakes

### ❌ Not Tracking Failures

```typescript
// ❌ BAD - only tracks success
const response = await api.signup();
if (response.ok) {
  trackSignUp('email', true);
}

// ✅ GOOD - tracks both success and failure
if (response.ok) {
  trackSignUp('email', true);
} else {
  trackSignUp('email', false, response.error);
}
```

### ❌ Forgetting Session/User IDs

```typescript
// ❌ BAD - no user ID
trackPaymentCompleted(9999, 'USD', 'pro');

// ✅ GOOD - sets user ID first
setUserId(userId);
trackPaymentCompleted(9999, 'USD', 'pro');
```

### ❌ Wrong Data Types

```typescript
// ❌ BAD - amount as string
trackPaymentCompleted('99.99', 'USD', 'pro');

// ✅ GOOD - amount in cents as number
trackPaymentCompleted(9999, 'USD', 'pro');
```

### ❌ Tracking PII

```typescript
// ❌ BAD - never track email
setCustomDimensions({ user_email: 'john@example.com' });

// ✅ GOOD - track anonymized ID
setCustomDimensions({ user_type: 'shop_owner' });
```

### ❌ Duplicate Tracking

```typescript
// ❌ BAD - event tracked twice
trackSignUp('email', true);
trackSignUp('email', true);  // Duplicate!

// ✅ GOOD - single track
trackSignUp('email', true);
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Remove debug mode: `NEXT_PUBLIC_GA4_DEBUG_MODE=false`
- [ ] Verify GA4 IDs in `.env.local`
- [ ] Test analytics in staging environment
- [ ] Verify consent banner displays
- [ ] Check privacy policy is updated
- [ ] Ensure GDPR/CCPA compliance
- [ ] Create incident response plan for data issues
- [ ] Set up alerts in GA4 for anomalies
- [ ] Document all tracked events
- [ ] Train team on analytics usage
- [ ] Create runbook for troubleshooting
- [ ] Set up scheduled reports

---

## File Structure Reference

```
project/
├── lib/analytics/
│   ├── types.ts                 # Event types (TypeScript)
│   └── index.ts                 # Analytics service
├── components/
│   ├── providers/
│   │   └── AnalyticsProvider.tsx    # React provider
│   ├── examples/
│   │   ├── SignupFormExample.tsx
│   │   ├── PaymentFormExample.tsx
│   │   ├── BookingFormExample.tsx
│   │   └── LandingPageExample.tsx
│   └── CookieConsent.tsx            # Consent banner
├── hooks/
│   └── useAnalytics.ts              # Custom hook
├── docs/
│   ├── GA4_SETUP_GUIDE.md
│   ├── CUSTOM_EVENTS_REFERENCE.md
│   ├── DASHBOARD_SETUP.md
│   ├── TESTING_AND_IMPLEMENTATION.md
│   ├── PRIVACY_AND_GDPR.md
│   └── INTEGRATION_GUIDE.md (this file)
├── pages/api/
│   ├── auth/
│   │   └── signup.ts
│   ├── bookings.ts
│   ├── payments/
│   │   └── process.ts
│   └── user/
│       ├── data-request.ts
│       └── delete-data.ts
├── .env.local                       # Analytics config
└── app/layout.tsx                   # Root layout with provider
```

---

## Next Steps

1. **Complete GA4 Setup** - Follow GA4_SETUP_GUIDE.md
2. **Integrate Provider** - Add AnalyticsProvider to root layout
3. **Add Cookie Consent** - Implement CookieConsent component
4. **Track Components** - Use pattern above for each component
5. **Enable Debug Mode** - Test in development
6. **Verify in GA4** - Check real-time reports
7. **Create Dashboards** - Follow DASHBOARD_SETUP.md
8. **Set Up Testing** - Follow TESTING_AND_IMPLEMENTATION.md
9. **Compliance Review** - Review PRIVACY_AND_GDPR.md
10. **Deploy to Production** - Follow deployment checklist

---

## Support & Resources

- **GA4 Help:** https://support.google.com/analytics
- **Google Analytics Community:** https://support.google.com/analytics/community
- **Privacy Questions:** Consult your privacy lawyer
- **Technical Help:** Review example components

---

## Summary

Your analytics infrastructure is now ready to:

✅ Track user behavior across all properties
✅ Monitor conversion funnels (acquisition → payment)
✅ Measure feature adoption and engagement
✅ Calculate revenue and MRR
✅ Identify churn signals
✅ Comply with GDPR/CCPA
✅ Provide users data access/deletion
✅ Create executive dashboards
✅ Make data-driven decisions

Happy tracking!
