# Analytics Dashboard Setup Guide

Complete guide to creating dashboards for monitoring business metrics, marketing performance, product usage, and customer bookings.

## Dashboard Overview

We'll create **4 main dashboards**:

1. **Executive Dashboard** - KPIs for leadership
2. **Marketing Dashboard** - Campaign and acquisition metrics
3. **Product Dashboard** - Feature adoption and engagement
4. **Portal Dashboard** - Customer booking metrics

Each can be created in **Google Data Studio** or **GA4 Reports**.

---

## Dashboard 1: Executive Dashboard

**Purpose:** High-level business metrics for leadership and stakeholders

### Metrics to Include

#### Growth Metrics
- **Total Signups (MTD)** - New user registrations this month
- **Total Signups (YTD)** - New user registrations this year
- **Active Shops** - Count of shops with bookings last 30 days
- **Growth Rate** - Month-over-month user growth %

#### Revenue Metrics
- **Total Revenue (MTD)** - Sum of `payment_completed` amounts this month
- **Total Revenue (YTD)** - Sum of `payment_completed` amounts this year
- **Monthly Recurring Revenue (MRR)** - Sum of recurring subscription revenue
- **Average Revenue Per User** - Total revenue / Active users

#### Conversion Metrics
- **Signup → Payment Conversion Rate** - (Users with payment / Total signups) × 100
- **Signup → Shop Created Conversion Rate** - (Shops created / Total signups) × 100
- **Booking Conversion Rate** - (Bookings / Portal visits) × 100

#### Retention & Health
- **Churn Rate** - % of users inactive for 30+ days
- **DAU/MAU Ratio** - Active users daily / Active users monthly
- **Repeat Booking Rate** - Users with 2+ bookings / Total users

### Creating in GA4

1. Go to **Reports > Explore**
2. Create custom exploration
3. Add metrics:
   - `event_count` filtered by `sign_up`
   - `event_count` filtered by `payment_completed`
   - Custom metric: `revenue`
4. Segment by:
   - Date
   - User dimension
   - Custom dimension `plan_tier`

### Creating in Data Studio

