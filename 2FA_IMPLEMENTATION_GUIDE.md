# Two-Factor Authentication (2FA) Implementation Guide

## Overview

This comprehensive guide documents the complete 2FA implementation for the barbershop SaaS platform, supporting both SMS (Twilio) and authenticator app (TOTP) methods with backup codes for account recovery.

## Table of Contents

1. [Architecture](#architecture)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [React Components](#react-components)
5. [Authentication Flow](#authentication-flow)
6. [Setup Guide](#setup-guide)
7. [Recovery Procedures](#recovery-procedures)
8. [Security Considerations](#security-considerations)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

## Architecture

### Components

The 2FA system consists of:

- **Database Layer**: 4 new tables for settings, backup codes, sessions, and audit logs
- **Service Layer**: `TwoFactorService` in `lib/two-factor-service.ts`
- **API Endpoints**: 8 endpoints under `/api/2fa/`
- **React Components**: 7 UI components for setup and verification
- **Authentication Integration**: Updated login flow to check for 2FA

### Technology Stack

- **SMS**: Twilio API (integrated via environment variables)
- **TOTP**: Custom HMAC-SHA1 implementation (compatible with Google Authenticator, Authy, Microsoft Authenticator)
- **Code Hashing**: bcrypt (using existing passwordService)
- **Database**: PostgreSQL (existing setup)

## Database Schema

### `user_two_factor_settings`

Stores user 2FA configuration:

```sql
CREATE TABLE user_two_factor_settings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  is_enabled BOOLEAN DEFAULT FALSE,
  method VARCHAR(20) CHECK (method IN ('sms', 'totp', 'none')),
  phone_number VARCHAR(20),
  phone_verified BOOLEAN DEFAULT FALSE,
  totp_secret VARCHAR(255),
  backup_codes_generated_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Fields**:
- `is_enabled`: Whether 2FA is active
- `method`: Authentication method (sms/totp/none)
- `phone_number`: SMS destination
- `phone_verified`: SMS verification status
- `totp_secret`: Base64-encoded TOTP secret
- `backup_codes_generated_at`: When backup codes were last generated

### `user_backup_codes`

Recovery codes for account access:

```sql
CREATE TABLE user_backup_codes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP
);
```

**Fields**:
- `code_hash`: bcrypt hash of the actual code
- `used_at`: When the code was used (NULL = unused)

**Important**: Codes cannot be reused once marked as `used_at`.

### `two_factor_sessions`

Temporary sessions for 2FA verification during login:

```sql
CREATE TABLE two_factor_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  attempt_id VARCHAR(100) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  code_expires_at TIMESTAMP,
  failed_attempts INTEGER DEFAULT 0,
  session_expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP
);
```

**Fields**:
- `attempt_id`: Unique identifier for SMS code verification
- `failed_attempts`: Count for rate limiting
- `code_expires_at`: When the SMS code expires (10 minutes)
- `session_expires_at`: When the entire verification session expires

### `two_factor_audit`

Security audit log for 2FA events:

```sql
CREATE TABLE two_factor_audit (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  event_type VARCHAR(100),
  method VARCHAR(20),
  success BOOLEAN,
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP
);
```

**Audit Events**:
- `2fa_enable_started` - User starts 2FA setup
- `sms_code_sent` - SMS code generated and sent
- `sms_code_verified` - SMS code verified
- `authenticator_setup_initiated` - TOTP setup started
- `authenticator_code_verified` - TOTP code verified
- `backup_codes_generated` - New backup codes created
- `backup_code_used` - Backup code consumed
- `2fa_enabled` - 2FA confirmed active
- `2fa_disabled` - 2FA disabled by user
- `2fa_login_success` - Successful 2FA login
- `2fa_login_failed` - Failed 2FA login

## API Endpoints

All endpoints require authentication (JWT token in `Authorization: Bearer` header).

### POST /api/2fa/enable

**Start 2FA setup process**

```bash
POST /api/2fa/enable
Authorization: Bearer <token>
Content-Type: application/json

{
  "method": "sms" | "totp",
  "phoneNumber": "+1234567890" // Required if method = "sms"
}
```

**Response**:
```json
{
  "success": true,
  "settings": {
    "id": "uuid",
    "user_id": "uuid",
    "is_enabled": false,
    "method": "sms"
  }
}
```

### POST /api/2fa/verify-sms

**Send and verify SMS codes**

**Send code**:
```bash
POST /api/2fa/verify-sms
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "send",
  "phoneNumber": "+1234567890"
}
```

**Response**:
```json
{
  "success": true,
  "attemptId": "uuid",
  "expiresIn": 600
}
```

**Verify code**:
```bash
POST /api/2fa/verify-sms
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "verify",
  "code": "123456",
  "attemptId": "uuid"
}
```

**Response**:
```json
{
  "success": true
}
```

### POST /api/2fa/setup-authenticator

**Get TOTP secret and QR code**

```bash
POST /api/2fa/setup-authenticator
Authorization: Bearer <token>
Content-Type: application/json

{}
```

**Response**:
```json
{
  "success": true,
  "secret": "base32-encoded-secret",
  "qrCodeUrl": "otpauth://totp/...",
  "manual_entry_key": "base32-encoded-secret"
}
```

### POST /api/2fa/verify-authenticator

**Verify TOTP code during setup**

```bash
POST /api/2fa/verify-authenticator
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "123456"
}
```

**Response**:
```json
{
  "success": true
}
```

### POST /api/2fa/confirm-2fa

**Activate 2FA after successful verification**

```bash
POST /api/2fa/confirm-2fa
Authorization: Bearer <token>
Content-Type: application/json

