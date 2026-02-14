# Deployment Guide

## 📋 Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Tests passing (136/150)
- [ ] SSL certificates configured
- [ ] Domain DNS setup complete
- [ ] Email domain verified in Resend
- [ ] Stripe webhook secret configured
- [ ] JWT secrets changed (NOT defaults)
- [ ] Backup strategy documented

---

## 🚀 Deployment Options

### **Option A: Vercel (Recommended for MVP)**

Simplest option - no K8s needed.

**1. Connect GitHub**
```bash
# Push to GitHub
git remote add origin https://github.com/yourusername/barbershop-booking.git
git push -u origin main
```

**2. Deploy to Vercel**
- Go to vercel.com
- Connect GitHub repo
- Set environment variables
- Click Deploy

**3. Environment Variables in Vercel**
```
DATABASE_URL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
JWT_SECRET
JWT_REFRESH_SECRET
OPENAI_API_KEY
GOOGLE_GEMINI_API_KEY
CORS_ALLOWED_ORIGINS
EMAIL_FROM
LOG_LEVEL=info (production)
```

**Cost:** $0-100/month (pay as you scale)

---

### **Option B: Railway (Docker-ready)**

Easy self-contained deployment.

**1. Create Dockerfile**
```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**2. Deploy to Railway**
```bash
npm install -g railway
railway login
railway init
railway up
```

**Cost:** $5-50/month

---

### **Option C: Kubernetes (Production at Scale)**

For multiple shops with dedicated resources.

**1. Build Docker Image**
```bash
docker build -t barbershop-booking:latest .
docker tag barbershop-booking:latest your-registry/barbershop-booking:latest
docker push your-registry/barbershop-booking:latest
```

**2. Helm Chart**
```yaml
# helm/values.yaml
replicaCount: 3

image:
  repository: your-registry/barbershop-booking
  tag: latest

resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"

postgres:
  enabled: true
  database: barbershop_booking
  user: barbershop_user
```

**3. Deploy with Helm**
```bash
helm repo add stable https://charts.helm.sh/stable
helm install barbershop ./helm
```

**Cost:** $300-1000/month (single cluster, 3 nodes)

---

## 🗄️ Database Setup for Each Platform

### Vercel + Postgres (Recommended)
```bash
# Use Vercel Postgres
# 1. In Vercel dashboard → Storage → Create Postgres
# 2. Get DATABASE_URL from dashboard
# 3. Run migrations:
psql $DATABASE_URL < db/migrations/004_create_users_table.sql
psql $DATABASE_URL < db/migrations/002_create_appointments_and_payments.sql
```

### Railway
```bash
# Railway auto-provisions PostgreSQL
# Get DATABASE_URL from Railway variables
# Migrations auto-run via init script
```

### Kubernetes
```bash
# Use managed database (AWS RDS, Google Cloud SQL, Azure)
# Or deploy PostgreSQL in K8s:
kubectl apply -f k8s/postgres-statefulset.yaml
```

---

## 🔐 Production Security Checklist

**Environment Variables**
- [ ] Change JWT_SECRET to random 32+ char string
- [ ] Change JWT_REFRESH_SECRET to random 32+ char string
- [ ] Never commit .env to Git
- [ ] Use platform's secret management (Vercel Secrets, K8s Secrets)

**Database**
- [ ] Enable SSL connections
- [ ] Set strong password for barbershop_user
- [ ] Restrict network access (whitelist IPs)
- [ ] Enable automated backups
- [ ] Test backup restoration

**API Security**
- [ ] Enable rate limiting in production
- [ ] Review CORS_ALLOWED_ORIGINS (no wildcards)
- [ ] Test all endpoints with invalid tokens
- [ ] Verify Stripe webhook signature verification

**Monitoring**
- [ ] Set up error logging (Sentry, LogRocket)
- [ ] Monitor database connections
- [ ] Alert on high error rates
- [ ] Track payment failures

---

## 📊 Architecture by Scale

### 1-5 Barbershops (Now)
```
Client → Vercel (Next.js)
         ↓
       Vercel Postgres
         ↓
       Resend (Email)
       Stripe (Payments)
       OpenAI (AI)
