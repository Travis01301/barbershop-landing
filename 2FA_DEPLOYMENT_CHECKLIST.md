# 2FA Deployment Checklist

## Pre-Deployment (Development Phase)

### Code Preparation
- [ ] Review all TypeScript files (no `any` types except necessary)
- [ ] Run `npm run build` - verify no errors
- [ ] Run `npm run lint` - fix all warnings
- [ ] Run `npm test` - all tests passing
- [ ] Run `npm run test:coverage` - >95% coverage achieved
- [ ] Review all API endpoints with team
- [ ] Code review by 2+ team members
- [ ] Security audit by security team (if applicable)

### Testing
- [ ] Unit tests passing (30+ tests)
- [ ] Integration tests passing (12+ flows)
- [ ] Manual testing in development environment
- [ ] Test SMS delivery (Twilio sandbox)
- [ ] Test authenticator setup (Google Authenticator)
- [ ] Test backup codes
- [ ] Test rate limiting
- [ ] Test error scenarios
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile testing (iOS Safari, Android Chrome)

## Staging Deployment

### Pre-Deployment Setup
- [ ] Create staging database backup
- [ ] Create staging environment variables file
- [ ] Verify Twilio sandbox credentials
- [ ] Set up new Twilio phone number for staging
- [ ] Create staging AWS/deployment environment

### Database Migration
- [ ] Backup production database
- [ ] Test migration on staging
- [ ] Run migration: `psql < db/migrations/020_two_factor_authentication.sql`
- [ ] Verify tables created:
  ```sql
  SELECT * FROM user_two_factor_settings LIMIT 1;
  SELECT * FROM user_backup_codes LIMIT 1;
  SELECT * FROM two_factor_sessions LIMIT 1;
  SELECT * FROM two_factor_audit LIMIT 1;
  ```
- [ ] Verify indexes created
- [ ] Check table sizes (should be empty initially)

### Environment Variables
```bash
# Verify in .env or deployment config
TWILIO_ACCOUNT_SID=your_staging_sid
TWILIO_AUTH_TOKEN=your_staging_token
TWILIO_PHONE_NUMBER=+1234567890
JWT_SECRET=existing_secret
JWT_REFRESH_SECRET=existing_secret
DATABASE_URL=staging_url
```

- [ ] All variables set
- [ ] Secrets not in version control
- [ ] Use environment variable manager (AWS Secrets Manager, etc.)

### Deployment
- [ ] Deploy code to staging
- [ ] Run `npm install` on staging
- [ ] Run `npm run build` on staging
- [ ] Restart application service
- [ ] Check application logs for errors
- [ ] Verify API endpoints responding

### Staging Testing
- [ ] Test SMS 2FA setup flow
  - [ ] Enable SMS
  - [ ] Enter phone number
  - [ ] Receive SMS code
  - [ ] Verify code
  - [ ] Save backup codes
- [ ] Test Authenticator 2FA setup flow
  - [ ] Enable authenticator
  - [ ] Scan QR code
  - [ ] Verify code from app
  - [ ] Save backup codes
- [ ] Test login with 2FA
  - [ ] SMS method
  - [ ] Authenticator method
  - [ ] Backup code method
- [ ] Test rate limiting (5 failed attempts)
- [ ] Test disable 2FA
- [ ] Test status endpoint
- [ ] Verify audit logging

### Performance Testing
- [ ] Load test with 100+ concurrent users
- [ ] Monitor database query times
- [ ] Check memory usage
- [ ] Monitor API response times
- [ ] Verify rate limiting under load

### Security Testing
- [ ] SQL injection attempts (should fail)
- [ ] XSS attempts in forms (should be escaped)
- [ ] CSRF protection (verify tokens)
- [ ] Password brute force (should be rate limited)
- [ ] Phone number enumeration (should not expose)
- [ ] Backup code enumeration (should not expose)
- [ ] Session hijacking attempts (should fail)

## Production Deployment

