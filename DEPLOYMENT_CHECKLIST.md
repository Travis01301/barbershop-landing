# 🚀 Vercel Deployment Checklist

## Pre-Deployment (Local)
- ✅ All tests passing (253/257 = 98.4%)
- ✅ Git committed and pushed
- ✅ `.vercelignore` configured
- ✅ `vercel.json` ready
- ✅ LLM removed from app
- ✅ Google Calendar integration complete
- ✅ Landing page ready

## Environment Variables (Set in Vercel Dashboard)

### Database
```
DATABASE_URL=postgresql://user:password@host:port/dbname
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=barbershop_booking
DB_USER=your_db_user
DB_PASSWORD=your_db_password
```

### Authentication
```
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
```

### Payments (Stripe)
```
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Email (Resend)
```
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=noreply@yourdomain.com
```

### SMS (Twilio)
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### AI / LLM
```
OLLAMA_BASE_URL=http://192.168.50.80:11434  (or your local Ollama)
DEEPSEEK_API_KEY=sk_... (fallback, optional)
```

### CORS
```
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Application
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://yourdomain.com
LOG_LEVEL=info
```

### Google Calendar Integration
```
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/integrations/google-calendar/callback
```

## Deployment Steps

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Link Project
```bash
vercel link
```
Follow prompts to connect to your GitHub repo.

### 3. Add Environment Variables
**Option A: Via CLI**
```bash
vercel env add DATABASE_URL
vercel env add STRIPE_SECRET_KEY
# ... add all vars above
```

**Option B: Via Vercel Dashboard**
- Go to Project Settings → Environment Variables
- Paste all vars from checklist above
- Make sure to set for Production environment

### 4. Deploy
```bash
vercel deploy --prod
```

Or push to main branch (if auto-deploy enabled):
```bash
git push origin main
```

### 5. Run Database Migrations
Once deployed, migrations should run automatically. If needed:
```bash
vercel env pull  # Pull env vars locally
npx prisma migrate deploy
```

Or via SSH into your database:
```sql
-- Run all migration files from db/migrations/ manually if needed
```

## Post-Deployment Checks

- [ ] Landing page loads: `https://yourdomain.com`
- [ ] Sign up works: Create test account
- [ ] Booking flow works: Select service, date, time
- [ ] Payment processing: Test Stripe integration (use test card: 4242424242424242)
- [ ] Email reminders: Check Resend logs
- [ ] SMS reminders: Check Twilio logs
- [ ] Analytics dashboard: View at `/barber/dashboard`
- [ ] Google Calendar sync: Connect and test sync
- [ ] Cron job: Verify appointment reminders run hourly

## Production Checklist

- [ ] Switch Stripe to LIVE keys (sk_live_, pk_live_)
- [ ] Update `NEXT_PUBLIC_API_URL` to production domain
- [ ] Enable auto-scaling if needed (Vercel handles this)
- [ ] Set up monitoring/alerts
- [ ] Configure custom domain in Vercel
- [ ] Enable automatic deployments on git push
- [ ] Set up SSL certificate (Vercel handles automatically)
- [ ] Test payment processing with live Stripe account
- [ ] Verify email deliverability (check Resend domain)

## Troubleshooting

**"Build failed"**
- Check Vercel build logs
- Ensure all env vars are set
- Verify Node.js version (should be 18+)

**"Database connection error"**
- Verify DATABASE_URL is correct
- Check if database is accessible from Vercel (firewall rules)
- Run migrations manually if needed

**"Payment not processing"**
- Verify Stripe keys are correct (test vs live)
- Check webhook secret in Stripe dashboard
- Review Stripe logs for errors

**"Emails not sending"**
- Verify RESEND_API_KEY
- Check email domain verification in Resend
- Review Resend logs

**"SMS not sending"**
- Verify Twilio credentials
- Check TWILIO_PHONE_NUMBER format (+1234567890)
- Review Twilio logs

## Rollback

If something breaks after deploy:
```bash
vercel rollback
```

## Next Steps After Launch

1. **Monitor** — Watch error logs, performance metrics
2. **Test with real bookings** — Create test appointments, verify reminders fire
3. **Collect feedback** — Reach out to early barbershops
4. **Scale** — Once stable, start customer acquisition

---

**Need help?** Contact Vercel support or check deployment logs in Vercel Dashboard → Project → Deployments.
