# Apple Pay Integration Guide

## Overview

This barbershop booking system includes full Apple Pay integration via Stripe. Customers can pay for appointments using Apple Pay on Safari browsers and iOS apps.

---

## ✨ Features

- ✅ Apple Pay button (shows only on supported devices)
- ✅ Secure tokenization (handled by Apple, not your server)
- ✅ Stripe integration (reuses existing payment infrastructure)
- ✅ 3D Secure support (for card security)
- ✅ Error handling & recovery
- ✅ Payment status tracking

---

## 🏗️ Architecture

### Payment Flow

```
1. User clicks Apple Pay button
   ↓
2. Apple Pay sheet appears
   ↓
3. User authorizes payment with Face ID/Touch ID
   ↓
4. Apple creates encrypted token
   ↓
5. Token sent to your server
   ↓
6. Server creates Stripe PaymentIntent
   ↓
7. Server confirms payment with Stripe
   ↓
8. Webhook confirms payment
   ↓
9. Appointment status → "confirmed"
```

---

## 📋 Setup Requirements

### 1. Stripe Account (Required)

- [ ] Create Stripe merchant account
- [ ] Enable Apple Pay in Settings
- [ ] Get Merchant ID from Stripe dashboard
- [ ] Configure Domain Association

### 2. Apple Merchant ID (Required)

You need an Apple Merchant ID to accept Apple Pay:

1. Go to https://developer.apple.com
2. Sign in with Apple Developer Account
3. Certificates, Identifiers & Profiles → Identifiers
4. Create "Merchant ID" (e.g., `merchant.com.yourdomain.barbershop`)
5. Save Merchant ID

### 3. Domain Association

Apple Pay requires domain verification:

1. Create `.well-known/apple-developer-merchantid-domain-association` file
2. Add your domain's Merchant ID
3. Upload to `https://yourdomain.com/.well-known/apple-developer-merchantid-domain-association`

**Example file:**

```
merchant.com.yourdomain.barbershop
```

### 4. Environment Variables

```bash
# .env
STRIPE_SECRET_KEY=sk_live_...        # Your Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_live_...   # Your Stripe publishable key
APPLE_MERCHANT_ID=merchant.com...    # Your Apple Merchant ID
```

---

## 💻 Implementation

### 1. Backend Setup

**API Endpoints (Already Created):**

```
POST   /api/payments/apple-pay          # Create payment intent
POST   /api/payments/apple-pay/confirm  # Confirm payment
GET    /api/payments/apple-pay          # Check availability
```

### 2. Frontend Integration

**In your booking form component:**

```tsx
import { ApplePayButton } from '@/components/ApplePayButton'

export function BookingPayment({ appointmentId, amount, shopName }) {
  const handleSuccess = (paymentIntentId) => {
    // Payment successful!
    console.log('Payment ID:', paymentIntentId)
    // Update UI, show confirmation
  }

  const handleError = (error) => {
    // Payment failed
    console.error('Payment error:', error)
    // Show error to user
  }

  return (
    <div>
      <ApplePayButton
        appointmentId={appointmentId}
        amount={amount}
        shopName={shopName}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  )
}
```

### 3. Add HTML Meta Tag

In your `app/layout.tsx`:

```tsx
<head>
  {/* Required for Apple Pay */}
  <meta name="apple-itunes-app" content="app-id=YOUR_APP_ID" />
</head>
```

---

## 🔐 Security

### Tokenization

Apple Pay tokens are:
- ✅ Created by Apple on the user's device
- ✅ Encrypted end-to-end
- ✅ Only work for your merchant ID
- ✅ Cannot be reused after transaction

### PCI Compliance

Your server never:
- ❌ Sees raw card numbers
- ❌ Touches sensitive payment data
- ❌ Stores card information
- ❌ Handles decryption

All security is handled by Apple + Stripe.

### Verification Steps

1. **Token validation** - Stripe verifies Apple's signature
2. **3D Secure** - Optional additional verification
3. **Webhook signature** - Verify all webhooks from Stripe
4. **Rate limiting** - Prevent brute force attempts

---

## 📱 Browser & Device Support

### Supported Browsers

- ✅ Safari on macOS 11+
- ✅ Safari on iOS 13+
- ✅ Safari on iPadOS 13+

### NOT Supported

- ❌ Chrome
- ❌ Firefox
- ❌ Edge
- ❌ Android
- ❌ Non-Apple devices

The `ApplePayButton` component automatically:
- Detects device support
- Hides button on unsupported browsers
- Shows error gracefully

---

## 🧪 Testing

