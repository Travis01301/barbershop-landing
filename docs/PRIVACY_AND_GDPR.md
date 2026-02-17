# Privacy, GDPR & CCPA Compliance Guide

Complete guide to implementing analytics in a privacy-respecting, compliant manner.

## Overview

This guide ensures the barbershop SaaS analytics implementation complies with:
- **GDPR** (General Data Protection Regulation) - EU users
- **CCPA** (California Consumer Privacy Act) - California users
- **Best practices** - Privacy-first analytics

---

## Part 1: GDPR Compliance

### 1.1 Legal Basis for Processing

**Article 6 GDPR:** We need a legal basis to track users. Choose one:

**Option 1: Consent (Recommended)**
- Users opt-in to analytics
- Consent must be:
  - Explicit and clear
  - Easy to withdraw
  - Not bundled with other services
- Best for: Transparent, user-friendly

**Option 2: Legitimate Interest**
- We have a business need to understand user behavior
- Must perform "balance test" showing benefit > privacy risk
- Less user-friendly
- Good for: Internal optimization

**Option 3: Performance of Contract**
- User agreed to service that requires analytics
- Only for essential analytics (not marketing)
- Limited use

**Recommendation:** Use **Consent** model with easy opt-out.

### 1.2 Cookie Consent Banner

Implement a clear, compliant banner:

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
    // Update GA4 consent
    if (analytics) {
      analytics.updateConsent(true);
    }
    setShowBanner(false);
  };

  const handleReject = () => {
    localStorage.setItem('analytics_consent', 'denied');
    // Update GA4 consent
    if (analytics) {
      analytics.updateConsent(false);
    }
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-50">
      <div className="max-w-4xl mx-auto">
        <h3 className="font-semibold mb-2">We use analytics to improve your experience</h3>
        <p className="text-sm text-gray-600 mb-4">
          We use Google Analytics to understand how you use our service and make improvements.
          Your data is never shared with third parties. <a href="/privacy" className="text-blue-600">Learn more</a>.
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
            className="border border-gray-300 px-4 py-2 rounded"
          >
            Reject
          </button>
          <a href="/privacy" className="px-4 py-2 text-blue-600">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}
```

**Banner Requirements:**
- [ ] Clear explanation of what data is collected
- [ ] Link to privacy policy
- [ ] Explicit "Accept" button
- [ ] Clear "Reject" button (not buried)
- [ ] No pre-checked boxes
- [ ] Easy to withdraw consent later

### 1.3 Privacy Policy Sections

Your privacy policy must include:

#### 1.3.1 Analytics Data Collection
```
We use Google Analytics 4 to analyze how users interact with our service.
This helps us improve our product and understand user needs.

Data collected includes:
- Page views and user journeys
- Conversion events (signups, bookings, payments)
- Device type and browser information
- Approximate location (country/region level)

Data is NOT collected:
- Personal information (name, email) in GA4
- Passwords or financial details
- Sensitive health information
```

#### 1.3.2 Cookies Used
```
We use the following cookies for analytics:
- _ga: Google Analytics session tracking (expires: 2 years)
- _ga_[property-id]: Property-specific tracking
- _gid: GA session identifier (expires: 24 hours)

These cookies track your interactions to create reports
on website activity and user engagement.
```

#### 1.3.3 Data Retention
```
Google Analytics data is retained for:
- Event data: 14 months (per user setting)
- User identifiers: Until user opts out or 24+ months inactive

Users can request deletion of their data anytime.
```

#### 1.3.4 Third-Party Sharing
```
Data is shared with:
- Google Analytics (for analysis)
- Google Cloud/BigQuery (for long-term analysis, optional)

Data is NOT shared with:
- Marketing partners
- Advertising networks
- Data brokers
- Any third party without explicit consent
```

#### 1.3.5 User Rights (GDPR)
```
Under GDPR, users have the right to:
- Access: Request copy of their data
- Rectification: Correct inaccurate data
- Erasure: Request data deletion
- Portability: Export their data
- Objection: Opt-out of processing