```

**Cost:** $50-200/month  
**Uptime:** 99.9%  
**Scaling:** Auto

---

### 5-50 Barbershops (6 months)
```
┌─ Load Balancer
├─ API Pod 1
├─ API Pod 2
├─ API Pod 3
├─ PostgreSQL (Managed)
└─ Redis Cache
```

**Cost:** $500-1000/month  
**Uptime:** 99.95%  
**Scaling:** Manual → Auto

---

### 50+ Barbershops (1+ year)
```
┌─ CDN (Cloudflare)
├─ API (3+ nodes)
├─ Database Replica
├─ Cache Cluster
├─ Queue (Bull)
├─ Analytics (Segment)
└─ Monitoring (Prometheus)
```

**Cost:** $2000+/month  
**Uptime:** 99.99%  
**Scaling:** Full auto-scaling

---

## 🚀 Deployment Commands

### Build Locally
```bash
npm run build
npm start
```

### Test Before Deploy
```bash
npm test
npm run lint
npm run type-check
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel deploy --prod
```

### Deploy to Railway
```bash
railway up
```

### Deploy to K8s
```bash
docker build -t barbershop:latest .
docker push your-registry/barbershop:latest
kubectl apply -f k8s/
```

---

## 🔄 Post-Deployment Steps

### 1. Health Check
```bash
curl https://your-domain.com/api/health
# Should return 200 OK
```

### 2. Run Database Migrations
```bash
psql $DATABASE_URL < db/migrations/004_create_users_table.sql
psql $DATABASE_URL < db/migrations/002_create_appointments_and_payments.sql
```

### 3. Create Admin User
```bash
# Use API or script:
curl -X POST https://your-domain.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "SecurePassword123",
    "name": "Admin",
    "role": "admin"
  }'
```

### 4. Verify Email
```bash
# Test booking confirmation email
# Manually trigger reminder (if > 24 hours out):
curl -X POST https://your-domain.com/api/reminders/send \
  -H "Authorization: Bearer <admin_token>"
```

### 5. Test Payment Flow
```bash
# Use Stripe test card: 4242 4242 4242 4242
# Create appointment → confirm payment
# Check Stripe dashboard for success
```

### 6. Setup Monitoring
```bash
# Sentry (error tracking)
# LogRocket (session replay)
# Vercel Analytics (performance)
```

---

## 🚨 Troubleshooting

### Application won't start
```bash
# Check environment variables
echo $DATABASE_URL
echo $NEXT_PUBLIC_API_URL

# Check logs
vercel logs
railway logs
kubectl logs -f deployment/barbershop
```

### Database connection fails
```bash
# Test connection locally
psql $DATABASE_URL -c "SELECT 1"

# Check security groups (K8s)
# Check firewall (managed DB)
```

### Reminders not sending
```bash
# Check Resend API key
curl -X GET "https://api.resend.com/" \
  -H "Authorization: Bearer $RESEND_API_KEY"

# Check cron job
cron list

# Check logs for errors
```

### Stripe webhooks failing
```bash
# Get webhook secret from Stripe dashboard
# Update STRIPE_WEBHOOK_SECRET in .env
# Re-deploy

# Test webhook:
stripe trigger payment_intent.succeeded
```

---

## 📈 Monitoring Checklist

**Daily**
- [ ] Check error logs
- [ ] Monitor API response times
- [ ] Verify cron reminders ran

**Weekly**
- [ ] Review database performance
- [ ] Check Stripe payment success rate
- [ ] Monitor email delivery rates

**Monthly**
- [ ] Analyze usage patterns
- [ ] Review cost breakdown
- [ ] Plan scaling if needed

---

## 🔄 Update & Maintenance

### Regular Updates
```bash
# Update dependencies
npm update

# Security patches
npm audit fix

# Commit & push
git add -A
git commit -m "Update dependencies"
git push

# Redeploy
vercel deploy --prod
```

### Database Backups
```bash
# Manual backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup-20260213.sql
```

---

## 📞 Support & Resources

- **Documentation:** See REMINDERS.md, README.md
- **Error Logs:** Vercel/Railway/K8s logs
- **Database:** `psql $DATABASE_URL`
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Resend Dashboard:** https://resend.com/emails
- **OpenClaw Docs:** https://docs.openclaw.ai

---

**You're ready to deploy! 🚀**

Choose Vercel for simplicity, Railway for medium scale, or K8s for enterprise. Start small, scale as needed.
