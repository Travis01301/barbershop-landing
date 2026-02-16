# Commission Payout Process Guide

Complete workflow for calculating, processing, and tracking commission payouts.

## Table of Contents

1. [Payout Workflow](#payout-workflow)
2. [Payout Methods](#payout-methods)
3. [Scheduled Payouts](#scheduled-payouts)
4. [Manual Payouts](#manual-payouts)
5. [Failed Payouts & Retries](#failed-payouts--retries)
6. [Payout History & Reconciliation](#payout-history--reconciliation)

---

## Payout Workflow

### Step 1: Calculate Commissions

At the end of the payout period (weekly, bi-weekly, or monthly), calculate pending commissions:

```typescript
// POST /api/commissions/payouts/calculate
fetch('/api/commissions/payouts/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    shopId: 'shop-1',
    period_start: '2024-01-01',
    period_end: '2024-01-31',
    barber_id: 'barber-1' // Optional: calculate for specific barber
  })
})
.then(r => r.json())
.then(payouts => console.log(`Created ${payouts.length} payouts`))
```

**Response:**
```json
[
  {
    "id": "payout-1",
    "barber_id": "barber-1",
    "payout_period_start": "2024-01-01",
    "payout_period_end": "2024-01-31",
    "total_commission": 400,
    "bonuses": 50,
    "deductions": 10,
    "tax_withheld": 60,
    "net_payout": 380,
    "payout_status": "pending"
  }
]
```

### Step 2: Review Payout Summary

Check the calculated payouts before processing:

```typescript
// GET /api/commissions/payouts?shopId=shop-1&status=pending
fetch('/api/commissions/payouts?shopId=shop-1&status=pending')
  .then(r => r.json())
  .then(data => {
    console.log(`Total pending payouts: $${
      data.payouts.reduce((sum, p) => sum + p.net_payout, 0)
    }`);
    console.log(`Barbers: ${data.payouts.length}`);
  })
```

### Step 3: Select Payout Method

Choose how to pay barbers:
- **Cash** - Manual cash payment
- **Bank Transfer** - ACH to barber's bank
- **Stripe Connect** - Stripe connected account

### Step 4: Process Payouts

```typescript
// POST /api/commissions/payouts/process
fetch('/api/commissions/payouts/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    shopId: 'shop-1',
    payout_ids: ['payout-1', 'payout-2', 'payout-3'],
    payout_method: 'stripe_connect'
    // stripe_payout_id: 'po_1234567890' // Required if stripe_connect
  })
})
.then(r => r.json())
.then(processed => {
  console.log(`Processed ${processed.length} payouts`);
  processed.forEach(p => {
    console.log(`${p.barber_id}: ${p.payout_status}`);
  });
})
```

### Step 5: Confirm Payouts Completed

Monitor payout status:

```typescript
// GET /api/commissions/payouts?shopId=shop-1&status=completed
fetch('/api/commissions/payouts?shopId=shop-1&status=completed')
  .then(r => r.json())
  .then(data => {
    // View completed payouts
    data.payouts.forEach(p => {
      console.log(`${p.barber_id}: $${p.net_payout} (${p.payout_date})`);
    });
  })
```

---

## Payout Methods

### 1. Cash Payout

For manual cash payments:

```typescript
fetch('/api/commissions/payouts/process', {
  method: 'POST',
  body: JSON.stringify({
    shopId: 'shop-1',
    payout_ids: ['payout-1'],
    payout_method: 'cash'
  })
})
```

**Process:**
1. Calculate commission (above)
2. Get cash from register/safe
3. Count out exact amount
4. Have barber sign receipt
5. Mark as processed
6. Record in system

**Receipt Template:**
```
─────────────────────────────
COMMISSION PAYOUT RECEIPT
─────────────────────────────
Date: January 31, 2024
Barber: John Doe
Period: 1/1/2024 - 1/31/2024

Commission:     $400.00
Bonuses:        $50.00
Deductions:     -$10.00
Tax Withheld:   -$60.00
─────────────────────────────
NET PAYMENT:    $380.00
─────────────────────────────

☐ Received by: ________________
  Signature
```

### 2. Bank Transfer (ACH)

For direct deposit to barber's bank account:

```typescript
// Step 1: Collect barber banking info
const barberBankInfo = {
  account_holder_name: 'John Doe',
  account_number: '123456789',
  routing_number: '021000021',
  account_type: 'checking'
};

// Step 2: Process through your payment system
// (Implementation depends on your banking provider)

// Step 3: Update payout status
fetch('/api/commissions/payouts/process', {
  method: 'POST',
  body: JSON.stringify({
    shopId: 'shop-1',
    payout_ids: ['payout-1'],
    payout_method: 'bank_transfer'
  })
})
```

**Timeline:**
- ACH initiated: T
- Processing: T+1 to T+3 business days
- Funds available: T+2 to T+4 business days

**Error Handling:**
- Invalid account number → Payout fails, mark for retry
- Insufficient funds → Manual intervention needed
- Bank holiday → Delay processing

### 3. Stripe Connect

For automated payouts via Stripe:

```typescript
// Prerequisites:
// 1. Stripe Connect account set up
// 2. Barber has connected Stripe account
// 3. stripe_id in database for barber

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Process payout
const payout = await stripe.payouts.create({
  amount: 38000, // $380.00 in cents
  currency: 'usd',
  destination: barber.stripe_account_id // barber's Stripe ID
});

// Update in system
fetch('/api/commissions/payouts/process', {
  method: 'POST',
  body: JSON.stringify({
    shopId: 'shop-1',
    payout_ids: ['payout-1'],
    payout_method: 'stripe_connect',
    stripe_payout_id: payout.id
  })
})
```

**Advantages:**
- Automated & fast
- Barber controls their own payout schedule
- Full transaction history
- Automatic payouts possible

**Setup Steps:**
1. Barber creates Stripe account
2. Connects to your platform
3. System stores `stripe_account_id`
4. Payouts processed automatically

---

## Scheduled Payouts

### Weekly Payouts

```typescript
// Calculate & process every Friday
const scheduleWeeklyPayouts = async (shopId: string) => {
  const today = new Date();
  const friday = new Date(today);
  friday.setDate(friday.getDate() + (5 - friday.getDay()));
  
  if (today.getDay() === 5) { // Friday
    // Calculate payouts for previous week
    const mondayStart = new Date(today);
    mondayStart.setDate(today.getDate() - 4); // Last Monday
    
    const response = await fetch('/api/commissions/payouts/calculate', {
      method: 'POST',
      body: JSON.stringify({
        shopId,
        period_start: mondayStart.toISOString().split('T')[0],
        period_end: today.toISOString().split('T')[0]
      })
    });
    
    if (response.ok) {
      const payouts = await response.json();
      // Process automatically or queue for manual review
      await processPayouts(payouts);
    }
  }
};
```

### Bi-Weekly Payouts

```typescript
const scheduleBiWeeklyPayouts = async (shopId: string) => {
  const today = new Date();
  const biWeeklyDate = 15; // 1st & 15th
  
  if (today.getDate() === biWeeklyDate || today.getDate() === 1) {
    const periodStart = new Date(today.getFullYear(), today.getMonth(), 
      today.getDate() < 15 ? 1 : 15);
    const periodEnd = new Date(today);
    
    // Calculate and process
    await fetch('/api/commissions/payouts/calculate', {
      method: 'POST',
      body: JSON.stringify({
        shopId,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0]
      })
    });
  }
};
```

### Monthly Payouts

```typescript
const scheduleMonthlyPayouts = async (shopId: string) => {
  const today = new Date();
  const isLastDayOfMonth = 
    new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() 
    === today.getDate();
  
  if (isLastDayOfMonth) {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    await fetch('/api/commissions/payouts/calculate', {
      method: 'POST',
      body: JSON.stringify({
        shopId,
        period_start: monthStart.toISOString().split('T')[0],
        period_end: today.toISOString().split('T')[0]
      })
    });
  }
};
```

---

## Manual Payouts

### One-Time Payout

For bonus, adjustment, or special payment:

```typescript
// 1. Create deduction (if needed)
await fetch('/api/commissions/deductions', {
  method: 'POST',
  body: JSON.stringify({
    shopId: 'shop-1',
    barber_id: 'barber-1',
    deduction_type: 'adjustment',
    amount: -50, // Negative = credit
    reason: 'Performance bonus - extra tip earnings'
  })
});

// 2. Calculate payout for specific barber
const payouts = await fetch('/api/commissions/payouts/calculate', {
  method: 'POST',
  body: JSON.stringify({
    shopId: 'shop-1',
    period_start: '2024-01-15',
    period_end: '2024-01-15',
    barber_id: 'barber-1'
  })
}).then(r => r.json());

// 3. Process
await fetch('/api/commissions/payouts/process', {
  method: 'POST',
  body: JSON.stringify({
    shopId: 'shop-1',
    payout_ids: [payouts[0].id],
    payout_method: 'cash'
  })
});
```

### Advance Payment

Barber can request early payment:

```typescript
// Barber requests advance
fetch('/api/commissions/advances', {
  method: 'POST',
  body: JSON.stringify({
    shopId: 'shop-1',
    barber_id: 'barber-1',
    requested_amount: 250,
    available_balance: 500
  })
});

// Admin approves
fetch('/api/commissions/advances/[advanceId]/approve', {
  method: 'POST',
  body: JSON.stringify({
    approved: true
  })
});

// System automatically creates deduction:
// Next payout will subtract $250 advance from commission
```

---

## Failed Payouts & Retries

### Handling Failed Payouts

```typescript
// Check for failed payouts
const failedPayouts = await fetch(
  '/api/commissions/payouts?shopId=shop-1&status=failed'
).then(r => r.json());

// Retry
failedPayouts.payouts.forEach(async (payout) => {
  // Fix issue (update bank info, add funds, etc.)
  
  // Retry payout
  await fetch('/api/commissions/payouts/process', {
    method: 'POST',
    body: JSON.stringify({
      shopId: 'shop-1',
      payout_ids: [payout.id],
      payout_method: 'stripe_connect'
    })
  });
});
```

### Retry Logic

```typescript
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3600000; // 1 hour

async function retryFailedPayout(payout) {
  if (payout.retry_count >= MAX_RETRIES) {
    // Alert admin - manual intervention needed
    console.error(`Payout ${payout.id} failed after ${MAX_RETRIES} retries`);
    notifyAdmin(payout);
    return;
  }
  
  // Wait before retrying
  await new Promise(resolve => 
    setTimeout(resolve, RETRY_DELAY_MS)
  );
  
  // Retry
  const response = await fetch('/api/commissions/payouts/process', {
    method: 'POST',
    body: JSON.stringify({
      shopId: payout.shop_id,
      payout_ids: [payout.id],
      payout_method: payout.payout_method
    })
  });
  
  if (!response.ok) {
    // Update retry count and try again
    retryFailedPayout(payout);
  }
}
```

### Common Failure Reasons

| Reason | Solution |
|--------|----------|
| Invalid bank account | Update barber banking info |
| Insufficient funds | Wait for funds to clear |
| Stripe account not connected | Have barber reconnect Stripe |
| Amount exceeds limit | Split into multiple payouts |
| Bank holiday | Retry next business day |
| Temporary API error | Automatic retry after delay |

---

## Payout History & Reconciliation

### View Payout History

```typescript
// Get all completed payouts for month
const payouts = await fetch(
  '/api/commissions/payouts?shopId=shop-1&status=completed&month=2024-01'
).then(r => r.json());

// Group by barber
const byBarber = payouts.payouts.reduce((acc, p) => {
  if (!acc[p.barber_id]) acc[p.barber_id] = [];
  acc[p.barber_id].push(p);
  return acc;
}, {});
```

### Monthly Payout Report

```typescript
async function generatePayoutReport(shopId: string, month: string) {
  const [year, monthNum] = month.split('-');
  const monthStart = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  const monthEnd = new Date(parseInt(year), parseInt(monthNum), 0);
  
  const payouts = await fetch(
    `/api/commissions/payouts?shopId=${shopId}&status=completed`
  ).then(r => r.json());
  
  // Filter by month
  const monthPayouts = payouts.payouts.filter(p => 
    new Date(p.payout_date) >= monthStart &&
    new Date(p.payout_date) <= monthEnd
  );
  
  // Generate report
  const report = {
    month,
    total_payouts: monthPayouts.length,
    total_amount: monthPayouts.reduce((sum, p) => sum + p.net_payout, 0),
    by_barber: monthPayouts.reduce((acc, p) => {
      if (!acc[p.barber_id]) {
        acc[p.barber_id] = {
          count: 0,
          total: 0
        };
      }
      acc[p.barber_id].count++;
      acc[p.barber_id].total += p.net_payout;
      return acc;
    }, {})
  };
  
  return report;
}
```

### Reconcile Payouts

```typescript
async function reconcilePayouts(shopId: string, barber_id: string, month: string) {
  // Get statement
  const statement = await fetch(
    `/api/commissions/${barber_id}/month/${month}?shopId=${shopId}`
  ).then(r => r.json());
  
  // Get payouts for month
  const [year, monthNum] = month.split('-');
  const monthStart = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  const monthEnd = new Date(parseInt(year), parseInt(monthNum), 0);
  
  const payouts = await fetch(
    `/api/commissions/payouts?shopId=${shopId}&barberId=${barber_id}&status=completed`
  ).then(r => r.json());
  
  const monthPayouts = payouts.payouts.filter(p =>
    new Date(p.payout_period_end) >= monthStart &&
    new Date(p.payout_period_end) <= monthEnd
  );
  
  // Verify amounts match
  const commissionEarned = statement.total_commission;
  const commissionPaid = monthPayouts.reduce((sum, p) => sum + p.net_payout, 0);
  
  if (Math.abs(commissionEarned - commissionPaid) > 0.01) {
    console.warn(`Mismatch for ${barber_id}: earned $${commissionEarned}, paid $${commissionPaid}`);
    // Investigate and adjust if needed
  }
}
```

---

## Best Practices

1. **Schedule Consistent Payouts**
   - Same day/frequency every period
   - Barbers expect consistency

2. **Review Before Processing**
   - Check calculations
   - Verify no data issues
   - Confirm payout amounts reasonable

3. **Maintain Payout Records**
   - Keep receipts for cash payouts
   - Archive bank transfer confirmations
   - Track Stripe payouts

4. **Communicate Clearly**
   - Notify barbers before payout date
   - Explain any adjustments
   - Provide written statements

5. **Handle Disputes Promptly**
   - Review discrepancies immediately
   - Document investigation
   - Make corrections quickly

6. **Track Tax Withholding**
   - Verify 15% federal tax applied
   - Track for 1099 reporting
   - Document any state/local taxes

---

## Troubleshooting

| Issue | Resolution |
|-------|-----------|
| Payout amount incorrect | Review transactions, bonuses, deductions |
| Barber not receiving payment | Check bank info, verify account connected |
| Payout marked failed | Review failure reason, retry or contact support |
| Missing transactions | Check appointment status, ensure completed |
| Tax amount wrong | Verify tax rate setting, recalculate |
