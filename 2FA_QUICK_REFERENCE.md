# 2FA Quick Reference Guide

## Quick Start

### 1. Install Dependencies

Twilio and speakeasy are already integrated in the service layer. In `package.json`, add:

```bash
npm install twilio@^4.0.0 speakeasy@^2.0.0 qrcode@^1.5.0
```

### 2. Environment Variables

```bash
# .env or .env.local
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 3. Run Database Migration

```bash
psql -U postgres -h localhost -d barbershop < db/migrations/020_two_factor_authentication.sql
```

## File Structure

```
app/api/2fa/
├── enable/route.ts              # Start 2FA setup
├── verify-sms/route.ts          # Send and verify SMS codes
├── setup-authenticator/route.ts # TOTP QR code
├── verify-authenticator/route.ts# Verify TOTP code
├── confirm-2fa/route.ts         # Confirm 2FA enabled
├── generate-backup-codes/route.ts
├── verify-backup-code/route.ts
├── disable/route.ts             # Disable 2FA
├── status/route.ts              # Get 2FA status
└── verify-login/route.ts        # Complete login with 2FA

components/
├── Enable2FAForm.tsx            # Method selection
├── VerifyPhoneForm.tsx          # SMS verification
├── SetupAuthenticatorForm.tsx   # TOTP setup
├── BackupCodesModal.tsx         # Display backup codes
├── Verify2FAForm.tsx            # Login verification
├── BackupCodeModal.tsx          # Backup code entry
└── Use2FASettings.tsx           # Settings dashboard

lib/
├── two-factor-service.ts        # Core 2FA logic
└── two-factor-service.test.ts   # Unit tests

db/migrations/
└── 020_two_factor_authentication.sql
```

## Code Examples

### Enable 2FA (Frontend)

```tsx
const handleEnable = async () => {
  const response = await fetch('/api/2fa/enable', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ method: 'sms', phoneNumber: '+1234567890' })
  });
  const data = await response.json();
  // Navigate to VerifyPhoneForm
};
```

### Verify SMS Code (Frontend)

```tsx
const handleSMSVerify = async (code: string, attemptId: string) => {
  const response = await fetch('/api/2fa/verify-sms', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'verify',
      code,
      attemptId
    })
  });
  const data = await response.json();
  if (data.success) {
    // Generate backup codes
  }
};
```

### Generate Backup Codes (Frontend)

```tsx
const handleGenerateBackupCodes = async () => {
  const response = await fetch('/api/2fa/generate-backup-codes', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
  // Show BackupCodesModal with data.codes
};
```

### Verify 2FA During Login (Frontend)

```tsx
// After password verification
const handleLogin2FA = async (code: string) => {
  const response = await fetch('/api/2fa/verify-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      method: 'sms',
      code,
      attemptId
    })
  });
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    // Redirect to dashboard
  }
};
```

## API Cheat Sheet

| Endpoint | Method | Purpose | Auth | Body |
|----------|--------|---------|------|------|
| `/api/2fa/enable` | POST | Start 2FA | Yes | `{method, phoneNumber?}` |
| `/api/2fa/verify-sms` | POST | SMS code | Yes | `{action, phoneNumber?, code?, attemptId?}` |
| `/api/2fa/setup-authenticator` | POST | Get TOTP | Yes | `{}` |
| `/api/2fa/verify-authenticator` | POST | Verify TOTP | Yes | `{code}` |
| `/api/2fa/confirm-2fa` | POST | Activate 2FA | Yes | `{}` |
| `/api/2fa/generate-backup-codes` | POST | Create codes | Yes | `{}` |
| `/api/2fa/verify-backup-code` | POST | Use backup | Yes | `{code}` |
| `/api/2fa/disable` | POST | Disable 2FA | Yes | `{password}` |
| `/api/2fa/status` | GET | Get status | Yes | — |
| `/api/2fa/verify-login` | POST | Complete 2FA | No | `{userId, method, code, attemptId?}` |

## Common Flows

### Setup 2FA (SMS)

```
1. POST /api/2fa/enable → {method: 'sms', phoneNumber: '+1...'}
2. POST /api/2fa/verify-sms → {action: 'send', phoneNumber: '+1...'}
   → Returns attemptId