To exercise these rights, email: privacy@yourdomain.com
We will respond within 30 days.
```

### 1.4 Data Processing Agreement (DPA)

Ensure Google signs your DPA:

1. Go to [Google Analytics DPA](https://support.google.com/analytics/answer/3379636)
2. Accept Google's standard DPA
3. This covers all GA4 data processing

### 1.5 Data Protection Impact Assessment (DPIA)

If analytics involves "large-scale systematic monitoring":

Create DPIA covering:
- Purpose of analytics
- Data collected and retention
- Privacy risks identified
- Mitigation measures
- Benefits to users
- Necessity and proportionality

---

## Part 2: CCPA Compliance (California)

### 2.1 California Residents Rights

Users in California have right to:
- **Know** what personal information is collected
- **Delete** their personal information
- **Opt-out** of sale or sharing
- **Correct** inaccurate information

### 2.2 Privacy Policy - CCPA Section

Add to privacy policy:

```
CALIFORNIA CONSUMER PRIVACY ACT (CCPA)

This section applies to California residents.

Information We Collect:
- Device identifiers (cookie IDs, IP addresses)
- Usage data (page views, clicks, conversions)
- Location data (country/state level)

Purpose of Collection:
- Understand user behavior
- Improve our service
- Analyze marketing effectiveness
- Detect fraud/security issues

Sale or Sharing of Data:
We do NOT sell or share personal information with third parties.

Your Rights:
- Right to Know: Request copy of data (email: privacy@yourdomain.com)
- Right to Delete: Request deletion of data
- Right to Opt-Out: Opt-out via preference center
- Right to Correct: Request correction of inaccurate data
- Non-Discrimination: No penalty for exercising rights

Opt-Out Mechanism:
Users can opt-out of analytics via the preference center:
[Link to preference center or analytics settings]
```

### 2.3 CCPA Opt-Out Implementation

Provide easy opt-out mechanism:

```tsx
// components/AnalyticsPreferences.tsx

import React from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

export function AnalyticsPreferences() {
  const { analytics } = useAnalytics();

  const handleOptOut = () => {
    // Disable analytics
    localStorage.setItem('analytics_consent', 'denied');
    if (analytics) {
      analytics.updateConsent(false);
    }
    alert('You have successfully opted out of analytics.');
  };

  return (
    <div className="bg-gray-50 p-6 rounded">
      <h3 className="font-semibold mb-2">Analytics Preferences</h3>
      <p className="text-sm text-gray-600 mb-4">
        We use analytics to understand how you use our service and improve it.
        You can opt-out at any time.
      </p>
      <button
        onClick={handleOptOut}
        className="bg-red-600 text-white px-4 py-2 rounded"
      >
        Opt Out of Analytics
      </button>
    </div>
  );
}
```

---

## Part 3: Data Minimization & Privacy Best Practices

### 3.1 What NOT to Track

**Never track:**
- [ ] User emails or usernames (in GA4)
- [ ] Passwords or authentication secrets
- [ ] Credit card numbers or payment details
- [ ] Health/medical information
- [ ] Racial or ethnic information
- [ ] Political beliefs or affiliations
- [ ] Precise location data (GPS coordinates)
- [ ] Biometric data
- [ ] Genetic information

**Instead track:**
- [ ] User ID (anonymized identifier)
- [ ] Event type (signup, payment, etc.)
- [ ] Service category (not health data)
- [ ] Approximate location (country/state)
- [ ] Device type (mobile/desktop)
- [ ] Plan tier (free/pro/enterprise)

### 3.2 PII Prevention

Use User-ID feature securely:

```typescript
// ✅ CORRECT - Anonymized user ID
analytics.setUserId('user_abc123def456');

// ❌ WRONG - Never use email as user ID
analytics.setUserId('user@example.com');

// ❌ WRONG - Never use personal details
analytics.setUserId('john_smith_dob_1990');
```

### 3.3 Custom Dimensions - Privacy First

**Safe dimensions:**
```typescript
setCustomDimensions({
  shop_id: 'shop_123',        // ✅ Anonymized
  user_type: 'shop_owner',    // ✅ Generic category
  plan_tier: 'pro',           // ✅ Public information
  device_type: 'mobile',      // ✅ Non-personal
});
```

**Unsafe dimensions:**
```typescript
setCustomDimensions({
  user_email: 'john@example.com',    // ❌ PII
  phone_number: '555-1234',          // ❌ PII
  ssn: '123-45-6789',                // ❌ Sensitive
  credit_score: 750,                 // ❌ Financial info
});
```

### 3.4 Event Parameters - Privacy Audit

Before sending events:

```typescript
// ✅ GOOD
trackEvent({
  name: 'payment_completed',
  additionalParams: {
    plan_tier: 'pro',           // ✅ Plan name
    currency: 'USD',            // ✅ Currency
    amount: 9999,               // ✅ Numeric only
  },
});