### Pre-Production Checklist
- [ ] Staging testing completed and approved
- [ ] Stakeholders informed
- [ ] Rollback plan documented
- [ ] Support team trained
- [ ] Documentation provided to users
- [ ] Customer communication prepared

### Backup & Recovery
- [ ] Full production database backup
- [ ] Backup stored in secure location
- [ ] Test restore procedure
- [ ] Document restore steps
- [ ] Point-in-time recovery available

### Production Environment Variables
```bash
# Production Twilio
TWILIO_ACCOUNT_SID=your_production_sid
TWILIO_AUTH_TOKEN=your_production_token
TWILIO_PHONE_NUMBER=+1555123456789

# Production Database
DATABASE_URL=production_url_with_encryption

# Existing Secrets (update if needed)
JWT_SECRET=production_secret_with_high_entropy
JWT_REFRESH_SECRET=production_secret_with_high_entropy
```

- [ ] Production environment variables configured
- [ ] Verified with DevOps/Infrastructure team
- [ ] Using secure secret storage
- [ ] Credentials encrypted at rest and in transit

### Database Migration
- [ ] Backup production database
- [ ] Schedule maintenance window (off-peak)
- [ ] Inform users of maintenance
- [ ] Run migration on production
- [ ] Verify migration success
- [ ] Test queries on production
- [ ] Verify table sizes and indexes

### Code Deployment
- [ ] Deploy to production
- [ ] Run `npm install` on production
- [ ] Run `npm run build` on production
- [ ] Verify build completed successfully
- [ ] Restart application service gracefully
- [ ] Verify application started successfully
- [ ] Monitor logs for errors
- [ ] Check CPU, memory, disk usage

### Health Checks
- [ ] Application health endpoint working
- [ ] Database connectivity verified
- [ ] Twilio connectivity verified
- [ ] JWT token generation working
- [ ] Rate limiter operational
- [ ] Logging operational

### Post-Deployment Testing
- [ ] Test 2FA setup (SMS)
  - [ ] Real phone number
  - [ ] Real SMS delivery
  - [ ] Code verification
  - [ ] Backup codes saved
- [ ] Test 2FA setup (Authenticator)
  - [ ] Real QR code
  - [ ] Real app verification
  - [ ] Backup codes saved
- [ ] Test login with 2FA (real user)
- [ ] Test disable 2FA
- [ ] Verify audit logs created
- [ ] Monitor error rates

### User Communication
- [ ] Send launch announcement
- [ ] Provide setup instructions
- [ ] Share troubleshooting guide
- [ ] Provide support contact info
- [ ] Monitor support tickets

### Monitoring
- [ ] Set up error rate alerts
- [ ] Set up performance alerts
- [ ] Monitor 2FA adoption
- [ ] Track failed 2FA attempts
- [ ] Review audit logs daily for first week
- [ ] Monitor database performance

## Rollback Plan

### If Critical Issues Found

Before rolling back, try to fix:
1. Check logs for error messages
2. Verify environment variables
3. Verify Twilio credentials
4. Verify database connectivity
5. Check API response times
6. Review rate limiting behavior

### Rollback Steps
- [ ] Stop deployment
- [ ] Announce rollback to team
- [ ] Inform users of issue
- [ ] Restore previous code version
- [ ] Revert database migrations (if necessary)
- [ ] Test rollback
- [ ] Restart application
- [ ] Verify system operational
- [ ] Investigate issue root cause
- [ ] Document lessons learned

### Rollback Database Migration
```bash
# Only if necessary - drops 2FA tables
DROP TABLE two_factor_audit;
DROP TABLE two_factor_sessions;
DROP TABLE user_backup_codes;
DROP TABLE user_two_factor_settings;
```

## Post-Deployment (1 Week)

### Monitoring
- [ ] Daily review of error logs
- [ ] Monitor 2FA setup rates
- [ ] Monitor 2FA login success rates
- [ ] Track support tickets related to 2FA
- [ ] Review rate limiting metrics
- [ ] Analyze audit logs for anomalies
- [ ] Monitor database performance