### 1. Enable Sandbox

In Stripe dashboard:
- Settings → Developers → Test mode
- Use test card numbers

### 2. Test Cards

| Card | Number | Result |
|------|--------|--------|
| Visa | 4242 4242 4242 4242 | Success |
| Visa | 4000 0000 0000 0002 | Requires 3D Secure |
| Visa | 4000 0000 0000 0341 | Declined (insufficient funds) |

### 3. Test Apple Pay Locally

**Safari on Mac:**

1. Go to apple.com
2. Open Developer Tools (Cmd+Option+U)
3. Find element with Apple Pay (e.g., `apple-pay-button`)
4. Expand → Interact with button
5. Follow prompts in simulator

**iOS Simulator:**

1. Open Xcode
2. Simulator → Device → Manage Devices
3. Create iPhone simulator
4. Run app, test Apple Pay button

### 4. Manual Testing Endpoint

```bash
# Check if Apple Pay is available
curl https://yourdomain.com/api/payments/apple-pay

# Response:
{
  "available": true,
  "supportedNetworks": ["visa", "mastercard", "amex", "discover"],
  "supportedCapabilities": ["supports3DS"],
  "countryCode": "US",
  "currencyCode": "USD"
}
```

---

## 🛠️ Troubleshooting

### Apple Pay button not showing

**Issue:** Button doesn't appear on Safari

**Solutions:**
1. Check browser (must be Safari on Mac/iOS)
2. Verify HTTPS (required for Apple Pay)
3. Check merchant setup in Stripe dashboard
4. Verify domain association file is accessible

```bash
# Test domain association
curl https://yourdomain.com/.well-known/apple-developer-merchantid-domain-association
# Should return your Merchant ID
```

### Payment fails with "Merchant validation failed"

**Issue:** Apple can't validate your merchant

**Solutions:**
1. Verify Apple Merchant ID is correct
2. Check domain association file exists
3. Verify Stripe Merchant ID matches
4. Clear Safari cache and retry

### Token processing fails

**Issue:** Valid Apple Pay token rejected by Stripe

**Solutions:**
1. Check Stripe API key in .env
2. Verify test vs live keys match
3. Check appointment exists in database
4. Check database connection

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"
```

### No payment confirmation email

**Issue:** Customer doesn't receive booking confirmation

**Solutions:**
1. Check Resend API key
2. Verify EMAIL_FROM is correct
3. Check Resend dashboard for delivery logs
4. Verify customer email is correct in database

---

## 📊 Monitoring

### Track Apple Pay Usage

```sql
-- Apple Pay transactions only
SELECT COUNT(*) as apple_pay_count 
FROM payments 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Success rate
SELECT 
  status,
  COUNT(*) as count
FROM payments
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Average transaction value
SELECT 
  AVG(amount) as avg_amount,
  SUM(amount) as total_revenue
FROM payments
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND status = 'confirmed';
```

### Webhook Monitoring

Check webhook delivery in Stripe:
1. Stripe Dashboard → Developers → Webhooks
2. Click webhook endpoint
3. View recent deliveries
4. Check for failures

---

## 🚀 Performance Tips

### 1. Lazy Load Apple Pay

```tsx
const ApplePayButton = dynamic(
  () => import('@/components/ApplePayButton'),
  { loading: () => <div>Loading payment options...</div> }
)
```

### 2. Preload Payment Methods

```tsx
// Early in booking form
useEffect(() => {
  fetch('/api/payments/apple-pay')
}[, [])
```

### 3. Cache Availability Check

```tsx
const [applePayAvailable, setApplePayAvailable] = useState(
  typeof window !== 'undefined' && !!window.ApplePaySession
)
```

---

## 🔗 Related Documentation

- [Stripe Apple Pay Guide](https://stripe.com/docs/apple-pay)
- [Apple Pay Web Implementation](https://developer.apple.com/apple-pay/web/)
- [Payment Integration Guide](./DEPLOYMENT.md)
- [Stripe Webhooks](./README.md)

---

## 🆘 Support

**Stripe Support:** https://support.stripe.com  
**Apple Developer Support:** https://developer.apple.com/support  
**Project Issues:** Check GitHub issues

---

## Next Steps

1. ✅ Create Apple Merchant ID (Apple Developer)
2. ✅ Configure Stripe (enable Apple Pay)
3. ✅ Add domain association file
4. ✅ Update .env variables
5. ✅ Test on Safari
6. ✅ Deploy to production
7. ✅ Monitor transactions

**Apple Pay is ready to go!** 🍎💳
