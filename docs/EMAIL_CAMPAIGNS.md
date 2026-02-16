# Email Campaigns Documentation

## Overview

The Email Campaigns feature allows barbershops to create, schedule, and send targeted email campaigns with advanced tracking and analytics. Includes bulk templates, auto-trigger rules, customer segmentation, and A/B testing support.

## Features

### 1. Campaign Types
- **Promotion**: Discount offers, special deals
- **Service Announcement**: New services, events
- **Reactivation**: Win-back campaigns for inactive customers
- **Custom**: Any custom message

### 2. Bulk Email Templates
- Pre-built professional templates
- HTML editor for customization
- Preview before sending
- Template library and history
- Dynamic field support

### 3. Auto-Trigger Rules
- **No Book in 30+ Days**: Automatically send reactivation email with $10 coupon
- **First-Time Customers**: Welcome series
- **Birthdays**: Special birthday offer
- **Custom Events**: Any custom trigger condition

### 4. Customer Segmentation
- **By Service Type**: Target specific services (haircut, beard trim, etc.)
- **By Visit Frequency**: Frequent, occasional, rare customers
- **By Last Visit**: Target inactive customers
- **Custom Segments**: Custom filter conditions
- **A/B Testing**: Test different subject lines and content

### 5. Campaign Management
- **Draft & Schedule**: Save drafts or schedule for later
- **Recipient Management**: Add emails individually or import lists
- **Segment Filters**: Apply filters to auto-select recipients
- **Send Now or Later**: Immediate or scheduled delivery

### 6. Advanced Tracking
- **Open Tracking**: Track who opens emails with pixel
- **Click Tracking**: Track which links are clicked
- **Email Delivery**: Monitor bounced/failed emails
- **Bounce Classification**: Hard bounce, soft bounce, complaint
- **Engagement Scoring**: Calculate engagement metrics

### 7. Campaign Analytics
- **Delivery Rate**: % of emails successfully delivered
- **Open Rate**: % of delivered emails opened
- **Click Rate**: % of delivered emails with clicks
- **Bounce Rate**: % of failed/bounced emails
- **Unique Opens/Clicks**: Track unique engagement
- **Conversion Tracking**: Track redemptions and revenue
- **ROI Analysis**: Calculate campaign ROI

### 8. Coupon/Redemption System
- **Unique Codes**: Generate unique coupon codes per email
- **Tracking**: Track which customers redeem coupons
- **Value Tracking**: Link redemptions to orders
- **Revenue Attribution**: Calculate campaign revenue impact

## Database Schema

### `campaigns` Table
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY,
  shop_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  campaign_type VARCHAR(50), -- promotion, service_announcement, reactivation, custom
  subject VARCHAR(255) NOT NULL,
  preview_text VARCHAR(255),
  html_content TEXT NOT NULL,
  plain_text_content TEXT,
  sender_name VARCHAR(255),
  sender_email VARCHAR(255) NOT NULL,
  reply_to_email VARCHAR(255),
  status VARCHAR(50), -- draft, scheduled, sending, sent, paused, failed
  scheduled_send_at TIMESTAMP,
  sent_at TIMESTAMP,
  total_recipients INT,
  total_sent INT,
  total_failed INT,
  total_bounced INT,
  a_b_test_enabled BOOLEAN,
  a_b_test_variant VARCHAR(50),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### `campaign_segments` Table