// ❌ BAD
trackEvent({
  name: 'payment_completed',
  additionalParams: {
    email: 'john@example.com',  // ❌ PII
    card_number: '4111111111',  // ❌ Financial
    full_name: 'John Smith',    // ❌ PII
  },
});
```

---

## Part 4: Consent Management Implementation

### 4.1 Consent Modes in GA4

Google provides three consent modes:

**Mode 1: Consent Not Required**
- For low-risk analytics
- EU users still need banner
- Data flows normally

**Mode 2: Require User Consent** (Recommended)
- Ask users before tracking
- Only track if consent given
- Provide easy opt-out

**Mode 3: Cookie Policy Only**
- Just inform in privacy policy
- No active consent required
- Not recommended (not fully GDPR compliant)

### 4.2 Implementing Consent Mode

In analytics service:

```typescript
// Enable in GA4 consent mode
window.gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
});

// User accepts consent
window.gtag('consent', 'update', {
  analytics_storage: 'granted',
  ad_storage: 'denied',  // Still no ads
  ad_user_data: 'denied',
  ad_personalization: 'denied',
});

// User rejects consent
window.gtag('consent', 'update', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
});
```

### 4.3 Consent Persistence

Save consent choice:

```typescript
const saveConsent = (consent: boolean) => {
  // Save to localStorage
  localStorage.setItem('analytics_consent', consent ? 'accepted' : 'denied');
  
  // Sync with GA4
  updateGA4Consent(consent);
};

const loadConsent = (): boolean => {
  const stored = localStorage.getItem('analytics_consent');
  if (stored === 'accepted') return true;
  if (stored === 'denied') return false;
  // No preference yet
  return false;
};
```

---

## Part 5: User Data Rights Implementation

### 5.1 Data Access Request

Create endpoint for users to request their data:

```typescript
// pages/api/user/data-request.ts

export async function POST(req: Request) {
  const { userId, email } = await req.json();

  // 1. Verify user identity
  // 2. Get user data from your database
  // 3. Get user data from GA4 (via BigQuery)
  // 4. Compile into report
  // 5. Email to user

  return {
    status: 'submitted',
    message: 'Your data request has been submitted. You will receive it via email within 30 days.',
  };
}
```

### 5.2 Data Deletion

```typescript
// pages/api/user/delete-data.ts

export async function POST(req: Request) {
  const { userId } = await req.json();

  // 1. Verify user identity
  // 2. Delete from your database
  // 3. Set GA4 opt-out cookie
  // 4. Request deletion in GA4
  // 5. Confirm deletion

  // Set GA4 opt-out cookie (prevents future tracking)
  setHeaderCookie(
    '_ga_opt_out',
    'true',
    { maxAge: '9999999999' }
  );

  return {
    status: 'success',
    message: 'Your data has been deleted.',
  };
}
```

### 5.3 Privacy Policy - User Rights Section

```
DATA RIGHTS & REQUESTS

You have the right to request:

1. Data Access
   - Receive copy of your personal data
   - Specify format (PDF, CSV, JSON)
   - Response time: 30 days

2. Data Deletion
   - Request permanent deletion
   - We will remove from all systems
   - Opt-out of future analytics
   - Response time: 30 days

3. Data Correction
   - Fix inaccurate information
   - Request changes to your profile
   - Response time: 14 days

4. Data Portability
   - Export your data
   - Receive in machine-readable format
   - Share with other services
   - Response time: 30 days

To Submit a Request:
Email: privacy@yourdomain.com
Include: Your user ID or email
Attach: Proof of identity (optional)

