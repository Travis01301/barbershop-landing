# AWS Setup Guide - Backup & Disaster Recovery

## Overview

This guide walks through setting up AWS resources for the automated backup and disaster recovery system.

## Prerequisites

- AWS Account with billing enabled
- AWS CLI installed and configured
- Appropriate IAM permissions (administrator or equivalent)
- Barbershop SaaS application deployed

## Step 1: Create S3 Bucket

### Create the Bucket

```bash
aws s3 mb s3://barbershop-backups-$(uuidgen | tr '[:upper:]' '[:lower:]') \
  --region us-east-1
```

Make it more memorable:

```bash
aws s3 mb s3://barbershop-backups-prod \
  --region us-east-1
```

### Enable Versioning

```bash
aws s3api put-bucket-versioning \
  --bucket barbershop-backups-prod \
  --versioning-configuration Status=Enabled
```

### Enable Default Encryption (AES-256)

```bash
aws s3api put-bucket-encryption \
  --bucket barbershop-backups-prod \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }'
```

### Block Public Access

```bash
aws s3api put-public-access-block \
  --bucket barbershop-backups-prod \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### Enable Logging

```bash
# Create log bucket first
aws s3 mb s3://barbershop-backups-logs-prod --region us-east-1

# Enable logging
aws s3api put-bucket-logging \
  --bucket barbershop-backups-prod \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "barbershop-backups-logs-prod",
      "TargetPrefix": "s3-logs/"
    }
  }'
```

### Set Lifecycle Rules

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket barbershop-backups-prod \
  --lifecycle-configuration '{
    "Rules": [
      {
        "Id": "TransitionToGlacier",
        "Filter": {"Prefix": "daily/"},
        "Status": "Enabled",
        "Transitions": [
          {
            "Days": 90,
            "StorageClass": "GLACIER"
          }
        ],
        "Expiration": {
          "Days": 2555
        }
      },
      {
        "Id": "DeleteIncompleteMultipartUploads",
        "Filter": {},
        "Status": "Enabled",
        "AbortIncompleteMultipartUpload": {
          "DaysAfterInitiation": 7
        }
      }
    ]
  }'
```

## Step 2: Create IAM User for Backups

### Create Backup User

```bash
aws iam create-user --user-name barbershop-backup-user
```

### Create Access Keys

```bash
aws iam create-access-key --user-name barbershop-backup-user
```

**Save the output securely** - these are credentials you'll need.

### Create IAM Policy

Create a file `backup-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3BackupAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::barbershop-backups-prod",
        "arn:aws:s3:::barbershop-backups-prod/*"
      ]
    },
    {
      "Sid": "S3Versioning",
      "Effect": "Allow",
      "Action": [
        "s3:GetObjectVersion",
        "s3:ListBucketVersions"
      ],
      "Resource": [
        "arn:aws:s3:::barbershop-backups-prod",
        "arn:aws:s3:::barbershop-backups-prod/*"
      ]
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

### Attach Policy

```bash
aws iam put-user-policy \
  --user-name barbershop-backup-user \
  --policy-name BackupPolicy \
  --policy-document file://backup-policy.json
```

## Step 3: Configure Database Backups

### RDS Configuration (if using RDS)

If your PostgreSQL is on AWS RDS:

```bash
# Enable automated backups (if not already)
aws rds modify-db-instance \
  --db-instance-identifier barbershop-db \
  --backup-retention-period 30 \
  --preferred-backup-window "02:00-03:00" \
  --apply-immediately
```

### On-Premises PostgreSQL

For self-hosted PostgreSQL, the backup script uses `pg_dump`.

Ensure PostgreSQL user has backup permissions:

```sql
-- As PostgreSQL superuser
CREATE ROLE backup_user WITH LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE barbershop TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
```

## Step 4: Set Environment Variables

### Local Development

Create `.env.local`:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key

# S3
S3_BACKUP_BUCKET=barbershop-backups-prod

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/barbershop
STAGING_DATABASE_URL=postgresql://user:password@staging-host:5432/barbershop

# Backup Configuration
BACKUP_ENCRYPTION_KEY=your-32-character-encryption-key
BACKUP_RETENTION_DAYS=30
BACKUP_NOTIFICATION_EMAIL=admin@barbershop.com

# Vercel Cron
CRON_SECRET=your-secret-cron-token

# Email Notifications (Resend)
RESEND_API_KEY=re_your_api_key

# Shop ID (for manual backups)
SHOP_ID=your-shop-uuid
```

### Production (Vercel)

Set environment variables in Vercel dashboard:

```bash
vercel env add AWS_REGION
vercel env add AWS_ACCESS_KEY_ID
vercel env add AWS_SECRET_ACCESS_KEY
vercel env add S3_BACKUP_BUCKET
vercel env add DATABASE_URL
vercel env add BACKUP_ENCRYPTION_KEY
vercel env add BACKUP_NOTIFICATION_EMAIL
vercel env add CRON_SECRET
vercel env add RESEND_API_KEY
```

## Step 5: Set Up CloudWatch Monitoring

