# Barber Commission Tracking System

A comprehensive, production-ready commission management system for barbershops. Automatically calculates payouts based on appointments, revenue, and performance metrics.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [React Components](#react-components)
7. [Setup & Installation](#setup--installation)
8. [Usage Examples](#usage-examples)
9. [Commission Structure Guide](#commission-structure-guide)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Commission Tracking System provides:
- **Automatic calculation** of commissions per appointment
- **Tiered commission structures** based on monthly revenue thresholds
- **Service-specific rates** (different rates for different services)
- **Performance bonuses** (volume, revenue, retention, ratings)
- **Multi-barber splits** for group appointments
- **Payout management** with multiple payment methods
- **Admin dashboard** for oversight and analytics
- **Barber statements** with tax tracking

---

## Features

### Commission Calculation
- ✅ Flat percentage rates (e.g., 40% of service revenue)
- ✅ Tiered rates (e.g., 40% base, 45% after $500/month, 50% after $1000/month)
- ✅ Service-specific rates (haircut 45%, beard trim 40%, specialty 50%)
- ✅ Per-barber overrides
- ✅ Automatic calculation immediately after appointment completion

### Revenue Tracking
- ✅ Tie appointments to barber
- ✅ Capture service prices
- ✅ Track tips separately (include/exclude from commission)
- ✅ Handle discounts & cancellations
- ✅ Refund commission on cancellation
- ✅ Multi-barber appointments with split commission

### Payouts
- ✅ Manual payout methods (cash, bank transfer)
- ✅ Stripe Connect integration
- ✅ Scheduled payouts (weekly, bi-weekly, monthly)
- ✅ Payout history & status tracking
- ✅ Tax withholding & 1099 tracking

### Bonuses & Deductions
- ✅ Volume bonuses (50+ appointments/month = $50)
- ✅ Revenue bonuses ($2000+ revenue = 5% bonus)
- ✅ Custom bonuses
- ✅ Deductions for damages, chargebacks, advances
- ✅ Adjustment with reason

### Reporting
- ✅ Monthly commission statements (PDF)
- ✅ Year-to-date summaries
- ✅ Admin dashboard with metrics
- ✅ Analytics & revenue trends
- ✅ Top earners & performance rankings

---

## Architecture

```
┌─────────────────────────────────────────┐
│     React Components (UI Layer)         │
│ - CommissionRateConfig                  │
│ - CommissionStatement                   │
│ - CommissionDashboard                   │
│ - CommissionPayouts                     │
│ - CommissionAnalytics                   │
│ - AdvanceRequestForm                    │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      API Routes (Next.js)               │
│ - /api/commissions/rates/*              │
│ - /api/commissions/transactions         │
│ - /api/commissions/bonuses              │
│ - /api/commissions/payouts/*            │
│ - /api/commissions/dashboard            │
│ - /api/commissions/analytics            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   CommissionService (Business Logic)    │
│ - Commission Calculation                │
│ - Tiered Rules Application              │
│ - Bonus Calculation                     │
│ - Payout Generation                     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      PostgreSQL Database                │
│ - commission_rates                      │
│ - barber_commission_overrides           │
│ - commission_transactions               │
│ - commission_bonuses                    │
│ - commission_deductions                 │
│ - commission_payouts                    │
│ - commission_reconciliation             │
│ - commission_advances                   │
└─────────────────────────────────────────┘
```

---

## Database Schema

### 1. commission_rates
Main configuration table for shop-wide commission structure.

```sql
CREATE TABLE commission_rates (
  id UUID PRIMARY KEY,
  shop_id UUID NOT NULL,
  rate_type VARCHAR(50), -- 'flat', 'tiered', 'service_specific'
  base_rate DECIMAL(5, 2), -- Base percentage
  tiered_rules JSONB, -- [{threshold, rate}, ...]
  service_rates JSONB, -- {serviceType: rate, ...}
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by UUID
);
```

### 2. barber_commission_overrides
Per-barber custom commission rates.

```sql
CREATE TABLE barber_commission_overrides (
  id UUID PRIMARY KEY,
  shop_id UUID NOT NULL,
  barber_id UUID NOT NULL,
  rate_type VARCHAR(50),
  base_rate DECIMAL(5, 2),
  tiered_rules JSONB,
  service_rates JSONB,
  effective_date TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by UUID
);
```

### 3. commission_transactions
Individual commission entries (one per appointment).

```sql
CREATE TABLE commission_transactions (
  id UUID PRIMARY KEY,
  shop_id UUID NOT NULL,
  barber_id UUID NOT NULL,
  appointment_id UUID NOT NULL,
  service_type VARCHAR(100),
  service_price DECIMAL(10, 2),
  discount_amount DECIMAL(10, 2),
  tip_amount DECIMAL(10, 2),
  include_tip_in_commission BOOLEAN,
  commission_rate DECIMAL(5, 2),
  base_commission DECIMAL(10, 2),
  commission_after_adjustments DECIMAL(10, 2),
  transaction_month DATE,
  status VARCHAR(50), -- pending, completed, cancelled, refunded
  transaction_date TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  refund_reason VARCHAR(255)
);
```

### 4. commission_bonuses
Performance bonuses applied to barbers.

```sql
CREATE TABLE commission_bonuses (
  id UUID PRIMARY KEY,
  shop_id UUID NOT NULL,
  barber_id UUID NOT NULL,
  bonus_type VARCHAR(50), -- volume, revenue, retention, rating, custom
  trigger_metric VARCHAR(100), -- e.g., 'appointments', 'monthly_revenue'
  trigger_value DECIMAL(10, 2),
  bonus_amount DECIMAL(10, 2),
  bonus_percentage DECIMAL(5, 2),
  calculation_month DATE,
  bonus_status VARCHAR(50), -- pending, earned, paid
  earned_at TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by UUID
);
```

### 5. commission_deductions
Damages, chargebacks, or other deductions.

```sql
CREATE TABLE commission_deductions (
  id UUID PRIMARY KEY,
  shop_id UUID NOT NULL,
  barber_id UUID NOT NULL,
  deduction_type VARCHAR(50), -- damages, chargebacks, advances, other
  amount DECIMAL(10, 2),
  reason VARCHAR(255),
  related_transaction_id UUID,
  deduction_date DATE,
  status VARCHAR(50), -- pending, applied, reversed
  applied_at TIMESTAMP,
  reversed_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by UUID
);
```

### 6. commission_payouts
Monthly or manual payout records.

```sql
CREATE TABLE commission_payouts (
  id UUID PRIMARY KEY,
  shop_id UUID NOT NULL,
  barber_id UUID NOT NULL,
  payout_period_start DATE,
  payout_period_end DATE,
  total_commission DECIMAL(10, 2),
  bonuses DECIMAL(10, 2),
  deductions DECIMAL(10, 2),
  tax_withheld DECIMAL(10, 2),
  net_payout DECIMAL(10, 2),
  payout_method VARCHAR(50), -- cash, bank_transfer, stripe_connect
  stripe_payout_id VARCHAR(255),
  payout_status VARCHAR(50), -- pending, processing, completed, failed
  payout_date TIMESTAMP,
  failure_reason VARCHAR(255),
  retry_count INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by UUID
);
```

### 7. commission_reconciliation
Audit trail for disputes and reconciliation.

```sql
CREATE TABLE commission_reconciliation (
  id UUID PRIMARY KEY,
  shop_id UUID NOT NULL,
  barber_id UUID NOT NULL,
  reconciliation_period DATE,
  total_appointments INTEGER,
  total_revenue DECIMAL(10, 2),
  total_commission DECIMAL(10, 2),
  total_bonuses DECIMAL(10, 2),
  total_deductions DECIMAL(10, 2),
  tax_withheld DECIMAL(10, 2),
  net_earnings DECIMAL(10, 2),
  payout_status VARCHAR(50),
  dispute_count INTEGER,
  notes VARCHAR(1000),
  reconciled_at TIMESTAMP,
  reconciled_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 8. commission_advances
Barber advance requests on future commissions.

```sql
CREATE TABLE commission_advances (
  id UUID PRIMARY KEY,
  shop_id UUID NOT NULL,
  barber_id UUID NOT NULL,
  requested_amount DECIMAL(10, 2),
  available_balance DECIMAL(10, 2),
  advance_status VARCHAR(50), -- pending, approved, paid, rejected
  request_date TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID,
  paid_at TIMESTAMP,
  rejection_reason VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## API Reference

### Commission Rates

#### GET /api/commissions/rates
Get all commission rates for a shop.

**Query Parameters:**
- `shopId` (required) - Shop ID

**Response:**
```json
[
  {
    "id": "rate-1",
    "shop_id": "shop-1",
    "rate_type": "tiered",
    "base_rate": 40,
    "tiered_rules": [
      {"threshold": 500, "rate": 45},
      {"threshold": 1000, "rate": 50}
    ],
    "is_default": true
  }
]
```

#### POST /api/commissions/rates/set
Create a new commission structure (admin only).

**Body:**
```json
{
  "shopId": "shop-1",
  "rate_type": "tiered",
  "base_rate": 40,
  "tiered_rules": [
    {"threshold": 500, "rate": 45},
    {"threshold": 1000, "rate": 50}
  ]
}
```

#### PATCH /api/commissions/rates/[barberId]
Set custom commission rate for a specific barber.

**Body:**
```json
{
  "shopId": "shop-1",
  "rate_type": "flat",
  "base_rate": 50,
  "expires_at": "2024-12-31T00:00:00Z"
}
```

### Commission Transactions

#### POST /api/commissions/transactions
Calculate and record commission for an appointment.

**Body:**
```json
{
  "shopId": "shop-1",
  "appointment_id": "apt-1",
  "barber_id": "barber-1",
  "service_type": "haircut",
  "service_price": 50,
  "discount_amount": 0,
  "tip_amount": 10,
  "include_tip_in_commission": false
}
```

#### GET /api/commissions/transactions
Get paginated transactions for a barber.

**Query Parameters:**
- `shopId` (required)
- `barberId` (required)
- `status` (optional) - pending, completed, cancelled, refunded
- `limit` (optional, default: 50)
- `offset` (optional, default: 0)

### Monthly Statements

#### GET /api/commissions/[barberId]/month/[YYYY-MM]
Get monthly commission statement for a barber.

**Query Parameters:**
- `shopId` (required)

**Response:**
```json
{
  "month": "2024-01-01T00:00:00Z",
  "barber_id": "barber-1",
  "total_appointments": 25,
  "total_revenue": 1250,
  "total_commission": 500,
  "total_bonuses": 50,
  "total_deductions": 0,
  "tax_withheld": 75,
  "net_earnings": 475,
  "transactions": [...],
  "year_to_date_summary": {...}
}
```

### Bonuses

#### POST /api/commissions/bonuses
Add a performance bonus (admin only).

**Body:**
```json
{
  "shopId": "shop-1",
  "barber_id": "barber-1",
  "bonus_type": "volume",
  "trigger_metric": "appointments",
  "trigger_value": 50,
  "bonus_amount": 50,
  "calculation_month": "2024-01-01"
}
```

### Payouts

#### POST /api/commissions/payouts/calculate
Calculate pending commissions for a period.

**Body:**
```json
{
  "shopId": "shop-1",
  "period_start": "2024-01-01",
  "period_end": "2024-01-31",
  "barber_id": "barber-1"
}
```

#### GET /api/commissions/payouts
Get payout history with filters.

**Query Parameters:**
- `shopId` (required)
- `barberId` (optional)
- `status` (optional) - pending, processing, completed, failed

#### POST /api/commissions/payouts/process
Process payouts (mark as completed).

**Body:**
```json
{
  "shopId": "shop-1",
  "payout_ids": ["payout-1", "payout-2"],
  "payout_method": "stripe_connect"
}
```

### Dashboard

#### GET /api/commissions/dashboard
Get admin dashboard data.

**Query Parameters:**
- `shopId` (required)
- `month` (optional, default: current month, format: YYYY-MM)
- `sort_by` (optional) - commission, appointments, revenue
- `sort_order` (optional) - asc, desc

### Analytics

#### GET /api/commissions/analytics
Get commission analytics and trends.

**Query Parameters:**
- `shopId` (required)
- `month` (optional, format: YYYY-MM)
- `period` (optional) - month, quarter, year

**Response:**
```json
{
  "month": "2024-01-01",
  "revenue_trend": [
    {"date": "2024-01-01", "revenue": 200, "commission": 80}
  ],
  "top_earners": [
    {"barber_name": "John", "earnings": 600, "appointments": 30}
  ],
  "service_breakdown": [
    {"service_type": "haircut", "revenue": 5000, "count": 100}
  ],
  "commission_distribution": [
    {"range": "$0-$50", "count": 10}
  ]
}
```

### Advances

#### POST /api/commissions/advances
Request an advance on commissions.

**Body:**
```json
{
  "shopId": "shop-1",
  "barber_id": "barber-1",
  "requested_amount": 250,
  "available_balance": 500
}
```

---

## React Components

### 1. CommissionRateConfig
Admin component for setting up commission structures.

```tsx
import { CommissionRateConfig } from '@/app/components/CommissionRateConfig';

<CommissionRateConfig shopId="shop-1" />
```

**Features:**
- Switch between flat, tiered, and service-specific rates
- Add/remove tiered rules
- Configure service-specific rates
- Save to database

### 2. CommissionStatement
Barber view of monthly commission breakdown.

```tsx
import { CommissionStatement } from '@/app/components/CommissionStatement';

<CommissionStatement shopId="shop-1" barberId="barber-1" month="2024-01" />
```

**Features:**
- Monthly summary cards (appointments, revenue, commission, net earnings)
- Transaction table with details
- Bonuses, deductions, tax breakdown
- Year-to-date summary
- Month navigation
- PDF download

### 3. CommissionDashboard
Admin view of all barbers' commissions.

```tsx
import { CommissionDashboard } from '@/app/components/CommissionDashboard';

<CommissionDashboard shopId="shop-1" />
```

**Features:**
- Summary cards (barbers, appointments, revenue, etc.)
- Sort by commission, appointments, or revenue
- Top earners list
- All barbers table with metrics
- Month selector

### 4. CommissionPayouts
Payout management interface.

```tsx
import { CommissionPayouts } from '@/app/components/CommissionPayouts';

<CommissionPayouts shopId="shop-1" barberId="barber-1" />
```

**Features:**
- Pending payouts summary
- Payout method selector
- Bulk processing
- Payout history with filters
- Status tracking

### 5. CommissionAnalytics
Analytics and trends visualization.

```tsx
import { CommissionAnalytics } from '@/app/components/CommissionAnalytics';

<CommissionAnalytics shopId="shop-1" />
```

**Features:**
- Revenue trend chart
- Top earners bar chart
- Service breakdown
- Commission distribution
- Monthly/quarterly/yearly views

### 6. AdvanceRequestForm
Barber interface for requesting advances.

```tsx
import { AdvanceRequestForm } from '@/app/components/AdvanceRequestForm';

<AdvanceRequestForm 
  shopId="shop-1" 
  barberId="barber-1" 
  availableBalance={500}
/>
```

**Features:**
- Request amount input
- Balance validation
- Submission to approval queue

---

## Setup & Installation

### 1. Database Setup

Run the migration:
```bash
psql -d your_database -f db/migrations/001_commission_tracking.sql
```

### 2. Environment Variables

Add to `.env.local`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### 3. Install Dependencies

```bash
npm install pg zod recharts
```

### 4. Import Components

```tsx
import { CommissionRateConfig } from '@/app/components/CommissionRateConfig';
import { CommissionStatement } from '@/app/components/CommissionStatement';
import { CommissionDashboard } from '@/app/components/CommissionDashboard';
```

---

## Usage Examples

### Example 1: Create Commission Structure

```tsx
// POST /api/commissions/rates/set
fetch('/api/commissions/rates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    shopId: 'shop-1',
    rate_type: 'tiered',
    base_rate: 40,
    tiered_rules: [
      { threshold: 500, rate: 45 },
      { threshold: 1000, rate: 50 }
    ]
  })
})
```

### Example 2: Calculate Commission for Appointment

```tsx
fetch('/api/commissions/transactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    shopId: 'shop-1',
    appointment_id: 'apt-001',
    barber_id: 'barber-1',
    service_type: 'haircut',
    service_price: 50,
    tip_amount: 10,
    include_tip_in_commission: false
  })
})
```

### Example 3: Get Monthly Statement

```tsx
fetch('/api/commissions/barber-1/month/2024-01?shopId=shop-1')
  .then(r => r.json())
  .then(data => console.log(`Commission: $${data.total_commission}`))
```

### Example 4: Calculate & Process Payouts

```tsx
// Calculate
fetch('/api/commissions/payouts/calculate', {
  method: 'POST',
  body: JSON.stringify({
    shopId: 'shop-1',
    period_start: '2024-01-01',
    period_end: '2024-01-31'
  })
})

// Process
fetch('/api/commissions/payouts/process', {
  method: 'POST',
  body: JSON.stringify({
    shopId: 'shop-1',
    payout_ids: ['payout-1', 'payout-2'],
    payout_method: 'stripe_connect'
  })
})
```

---

## Commission Structure Guide

### Flat Rate Example
40% commission on all services.

```json
{
  "rate_type": "flat",
  "base_rate": 40
}
```

**Calculation:**
- $100 service → $40 commission
- $50 service → $20 commission

### Tiered Rate Example
Increased commission based on monthly revenue.

```json
{
  "rate_type": "tiered",
  "base_rate": 40,
  "tiered_rules": [
    { "threshold": 0, "rate": 40 },
    { "threshold": 500, "rate": 45 },
    { "threshold": 1000, "rate": 50 }
  ]
}
```

**Calculation:**
- Month revenue $0-$499: 40%
- Month revenue $500-$999: 45%
- Month revenue $1000+: 50%

### Service-Specific Example
Different rates for different services.

```json
{
  "rate_type": "service_specific",
  "base_rate": 40,
  "service_rates": {
    "haircut": 45,
    "beard trim": 40,
    "specialty": 50
  }
}
```

### Bonuses

Volume Bonus:
```json
{
  "bonus_type": "volume",
  "trigger_metric": "appointments",
  "trigger_value": 50,
  "bonus_amount": 50
}
```
→ $50 bonus if 50+ appointments in month

Revenue Bonus:
```json
{
  "bonus_type": "revenue",
  "trigger_metric": "monthly_revenue",
  "trigger_value": 2000,
  "bonus_percentage": 5
}
```
→ 5% of commission earned if revenue ≥ $2000

---

## Troubleshooting

### Commission not calculating
- Check `commission_rates` table has default rate for shop
- Verify `barber_id` exists
- Ensure `service_price` > 0

### Payouts showing $0
- Check `commission_transactions` status = 'completed' or 'pending'
- Verify no cancelled/refunded transactions for period
- Check tax withholding calculation (15% default)

### Advance request fails
- Validate `requested_amount` ≤ `available_balance`
- Check barber has pending commissions
- Verify shop has advance feature enabled

### Missing monthly data
- Ensure transactions have `transaction_month` set
- Check all transactions have status (pending/completed/etc)
- Verify query using correct date format (YYYY-MM)

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API response errors
3. Check database constraints
4. Verify shop/barber IDs are correct
5. Check database connection
