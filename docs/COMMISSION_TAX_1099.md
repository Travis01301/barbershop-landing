# Tax & 1099 Reporting Guide

This guide covers tax handling, withholding, and 1099 reporting in the Commission Tracking System.

## Table of Contents

1. [Tax Withholding](#tax-withholding)
2. [1099 Reporting](#1099-reporting)
3. [Annual Reconciliation](#annual-reconciliation)
4. [Compliance](#compliance)

---

## Tax Withholding

### Default Tax Rate

The system applies a **15% federal tax withholding** by default on all commission earnings.

**Calculation:**
```
Net Payout = Commission + Bonuses - Deductions - (Commission × 0.15)
```

**Example:**
```
Commission:     $400.00
Bonuses:        $50.00
Deductions:     $10.00
Tax (15%):      -$60.00
────────────────────────
Net Payout:     $380.00
```

### Customizing Tax Rate

To adjust the tax withholding rate for a shop:

1. Modify the service layer (currently hardcoded at 15%)
2. Update in `commission-service.ts`:

```typescript
// Current:
const taxWithheld = totalCommission * 0.15;

// Custom rate:
const TAX_RATE = 0.15; // Set to your rate
const taxWithheld = totalCommission * TAX_RATE;
```

3. Update calculations in:
   - `calculatePayouts()`
   - `getMonthlyStatement()`
   - `getDashboardData()`

### Tax Withholding Tracking

Tax amounts are tracked in multiple tables:

1. **commission_payouts**
   - `tax_withheld` column stores monthly tax
   
2. **commission_reconciliation**
   - `tax_withheld` tracks tax for reconciliation period

3. **Commission Statement (API Response)**
   - `tax_withheld` field in monthly statement

---

## 1099 Reporting

### Who Needs 1099s

File Form 1099-NEC (Nonemployee Compensation) for:
- Independent contractor barbers
- Total annual earnings ≥ $600
- Payments made during calendar year

### 1099-NEC Fields

For each barber, report:
- **Box 1** - Non-employee compensation (total commissions)
- **Box 2** - Federal income tax withheld
- **Barber Information** - Name, SSN, address
- **Payer Information** - Shop name, EIN, address

### Generating 1099 Data

Use the endpoint to get year-to-date totals:

```
GET /api/commissions/[barberId]/month/[YYYY-MM]?shopId=[shopId]
```

From the response, extract:
- `year_to_date_summary.total_commission` → Box 1
- `year_to_date_summary.total_tax_withheld` → Box 2

### Example: Getting 1099 Data for Barber

```typescript
// Get December statement (year-end)
const response = await fetch(
  `/api/commissions/barber-1/month/2024-12?shopId=shop-1`
);
const statement = await response.json();

const form1099 = {
  box1_compensation: statement.year_to_date_summary.total_commission,
  box2_tax_withheld: statement.year_to_date_summary.total_tax_withheld,
  barber_name: 'John Doe',
  barber_ssn: '123-45-6789',
  shop_ein: '12-3456789'
};
```

### Form 1099-NEC Due Date

- **Filing deadline:** January 31st (following calendar year)
- **IRS E-File deadline:** March 31st (following year)
- **Payment deadline:** January 15th

### Barber 1098-T Deductions (Optional)

Barbers may claim:
- Commission as gross income (Box 1)
- Federal tax withheld as credit (Box 2)
- Business expenses deduction (tools, supplies, etc.)

---

## Annual Reconciliation

### Year-End Review Process

1. **Pull YTD Summary**
   ```sql
   SELECT
     barber_id,
     COUNT(DISTINCT appointment_id) as appointments,
     SUM(service_price) as total_revenue,
     SUM(base_commission) as total_commission,
     SUM(CASE WHEN status = 'refunded' THEN base_commission ELSE 0 END) as refunded_commission,
     COUNT(CASE WHEN status = 'refunded' THEN 1 END) as cancelled_appointments
   FROM commission_transactions
   WHERE shop_id = $1 AND EXTRACT(YEAR FROM transaction_date) = 2024
   GROUP BY barber_id;
   ```

2. **Verify Payouts**
   ```sql
   SELECT
     barber_id,
     SUM(net_payout) as total_paid,
     COUNT(*) as payout_count
   FROM commission_payouts
   WHERE shop_id = $1 
     AND EXTRACT(YEAR FROM payout_period_start) = 2024
     AND payout_status = 'completed'
   GROUP BY barber_id;
   ```

3. **Check for Discrepancies**
   - Commission earned vs. amount paid
   - Refunded/cancelled amounts
   - Pending transactions
   - Disputed amounts

4. **Create Reconciliation Record**

```typescript
// POST to create reconciliation
fetch('/api/commissions/reconciliation', {
  method: 'POST',
  body: JSON.stringify({
    shopId: 'shop-1',
    barberId: 'barber-1',
    reconciliation_period: '2024-12-31',
    total_appointments: 250,
    total_revenue: 12500,
    total_commission: 5000,
    total_bonuses: 300,
    total_deductions: 50,
    tax_withheld: 750,
    net_earnings: 4500,
    payout_status: 'completed',
    notes: 'Annual reconciliation - no discrepancies found'
  })
})
```

### Barber Dispute Resolution

If barber disputes earnings:

1. **Review commission_transactions**
   - Check calculation accuracy
   - Verify service prices
   - Confirm tip handling

2. **Review commission_reconciliation**
   - Check audit trail
   - Review any manual adjustments

3. **Check commission_payouts**
   - Verify all payouts processed
   - Check payout dates

4. **Add deduction if needed**
```typescript
fetch('/api/commissions/deductions', {
  method: 'POST',
  body: JSON.stringify({
    shopId: 'shop-1',
    barber_id: 'barber-1',
    deduction_type: 'adjustment',
    amount: 100,
    reason: 'Correction for dispute resolution - underpaid in Jan',
    related_transaction_id: null
  })
})
```

---

## Compliance

### Record Keeping

Maintain for 7 years:
- ✅ Commission rate schedules
- ✅ Individual transaction records
- ✅ Monthly statements
- ✅ Payout records
- ✅ Tax withholding documentation
- ✅ 1099 forms

### IRS Requirements

1. **File 1099-NEC if:**
   - Compensation ≥ $600
   - Independent contractor status
   - Annual payments made

2. **Form 1098-T (Optional)**
   - Barbers may claim education expenses
   - Tools, supplies, continuing education

3. **Backup Withholding**
   - If SSN not provided: apply 24% backup withholding
   - Update in deduction logic

### State/Local Taxes

**Note:** System applies federal tax only. Check local requirements:

- Some states require additional tax withholding
- Some cities have self-employment tax requirements
- Modify tax calculation as needed for jurisdiction

**To add state tax:**

```typescript
const FEDERAL_TAX_RATE = 0.15;
const STATE_TAX_RATE = 0.05; // Example: 5% state tax
const totalTax = totalCommission * (FEDERAL_TAX_RATE + STATE_TAX_RATE);
```

### Contractor Classification

Barbers are typically:
- **Independent Contractors** → Use 1099-NEC
- Not employees → No Form W-2 needed
- Responsible for self-employment tax

### Documentation

Generate annual report for compliance:

```typescript
// Generate year-end tax report
async function generateTaxReport(shopId: string, year: number) {
  const report = [];
  
  // Get all barbers
  const barbers = await getBarberList(shopId);
  
  for (const barber of barbers) {
    // Get YTD statement
    const statement = await getMonthlyStatement(
      shopId,
      barber.id,
      new Date(year, 11, 31) // December 31
    );
    
    if (statement.year_to_date_summary.total_commission >= 600) {
      report.push({
        barber_id: barber.id,
        barber_name: barber.name,
        ssn: barber.ssn,
        box1_compensation: statement.year_to_date_summary.total_commission,
        box2_tax_withheld: statement.year_to_date_summary.total_tax_withheld,
        filing_required: true
      });
    }
  }
  
  return report;
}
```

### Audit Trail

All changes tracked in database:
- Commission rate updates (`created_by`, `updated_at`)
- Manual adjustments (`created_by`, reason)
- Payouts (`payout_status`, `failure_reason`)
- Reconciliation (`reconciled_by`, `notes`)

Query audit trail:

```sql
-- Get all changes to rates
SELECT * FROM commission_rates 
WHERE shop_id = 'shop-1' 
ORDER BY updated_at DESC;

-- Get all manual adjustments
SELECT * FROM commission_deductions 
WHERE shop_id = 'shop-1' AND deduction_type = 'adjustment'
ORDER BY deduction_date DESC;

-- Get reconciliation history
SELECT * FROM commission_reconciliation 
WHERE shop_id = 'shop-1' 
ORDER BY reconciliation_period DESC;
```

---

## Summary

| Item | Details |
|------|---------|
| Tax Withholding | 15% federal (configurable) |
| 1099-NEC Threshold | $600 annual |
| Filing Deadline | January 31 |
| Record Retention | 7 years |
| Barber Status | Independent Contractor |
| Audit Trail | Full change tracking |

For specific tax questions, consult a tax professional or accountant familiar with barbershop operations.