1. Go to [Data Studio](https://datastudio.google.com)
2. Create **New Report**
3. Add GA4 data source
4. Add widgets:

**Card 1: Total Signups (MTD)**
```
Metric: User count
Filter: sign_up event
Date range: Month to date
Format: Number with comparison to previous month
```

**Card 2: Revenue (MTD)**
```
Metric: revenue (custom metric)
Filter: payment_completed event
Date range: Month to date
Format: Currency with comparison
```

**Card 3: Active Shops**
```
Metric: User count (distinct)
Filter: appointment_booked event in last 30 days
Dimension: shop_id (custom dimension)
Format: Number
```

**Card 4: Conversion Funnel**
```
Type: Funnel visualization
Steps:
1. Sign ups (sign_up events)
2. Shop created (shop_created events)
3. First booking (appointment_booked, first time)
4. Payment (payment_completed events)
```

**Card 5: Revenue Trend**
```
Type: Time series
Metric: revenue
Dimension: Date
Filter: payment_completed
Format: Line chart with growth rate
```

**Card 6: Churn Indicator**
```
Metric: Count of users with 0 appointments in last 30 days
Format: Number with trend
```

---

## Dashboard 2: Marketing Dashboard

**Purpose:** Track marketing effectiveness and user acquisition

### Metrics to Include

#### Traffic Metrics
- **Landing Page Views** - Total page_view events
- **Unique Visitors** - Unique user sessions
- **Bounce Rate** - Users who left without CTA click

#### Engagement Metrics
- **CTA Click-Through Rate** - (CTA clicks / Page views) × 100
- **Pricing Tier Views** - Count of pricing_tier_viewed events
- **Newsletter Signups** - Count of newsletter_signup events

#### Acquisition Metrics
- **Conversion Rate (Visitor → Signup)** - (Signups / Unique visitors) × 100
- **Cost Per Acquisition (CPA)** - Total marketing spend / New signups
- **Signup Source** - Signups by referrer/source

#### Geographic & Device Metrics
- **Geographic Distribution** - Signups by country/region
- **Device Breakdown** - Mobile vs Desktop signups % split
- **Top Traffic Sources** - Signups by traffic source (organic, paid, etc.)

#### Promo Code Performance
- **LAUNCH50 Redemptions** - Count of promo_code_applied events
- **LAUNCH50 Discount Amount** - Total discount issued
- **LAUNCH50 Conversion Lift** - Comparison of conv rate with/without code

### Creating in Data Studio

1. Create **New Report**
2. Add GA4 data source
3. Add widgets:

**Card 1: Landing Page Views**
```
Metric: Event count
Filter: page_view event AND page_title contains "landing"
Format: Big number with comparison
```

**Card 2: CTA Click-Through Rate**
```
Type: Scorecard
Metric: (cta_click count / page_view count) × 100
Filter: Landing page events only
Format: Percentage
```

**Card 3: Conversion Funnel (Visitor → Signup)**
```
Type: Funnel chart
Step 1: page_view (landing page)
Step 2: cta_click
Step 3: sign_up
Show conversion rate between steps
```

**Card 4: Geographic Breakdown**
```
Type: Geo chart
Metric: User count
Dimension: Country
Filter: sign_up events
Format: World map with colors by volume
```

**Card 5: Device Breakdown**
```
Type: Pie chart
Metric: User count
Dimension: Device category
Filter: sign_up events
Format: Pie chart with percentages
```

**Card 6: Promo Code Performance**
```
Type: Table
Columns:
- Promo code (parameter)
- Count of uses
- Total discount
- Conversion rate (users with code that signed up)
Filter: promo_code_applied events
```

**Card 7: Traffic Source Analysis**
```
Type: Table
Columns:
- Traffic source (referrer)
- Signup count
- Conversion rate
Sort: By signup count descending
```

---

## Dashboard 3: Product Dashboard

**Purpose:** Monitor feature adoption, engagement, and product health

### Metrics to Include

#### Feature Adoption
- **Feature Adoption Rates** - % of users who used each feature
  - Recurring appointments
  - Waitlist
  - Loyalty program
  - SMS/Email campaigns
  - Analytics

#### Engagement Metrics
- **Daily Active Users (DAU)** - Users with any event today
- **Monthly Active Users (MAU)** - Users with any event this month
- **Feature Usage Time** - Average duration_seconds by feature
- **Session Duration** - Average time spent in app

#### Payment Metrics
- **Payment Completion Rate** - (Successful / Attempted) × 100
- **Failed Payment Rate** - Failed payment count / Attempted
- **Failed Payment Reasons** - Breakdown by error code

#### Plan Distribution
- **Free Plan Users** - Count of users with plan_tier=free
- **Pro Plan Users** - Count of users with plan_tier=pro
- **Enterprise Plan Users** - Count of users with plan_tier=enterprise
- **Plan Distribution %** - Percentage breakdown

#### Churn & Health
- **Churn Signals** - Users with 0 appointments in 30 days
- **Repeat Booking Rate** - Users with 2+ bookings
- **Support Correlation** - Bookings correlated with support tickets
- **Feature Usage by Plan** - Breakdown of usage by plan tier

### Creating in Data Studio

**Card 1: Feature Adoption Rates**
```
Type: Scorecards (one per feature)
Metric: Count of unique users
Filter: feature_used event where feature_name='recurring'
Total users / This metric = adoption rate
Format: Percentage
```

**Card 2: DAU/MAU Ratio**
```
Type: Two scorecards
Card A: DAU = Count of unique users today
Card B: MAU = Count of unique users this month
Ratio display: DAU/MAU
```

**Card 3: Feature Usage Duration**
```
Type: Table
Columns:
- Feature name
- Average duration (seconds)
- Median duration
- 95th percentile
Sort: By usage time descending
```

**Card 4: Payment Completion Funnel**
```
Type: Funnel
Step 1: Appointment booked
Step 2: Payment initiated
Step 3: Payment completed
Show conversion rate between steps
```

**Card 5: Failed Payment Analysis**
```
Type: Table
Columns:
- Error code
- Error message
- Count of occurrences
- User count affected
Sort: By count descending
```

**Card 6: Plan Distribution**
```
Type: Pie chart
Metric: User count (distinct)
Dimension: plan_tier (custom dimension)
Format: Pie chart with count + percentage
```

**Card 7: Churn Risk Dashboard**
```
Type: Numbers
- Users with 0 bookings in 30 days
- Users with 0 logins in 30 days
- Users with failed payments
All tracked separately
```

---

## Dashboard 4: Portal Dashboard

**Purpose:** Monitor customer booking portal performance

### Metrics to Include

#### Booking Metrics
- **Total Portal Bookings** - Count of portal_booking events
- **Portal Booking Conversion Rate** - (Bookings / Portal visitors) × 100
- **Bookings by Shop** - Portal bookings grouped by shop_id
- **Bookings by Service** - Breakdown by service type
- **Average Booking Value** - Average booking_value custom metric

#### Customer Behavior
- **Top Barbers** - Barbers by booking count
- **Promo Code Redemption** - % of customers using promo codes
- **Walk-in vs Advance** - Walk-ins today vs advance bookings
- **Time Between Booking & Appointment** - Average days advance

#### Traffic & Engagement
- **Portal Page Views** - page_view events on portal
- **Time to Book** - Session duration for portal visitors
- **Ratings & Reviews** - review_submitted count
- **Review Rating Distribution** - Average stars by shop

### Creating in Data Studio

**Card 1: Total Portal Bookings**
```
Metric: Event count
Filter: portal_booking events
Format: Big number with comparison
```

**Card 2: Portal Conversion Funnel**
```
Type: Funnel
Step 1: page_view (portal)
Step 2: Barber viewed (custom event)
Step 3: Time slot selected (custom event)
Step 4: Payment completed
Step 5: Booking confirmed
```

**Card 3: Bookings by Shop**
```
Type: Table
Columns:
- Shop name
- Booking count
- Revenue (sum of booking_value)
- Conversion rate
Filter: portal_booking events
Sort: By bookings descending
```

**Card 4: Top Barbers**
```
Type: Table
Columns:
- Barber ID
- Booking count
- Revenue
- Rating (if available)
- % of total bookings
Sort: By bookings descending
Limit: Top 10
```

**Card 5: Promo Code Redemption**
```
Type: Scorecard
Metric: Count of portal_booking with promo code applied
Total bookings / This metric = redemption rate
Format: Percentage
```

**Card 6: Service Type Breakdown**
```
Type: Pie chart
Metric: Booking count
Dimension: service_type (from portal_booking events)
Format: Pie chart with counts
```

**Card 7: Booking Timing**
```
Type: Table
Columns:
- Time slot (hour of day)
- Booking count
- Appointment date (same day vs future)
Format: Heat map or bar chart by time
```

**Card 8: Rating Distribution**
```
Type: Table
Columns:
- Shop name
- Average rating
- Review count
- Distribution (stars 1-5)
Filter: review_submitted events from portal
```

---

## BigQuery Integration

For more advanced analysis, export GA4 to BigQuery:

### Setup

1. Admin > Property Settings > BigQuery Link
2. Select BigQuery project
3. Create dataset for your account
4. Link GA4 property

### Example Queries

**Acquisition Funnel Analysis:**
```sql
WITH funnel AS (
  SELECT
    user_id,
    COUNTIF(event_name = 'page_view') as page_views,
    COUNTIF(event_name = 'cta_click') as cta_clicks,
    COUNTIF(event_name = 'sign_up') as signups,
    COUNTIF(event_name = 'shop_created') as shops_created,
  FROM `project.dataset.events_*`
  WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
  GROUP BY user_id
)
SELECT
  COUNTIF(page_views > 0) as visitors,
  COUNTIF(cta_clicks > 0) as cta_clickers,
  COUNTIF(signups > 0) as signups,
  COUNTIF(shops_created > 0) as shops,
FROM funnel;
```

**Revenue by Plan Tier:**
```sql
SELECT
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'plan_tier') as plan,
  SUM((SELECT CAST(value.double_value AS INT64) FROM UNNEST(event_params) WHERE key = 'revenue')) as total_revenue,
  COUNT(DISTINCT user_id) as users,
FROM `project.dataset.events_*`
WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
  AND event_name = 'payment_completed'
GROUP BY plan
ORDER BY total_revenue DESC;
```

---

## Setting Up Alerts

Monitor important metrics with alerts:

### In Data Studio
1. Reports > Scorecard
2. Click **More Options** > **Set up alerts**
3. Configure threshold and notification

### In GA4
1. Admin > Notifications
2. Create notification for:
   - Sudden traffic drop
   - Payment failures spike
   - New user signup surge

### Via Slack Integration

Use Data Studio's Slack connector:

1. Create scheduled report
2. Set delivery frequency
3. Add recipients (Slack channel)
4. Reports sent daily/weekly/monthly

---

## Custom Metrics in Data Studio

When creating custom metrics for revenue tracking:

```
Metric: Revenue per Booking
= SUM(revenue) / COUNT(booking events)

Metric: Payment Success Rate
= COUNT(payment_completed) / COUNT(payment_attempted) × 100

Metric: Customer LTV
= AVG(revenue per user across all time)
```

---

## Scheduled Reports

Send reports automatically:

1. Click **Share** in Data Studio report
2. Set **Scheduled reports and emails**
3. Choose frequency: Daily / Weekly / Monthly
4. Select recipients
5. Choose format: PDF / Sheet

**Recommended Schedules:**
- Executive Dashboard: Weekly (Monday 8 AM)
- Marketing Dashboard: Daily (6 AM)
- Product Dashboard: Weekly (Tuesday 9 AM)
- Portal Dashboard: Daily (6 AM)

---

## Troubleshooting Dashboards

### Data not showing up?
1. Verify GA4 is configured correctly
2. Check events are firing in real-time report
3. Wait 24-48 hours for historical data
4. Verify correct property ID in Data Studio

### Custom dimensions not appearing?
1. Check custom dimension is created in GA4 admin
2. Verify events include the dimension
3. Wait 48 hours for GA4 to process
4. Check dimension naming (case-sensitive)

### Funnel shows 0 users?
1. Verify event names match exactly
2. Check event parameters and filters
3. Increase date range
4. Confirm events are ordered correctly

### Performance is slow?
1. Reduce date range
2. Add filters to narrow data
3. Use report sampling (GA4 does this automatically)
4. Split into separate reports

---

## Next Steps

1. Create each dashboard in Data Studio
2. Verify data is flowing correctly
3. Set up scheduled reports
4. Share dashboards with team
5. Monitor key metrics daily
6. Create alerts for anomalies
7. Review metrics weekly with team

See CUSTOM_EVENTS_REFERENCE.md for details on each event type.