We take all requests seriously and will respond promptly.
```

---

## Part 6: International Compliance

### 6.1 Multiple Jurisdictions

**If you serve users in:**

**EU (GDPR):**
- [ ] Display cookie consent banner
- [ ] Implement consent mode
- [ ] Sign DPA with Google
- [ ] Create DPIA documentation
- [ ] Provide data access/deletion tools

**California (CCPA):**
- [ ] Add CCPA section to privacy policy
- [ ] Provide opt-out mechanism
- [ ] Honor do-not-sell requests
- [ ] Respond to data requests within 45 days

**Canada (PIPEDA):**
- [ ] Obtain consent for analytics
- [ ] Provide privacy policy in English/French
- [ ] Implement access/correction/deletion

**Australia (Privacy Act):**
- [ ] Implement consent/opt-out
- [ ] Australian Privacy Policy addendum
- [ ] Data retention policies

### 6.2 Geolocation-Based Consent

Different rules apply by location:

```typescript
const getLocationFromIP = async (ip: string) => {
  // Use IP geolocation service
  const location = await geoip.lookup(ip);
  return location.country; // 'US', 'DE', 'CA', etc.
};

const requiresConsentByLocation = (country: string): boolean => {
  // Countries with strict privacy laws
  const strictCountries = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', // EU
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    'CA', // Canada
    'CH', // Switzerland
    'GB', // UK
  ];
  return strictCountries.includes(country);
};

// If user is in EU/CA/CH, show consent banner
if (requiresConsentByLocation(userCountry)) {
  <CookieConsent />;
}
```

---

## Part 7: Ongoing Compliance

### 7.1 Audit Checklist (Quarterly)

- [ ] Review privacy policy for updates
- [ ] Check GA4 data retention settings
- [ ] Verify consent banner is displaying
- [ ] Audit custom dimensions for PII
- [ ] Review user data requests received
- [ ] Check third-party integrations
- [ ] Update DPIA if necessary
- [ ] Review GA4 security settings

### 7.2 Compliance Documentation

Create and maintain:
- [ ] Privacy Policy (updated version)
- [ ] Terms of Service
- [ ] Data Processing Agreement (GA4)
- [ ] Data Protection Impact Assessment (DPIA)
- [ ] Consent management audit trail
- [ ] Data deletion/access requests log

### 7.3 Team Training

Ensure team understands:
- [ ] What is PII and what isn't
- [ ] Why data minimization matters
- [ ] How to respond to data requests
- [ ] Privacy by design principles
- [ ] Incident response procedures

---

## Part 8: Common Compliance Mistakes

### ❌ Don't:
1. **Track emails in GA4** - Use anonymized user ID instead
2. **Forget consent banner** - Required for GDPR compliance
3. **Store consent flag in GA** - Keep in localStorage or database
4. **Ignore CCPA opt-out** - Implement and honor requests
5. **Share data with unlimited third parties** - Only necessary integrations
6. **Collect data "just in case"** - Minimize from the start
7. **Store data forever** - Set retention limits
8. **Ignore user requests** - Must respond within timeframe
9. **Track in private browsing** - Respect user choice
10. **Use tracking pixels without consent** - Always ask first

### ✅ Do:
1. **Ask for consent first** - Clear, easy opt-in
2. **Make opt-out easy** - Settings, banner, tools
3. **Document everything** - Privacy policy, DPA, DPIA
4. **Minimize data collected** - Only what you need
5. **Secure user data** - Encryption, access controls
6. **Respect user rights** - Access, deletion, correction
7. **Set retention limits** - 14 months for GA4
8. **Respond to requests** - Within 30 days
9. **Update regularly** - Privacy laws evolve
10. **Be transparent** - Tell users what you track

---

## Part 9: Resources & Templates

### Privacy Policy Generator
- https://www.termly.io/products/privacy-policy-generator/
- https://www.privacypolicies.com/

### DPIA Template
- [GDPR.eu DPIA Template](https://gdpr-info.eu/art-35-gdpr/)
- [ICO DPIA Template](https://ico.org.uk/for-organisations/data-protection/data-protection-impact-assessments/)

### DPA with Google
- [Google Analytics DPA](https://support.google.com/analytics/answer/3379636)
- [Google Standard Contractual Clauses](https://support.google.com/analytics/answer/9973249)

### Compliance Checklist
- [GDPR Checklist](https://gdpr-info.eu/checklist/)
- [CCPA Checklist](https://www.oag.ca.gov/privacy/ccpa)

---

## Conclusion

Privacy-respecting analytics is:
- **Better for users** - Trust and transparency
- **Better for business** - Compliance, reputation, retention
- **Better long-term** - Avoid fines and lawsuits

Implement consent, minimize data, respect rights, and document everything.

Questions? Consult a privacy lawyer for jurisdiction-specific advice.