{}
```

**Response**:
```json
{
  "success": true
}
```

### POST /api/2fa/generate-backup-codes

**Generate 10 backup codes**

```bash
POST /api/2fa/generate-backup-codes
Authorization: Bearer <token>
Content-Type: application/json

{}
```

**Response**:
```json
{
  "success": true,
  "codes": [
    "ABC12345DEF6",
    "XYZ98765ABC4",
    ...
  ],
  "count": 10
}
```

### POST /api/2fa/verify-backup-code

**Use backup code during login**

```bash
POST /api/2fa/verify-backup-code
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "ABC12345DEF6"
}
```

**Response**:
```json
{
  "success": true,
  "remaining": 9
}
```

### POST /api/2fa/disable

**Disable 2FA (requires password)**

```bash
POST /api/2fa/disable
Authorization: Bearer <token>
Content-Type: application/json

{
  "password": "user-password"
}
```

**Response**:
```json
{
  "success": true
}
```

### GET /api/2fa/status

**Check 2FA status**

```bash
GET /api/2fa/status
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "is_enabled": true,
  "method": "sms",
  "phone_number": "****7890",
  "totp_configured": false
}
```

### POST /api/2fa/verify-login

**Complete 2FA verification during login**

```bash
POST /api/2fa/verify-login
Content-Type: application/json

{
  "userId": "uuid",
  "method": "sms" | "totp" | "backup",
  "code": "123456",
  "attemptId": "uuid" // Required for SMS
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "barber",
    "shopId": "uuid"
  },
  "accessToken": "jwt-token",
  "refreshToken": "jwt-token",
  "expiresIn": 900
}
```

## React Components

### Enable2FAForm

**Purpose**: Choose between SMS and authenticator app

**Props**:
- `onMethodSelect: (method: 'sms' | 'totp') => void`
- `loading?: boolean`

**Usage**:
```tsx
<Enable2FAForm
  onMethodSelect={handleMethodSelect}
  loading={isLoading}
/>
```

### VerifyPhoneForm

**Purpose**: Send and verify SMS code for phone validation

**Props**:
- `onPhoneSubmit: (phone: string) => Promise<void>`
- `onCodeVerify: (code: string, attemptId: string) => Promise<void>`
- `onBack: () => void`
- `loading?: boolean`

**Usage**:
```tsx
<VerifyPhoneForm
  onPhoneSubmit={sendSMS}
  onCodeVerify={verifySMS}
  onBack={goBack}
