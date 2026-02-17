# Environment Variables Setup for Vercel

## Quick Setup (Copy-Paste Method)

### Step 1: In Vercel Dashboard
Go to: **Project Settings → Environment Variables**

### Step 2: Add Each Variable

Copy these EXACTLY (replace YOUR_VALUE with actual values):

```
DATABASE_URL=postgresql://barbershop_user:barbershop_secure_pass_2026@localhost:5432/barbershop_booking
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUBLISHABLE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
JWT_SECRET=your_jwt_secret_key_here_min_32_chars_change_in_production_12345
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_min_32_chars_change_in_production12345
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://your-vercel-domain.vercel.app
RESEND_API_KEY=re_bpz6htdN_95ybRmnWWBwVqV7c7SuAmMU1
EMAIL_FROM=Dev@barbershopmvp.com
TWILIO_ACCOUNT_SID=AC_YOUR_ACCOUNT_SID
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
OLLAMA_BASE_URL=http://192.168.50.80:11434
DEEPSEEK_API_KEY=sk_002633fc6c7341fda9880686b7aa6c88
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-vercel-domain.vercel.app
LOG_LEVEL=info
AWS_ACCESS_KEY_ID=YOUR_AWS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET
AWS_REGION=us-east-1
AWS_BACKUP_BUCKET=your-backup-bucket
ENABLE_2FA=true
ENABLE_BACKUPS=true
ENABLE_SUPPORT_TICKETING=true
ENABLE_WHITE_LABEL=true
ENABLE_INTEGRATIONS=true
```

### Step 3: After Adding All Variables
Click **Save** and **Redeploy** the project.

## What Each Variable Does

| Variable | Purpose | Example |
|----------|---------|---------|
| DATABASE_URL | PostgreSQL connection | postgresql://user:pass@host:5432/db |
| STRIPE_SECRET_KEY | Stripe payments | sk_test_... |
| JWT_SECRET | User session tokens | random 32+ char string |
| RESEND_API_KEY | Email sending | re_... |
| TWILIO_ACCOUNT_SID | SMS notifications | AC_... |
| OLLAMA_BASE_URL | Local LLM | http://192.168.50.80:11434 |
| NODE_ENV | Environment | production |
| ENABLE_* | Feature flags | true/false |

## Getting Values

### Stripe
1. Go to https://dashboard.stripe.com/apikeys
2. Copy **Secret Key** and **Publishable Key**
3. Get webhook secret from dashboard

### Resend (Email)
1. Go to https://resend.com/api-keys
2. Copy your API key

### Twilio (SMS)
1. Go to https://www.twilio.com/console/account
2. Copy Account SID and Auth Token
3. Get a Twilio phone number

### AWS (Backups)
1. Go to https://console.aws.amazon.com/iam
2. Create access key (not root)
3. Copy Access Key ID and Secret

### JWT Secrets
Generate random 32+ character strings:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## After Setup

1. All variables are now in Vercel
2. Click **Redeploy** on latest failed build
3. Vercel will use these env vars automatically
4. Build should now succeed! ✅

## Still Failing?

Check Vercel build logs for the specific error:
1. Go to **Deployments** tab
2. Click the failed deployment
3. Scroll to bottom of logs to see exact error
4. Fix that specific variable or module