```sql
CREATE TABLE campaign_segments (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL,
  segment_name VARCHAR(255) NOT NULL,
  segment_type VARCHAR(50), -- service, frequency, last_visit, custom
  segment_value VARCHAR(255),
  segment_operator VARCHAR(20), -- equals, contains, greater_than, less_than, between
  customer_count INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### `campaign_emails` Table
```sql
CREATE TABLE campaign_emails (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL,
  customer_id UUID,
  recipient_email VARCHAR(255) NOT NULL,
  variant VARCHAR(50),
  tracking_code VARCHAR(255) UNIQUE,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  bounced_at TIMESTAMP,
  bounce_type VARCHAR(50), -- hard, soft, complaint
  bounce_reason TEXT,
  opened BOOLEAN,
  opened_at TIMESTAMP,
  opened_count INT,
  clicked BOOLEAN,
  clicked_at TIMESTAMP,
  clicked_count INT,
  clicked_links TEXT,
  status VARCHAR(50), -- pending, sent, delivered, bounced, failed, complaint
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### `campaign_analytics` Table
```sql
CREATE TABLE campaign_analytics (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL,
  total_recipients INT,
  total_delivered INT,
  total_bounced INT,
  total_opened INT,
  total_clicked INT,
  unique_opens INT,
  unique_clicks INT,
  open_rate DECIMAL(5, 2),
  click_rate DECIMAL(5, 2),
  bounce_rate DECIMAL(5, 2),
  conversion_count INT,
  conversion_value DECIMAL(10, 2),
  revenue_generated DECIMAL(10, 2),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### `campaign_auto_triggers` Table
```sql
CREATE TABLE campaign_auto_triggers (
  id UUID PRIMARY KEY,
  shop_id UUID NOT NULL,
  campaign_id UUID NOT NULL,
  trigger_name VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(50), -- no_book, first_time, birthday, custom_event
  trigger_condition VARCHAR(255) NOT NULL,
  trigger_value INT,
  trigger_unit VARCHAR(20), -- days, weeks, months
  enabled BOOLEAN,
  last_triggered_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### `campaign_redemptions` Table
```sql
CREATE TABLE campaign_redemptions (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL,
  campaign_email_id UUID NOT NULL,
  customer_id UUID,
  coupon_code VARCHAR(50) NOT NULL UNIQUE,
  discount_value DECIMAL(10, 2),
  discount_percent DECIMAL(5, 2),
  redeemed BOOLEAN,
  redeemed_at TIMESTAMP,
  redeemed_order_id UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## API Endpoints

### Create Campaign
```
POST /api/campaigns/create
Authorization: Bearer {token}

{
  "name": "Holiday Sale",
  "campaign_type": "promotion",
  "subject": "20% Off This Holiday Season!",
  "html_content": "<div>...</div>",
  "sender_email": "noreply@barbershop.com",
  "sender_name": "Your Barbershop",
  "reply_to_email": "replies@barbershop.com",
  "preview_text": "Save big on all services"
}

Response:
{
  "success": true,
  "campaign": {
    "id": "campaign-1",
    "status": "draft",
    ...
  }
}
```

### Get Campaigns
```
GET /api/campaigns?status=sent&limit=50&offset=0
Authorization: Bearer {token}

Response:
{
  "success": true,
  "campaigns": [...],
  "total": 25
}
```

### Update Campaign
```
PUT /api/campaigns/[id]
Authorization: Bearer {token}

{
  "name": "Updated Name",
  "subject": "Updated Subject",
  "status": "scheduled",
  "scheduled_send_at": "2024-12-25T10:00:00Z"
}

Response:
{
  "success": true,
  "campaign": {...}
}
```

### Send Campaign
```
POST /api/campaigns/[id]/send
Authorization: Bearer {token}

{
  "recipientEmails": [
    "customer1@example.com",
    "customer2@example.com"
  ]
}

Response:
{
  "success": true,
  "message": "Campaign sent successfully"
}
```

### Get Campaign Analytics
```
GET /api/campaigns/[id]/analytics
Authorization: Bearer {token}

Response:
{
  "success": true,
  "analytics": {
    "total_recipients": 500,
    "total_delivered": 495,
    "open_rate": 22.5,
    "click_rate": 4.2,
    "bounce_rate": 1.0,
    "conversion_count": 15,
    "revenue_generated": 450.00
  }
}
```

## React Components

### CampaignBuilder
Create and edit campaigns with templates.

```tsx
import { CampaignBuilder } from '@/components/CampaignBuilder';

<CampaignBuilder
  onSave={async (data) => {
    const res = await fetch('/api/campaigns/create', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    return res.json();
  }}
  isLoading={false}
/>
```

### CampaignScheduler
Schedule campaigns and manage recipients.

```tsx
import { CampaignScheduler } from '@/components/CampaignScheduler';

<CampaignScheduler
  campaignId={campaignId}
  onSchedule={async (data) => {
    const res = await fetch(`/api/campaigns/${campaignId}/send`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    return res.json();
  }}
  isLoading={false}
/>
```

### CampaignAnalytics
Display campaign performance metrics.

```tsx
import { CampaignAnalytics } from '@/components/CampaignAnalytics';

<CampaignAnalytics
  analytics={analyticsData}
  campaignName="Holiday Sale"
/>
```

## Service Integration

### Campaign Service Methods
```typescript
// Create campaign
const campaign = await campaignService.createCampaign(
  shopId,
  {
    name: 'Holiday Sale',
    campaign_type: 'promotion',
    subject: 'Special Offer!',
    html_content: '<div>...</div>',
    sender_email: 'noreply@example.com'
  }
);

// Get campaigns
const { campaigns, total } = await campaignService.getCampaigns(
  shopId,
  'sent',
  50,
  0
);

// Update campaign
const updated = await campaignService.updateCampaign(campaignId, {
  status: 'scheduled',
  scheduled_send_at: new Date()
});

// Send campaign
await campaignService.sendCampaign(campaignId, [
  'user1@example.com',
  'user2@example.com'
]);

// Get analytics
const analytics = await campaignService.getCampaignAnalytics(campaignId);

// Create auto-trigger
const trigger = await campaignService.createAutoTrigger(shopId, {
  campaign_id: campaignId,
  trigger_name: 'Inactive Users',
  trigger_type: 'no_book',
  trigger_condition: 'days_since_visit > 30',
  trigger_value: 30,
  trigger_unit: 'days'
});

// Create redemption code
const redemption = await campaignService.createRedemptionCode(
  campaignId,
  campaignEmailId,
  'HOLIDAY20',
  undefined,
  20
);

// Track email open
await campaignService.trackEmailOpen(trackingCode);

// Track email click
await campaignService.trackEmailClick(trackingCode, 'https://example.com');
```

## Email Integration (Resend)

The system uses Resend for email delivery:

Configuration:
```env
RESEND_API_KEY=your_api_key
RESEND_FROM_EMAIL=noreply@barbershop.com
```

Supported features:
- HTML and plain text emails
- Attachments
- Reply-to addresses
- Custom headers
- List management

## Template Variables

Use these variables in HTML templates:
- `{tracking_code}` - Pixel tracking code
- `{customer_name}` - Customer name
- `{discount_code}` - Coupon/redemption code
- `{discount_value}` - Dollar discount amount
- `{discount_percent}` - Percentage discount
- `{shop_name}` - Shop name
- `{shop_phone}` - Shop phone number
- `{shop_address}` - Shop address

Example:
```html
<h1>Hello {customer_name}!</h1>
<p>Enjoy {discount_percent}% off with code: {discount_code}</p>
<img src="https://track.example.com/pixel/{tracking_code}" width="1" height="1" />
```

## Auto-Trigger Setup Examples

### Reactivation Campaign
Target customers who haven't booked in 30+ days with $10 off coupon:

```typescript
await campaignService.createAutoTrigger(shopId, {
  campaign_id: campaignId,
  trigger_name: 'Reactivation - 30+ Days',
  trigger_type: 'no_book',
  trigger_condition: 'days_since_last_booking >= 30',
  trigger_value: 30,
  trigger_unit: 'days',
  enabled: true
});
```

### Birthday Campaign
Send birthday specials:

```typescript
await campaignService.createAutoTrigger(shopId, {
  campaign_id: campaignId,
  trigger_name: 'Birthday Special',
  trigger_type: 'birthday',
  trigger_condition: 'is_birthday_today',
  enabled: true
});
```

## A/B Testing

Test different subject lines or content:

```typescript
// Create variant A
await campaignService.createCampaign(shopId, {
  name: 'Holiday Sale - Variant A',
  subject: '20% Off Holiday Sale',
  a_b_test_enabled: true,
  a_b_test_variant: 'A',
  ...
});

// Create variant B
await campaignService.createCampaign(shopId, {
  name: 'Holiday Sale - Variant B',
  subject: 'Exclusive: Holiday Discounts Inside',
  a_b_test_enabled: true,
  a_b_test_variant: 'B',
  ...
});

// Send 50% of recipients each variant
```

## Testing

Run tests with 95%+ coverage:
```bash
npm test -- lib/campaign-service.test.ts --coverage
```

Test coverage includes:
- Campaign creation and updates
- Bulk sending
- Analytics calculation
- Auto-trigger rules
- Coupon redemption
- Error handling

## Best Practices

1. **Email Design**
   - Keep subject lines under 50 characters
   - Use clear, compelling CTAs
   - Mobile-responsive design
   - Test email rendering across clients

2. **Segmentation**
   - Use narrow segments for better targeting
   - Test segments before sending
   - Monitor segment performance
   - Update segments regularly

3. **Frequency**
   - Don't send more than 2x per week
   - Space campaigns out by at least 3 days
   - Monitor unsubscribe rates
   - Respect customer preferences

4. **Compliance**
   - Include unsubscribe link in emails
   - Honor GDPR/CAN-SPAM requirements
   - Monitor bounces and complaints
   - Update lists regularly

5. **Analytics**
   - Review analytics after 24-48 hours
   - Compare against historical benchmarks
   - Test different send times
   - Analyze link clicks to improve CTAs

## Troubleshooting

### High Bounce Rate
- Clean email list regularly
- Verify email addresses on capture
- Remove hard bounces immediately
- Check sender reputation

### Low Open Rate
- Test different subject lines
- Send at different times
- Improve sender name recognition
- Segment audiences better

### Low Click Rate
- Add more visible CTAs
- Use action-oriented copy
- Include relevant offers
- Test different link placements

## Monitoring & Reporting

Monitor with:
- Delivery success rate (target >95%)
- Open rate (target >20%)
- Click rate (target >5%)
- Bounce rate (target <2%)
- Conversion rate (target >1%)
- ROI (revenue / email cost)