/>
```

### SetupAuthenticatorForm

**Purpose**: Display TOTP secret and QR code

**Props**:
- `secret?: string`
- `qrCodeUrl?: string`
- `onCodeVerify: (code: string) => Promise<void>`
- `onBack: () => void`
- `loading?: boolean`

**Usage**:
```tsx
<SetupAuthenticatorForm
  secret={secret}
  qrCodeUrl={qrCodeUrl}
  onCodeVerify={verifyTOTP}
  onBack={goBack}
/>
```

### BackupCodesModal

**Purpose**: Display and save backup codes

**Props**:
- `codes: string[]`
- `onConfirm: () => void`
- `onCancel: () => void`
- `loading?: boolean`

**Usage**:
```tsx
<BackupCodesModal
  codes={backupCodes}
  onConfirm={handleConfirm}
  onCancel={handleCancel}
/>
```

### Verify2FAForm

**Purpose**: Enter 2FA code during login

**Props**:
- `method: 'sms' | 'totp'`
- `attemptId?: string`
- `phoneNumber?: string`
- `onVerify: (code: string) => Promise<void>`
- `onUseBackupCode: () => void`
- `onResendSMS?: () => Promise<void>`
- `loading?: boolean`

**Usage**:
```tsx
<Verify2FAForm
  method={method}
  attemptId={attemptId}
  phoneNumber={maskedPhone}
  onVerify={verify2FA}
  onUseBackupCode={switchToBackupCode}
/>
```

### BackupCodeModal

**Purpose**: Enter backup code during login

**Props**:
- `onVerify: (code: string) => Promise<void>`
- `onBack: () => void`
- `loading?: boolean`

**Usage**:
```tsx
<BackupCodeModal
  onVerify={verifyBackupCode}
  onBack={goBack}
/>
```

### Use2FASettings

**Purpose**: Manage 2FA settings in user dashboard

**Props**:
- `onEnable: () => void`
- `onDisable: () => void`
- `onRegenerateCodes: () => void`
- `loading?: boolean`

**Usage**:
```tsx
<Use2FASettings
  onEnable={enable2FA}
  onDisable={disable2FA}
  onRegenerateCodes={generateNewCodes}
/>
```

## Authentication Flow

### Setup Flow (New User)

```
1. User logs in normally
   ├─ Dashboard → Settings → Security
   ├─ Click "Enable 2FA"
   
2. Choose method
   ├─ SMS: Enter phone number
   │  ├─ Send verification SMS
   │  ├─ Enter 6-digit code
   │  └─ Phone verified
   │
   └─ Authenticator: Get TOTP secret
      ├─ Scan QR code or enter manually
      ├─ Enter code from app
      └─ Authenticator verified

3. Generate backup codes
   ├─ Create 10 one-time codes
   ├─ User downloads/prints codes
   └─ Confirm saved

4. 2FA enabled
   └─ User redirected to security settings
```

### Login Flow (2FA Enabled)

```
1. User enters email + password
   ├─ Credentials validated
   ├─ Password correct → Check for 2FA
   └─ 2FA enabled → Return requiresTwoFactor flag

2. Show 2FA verification screen
   ├─ SMS method:
   │  ├─ Display masked phone (****7890)
   │  ├─ User enters code
   │  ├─ Code verified
   │  └─ Issue JWT tokens
   │
   ├─ Authenticator method:
   │  ├─ User enters code from app
   │  ├─ Code verified
   │  └─ Issue JWT tokens
   │
   └─ Backup code option:
      ├─ Link: "Use backup code instead"
      ├─ User enters backup code
      ├─ Code verified (marked as used)
      └─ Issue JWT tokens

3. Rate limiting
   ├─ Max 5 failed attempts
   ├─ 15-minute lockout after failure
   └─ User can use backup code anytime
```

## Setup Guide

### For SMS Method

**Admin Configuration**:

```bash
# Set Twilio credentials in .env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**User Setup**:

1. Go to Settings → Security → Enable 2FA
2. Select "Text Message (SMS)"
3. Enter phone number
4. Receive SMS with 6-digit code
5. Enter code in app
6. Save 10 backup codes
7. Click "I have saved my codes"

### For Authenticator App

**User Setup**:

1. Go to Settings → Security → Enable 2FA
2. Select "Authenticator App"
3. Open Google Authenticator, Authy, or Microsoft Authenticator
4. Scan QR code or enter manual key
5. Enter 6-digit code from app
6. Save 10 backup codes
7. Click "I have saved my codes"