### Create Alarm for Backup Failures

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name BackupFailureAlert \
  --alarm-description "Alert when backup fails" \
  --metric-name FailedBackupCount \
  --namespace AWS/S3 \
  --statistic Sum \
  --period 86400 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:backup-alerts
```

### Create SNS Topic for Alerts

```bash
aws sns create-topic --name backup-alerts

# Subscribe email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:backup-alerts \
  --protocol email \
  --notification-endpoint admin@barbershop.com
```

## Step 6: Test Backup System

### Manual Backup Test

```bash
# Set environment variables
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=your_access_key_id
export AWS_SECRET_ACCESS_KEY=your_secret_access_key
export S3_BACKUP_BUCKET=barbershop-backups-prod
export DATABASE_URL=postgresql://user:password@localhost:5432/barbershop
export BACKUP_ENCRYPTION_KEY=your-32-character-encryption-key
export SHOP_ID=your-shop-uuid

# Run backup
ts-node scripts/backup.ts
```

### Verify S3 Upload

```bash
# List backups
aws s3 ls s3://barbershop-backups-prod/daily/ --recursive

# Check file sizes
aws s3 ls s3://barbershop-backups-prod/daily/ --recursive --human-readable --summarize
```

### Test Restore (Staging)

```bash
# Export staging database URL
export DATABASE_URL=postgresql://user:password@staging:5432/barbershop

# Restore from latest backup
BACKUP_DATE=$(date -d "yesterday" +%Y-%m-%d)
ts-node scripts/restore.ts $BACKUP_DATE --test
```

## Step 7: Configure Vercel Cron

Ensure `vercel.json` is in your repository:

```json
{
  "crons": [
    {
      "path": "/api/cron/backup",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/backup-cleanup",
      "schedule": "0 3 * * 0"
    },
    {
      "path": "/api/cron/test-restore",
      "schedule": "0 4 * * 1"
    }
  ]
}
```

Deploy to Vercel:

```bash
vercel deploy
```

## Step 8: Monitoring & Alerts

### Check Backup Status via API

```bash
# List recent backups
curl https://your-app.vercel.app/api/admin/backups \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get backup status
curl https://your-app.vercel.app/api/admin/backups/status \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### CloudWatch Dashboard

Create a custom dashboard:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name BackupMonitoring \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "properties": {
          "metrics": [
            ["AWS/S3", "BucketSizeBytes", {"dimensions": {"BucketName": "barbershop-backups-prod"}}]
          ],
          "period": 86400,
          "stat": "Average",
          "region": "us-east-1",
          "title": "Backup Size"
        }
      }
    ]
  }'
```

## Step 9: Cost Optimization

### Estimate Monthly Costs

For ~150MB daily backups:

- **S3 Storage:** ~$0.10/month (4.5GB in STANDARD)
- **Data Transfer:** ~$0.13/month (restore tests)
- **Glacier Transition:** ~$0.20/month
- **Total:** ~$0.43/month

### Reduce Costs

1. **Compress Backups:** Already enabled (gzip -9)
2. **Transition to Glacier:** Set to 90 days in lifecycle rules
3. **Cleanup Old Backups:** Automatic via lifecycle policies
4. **Monitor Growth:** Check S3 usage weekly

## Step 10: Disaster Recovery Testing

### Monthly Test Schedule

**First Monday of month (2 AM UTC):**

```bash
# Test restore to staging
ts-node scripts/restore.ts $(date -d "last week" +%Y-%m-%d) --test
```

**Verify:**
- Database restored successfully
- All tables present
- Data integrity checks pass
- Email notification received

## Troubleshooting

### Backup Fails with "Access Denied"

1. Check IAM user policy
2. Verify AWS credentials in environment
3. Check S3 bucket permissions

```bash
# Test S3 access
aws s3 ls s3://barbershop-backups-prod/ \
  --profile backup-user
```

### Restore Fails with "Database Connection Error"

1. Check DATABASE_URL format
2. Verify PostgreSQL is accessible
3. Check firewall rules

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"
```

### Encryption Key Mismatch

1. Ensure BACKUP_ENCRYPTION_KEY is exactly 32 characters
2. Use same key for backup and restore
3. Never change key without re-encrypting backups

### S3 Upload Timeout

1. Check network connectivity
2. Increase timeout in script (default 5 minutes)
3. Consider using AWS DataSync for large backups

## Security Best Practices

✅ **Enabled:**
- S3 encryption (AES-256)
- Bucket versioning
- Public access blocking
- IAM user with minimal permissions
- Cron secret validation
- Password confirmation for restores

⚠️ **Monitor:**
- Access logs regularly
- Failed backup attempts
- Restore operations
- Encryption key security
- IAM user activity

❌ **Never:**
- Commit credentials to git
- Share IAM access keys
- Disable encryption
- Make bucket public
- Use root AWS credentials

## References

- [AWS S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/dev/BestPractices.html)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [S3 Lifecycle Rules](https://docs.aws.amazon.com/AmazonS3/latest/dev/object-lifecycle-mgmt.html)
- [PostgreSQL Backup](https://www.postgresql.org/docs/current/backup.html)

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review backup logs in application
3. Contact AWS support if needed

---

Last Updated: **February 16, 2026**
