# Deployment Guide: Multi-Location Support & Advanced Analytics

## Pre-Deployment Checklist

### 1. Database Backup
```bash
# Backup current database
pg_dump -h localhost -U barbershop_user -d barbershop_booking > backup_pre_deployment.sql

# Test restore
psql -h localhost -U barbershop_user -d barbershop_booking < backup_pre_deployment.sql
```

### 2. Run Database Migrations
```bash
# Apply multi-location schema
psql -h localhost -U barbershop_user -d barbershop_booking < db_migration_multi_location.sql

# Apply advanced analytics schema
psql -h localhost -U barbershop_user -d barbershop_booking < db_migration_advanced_analytics.sql

# Verify tables created
psql -h localhost -U barbershop_user -d barbershop_booking -c "\dt"
```

### 3. Test Coverage
```bash
# Run all tests
npm test

# Check coverage
npm run test:coverage

# Ensure 95%+ coverage
# Expected output: Statements 95.xx%, Branches 95.xx%, Functions 95.xx%, Lines 95.xx%
```

### 4. Environment Configuration
```bash
# .env should already have DATABASE_URL
# No new environment variables needed

# Verify connection
npm run dev &
curl http://localhost:3000/api/health
```

## Deployment Steps

### 1. Code Deployment
```bash
# Build the application
npm run build

# Verify build succeeded
ls -la .next/

# Push code changes
git add .
git commit -m "feat: Multi-location Support and Advanced Analytics"
git push origin main
```

### 2. Verify API Endpoints
```bash
# Start server
npm run start &

# Test locations API
curl -X POST http://localhost:3000/api/locations/add \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Location","slug":"test-loc"}'

# Test analytics API
curl http://localhost:3000/api/analytics/barber-performance?shopId=1

# Expected responses: 200 or 201 status codes
```

### 3. Load Testing
```bash
# Install k6 for load testing
npm install -g k6

# Run basic load test
k6 run scripts/load-test.js

# Monitor: Should handle 50+ concurrent users
```

### 4. Component Testing
```bash
# Start dev server
npm run dev &

# Navigate to components
# Test MultiLocationDashboard at /components/multi-location-dashboard
# Test BarberPerformanceAnalytics at /components/barber-performance
# Test ChurnAnalytics at /components/churn-analysis
# Verify charts render correctly
```

## Post-Deployment Verification

### 1. Health Checks
```bash
# API health
curl http://localhost:3000/api/health

# Database connection
psql -h localhost -U barbershop_user -d barbershop_booking -c "SELECT 1"

# All migrations applied
psql -h localhost -U barbershop_user -d barbershop_booking -c "\dt+ location%"
psql -h localhost -U barbershop_user -d barbershop_booking -c "\dt+ barber_performance%"
psql -h localhost -U barbershop_user -d barbershop_booking -c "\dt+ customer_lifetime%"
psql -h localhost -U barbershop_user -d barbershop_booking -c "\dt+ churn%"
psql -h localhost -U barbershop_user -d barbershop_booking -c "\dt+ demand_forecast%"
```

### 2. Sample Data Setup
```bash
# Insert test location
psql -h localhost -U barbershop_user -d barbershop_booking << 'EOF'
INSERT INTO shops (name, slug, parent_shop_id, is_parent_location, location_type)
VALUES ('Parent Shop', 'parent-shop', NULL, true, 'parent');

INSERT INTO shops (name, slug, parent_shop_id, is_parent_location, location_type)
VALUES ('Branch 1', 'branch-1', 1, false, 'franchise');

INSERT INTO shops (name, slug, parent_shop_id, is_parent_location, location_type)
VALUES ('Branch 2', 'branch-2', 1, false, 'franchise');
EOF

# Verify data
psql -h localhost -U barbershop_user -d barbershop_booking \
  -c "SELECT id, name, parent_shop_id, location_type FROM shops WHERE location_type IN ('parent', 'franchise')"
```

### 3. API Testing
```bash
# Test location hierarchy
curl "http://localhost:3000/api/locations/1/hierarchy"

# Test multi-location reporting
curl "http://localhost:3000/api/reporting/multi-location?parentShopId=1"

# Test analytics
curl "http://localhost:3000/api/analytics/barber-performance?shopId=1"
curl "http://localhost:3000/api/analytics/customer-ltv?shopId=1"
curl "http://localhost:3000/api/analytics/churn-signals?shopId=1"
curl "http://localhost:3000/api/analytics/cohorts?shopId=1"
curl "http://localhost:3000/api/analytics/demand-forecast?shopId=1"
```

## Rollback Plan

### If Issues Occur

```bash
# 1. Stop current deployment
npm stop
pm2 stop app

# 2. Restore database backup
psql -h localhost -U barbershop_user -d barbershop_booking < backup_pre_deployment.sql

# 3. Revert code
git revert HEAD
git push origin main

# 4. Restart server
npm run start
pm2 start app

# 5. Verify system working
curl http://localhost:3000/api/health
```

## Performance Monitoring

### Metrics to Monitor

1. **API Response Times**
   - Target: < 1s for analytics queries
   - Target: < 2s for dashboard loads

2. **Database Performance**
   - Monitor slow query log
   - Check index usage
   - Monitor connections: `SELECT count(*) FROM pg_stat_activity`

3. **Application Metrics**
   - Error rate: Target < 0.1%
   - Uptime: Target > 99.9%

### Commands

```bash
# PostgreSQL slow query log
SHOW log_statement;
SET log_min_duration_statement = 1000;  -- Log queries > 1s

# Check index usage
SELECT * FROM pg_stat_user_indexes ORDER BY idx_scan DESC;

# Monitor table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname != 'pg_catalog'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Documentation Updates

### Update User Guides
- [ ] Add Multi-Location Dashboard walkthrough
- [ ] Document analytics features for shop managers
- [ ] Create churn response playbook
- [ ] Add demand forecasting usage guide

### API Documentation
- [ ] Update Swagger/OpenAPI spec with new endpoints
- [ ] Document response schemas
- [ ] Add rate limiting info
- [ ] Include error code reference

## Git Tag & Release

```bash
# Create release tag
git tag -a v2.0.0 -m "Release: Multi-Location Support & Advanced Analytics"
git push origin v2.0.0

# Generate changelog
git log v1.9.0..v2.0.0 --oneline > CHANGELOG_v2.0.0.md
```

## Success Criteria

✅ All database migrations applied successfully
✅ All tests pass with 95%+ coverage
✅ API endpoints respond < 1s for analytics queries
✅ React components render without errors
✅ Multi-location dashboard shows consolidated data
✅ Analytics APIs return expected data structures
✅ No critical errors in application logs
✅ Database performance meets targets
✅ Rollback verified and documented

---

## Post-Deployment Tasks

### 1. Monitor for 24 Hours
- Watch for errors in logs
- Monitor database performance
- Check user feedback
- Verify all features working

### 2. User Training
- Conduct training sessions for shop managers
- Create demo videos
- Provide documentation
- Set up support channels

### 3. Ongoing Optimization
- Analyze which features are used most
- Optimize slow queries based on metrics
- Gather feedback for improvements
- Plan next phase enhancements

---

End of Deployment Guide
