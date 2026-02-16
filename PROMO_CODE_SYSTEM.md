# Promo Code System Documentation

## Overview

The Promo Code System provides a complete solution for managing promotional offers in the barbershop SaaS platform. It integrates with Stripe to automatically apply discounts and tracks usage across the platform.

### Key Features

- **50% Discount for 6 Months**: Hard-coded initial offer with configurable discounts
- **Unique Code Generation**: Create memorable promotional codes (e.g., LAUNCH50, WELCOME50)
- **Usage Tracking**: Monitor code usage, redemptions, and discount applied
- **Stripe Integration**: Automatic coupon creation and subscription discount application
- **Admin Management**: Create, update, and manage promo codes
- **Analytics Dashboard**: Track redemption rates and discount impact
- **Expiration Control**: Set expiration dates and usage limits per code
- **Shop-Level Restrictions**: Prevent code stacking with one-promo-per-shop rule

---

## Database Schema

### `promo_codes` Table

Stores all promo codes and their configuration:

```sql
CREATE TABLE promo_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,          -- Unique promotional code (LAUNCH50)
  discount_percent NUMERIC(5,2) NOT NULL,   -- Discount percentage (50.00)
  duration_months INTEGER NOT NULL,          -- Duration of discount (6)
  max_uses INTEGER,                          -- Max total redemptions (NULL = unlimited)
  used_count INTEGER DEFAULT 0,              -- Current usage count
  expires_at TIMESTAMP,                      -- Code expiration date
  is_active BOOLEAN DEFAULT true,            -- Active/inactive flag
  stripe_coupon_id VARCHAR(255),             -- Associated Stripe coupon ID
  created_by INTEGER REFERENCES users(id),   -- Admin who created code
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT                           -- Optional notes
);
```

### `promo_code_usage` Table

Tracks when and where codes are redeemed:

```sql
CREATE TABLE promo_code_usage (
  id SERIAL PRIMARY KEY,
  code_id INTEGER REFERENCES promo_codes(id),
  shop_id INTEGER REFERENCES shops(id),
  subscription_id VARCHAR(255),              -- Stripe subscription ID
  redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  discount_applied NUMERIC(10,2),            -- Actual discount amount ($19.50)
  discount_end_at TIMESTAMP,                 -- When discount expires
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `shops` Table Updates

Added promo code tracking:

```sql
ALTER TABLE shops ADD COLUMN active_promo_code_id INTEGER;
ALTER TABLE shops ADD COLUMN promo_discount_percent NUMERIC(5,2);
ALTER TABLE shops ADD COLUMN promo_expires_at TIMESTAMP;
```

---

## API Endpoints

### 1. Create Promo Code (Admin)

**POST** `/api/promo`

Create a new promotional code with custom parameters.

**Request:**
```json
{
  "code": "LAUNCH50",
  "discountPercent": 50,
  "durationMonths": 6,
  "maxUses": 100,
  "expiresAt": "2024-12-31T23:59:59Z",
  "description": "Q1 Launch Special"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Promo code created successfully",
  "promoCode": {
    "id": 1,
    "code": "LAUNCH50",
    "discountPercent": 50,
    "durationMonths": 6,
    "maxUses": 100,
    "expiresAt": "2024-12-31T23:59:59Z",
    "isActive": true,
    "stripeCouponId": "cpon_abc123",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### 2. Validate Promo Code

**GET** `/api/promo/validate?code=LAUNCH50&shopId=1`

Check if a code is valid without redeeming it. Useful for frontend validation during checkout.

**Response:**
```json
{
  "success": true,
  "isValid": true,
  "code": "LAUNCH50",
  "discountPercent": 50,
  "durationMonths": 6,
  "savings": 19.50,
  "message": "Get 50% off for 6 months!"
}
```

**Invalid Code Response:**
```json
{
  "success": false,
  "isValid": false,
  "reason": "Promo code has expired",
  "message": "Invalid code: Promo code has expired"
}
```

### 3. Redeem Promo Code

**POST** `/api/promo/redeem`

Apply a promo code to a shop's subscription.

**Request:**
```json
{
  "code": "LAUNCH50",
  "shopId": 1,
  "subscriptionId": "sub_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Promo code redeemed successfully",
  "discountApplied": 19.50,
  "discountPercent": 50,
  "durationMonths": 6,
  "discountEndDate": "2024-07-15T10:30:00Z",
  "stripeCouponId": "cpon_abc123",
  "savings": "$19.50 per month for 6 months"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "DUPLICATE_REDEMPTION",
  "message": "This shop has already redeemed this promo code"
}
```

### 4. Get Analytics (Admin)

**GET** `/api/promo/analytics`

Retrieve comprehensive analytics on promo code usage and impact.

**Response:**
```json
{
  "success": true,
  "summary": {
    "totalCodes": 5,
    "activeCodes": 4,
    "totalRedemptions": 25,
    "totalDiscountApplied": 487.50,
    "avgDiscountPerCode": 97.50,
    "avgRedemptionsPerCode": 5.0
  },
  "codes": [
    {
      "code": "LAUNCH50",
      "discountPercent": 50,
      "durationMonths": 6,
      "usedCount": 10,
      "maxUses": 100,
      "utilizationRate": "10.0%",
      "isActive": true,
      "expiresAt": "2024-12-31T23:59:59Z",
      "redemptions": 10,
      "totalDiscountGiven": 195.00,
      "avgDiscountPerRedemption": 19.50
    }
  ]
}
```

### 5. Get All Promo Codes (Admin)

**GET** `/api/promo`

List all promo codes with their current status.

**Response:**
```json
{
  "success": true,
  "total": 5,
  "codes": [
    {
      "id": 1,
      "code": "LAUNCH50",
      "discountPercent": 50,
      "durationMonths": 6,
      "maxUses": 100,
      "usedCount": 25,
      "expiresAt": "2024-12-31T23:59:59Z",
      "isActive": true,
      "stripeCouponId": "cpon_abc123",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 6. Update Promo Code (Admin)

**PATCH** `/api/promo`

Update an existing promo code's configuration.

**Request:**
```json
{
  "id": 1,
  "isActive": false,
  "maxUses": 50,
  "description": "Q1 Launch Special - Updated"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Promo code updated successfully",
  "promoCode": {
    "id": 1,
    "code": "LAUNCH50",
    "discountPercent": 50,
    "durationMonths": 6,
    "maxUses": 50,
    "usedCount": 25,
    "isActive": false,
    "updatedAt": "2024-02-01T14:22:00Z"
  }
}
```

### 7. Delete Promo Code (Admin)

**DELETE** `/api/promo?id=1`

Remove a promo code from the system (use carefully).

**Response:**
```json
{
  "success": true,
  "message": "Promo code deleted successfully"
}
```

---

## Service Layer (PromoService)

### Class: PromoService

The core business logic for promo code management.

#### Public Methods

##### `createPromoCode()`
```typescript
async createPromoCode(
  code: string,
  discountPercent: number,
  durationMonths: number,
  maxUses?: number,
  expiresAt?: string,
  description?: string,
  createdBy?: number
): Promise<PromoCode>
```

Creates a new promo code and associated Stripe coupon.

**Features:**
- Validates code uniqueness
- Normalizes code to uppercase
- Creates Stripe coupon automatically
- Stores in database with metadata

**Example:**
```typescript
const code = await promoService.createPromoCode(
  'LAUNCH50',
  50,
  6,
  100,
  '2024-12-31T23:59:59Z',
  'Q1 Launch Special'
);
```

##### `validatePromoCode()`
```typescript
async validatePromoCode(
  code: string,
  shopId?: number
): Promise<ValidationResult>
```

Validates a code without redeeming it.

**Checks:**
- Code exists in database
- Code is active
- Code hasn't expired
- Usage limit not exceeded
- Shop doesn't already have active code

**Returns:**
```typescript
{
  isValid: boolean,
  reason?: string,     // Error reason
  code?: PromoCode     // Code details if valid
}
```

##### `redeemPromoCode()`
```typescript
async redeemPromoCode(
  code: string,
  shopId: number,
  subscriptionId?: string
): Promise<RedemptionResult>
```

Applies a promo code to a shop.

**Process:**
1. Validates the code
2. Prevents duplicate redemptions
3. Calculates discount end date
4. Applies Stripe coupon (if subscription exists)
5. Records usage
6. Updates shop with active code

**Returns:**
```typescript
{
  success: boolean,
  message: string,
  code?: PromoCode,
  discountApplied?: number,
  discountEndDate?: string,
  stripeCouponId?: string,
  error?: string
}
```

##### `getAnalytics()`
```typescript
async getAnalytics(): Promise<AnalyticsData>
```

Generates comprehensive usage statistics.

**Returns:**
```typescript
{
  totalCodes: number,
  activeCodes: number,
  totalRedemptions: number,
  totalDiscountApplied: number,
  codes: Array<{
    code: string,
    discountPercent: number,
    usedCount: number,
    maxUses: number | null,
    isActive: boolean,
    expiresAt: string | null,
    redemptions: number,
    totalDiscountGiven: number
  }>
}
```

##### `updatePromoCode()`
```typescript
async updatePromoCode(
  id: number,
  updates: Partial<PromoCode>
): Promise<PromoCode>
```

Updates code configuration. Supports partial updates.

##### `deletePromoCode()`
```typescript
async deletePromoCode(id: number): Promise<void>
```

Removes a code from the system.

##### `cleanupExpiredCodes()`
```typescript
async cleanupExpiredCodes(): Promise<number>
```

Deactivates expired codes and removes discounts from shops. Useful for scheduled maintenance.

**Returns:** Number of codes cleaned up

---

## Integration Examples

### Frontend: React Component

```typescript
// pages/onboarding/promo.tsx

import { useState } from 'react';

export default function PromoCodeInput() {
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    if (!code.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/promo/validate?code=${code}&shopId=${shopId}`
      );
      const data = await response.json();

      if (data.isValid) {
        setDiscount(data);
        setError('');
      } else {
        setError(data.reason);
        setDiscount(null);
      }
    } catch (err) {
      setError('Failed to validate code');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    const response = await fetch('/api/promo/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        shopId,
        subscriptionId: stripeSubscriptionId,
      }),
    });

    const result = await response.json();
    if (result.success) {
      // Show success message and redirect
    }
  };

  return (
    <div>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter promo code"
      />
      <button onClick={handleValidate} disabled={loading}>
        Validate
      </button>

      {discount && (
        <div>
          <p>Save {discount.discountPercent}% for {discount.durationMonths} months!</p>
          <p>Monthly savings: ${discount.savings.toFixed(2)}</p>
          <button onClick={handleRedeem}>Apply Code</button>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

### Backend: Apply During Signup

```typescript
// lib/auth-service.ts

async function createShop(shopData, promoCode?) {
  // Create shop first
  const shop = await createShopInDB(shopData);

  // Apply promo code if provided
  if (promoCode) {
    const result = await promoService.redeemPromoCode(
      promoCode,
      shop.id,
      shop.stripeSubscriptionId
    );

    if (result.success) {
      console.log(`Discount applied: $${result.discountApplied}`);
    }
  }

  return shop;
}
```

---

## Stripe Integration

### How It Works

1. **Coupon Creation**: When a code is created, a Stripe coupon is automatically generated:
   ```typescript
   const coupon = await stripe.coupons.create({
     percent_off: 50,
     duration: 'limited',
     duration_in_months: 6,
     metadata: { code: 'LAUNCH50' }
   });
   ```

2. **Subscription Discount**: When code is redeemed:
   ```typescript
   const subscription = await stripe.subscriptions.update(
     subscriptionId,
     { coupon: coupon.id }
   );
   ```

3. **Automatic Expiration**: Stripe coupon duration is set to match the promotion period (6 months). After 6 months, regular pricing applies automatically.

4. **Tracking**: Each redemption records:
   - Shop ID
   - Subscription ID
   - Discount amount ($19.50 for 50% of $39)
   - Discount end date

---

## Admin Workflow

### Creating a Launch Campaign

```bash
# 1. Create the promo code
curl -X POST https://yourapi.com/api/promo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "code": "LAUNCH50",
    "discountPercent": 50,
    "durationMonths": 6,
    "maxUses": 500,
    "expiresAt": "2024-12-31T23:59:59Z",
    "description": "Q1 2024 Launch Special Offer"
  }'

# 2. Check analytics
curl https://yourapi.com/api/promo/analytics \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 3. Deactivate when campaign ends
curl -X PATCH https://yourapi.com/api/promo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "id": 1,
    "isActive": false
  }'
```

---

## Testing

### Unit Tests

The promo service includes comprehensive unit tests covering:

- ✅ Code validation (valid, expired, max uses, inactive)
- ✅ Duplicate redemption prevention
- ✅ Stripe coupon creation
- ✅ Analytics aggregation
- ✅ Code updates and deletion
- ✅ Cleanup of expired codes

**Run tests:**
```bash
npm test -- lib/promo-service.test.ts
npm run test:coverage
```

### Manual Testing Checklist

- [ ] Create promo code via API
- [ ] Validate code before redemption
- [ ] Redeem code and verify Stripe discount
- [ ] Check shop discount in database
- [ ] Verify analytics show redemption
- [ ] Update code status
- [ ] Test duplicate redemption error
- [ ] Validate expiration enforcement
- [ ] Test max uses limit
- [ ] Check cleanup task removes expired codes

---

## Pricing Calculation

### Base Pricing
- Monthly plan: **$39/month**
- Base annual: **$468/year**

### With 50% Discount
- Discounted price: **$19.50/month**
- Discount duration: **6 months**
- Total savings: **$117** (6 × $19.50)
- Price after 6 months: **$39/month** (automatically)

### Example Timeline

```
Month 1-6:  $19.50/month (50% off)
Month 7+:   $39.00/month (regular price)
Total Year 1: $19.50 × 6 + $39 × 6 = $117 + $234 = $351
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Promo code not found` | Code doesn't exist | Check spelling, verify code exists |
| `Promo code has expired` | Code expiration date passed | Create new code or extend expiration |
| `Promo code has reached maximum usage limit` | Used up all allowed redemptions | Create another code or raise limit |
| `Shop already has an active promo code` | Shop can't stack codes | Remove existing code first |
| `This shop has already redeemed this promo code` | Duplicate redemption attempt | Use a different code |
| `Promo code is inactive` | Code deactivated | Activate code or create new one |

---

## Maintenance

### Regular Tasks

**Weekly:**
- Monitor analytics dashboard
- Check redemption rates

**Monthly:**
- Review campaign performance
- Deactivate expired codes
- Run cleanup task

**Quarterly:**
- Analyze ROI of promotions
- Plan new campaigns
- Archive old codes

### Database Maintenance

```sql
-- Find most popular codes
SELECT code, used_count, discount_percent
FROM promo_codes
ORDER BY used_count DESC
LIMIT 10;

-- Get redemption timeline
SELECT DATE(redeemed_at), COUNT(*) as redemptions
FROM promo_code_usage
GROUP BY DATE(redeemed_at)
ORDER BY DATE(redeemed_at);

-- Calculate total revenue impact
SELECT SUM(discount_applied) as total_discounts
FROM promo_code_usage
WHERE redeemed_at >= '2024-01-01';
```

---

## Deployment

### Prerequisites
- PostgreSQL database with migrations applied
- Stripe account and API keys
- Environment variables configured

### Environment Variables

```env
STRIPE_SECRET_KEY=sk_live_...
DATABASE_URL=postgresql://user:password@host/dbname
NODE_ENV=production
```

### Migration Steps

1. **Apply database migration:**
   ```bash
   psql -U postgres -d barbershop_booking -f db_migration_promo_codes.sql
   ```

2. **Verify tables created:**
   ```bash
   psql -U postgres -d barbershop_booking -c "\dt promo*"
   ```

3. **Test API endpoints:**
   ```bash
   npm run test -- lib/promo-service.test.ts
   ```

4. **Deploy with confidence:**
   ```bash
   git add .
   git commit -m "feat: Promo code system with Stripe integration"
   git push origin main
   ```

---

## Support & Troubleshooting

### Common Issues

**Q: Code created but Stripe coupon failed?**
A: Check Stripe API key is valid. Code is still created but manual coupon creation needed.

**Q: Discount not applied in Stripe?**
A: Ensure subscription exists. Try redeeming again or manually apply coupon in Stripe dashboard.

**Q: Analytics showing wrong numbers?**
A: Run cleanup task to remove expired codes. Verify database constraints are not violated.

---

## Future Enhancements

- [ ] Variable discount percentages per code
- [ ] Regional/segment-specific codes
- [ ] Referral bonus codes
- [ ] Time-based code scheduling (auto-activate)
- [ ] A/B testing different discounts
- [ ] Email templates for code distribution
- [ ] QR code generation for marketing
- [ ] Integration with email marketing platforms

---

## Support

For questions or issues:
- Create issue: `github.com/yourepo/issues`
- Documentation: This file
- Examples: See integration examples above