3. POST /api/2fa/verify-sms → {action: 'verify', code: '123456', attemptId}
4. POST /api/2fa/generate-backup-codes → Returns 10 codes
5. POST /api/2fa/confirm-2fa → 2FA is now enabled
```

### Setup 2FA (Authenticator)

```
1. POST /api/2fa/enable → {method: 'totp'}
2. POST /api/2fa/setup-authenticator → Returns secret, QR code
   User scans QR in app
3. POST /api/2fa/verify-authenticator → {code: '123456'}
4. POST /api/2fa/generate-backup-codes → Returns 10 codes
5. POST /api/2fa/confirm-2fa → 2FA is now enabled
```

### Login with 2FA

```
1. POST /api/auth/login → {email, password}
   → Returns {requiresTwoFactor: true, userId, method, attemptId?}

2. If SMS:
   POST /api/2fa/verify-login → {userId, method: 'sms', code, attemptId}

   If TOTP:
   POST /api/2fa/verify-login → {userId, method: 'totp', code}

   If Backup:
   POST /api/2fa/verify-login → {userId, method: 'backup', code}

3. Returns JWT tokens if successful
```

## Troubleshooting

### SMS Not Sending

Check:
```bash
echo $TWILIO_ACCOUNT_SID  # Should not be empty
echo $TWILIO_AUTH_TOKEN   # Should not be empty
echo $TWILIO_PHONE_NUMBER # Should start with +
```

### TOTP Not Working

Check device:
1. Time is synchronized (Settings → Date & Time)
2. App has access to current time
3. Code is 6 digits with leading zeros

### Backup Code Issues

Check database:
```sql
SELECT COUNT(*) FROM user_backup_codes 
WHERE user_id = 'xxx' AND used_at IS NULL;
-- Should show remaining unused codes
```

## Database Queries

### Get User 2FA Status

```sql
SELECT is_enabled, method, phone_verified, totp_configured 
FROM user_two_factor_settings 
WHERE user_id = 'xxx' AND shop_id = 'yyy';
```

### Reset 2FA for User

```sql
-- Disable
UPDATE user_two_factor_settings 
SET is_enabled = FALSE, method = 'none'
WHERE user_id = 'xxx';

-- Clean up
DELETE FROM user_backup_codes WHERE user_id = 'xxx';
DELETE FROM two_factor_sessions WHERE user_id = 'xxx';
```

### View Audit Log

```sql
SELECT event_type, success, created_at 
FROM two_factor_audit 
WHERE user_id = 'xxx' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Testing with cURL

### Enable 2FA

```bash
curl -X POST http://localhost:3000/api/2fa/enable \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method":"sms","phoneNumber":"+1234567890"}'
```

### Send SMS Code

```bash
curl -X POST http://localhost:3000/api/2fa/verify-sms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"send","phoneNumber":"+1234567890"}'
```

### Get 2FA Status

```bash
curl -X GET http://localhost:3000/api/2fa/status \
  -H "Authorization: Bearer $TOKEN"
```

### Generate Backup Codes

```bash
curl -X POST http://localhost:3000/api/2fa/generate-backup-codes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Performance Tips

1. **Cache 2FA Status**: Store in localStorage, invalidate on logout
2. **Lazy Load Components**: Load 2FA forms only when needed
3. **SMS Resend Cooldown**: Prevent abuse with 60-second delay
4. **Code Length**: 6 digits optimal (faster to enter, secure enough)
5. **Timeout**: 10 minutes for SMS, 30 seconds for TOTP

## Security Checklist

- [ ] Twilio credentials in environment variables (not in code)
- [ ] HTTPS enforced in production
- [ ] Rate limiting enabled (5 attempts, 15-minute lockout)
- [ ] Backup codes hashed with bcrypt
- [ ] Audit logs enabled for all 2FA events
- [ ] Old 2FA codes deleted after verification
- [ ] Phone numbers masked in API responses
- [ ] TOTP secrets never logged
- [ ] Sessions expire properly
- [ ] Password required to disable 2FA

## Support Resources

- **Implementation Guide**: `2FA_IMPLEMENTATION_GUIDE.md`
- **Unit Tests**: `lib/two-factor-service.test.ts`
- **Components**: `/components/[2FA components].tsx`
- **API Routes**: `/app/api/2fa/*`
- **Twilio Docs**: https://www.twilio.com/docs/verify/api
- **TOTP Spec**: https://tools.ietf.org/html/rfc6238
