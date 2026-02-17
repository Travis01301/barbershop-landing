# Deployment Guide

## Prerequisites

- Node.js 16+ 
- PostgreSQL 12+
- Docker (optional, for containerization)
- AWS/GCP/Azure account (for cloud deployment)

## Environment Setup

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb barbershop_integrations

# Set encryption key for PostgreSQL
psql barbershop_integrations -c "SET integrations.encryption_key = 'your-encryption-key'"

# Run migrations
psql barbershop_integrations < backend/database/schema.sql
```

### 2. Environment Variables

Create `.env` file:

```env
# Server
NODE_ENV=production
PORT=3000
API_URL=https://api.barbershop-saas.com

# Database
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=barbershop_integrations
DB_SSL=true

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=https://api.barbershop-saas.com/api/oauth/callback/google_calendar

# Microsoft OAuth
MICROSOFT_CLIENT_ID=xxx
MICROSOFT_CLIENT_SECRET=xxx
MICROSOFT_REDIRECT_URI=https://api.barbershop-saas.com/api/oauth/callback/outlook_calendar

# Shopify OAuth
SHOPIFY_CLIENT_ID=xxx
SHOPIFY_CLIENT_SECRET=xxx
SHOPIFY_REDIRECT_URI=https://api.barbershop-saas.com/api/oauth/callback/shopify

# Zapier OAuth
ZAPIER_CLIENT_ID=xxx
ZAPIER_CLIENT_SECRET=xxx
ZAPIER_REDIRECT_URI=https://api.barbershop-saas.com/api/oauth/callback/zapier
ZAPIER_APP_ICON_URL=https://your-domain.com/zapier-icon.png

# Allowed Origins (CORS)
ALLOWED_ORIGINS=https://barbershop-saas.com,https://admin.barbershop-saas.com,http://localhost:3000

# JWT Secret (for token signing)
JWT_SECRET=your-jwt-secret-key

# Redis (for caching and job queues)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Webhook
WEBHOOK_MAX_RETRIES=5
WEBHOOK_RETRY_DELAY_MS=1000
```

## Local Development

```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Docker Deployment

### Build Docker Image

```bash
docker build -t barbershop-integrations:latest .
```

### Docker Compose

```yaml
version: '3.8'

services:
  api:
    image: barbershop-integrations:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=barbershop_integrations
      - POSTGRES_PASSWORD=secure-password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Run with:
```bash
docker-compose up -d
```

## Cloud Deployment

### AWS Deployment (Elastic Beanstalk)

```bash
# Install EB CLI
pip install awsebcli

# Create EB environment
eb create barbershop-integrations

# Deploy
eb deploy

# View logs
eb logs

# Check status
eb status
```

### AWS RDS Database

Create PostgreSQL instance:
1. Go to RDS Console
2. Create Database
3. Engine: PostgreSQL 15
4. Instance class: db.t3.micro (for dev)
5. Allocated storage: 20GB
6. Enable automated backups
7. Enable encryption
8. Get endpoint and update `.env`

### Google Cloud Run

```bash
# Authenticate
gcloud auth login

# Build and deploy
gcloud run deploy barbershop-integrations \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,DB_HOST=<cloudsql-instance>"

# View logs
gcloud run logs read barbershop-integrations
```

### Heroku Deployment

```bash
# Login to Heroku
heroku login

# Create app
heroku create barbershop-integrations

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:standard-0

# Set environment variables
heroku config:set ENCRYPTION_KEY=xxx
heroku config:set GOOGLE_CLIENT_ID=xxx
# ... set all env vars

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

## SSL/TLS Setup

### Let's Encrypt with Nginx

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d api.barbershop-saas.com

# Auto-renew
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name api.barbershop-saas.com;

    ssl_certificate /etc/letsencrypt/live/api.barbershop-saas.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.barbershop-saas.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name api.barbershop-saas.com;
    return 301 https://$server_name$request_uri;
}
```

## Database Backups

### PostgreSQL Backups

```bash
# Full backup
pg_dump -h <host> -U <user> -d barbershop_integrations > backup.sql

# Restore from backup
psql -h <host> -U <user> -d barbershop_integrations < backup.sql

# Automated daily backups
0 2 * * * pg_dump -h <host> -U <user> -d barbershop_integrations > /backups/db-$(date +\%Y\%m\%d).sql
```

### AWS S3 Backups

```bash
# Upload backup to S3
aws s3 cp backup.sql s3://barbershop-backups/$(date +%Y%m%d).sql

# Setup automated backups
# Use AWS RDS automated backups (7 days retention minimum)
```

## Monitoring & Logging

### Application Monitoring

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start backend/server.js --name "integrations-api"

# Monitor
pm2 logs integrations-api
pm2 monit
```

### Log Aggregation

```bash
# Docker logs
docker logs -f <container-id>

# Tail logs
tail -f /var/log/integrations-api.log

# Send to ELK Stack
npm install winston winston-elasticsearch
```

### Health Checks

```bash
# Check API health
curl https://api.barbershop-saas.com/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

## Performance Optimization

### Database Optimization

```sql
-- Analyze indexes
ANALYZE integrations;
ANALYZE integration_logs;
ANALYZE webhook_events;

-- Create additional indexes if needed
CREATE INDEX idx_logs_timestamp ON integration_logs(created_at DESC);
CREATE INDEX idx_webhooks_retry ON webhook_events(next_retry_at) WHERE status IN ('pending', 'retrying');
```

### Redis Caching

```javascript
// Cache frequently accessed data
const redis = require('redis');
const client = redis.createClient();

// Cache integration config
app.get('/api/integrations/:id', async (req, res) => {
  const cached = await client.get(`integration:${req.params.id}`);
  if (cached) return res.json(JSON.parse(cached));
  
  // ... fetch and cache
});
```

### Connection Pooling

```javascript
// Use connection pool for better performance
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Security Checklist

- [ ] Use HTTPS/TLS everywhere
- [ ] Set secure cookie flags (HttpOnly, Secure, SameSite)
- [ ] Enable CORS properly (whitelist allowed origins)
- [ ] Validate all inputs server-side
- [ ] Use parameterized queries to prevent SQL injection
- [ ] Implement rate limiting
- [ ] Set security headers (CSP, X-Frame-Options, etc.)
- [ ] Encrypt sensitive data at rest (tokens, secrets)
- [ ] Rotate encryption keys regularly
- [ ] Use environment variables for secrets
- [ ] Enable audit logging
- [ ] Regular security updates and patching
- [ ] Use strong passwords for databases
- [ ] Enable database SSL connections
- [ ] Implement proper error handling (don't expose internals)

## Troubleshooting

### Common Issues

**"Database connection refused"**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection credentials
psql -h localhost -U postgres -d barbershop_integrations
```

**"OAuth callback failed"**
- Verify redirect URI matches exactly in provider settings
- Check OAuth credentials in environment variables
- Verify CORS settings allow callback origin

**"Webhooks not delivering"**
- Check webhook URL is publicly accessible
- Verify webhook secret in integration config
- Check logs for retry status
- Test webhook with POST request

**"Sync stuck in pending"**
- Check job queue status
- Verify OAuth tokens are valid
- Check integration logs for errors
- Restart sync service

## Scaling

As usage grows:

1. **Horizontal Scaling**: Run multiple API instances behind load balancer
2. **Database Scaling**: Enable read replicas for queries
3. **Cache Layer**: Add Redis for frequent queries
4. **Queue System**: Implement Bull/RabbitMQ for background jobs
5. **CDN**: Cache static assets on CDN
6. **API Gateway**: Use API Gateway for rate limiting and authentication
