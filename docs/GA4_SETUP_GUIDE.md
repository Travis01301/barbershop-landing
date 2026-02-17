# Google Analytics 4 Setup Guide

Complete step-by-step guide to set up GA4 for the barbershop SaaS with multiple properties.

## Overview

We'll create **3 separate GA4 properties**:
1. **Main App** - Shop owner/barber dashboard
2. **Landing Page** - Public marketing site
3. **Customer Portal** - Public booking portal

This separation allows for:
- Independent analytics for each product
- Different consent/tracking policies per property
- Cleaner data isolation
- Separate dashboards per product

## Step 1: Create GA4 Property for Main App

### 1.1 Create Google Analytics Account
1. Go to [Google Analytics](https://analytics.google.com)
2. Click **Start measuring**
3. Enter Account name: `Barbershop SaaS`
4. Accept terms and create account

### 1.2 Create First Property (Main App)
1. In Admin section, click **Create Property**
2. Property name: `Main App - Barbershop Dashboard`
3. Select time zone: Your business location
4. Currency: USD
5. Industry: Professional Services / Personal Services
6. Business size: Choose based on your business
7. Click **Create**

### 1.3 Create Web Data Stream
1. Select Platform: **Web**
2. Website URL: `https://yourdomain.com` (or development URL)
3. Stream name: `Main App Web`
4. Click **Create stream**

### 1.4 Copy Measurement ID
- You'll see a Measurement ID like `G-XXXXXXXXXX`
- Save this as `NEXT_PUBLIC_GA4_MAIN_APP_ID` in your `.env.local`

## Step 2: Create GA4 Property for Landing Page

1. Go back to Admin > **Create Property**
2. Property name: `Landing Page - Marketing Site`
3. Website URL: `https://yourdomain.com/landing` (or separate domain)
4. Stream name: `Landing Page Web`
5. Copy Measurement ID
6. Save as `NEXT_PUBLIC_GA4_LANDING_PAGE_ID` in `.env.local`

## Step 3: Create GA4 Property for Customer Portal

1. Create another property
2. Property name: `Customer Portal - Public Bookings`
3. Website URL: `https://yourdomain.com/portal` (or `bookings.yourdomain.com`)
4. Stream name: `Portal Web`
5. Copy Measurement ID
6. Save as `NEXT_PUBLIC_GA4_CUSTOMER_PORTAL_ID` in `.env.local`

## Step 4: Set Up Custom Dimensions

Custom dimensions allow you to track additional metadata about users and events.

### 4.1 For Main App Property

1. Go to Admin > Property Settings > Custom definitions > Custom dimensions
2. Create these dimensions:
   - **shop_id** (Scope: User)
   - **user_type** (Scope: User) - Values: `shop_owner`, `barber`
   - **plan_tier** (Scope: User) - Values: `free`, `pro`, `enterprise`
   - **barber_id** (Scope: Event)
   - **customer_id** (Scope: Event)

### 4.2 For Portal Property

1. Create these dimensions:
   - **shop_id** (Scope: User)
   - **barber_id** (Scope: Event)
   - **customer_id** (Scope: Event)

## Step 5: Set Up Custom Metrics

Custom metrics allow tracking of numeric values like revenue and bookings.

### 5.1 For Main App Property

1. Go to Admin > Property Settings > Custom definitions > Custom metrics
2. Create these metrics:
   - **revenue** (Value type: Currency)
   - **appointments_booked** (Value type: Standard)
   - **commission_amount** (Value type: Currency)

### 5.2 For Portal Property

1. Create these metrics:
   - **booking_value** (Value type: Currency)

## Step 6: Set Up Conversion Goals

Conversion goals track important business actions.

### Main App Conversions

1. Go to Admin > Conversions
2. Click **New conversion event**
3. Create these events:
   - `sign_up` - New user registration
   - `shop_created` - New shop created
   - `appointment_booked` - Appointment booked
   - `payment_completed` - Payment successfully processed
   - `plan_upgrade` - User upgraded plan
   - `feature_used` - Feature accessed

### Landing Page Conversions

1. Create these events:
   - `cta_click` - CTA button clicked
   - `pricing_tier_viewed` - User viewed pricing
   - `newsletter_signup` - Newsletter signup

### Portal Conversions

1. Create these events:
   - `portal_booking` - Booking via portal
   - `payment_completed` - Payment in portal

## Step 7: Set Up Google Tag Manager (Optional but Recommended)

GTM makes it easier to manage tags and events without code changes.

### 7.1 Create GTM Container

1. Go to [Google Tag Manager](https://tagmanager.google.com)
2. Click **Create Account**
3. Account name: `Barbershop SaaS`
4. Container name: `Main App` (for the app property)
5. Target platform: **Web**
6. Click **Create**
7. Accept terms
8. Copy the Container ID (format: `GTM-XXXXXXX`)
9. Save as `NEXT_PUBLIC_GTM_CONTAINER_ID` in `.env.local`

### 7.2 Connect GA4 to GTM

1. In GTM, go to **Tags**
2. Click **New** and choose **Google Analytics: GA4 Configuration**
3. Choose **Configuration** for GA4
4. Set Measurement ID to your Main App GA4 ID
5. Click **Save**

## Step 8: Configure Data Streams for Mobile

If your app has a mobile component:

### 8.1 For Main App
1. Go to Admin > Data streams
2. Click **Add stream** > **Android** or **iOS**
3. Follow the setup wizard
4. Add Firebase SDK to your mobile app

### 8.2 Note
For a web-only SaaS, you can track mobile web usage through the existing web data stream.

## Step 9: Data Collection & Settings

### 9.1 Enable Data Retention

1. Admin > Data Settings
2. Set event data retention: **14 months** (maximum recommended)

### 9.2 Configure Cross Domain Tracking

If you have subdomains (e.g., `app.yourdomain.com`, `portal.yourdomain.com`):

1. Admin > Property Settings > Data Streams > Web Stream Settings
2. Scroll to **Cross-domain tracking**
3. Add:
   - `yourdomain.com`
   - `app.yourdomain.com`
   - `portal.yourdomain.com`

### 9.3 Exclude Internal Traffic

1. Admin > Data Settings > Data Filters
2. Create filter to exclude your office IP addresses

## Step 10: Consent Management

### 10.1 Google Consent Mode

1. Admin > Data Settings > Consent Settings
2. Enable **Consent mode**
3. Choose **Require User Consent** (GDPR/CCPA compliant)

### 10.2 Privacy Settings

1. Set **Enable Signals on Google properties** to OFF for privacy
2. Disable **Google Signals** for advertising

## Step 11: Testing & Debug Mode

### 11.1 Enable Debug Mode

The code automatically supports debug mode. Set in `.env.local`:
```
NEXT_PUBLIC_GA4_DEBUG_MODE=true
```

### 11.2 Real-Time Monitoring

1. Go to Admin > Real-time report
2. Visit your app while this is open
3. You should see events flowing in real-time

### 11.3 Check Google Analytics Debugger

1. Install [Google Analytics Debugger Chrome Extension](https://chrome.google.com/webstore)
2. Enable extension
3. Open DevTools > Google Analytics
4. Perform actions and verify events are being sent

## Step 12: Create Event Filters & Annotations

### Event Filters (optional)

1. Admin > Data Streams > Web Stream > Event Settings
2. Add filters to exclude certain events or users

### Annotations

1. Go to Reports > Audience
2. Click **Create annotation** to mark important dates
3. Examples: Launch date, campaign start, maintenance window

## Environment Variables

Add to your `.env.local`:

```env
# GA4 Properties
NEXT_PUBLIC_GA4_MAIN_APP_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GA4_LANDING_PAGE_ID=G-YYYYYYYYYY
NEXT_PUBLIC_GA4_CUSTOMER_PORTAL_ID=G-ZZZZZZZZZZ

# GTM (optional)
NEXT_PUBLIC_GTM_CONTAINER_ID=GTM-XXXXXXX

# Debug Mode
NEXT_PUBLIC_GA4_DEBUG_MODE=false

# Consent
NEXT_PUBLIC_GA4_ENABLE_CONSENT=true
```

## Integration with Next.js

### 11.1 Install Dependencies

```bash
npm install @react-google-analytics/core
# or
yarn add @react-google-analytics/core
```

### 11.2 Wrap App with Provider

```tsx
// app/layout.tsx
import { AnalyticsProvider } from '@/components/providers/AnalyticsProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AnalyticsProvider config={{
          ga4PropertyId: process.env.NEXT_PUBLIC_GA4_MAIN_APP_ID || '',
          gtmContainerId: process.env.NEXT_PUBLIC_GTM_CONTAINER_ID,
          debugMode: process.env.NEXT_PUBLIC_GA4_DEBUG_MODE === 'true',
          enableCookieConsent: process.env.NEXT_PUBLIC_GA4_ENABLE_CONSENT === 'true',
        }}>
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}
```

## Next Steps

1. Verify data is flowing by checking Real-time reports
2. Set up conversion goals in GA4 admin
3. Create custom dashboards (see DASHBOARD_SETUP.md)
4. Implement event tracking in components (see CUSTOM_EVENTS_REFERENCE.md)
5. Set up BigQuery export for advanced analysis
6. Create Data Studio dashboards for visualization

## Troubleshooting

### Events not showing up?
1. Check Real-time report in GA4
2. Enable debug mode: `NEXT_PUBLIC_GA4_DEBUG_MODE=true`
3. Check browser console for errors
4. Verify GA4 ID is correct in `.env.local`
5. Check if user consent is blocking events

### Custom dimensions not appearing?
1. Make sure events include the custom dimension
2. Wait 24-48 hours for GA4 to process
3. Check custom dimension name matches exactly

### Cross-domain tracking not working?
1. Verify domains are added correctly
2. Check that linker_id is being passed between domains
4. Test with browser developer tools

## Additional Resources

- [GA4 Documentation](https://support.google.com/analytics/answer/10089681)
- [GTM Documentation](https://support.google.com/tagmanager/)
- [GA4 Event Parameters](https://support.google.com/analytics/answer/9267744)
- [GA4 Custom Dimensions & Metrics](https://support.google.com/analytics/answer/9355949)
