# Deployment Guide

## Local Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Setup Database
```bash
# Create .env file
cp .env.example .env

# Update DATABASE_URL with your PostgreSQL connection
# Then run migrations
npm run migrate

# (Optional) Seed with test data
npm run seed
```

### Step 3: Configure Environment
Update `.env` with:
- JWT_SECRET (minimum 32 characters)
- STRIPE keys (for payments)
- SMTP settings (for email)
- APP_URL (where app is hosted)

### Step 4: Start Development Server
```bash
npm run dev
```

Visit:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- API Health: http://localhost:3001/api/health

## Production Deployment

### Option 1: Docker Deployment

#### Build Image
```bash
docker build -t barbershop-white-label:latest .
```

#### Run Container
```bash
docker run -d \
  --name white-label \
  -p 3001:3001 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=... \
  -e STRIPE_SECRET_KEY=... \
  barbershop-white-label:latest
```

#### Docker Compose
```yaml
version: '3.9'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: barbershop
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: white_label
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://barbershop:secure_password@db:5432/white_label
      JWT_SECRET: ${JWT_SECRET}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
    depends_on:
      - db

volumes:
  pgdata:
```

### Option 2: Heroku Deployment

#### Prerequisites
- Heroku CLI installed
- Git repository initialized

#### Steps
```bash
# Create Heroku app
heroku create white-label-barbershop

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:standard-0

# Set environment variables
heroku config:set JWT_SECRET=your-secret
heroku config:set STRIPE_SECRET_KEY=sk_test_...

# Deploy
git push heroku main

# Run migrations
heroku run npm run migrate

# Check logs
heroku logs --tail
```

### Option 3: AWS EC2 Deployment

#### Launch Instance
1. Choose Ubuntu 22.04 LTS AMI
2. Instance type: t3.medium (minimum for production)
3. Security group: Allow ports 80, 443, 3001

#### Setup
```bash
# Connect to instance
ssh -i key.pem ubuntu@your-instance-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install PM2 (process manager)
sudo npm install -g pm2

# Clone repository
git clone https://github.com/yourorg/white-label.git
cd white-label

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with production values

# Run migrations
npm run migrate

# Start with PM2
pm2 start server/index.js --name white-label
pm2 save
pm2 startup

# Setup Nginx reverse proxy
sudo apt-get install -y nginx
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 4: Vercel Deployment (Frontend Only)

#### Steps
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# REACT_APP_API_URL=https://your-api-domain.com
```

## Database Migration

### Create New Migration
```bash
npx prisma migrate dev --name add_new_field
```

### Apply Migrations
```bash
npm run migrate
```

### Reset Database (⚠️ Destructive)
```bash
npx prisma migrate reset
```

## SSL/TLS Setup

### Using Let's Encrypt with Certbot
```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d your-domain.com

# Auto-renew
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Nginx SSL Configuration
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # ... rest of config
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## Monitoring & Logging

### PM2 Monitoring
```bash
pm2 monit
pm2 logs white-label
```

### Logging Setup
Configure Winston or Bunyan for structured logging:
```javascript
const logger = require('./server/logger');
logger.info('Application started');
```

### Database Monitoring
```bash
# Connect to PostgreSQL
psql -U user -d white_label

# Check table sizes
\d+

# Check connections
SELECT * FROM pg_stat_activity;
```

## Backup Strategy

### Database Backups
```bash
# Automated backup (daily at 2 AM)
0 2 * * * pg_dump -U user white_label > /backups/white_label_$(date +\%Y\%m\%d).sql

# Restore from backup
psql -U user -d white_label < /backups/white_label_20240101.sql
```

### File Backups
```bash
# Backup uploads directory
tar -czf /backups/uploads_$(date +%Y%m%d).tar.gz /app/uploads/
```

## Performance Tuning

### PostgreSQL
```sql
-- Increase shared_buffers (25% of RAM)
-- Increase work_mem (RAM / max_connections / 2)
-- Increase maintenance_work_mem (RAM / 16)
-- Increase effective_cache_size (50-75% of RAM)
```

### Application
```javascript
// Enable compression
app.use(compression());

// Enable HTTP caching
app.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=3600');
  next();
});

// Connection pooling
const pool = new pg.Pool({ max: 20 });
```

### Load Balancing
```bash
# Use HAProxy or Nginx for load balancing
upstream white_label {
    server instance1:3001;
    server instance2:3001;
    server instance3:3001;
}
```

## Scaling Strategy

### Horizontal Scaling
1. Add more instances behind load balancer
2. Use RDS for managed PostgreSQL
3. Add read replicas for analytics queries

### Vertical Scaling
1. Increase instance size
2. Increase RAM and CPU
3. Optimize queries

### Caching Layer
```bash
# Add Redis for sessions/caching
docker run -d -p 6379:6379 redis:alpine
```

## Health Checks

### Application Health Endpoint
```
GET /api/health
```

Returns:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

### Uptime Monitoring
Use services like:
- Pingdom
- UptimeRobot
- DataDog
- New Relic

## Security Hardening

### Essential Security Measures
1. ✅ Enable HTTPS/SSL
2. ✅ Set strong JWT_SECRET
3. ✅ Enable CORS with specific origins
4. ✅ Rate limiting on auth endpoints
5. ✅ SQL injection prevention (Prisma)
6. ✅ XSS protection (React)
7. ✅ CSRF protection
8. ✅ Regular dependency updates

### Update Dependencies
```bash
npm audit
npm update
npm audit fix
```

## Rollback Procedure

If deployment fails:

```bash
# With PM2
pm2 restart white-label

# With Docker
docker rollback barbershop-white-label:previous

# With Git
git revert HEAD
git push
```

## Post-Deployment Checklist

- [ ] Database migrations completed
- [ ] Environment variables set
- [ ] SSL certificate valid
- [ ] Health endpoint responding
- [ ] CORS configured correctly
- [ ] Stripe webhook configured
- [ ] Email sending tested
- [ ] Backups scheduled
- [ ] Monitoring enabled
- [ ] Logs being collected
- [ ] Load testing passed (1000+ concurrent users)
- [ ] Performance baseline established

## Support & Troubleshooting

### Common Issues

**Database connection failed**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Verify connection string
psql -h localhost -U user -d white_label
```

**Port 3001 already in use**
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>
```

**Out of memory**
```bash
# Check memory usage
free -h
top

# Increase swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
```

## Performance Benchmarks

Target metrics for production:
- **API Response Time**: < 200ms (p95)
- **Database Query Time**: < 100ms (p95)
- **Uptime**: 99.9%
- **Concurrent Users**: 10,000+
- **RPS**: 5,000+

---

For additional support, contact your deployment team or refer to the troubleshooting guide.
