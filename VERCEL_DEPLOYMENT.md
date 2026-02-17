# Vercel Deployment Guide

## Prerequisites
1. Vercel account (free tier works)
2. GitHub repository connected to Vercel
3. All environment variables configured

## Deploy Steps

### 1. Connect GitHub to Vercel
- Go to https://vercel.com/dashboard
- Click "Add New..." → "Project"
- Select the barbershop-landing GitHub repository
- Click "Import"

### 2. Configure Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:

```
DATABASE_URL=postgresql://[user]:[password]@[host]:5432/[database]
DB_HOST=[your-db-host]
DB_PORT=5432
DB_NAME=[your-db-name]
DB_USER=[your-db-user]
DB_PASSWORD=[your-db-password]

STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

RESEND_API_KEY=re_...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

JWT_SECRET=[32+ character random string]
JWT_REFRESH_SECRET=[32+ character random string]

CORS_ALLOWED_ORIGINS=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com

OLLAMA_BASE_URL=http://192.168.50.80:11434
DEEPSEEK_API_KEY=sk_...

NODE_ENV=production
```

### 3. Deploy
- Click "Deploy"
- Vercel will automatically:
  - Run `npm install --legacy-peer-deps`
  - Run `npm run build`
  - Deploy to production

### 4. Verify Deployment
- Wait for build to complete
- Visit your Vercel deployment URL
- Check that:
  - Landing page loads
  - Login page works
  - API endpoints respond

## Cron Jobs
Vercel will automatically schedule:
- **2 AM UTC**: Daily backups
- **3 AM UTC**: Weekly backup cleanup
- **4 AM UTC**: Test restore (Mondays)
- **5 AM UTC**: Backup statistics

## Troubleshooting

### Build fails: "npm error ERESOLVE"
✅ Fixed with `buildCommand` in vercel.json and `.npmrc`

### Database connection error
- Verify DATABASE_URL is accessible from Vercel's IP ranges
- Add Vercel IP range to firewall: https://vercel.com/docs/concepts/projects/environment-variables#system-environment-variables

### TypeScript errors
- Run `npm run build` locally first
- Fix any type errors before pushing

### Port 3000 conflict
- Vercel automatically assigns a port
- No changes needed

## Custom Domain
1. Go to Vercel → Settings → Domains
2. Add your domain
3. Update DNS records (Vercel will provide instructions)
4. Update CORS_ALLOWED_ORIGINS env var to your domain

## Database Setup
Before first deployment:
1. Create PostgreSQL database (Vercel Postgres, Railway, etc.)
2. Run migrations:
   ```bash
   psql DATABASE_URL < db/migrations/001_initial_schema.sql
   psql DATABASE_URL < db/migrations/002_create_appointments_and_payments.sql
   # ... run all migrations
   ```
3. Add DATABASE_URL to Vercel environment variables

## Scaling
- Free tier: Up to 100 concurrent requests
- Pro tier: Unlimited concurrent requests
- Upgrade as needed based on traffic

## Support
- Vercel docs: https://vercel.com/docs
- GitHub issues: Check deployment logs for specific errors