### Supported Authenticator Apps

- Google Authenticator
- Authy
- Microsoft Authenticator
- FreeOTP
- Lastpass Authenticator
- 1Password

## Recovery Procedures

### Lost Phone (SMS Method)

1. At login screen, choose "Use backup code instead"
2. Enter one of your saved backup codes
3. Code is marked as used (can't be reused)
4. Generate new backup codes in Settings

### Lost Authenticator App

1. At login screen, choose "Use backup code instead"
2. Enter one of your saved backup codes
3. Re-setup authenticator app with new device
4. Generate new backup codes

### Lost All Backup Codes

**Option 1**: Contact Support
1. Visit support page
2. Verify email address
3. Support sends verification link
4. Click link to access account recovery
5. Setup new 2FA

**Option 2**: Account Recovery (if enabled)
1. At login, click "Can't access your account?"
2. Verify email address
3. Follow link in recovery email
4. Complete identity verification
5. Reset 2FA and create new backup codes

## Security Considerations

### Code Security

- **SMS codes**: 6 digits, 10-minute expiration
- **TOTP codes**: 6 digits, 30-second window (±1 step for drift)
- **Backup codes**: 12 alphanumeric, single-use only
- **All codes**: Hashed with bcrypt before storage

### Rate Limiting

- **Login attempts**: 5 per 15 minutes (existing)
- **2FA attempts**: 5 per session, 15-minute lockout
- **SMS resend**: 60-second cooldown between resends
- **Failed codes**: Increment counter, block after max

### Password Requirements

- **2FA disable**: Requires current password for security
- **Password change**: Doesn't affect 2FA
- **Password reset**: User must reset 2FA if link is old

### Audit Logging

All 2FA events are logged in `two_factor_audit` table:
- User ID, Shop ID, Event type, Success/failure
- IP address, User agent (for security review)
- Details in JSON for investigation

### Session Security

- **Temporary sessions**: Expire after 10 minutes
- **No token issued**: Until 2FA verified
- **Session isolation**: Each user/shop combo separate
- **Failed attempts**: Tracked per session

### Transport Security

- SMS codes sent via Twilio (uses HTTPS)
- TOTP secrets never transmitted after setup
- All API endpoints require HTTPS in production
- JWT tokens expire in 15 minutes

## Testing

### Manual Testing Checklist

```
2FA Setup (SMS):
☐ Enable 2FA
☐ Select SMS method
☐ Enter phone number
☐ Receive SMS code
☐ Enter incorrect code (test error)
☐ Enter correct code
☐ Save backup codes
☐ Confirm 2FA enabled

2FA Setup (Authenticator):
☐ Enable 2FA
☐ Select Authenticator method
☐ Scan QR code with app
☐ Enter incorrect code (test error)
☐ Enter correct code from app
☐ Save backup codes
☐ Confirm 2FA enabled

Login with 2FA:
☐ Login with correct credentials
☐ See 2FA verification screen
☐ Enter incorrect code (test rate limit)
☐ Try 5 times (verify lockout)
☐ Wait/use backup code
☐ Successful login with tokens

Backup Code Usage:
☐ Use backup code during login
☐ Code marked as used
☐ Try same code again (should fail)
☐ Remaining codes count correct

Disable 2FA:
☐ Go to Security settings
☐ Click "Disable 2FA"
☐ Enter incorrect password (test)
☐ Enter correct password
☐ 2FA disabled
☐ Login without 2FA verification

Change 2FA Method:
☐ SMS enabled → Setup Authenticator
☐ Authenticator → SMS (phone verified)
☐ Generate new backup codes
☐ Old backup codes still work
☐ New codes generated at timestamp
```

### Unit Tests

File: `lib/two-factor-service.test.ts`

Coverage: 30+ tests
- Enable/disable 2FA
- SMS code generation and verification
- TOTP setup and verification
- Backup code generation and usage
- Rate limiting and lockouts
- Audit logging
- Error handling

**Run tests**:
```bash
npm test -- two-factor-service.test.ts
```

**Coverage**:
```bash
npm run test:coverage -- two-factor-service.test.ts
```

## Troubleshooting

### SMS Code Not Received

**Check**:
1. Phone number format correct (+1234567890)
2. Twilio credentials configured
3. Twilio account has credits/balance
4. Phone number whitelisted (if in sandbox)
5. Check spam/junk folder

**Debug**:
```bash
# Check logs for SMS sending errors
grep -i "sms" logs/*.log

# Verify Twilio credentials
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN
```

### TOTP Code Not Accepted

**Check**:
1. App time is synchronized (Settings → Auto-sync time)
2. Code has 6 digits (leading zeros matter)
3. Code not expired (changes every 30 seconds)
4. Secret key correctly entered/scanned
5. Correct timezone on device

**Debug**:
```bash
# Generate test TOTP code (use speakeasy in Node)
const speakeasy = require('speakeasy');
const code = speakeasy.totp({ secret: 'your-secret-base64' });
console.log(code);
```

### Backup Codes Not Working

**Check**:
1. Code format correct (should be 12 characters)
2. Code hasn't been used before (check `used_at`)
3. User has unused codes remaining
4. Code belongs to correct user/shop

**Debug**:
```sql
-- Check backup codes
SELECT * FROM user_backup_codes 
WHERE user_id = 'user-id' 
ORDER BY created_at DESC;

-- Check for used codes
SELECT * FROM user_backup_codes 
WHERE user_id = 'user-id' AND used_at IS NOT NULL;
```

### Rate Limiting Issues

**Problem**: User locked out for 15 minutes

**Solution**:
1. Wait 15 minutes for lockout to expire
2. Or use backup code (no lockout)
3. Verify time window: `Date.now() > session_expires_at`

**Debug**:
```sql
-- Check active sessions with failed attempts
SELECT user_id, failed_attempts, session_expires_at 
FROM two_factor_sessions 
WHERE user_id = 'user-id' 
AND session_expires_at > CURRENT_TIMESTAMP;
```

### 2FA Database Issues

**Reset 2FA for User**:
```sql
-- CAUTION: Only for support/recovery

-- Disable 2FA
UPDATE user_two_factor_settings 
SET is_enabled = FALSE, method = 'none'
WHERE user_id = 'user-id';

-- Delete backup codes
DELETE FROM user_backup_codes WHERE user_id = 'user-id';

-- Delete active sessions
DELETE FROM two_factor_sessions WHERE user_id = 'user-id';

-- Clear audit log (optional)
DELETE FROM two_factor_audit WHERE user_id = 'user-id';
```

## Integration with Existing System

### Modified Endpoints

**POST /api/auth/login**
- Now checks 2FA status after password verification
- Returns `requiresTwoFactor: true` if enabled
- Still issues tokens normally if 2FA not enabled

### JWT Payload

No changes to JWT structure, but token only issued after 2FA verification if enabled.

### Rate Limiter

Uses existing rate limiter from `lib/rate-limiter.ts` for login attempts.

### Password Service

Uses existing `passwordService` for code hashing (bcrypt).

### Database

Adds 4 new tables, no modifications to existing tables.

## Performance Considerations

### Query Optimization

- Indexes on `user_id`, `shop_id`, and `expires_at` for fast lookups
- Composite index on `(user_id, shop_id)` for user 2FA settings
- Partial indexes on unused backup codes (`WHERE used_at IS NULL`)

### Cache Strategies

- 2FA status cached in client localStorage
- Invalidate on logout or 2FA change
- SMS attempt tracking (in-memory during session)

### Scalability

- Stateless API endpoints
- Rate limiting via in-memory limiter (can be replaced with Redis)
- Audit logs pruned after 90 days (optional)

## Compliance

### GDPR

- User can disable 2FA and delete associated data
- Backup codes deleted on disable
- Audit logs can be exported
- Phone numbers masked in API responses

### Security Standards

- NIST SP 800-63B compliant
- OWASP authentication guidelines
- Time-based OTP (RFC 6238)
- Backup codes follow RFC 5869 design

## Support Contact

For issues with 2FA implementation:
1. Check troubleshooting section above
2. Review audit logs in `two_factor_audit` table
3. Check test coverage in `two-factor-service.test.ts`
4. Contact support with error logs