### User Support
- [ ] Address user questions
- [ ] Update FAQ with common issues
- [ ] Provide additional setup guides if needed
- [ ] Monitor success rate of setups
- [ ] Adjust messaging if needed

### Performance Tuning
- [ ] Analyze slow queries
- [ ] Verify index usage
- [ ] Optimize rate limiting
- [ ] Cache frequently accessed data

### Security Review
- [ ] Verify audit logging is working
- [ ] Review failed login attempts
- [ ] Check for rate limiting bypasses
- [ ] Verify phone numbers properly masked
- [ ] Ensure backup codes not logged

## Post-Deployment (1 Month)

### Metrics Review
- [ ] 2FA adoption rate (target: >80%)
- [ ] Average setup time
- [ ] Success rate for 2FA login
- [ ] Fallback to backup codes rate
- [ ] Support ticket volume

### Feature Evaluation
- [ ] User feedback on 2FA
- [ ] Identify improvement opportunities
- [ ] Review alternative methods
- [ ] Plan future enhancements

### Security Audit
- [ ] Review audit logs for 2 week sample
- [ ] Identify any suspicious patterns
- [ ] Verify rate limiting effectiveness
- [ ] Check for unauthorized access attempts
- [ ] Review compliance with security policy

## Ongoing Maintenance

### Weekly Tasks
- [ ] Monitor error logs
- [ ] Review failed login attempts
- [ ] Check database size growth
- [ ] Verify Twilio billing

### Monthly Tasks
- [ ] Review 2FA adoption metrics
- [ ] Audit user 2FA settings
- [ ] Analyze backup code usage
- [ ] Review security audit logs
- [ ] Plan infrastructure updates

### Quarterly Tasks
- [ ] Review and update documentation
- [ ] Security audit of implementation
- [ ] Performance optimization
- [ ] Update dependencies (Twilio SDK, etc.)
- [ ] Disaster recovery drill

### Annual Tasks
- [ ] Comprehensive security review
- [ ] Penetration testing
- [ ] Compliance audit (GDPR, etc.)
- [ ] Update emergency procedures
- [ ] Team training refresher

## Important Notes

### Critical Points
1. **Never share Twilio credentials** - use environment variables
2. **Always backup database** before running migrations
3. **Test in staging first** - never test in production
4. **Monitor after deployment** - watch first 24 hours closely
5. **Have rollback plan ready** - don't assume deployment succeeds

### Quick Help
- **Problem**: SMS not sending
  - [ ] Check Twilio credentials
  - [ ] Verify phone number format
  - [ ] Check Twilio account balance
  - [ ] Review Twilio logs

- **Problem**: Rate limiting too strict
  - [ ] Adjust `MAX_FAILED_ATTEMPTS` in service
  - [ ] Adjust `LOCKOUT_DURATION` timing
  - [ ] Monitor actual usage patterns
  - [ ] Communicate with users

- **Problem**: Database slow
  - [ ] Check index usage: `EXPLAIN ANALYZE`
  - [ ] Analyze query plans
  - [ ] Add missing indexes
  - [ ] Archive old audit logs

## Contact & Escalation

### For Issues
- **Code Issues**: Contact development team
- **Database Issues**: Contact DBA or database team
- **Twilio Issues**: Contact support or check Twilio console
- **Performance Issues**: Contact DevOps/Infrastructure team
- **User Issues**: Contact support team

### Support Contacts
- Development Team: [contact info]
- DevOps Team: [contact info]
- Support Team: [contact info]
- Emergency Contact: [contact info]

---

## Deployment Sign-Off

- [ ] Code review approved
- [ ] Testing completed
- [ ] Staging deployment successful
- [ ] Security review passed
- [ ] Performance acceptable
- [ ] Rollback plan documented
- [ ] Team trained
- [ ] Documentation reviewed
- [ ] Users informed
- [ ] Monitoring configured
- [ ] Production deployment approved by: _______________

**Deployment Date**: _______________
**Deployed By**: _______________
**Deployment Status**: ☐ Successful ☐ Rollback Required

**Notes**:
```
[space for deployment notes]
```
