# Backup & Disaster Recovery System Guide

## Overview

The Barbershop SaaS platform includes an automated backup and disaster recovery (DR) system designed to protect business-critical data with:

- **Daily automated backups** at 2 AM UTC
- **Point-in-time recovery** from any backup date
- **One-click restore** capability with safety confirmations
- **Multi-tenant support** (each shop backed up separately)
- **AES-256 encryption** for all backups
- **AWS S3 storage** with versioning and lifecycle rules
- **Recovery targets**: RPO 24h, RTO 2h

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────┐
│         Backup & DR System                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  Backup Scripts (TypeScript)                   │
│  ├── backup.ts (daily backups)                 │
│  ├── restore.ts (restore operations)           │
│  └── Scheduled via Vercel cron                 │
│                                                 │
│  Database (PostgreSQL)                         │
│  ├── backup_jobs (all backups)                │
│  ├── backup_logs (audit trail)                │
│  ├── restore_operations (restore history)     │
│  ├── backup_metadata (backup details)         │
│  ├── backup_schedules (configuration)         │
│  └── backup_statistics (monitoring)           │
│                                                 │
│  Storage (AWS S3)                              │
│  ├── Daily backups (compressed + encrypted)   │
│  ├── Weekly snapshots                          │
│  └── Versioning enabled                       │
│                                                 │
│  API Endpoints                                 │
│  ├── GET /api/admin/backups                   │
│  ├── GET /api/admin/backups/[date]            │
│  ├── POST /api/admin/backups/restore          │
│  ├── GET /api/admin/backups/status            │
│  ├── GET /api/admin/backups/logs              │
│  └── POST /api/admin/backups/test-restore     │
│                                                 │
│  React Components                              │
│  ├── BackupDashboard (monitoring)             │
│  ├── RestoreModal (restore UI)                │
│  ├── BackupLogs (audit trail)                 │
│  └── DisasterRecoveryGuide (documentation)    │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Backup Strategy

### Daily Backups

**Schedule:** 2 AM UTC (off-peak, typically business-closed hours)

**What's Backed Up:**
- PostgreSQL database (full dump)
  - All schemas and tables
  - Indexes and constraints
  - Stored procedures
  - Custom functions
- Uploaded files (public/uploads directory)
  - Customer avatars
  - Documents
  - Appointment photos
  - Media files

**Backup Process:**
1. Connect to PostgreSQL
2. Run `pg_dump` with full schema
3. Create tar.gz archive of files
4. Compress both with gzip -9
5. Encrypt with AES-256
6. Upload to S3 (barbershop-backups bucket)
7. Record metadata in database
8. Send email notification

**Backup Size:** ~50-200MB (depending on usage)

**Backup Duration:** 5-15 minutes

### Backup Retention

| Type | Retention | Storage Class |
|------|-----------|---|
| Daily | 30 days | STANDARD |
| Weekly Snapshots | 12 weeks (3 months) | STANDARD |
| Monthly Snapshots | 24 months | GLACIER |
| Yearly Snapshots | 7 years | GLACIER |

**Auto-Cleanup:** Backups older than retention period are automatically deleted.

**Cost Optimization:** Old backups transition to Glacier after 90 days.

---

## Storage Structure (S3)

```
s3://barbershop-backups/
├── daily/
│   ├── 2026-02-16/
│   │   ├── 2026-02-16-02-00-00-db-dump.sql.gz.enc
│   │   ├── 2026-02-16-02-00-00-files.tar.gz.enc
│   │   └── 2026-02-16-02-00-00-metadata.json
│   ├── 2026-02-15/
│   └── ...
├── weekly/
│   ├── 2026-02-16-weekly-snapshot.tar.gz.enc
│   └── ...
├── metadata/
│   └── backup-manifest.json
└── logs/
    ├── 2026-02-16-backup.log
    └── ...
```

**Encryption:** All files encrypted at rest on S3 with AES-256

**Versioning:** Enabled on bucket for point-in-time recovery

---

## Database Schema

### backup_jobs

Tracks all backup operations.

```sql
CREATE TABLE backup_jobs (
  id UUID PRIMARY KEY,
  shop_id UUID NOT NULL,
  backup_date TIMESTAMP NOT NULL,
  backup_type VARCHAR (full/incremental/weekly_snapshot),
  status VARCHAR (pending/in_progress/completed/failed),
  size_bytes BIGINT,
  duration_seconds INTEGER,
  s3_path VARCHAR,
  integrity_check_passed BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### backup_logs

Audit trail of backup operations.

```sql
CREATE TABLE backup_logs (
  id UUID PRIMARY KEY,
  backup_job_id UUID,
  shop_id UUID,
  log_level VARCHAR (info/warning/error/debug),
  message TEXT,
  metadata JSONB,
  timestamp TIMESTAMP
);
```

### restore_operations

Tracks all restore operations.

```sql
CREATE TABLE restore_operations (
  id UUID PRIMARY KEY,
  backup_job_id UUID,
  shop_id UUID,
  initiated_by UUID,
  initiated_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR (pending/in_progress/completed/failed),
  verification_passed BOOLEAN,
  test_restore BOOLEAN,
  duration_seconds INTEGER,
  error_message TEXT
);
```

### backup_metadata

Enhanced metadata about backup contents.

```sql
CREATE TABLE backup_metadata (
  id UUID PRIMARY KEY,
  backup_job_id UUID,
  shop_id UUID,
  database_size_bytes BIGINT,
  table_count INTEGER,
  table_details JSONB,
  file_count INTEGER,
  compression_ratio DECIMAL,
  checksum VARCHAR,
  ...
);
```

---

## API Endpoints

### GET /api/admin/backups
List all backups for a shop.

**Parameters:**
- `limit` (optional): 1-100, default 50
- `offset` (optional): pagination, default 0
- `type` (optional): filter by backup_type
- `status` (optional): filter by status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "backup_date": "2026-02-16T02:00:00Z",
      "backup_type": "full",
      "status": "completed",
      "size_bytes": 157286400,
      "duration_seconds": 245
    }
  ],
  "pagination": {
    "total": 30,
    "limit": 50,
    "offset": 0,
    "pages": 1
  }
}
```

### GET /api/admin/backups/[date]
Get detailed backup information for a specific date.

**Parameters:**
- `date` (path): YYYY-MM-DD format

**Response:**
```json
{
  "success": true,
  "data": {
    "backup": { /* backup_jobs row */ },
    "metadata": { /* backup_metadata row */ },
    "logs": [ /* backup_logs rows */ ],
    "restores": [ /* restore_operations rows */ ]
  }
}
```

### POST /api/admin/backups/restore
Initiate a restore from backup.

**Request:**
```json
{
  "backup_date": "2026-02-16",
  "admin_password": "your-admin-password",
  "test_restore": false
}
```

**Security:**
- Requires admin password confirmation
- Validates password against stored hash
- Logs restore operation with user ID

**Response:**
```json
{
  "success": true,
  "data": { /* restore_operations row */ },
  "message": "Restore initiated...",
  "warning": "This is a production restore operation"
}
```

### GET /api/admin/backups/status
Get current backup status and health metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "last_backup": { /* backup_jobs row */ },
    "hours_since_last_backup": 2,
    "rpo_status": "healthy",
    "next_scheduled": { /* backup_schedules row */ },
    "failed_backups_7d": 0,
    "statistics": { /* backup_statistics row */ },
    "size_trend": [ /* 7-day trend */ ],
    "rto_target_hours": 2
  }
}
```

### GET /api/admin/backups/logs
Get backup logs and alerts.

**Parameters:**
- `limit` (optional): 1-500, default 100
- `offset` (optional): pagination
- `level` (optional): filter by log level
- `backup_id` (optional): filter by specific backup

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [ /* backup_logs rows */ ],
    "alerts": {
      "total_errors": 0,
      "errors_24h": 0,
      "warnings": 0
    },
    "recent_failures": []
  },
  "pagination": { /* pagination info */ }
}
```

### POST /api/admin/backups/test-restore
Test restore to staging environment.

**Request:**
```json
{
  "backup_id": "uuid",
  "backup_date": "2026-02-16"
}
```

**Features:**
- Doesn't affect production
- Verifies backup integrity
- Runs every 7 days automatically
- Full data validation

**Response:**
```json
{
  "success": true,
  "data": { /* restore_operations row */ },
  "message": "Test restore to staging initiated...",
  "details": {
    "backup_date": "2026-02-16T02:00:00Z",
    "backup_size_mb": "150",
    "environment": "staging",
    "estimated_duration_minutes": 10
  }
}
```

---

## Recovery Procedures

### One-Click Restore (Admin UI)

1. Go to Admin → Backups → Restore
2. Select backup date
3. Choose restore target:
   - **Staging** (recommended for testing)
   - **Production** (for actual recovery)
4. Enter admin password for confirmation
5. System will:
   - Download backup from S3
   - Decrypt with AES-256
   - Decompress files
   - Verify integrity
   - Restore database and files
   - Send notification on completion

### Manual Restore (CLI)

```bash
# Set environment variables
export DATABASE_URL="postgresql://..."
export S3_BACKUP_BUCKET="barbershop-backups"
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export BACKUP_ENCRYPTION_KEY="..."
export SHOP_ID="your-shop-id"

# Restore from backup
ts-node scripts/restore.ts 2026-02-16

# Test restore (staging)
ts-node scripts/restore.ts 2026-02-16 --test
```

### Pre-Restore Checks

1. **Backup Verification**
   - Check backup completion status
   - Verify integrity check passed
   - Confirm S3 file accessibility

2. **Current Database Backup**
   - Automatic backup of current DB before restore
   - Stored in temp directory for rollback

3. **File Backup**
   - Automatic backup of current files before restore
   - Prevents data loss from accidental restores

### Restore Verification

After restore completes:

1. **Database Integrity Checks**
   - Verify table count and schema
   - Check foreign key constraints
   - Validate index integrity

2. **File Validation**
   - Verify file count
   - Check for corruption
   - Validate permissions

3. **Data Consistency**
   - Random sample verification
   - Appointment data validation
   - Customer record checks

---

## Disaster Recovery Plan

### Recovery Objectives

| Metric | Target | Status |
|--------|--------|--------|
| **RPO** (Recovery Point Objective) | 24h | Max 1 day of data loss |
| **RTO** (Recovery Time Objective) | 2h | Restore within 2 hours |
| **Backup Frequency** | Daily | At 2 AM UTC |
| **Retention** | 30 days | Daily backups kept |

### Failure Scenarios

#### Scenario 1: Single Table Corruption

1. Identify corrupted table
2. Restore from latest backup
3. Expected downtime: <5 minutes
4. Data loss: <24 hours

**Steps:**
- Locate backup date before corruption
- Use test restore to verify
- Execute restore to specific backup
- Validate data integrity

#### Scenario 2: Database Disk Failure

1. Switch to backup database (from latest backup)
2. Verify data integrity
3. Update application to point to restored DB
4. Expected downtime: 2 hours
5. Data loss: <24 hours

**Steps:**
- Stop application
- Restore latest backup to new database instance
- Run integrity checks
- Update database connection string
- Restart application
- Verify all functionality

#### Scenario 3: Ransomware/Malicious Data

1. Restore from known-good backup (before attack)
2. Verify no malware in backup
3. Deploy patched version
4. Expected downtime: 2-4 hours
5. Data loss: Affected period

**Steps:**
- Identify attack timestamp
- Find backup before attack
- Test restore in staging (verify no malware)
- Execute production restore
- Apply security patches
- Review logs for attack vector

#### Scenario 4: Accidental Data Deletion

1. Restore from backup before deletion
2. Verify data integrity
3. Merge with any new data if needed
4. Expected downtime: 30 minutes
5. Data loss: Up to 24 hours

**Steps:**
- Identify deletion timestamp
- Restore backup from before deletion
- Compare with current backup to identify new data
- Merge if necessary
- Verify completeness

### Testing

**Weekly Restore Tests:**
- Automatic test restore to staging
- Full data integrity verification
- Reports success/failure
- Alerts on any issues

**Monthly Full DR Drill:**
- Practice complete recovery procedure
- Document any issues
- Update procedures as needed

---

## Monitoring & Alerting

### Dashboard Metrics

Access via Admin → Backup & DR Dashboard

- **Last Backup:** Date and size
- **Hours Since Backup:** RPO status
- **Failed Backups (7d):** Count of failures
- **Backup Success Rate:** Percentage
- **Storage Used:** Bytes and trend
- **Next Scheduled Backup:** Date and time

### Alerts

**Email Notifications:**
- Backup success (daily)
- Backup failure (immediately)
- Restore completion (immediately)
- Failed restore (immediately)
- RPO violation (>24h since backup)

**Dashboard Warnings:**
- Yellow: RPO approaching (>20h)
- Red: RPO exceeded (>24h)
- Red: Backup failed
- Yellow: Restore test failed

### Monitoring Commands

```bash
# Check backup status
curl https://api.barbershop/api/admin/backups/status \
  -H "Authorization: Bearer $TOKEN"

# View backup logs
curl https://api.barbershop/api/admin/backups/logs \
  -H "Authorization: Bearer $TOKEN"

# List recent backups
curl https://api.barbershop/api/admin/backups?limit=10 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Security Considerations

### Encryption

- **At Rest:** AES-256 encryption on S3
- **In Transit:** TLS 1.3 for all uploads/downloads
- **Backup Key:** Stored in environment variables, never in code

### Access Control

- **Admin Only:** All restore operations require admin authentication
- **Password Confirmation:** Production restores require password
- **Audit Trail:** Every restore operation logged with user ID
- **IAM Permissions:** Minimal S3 access (backup user role)

### Backup Security

```json
{
  "S3BucketPolicy": {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Deny",
        "Principal": "*",
        "Action": "s3:*",
        "Resource": "arn:aws:s3:::barbershop-backups/*",
        "Condition": {
          "Bool": {
            "aws:SecureTransport": "false"
          }
        }
      }
    ]
  }
}
```

### Secrets Management

**Never Commit:**
- Database passwords
- AWS access keys
- Encryption keys
- API tokens

**Store in:**
- Environment variables
- AWS Secrets Manager
- GitHub Secrets (for CI/CD)

---

## Troubleshooting

### Backup Failed

1. Check backup logs: `GET /api/admin/backups/logs`
2. Common issues:
   - Database connection timeout
   - S3 upload failure
   - Encryption key mismatch
   - Insufficient disk space

3. Manual retry:
   ```bash
   ts-node scripts/backup.ts
   ```

### Restore Failed

1. Check restore logs
2. Verify backup integrity
3. Check database connectivity
4. Verify S3 access

4. Rollback to previous state:
   ```sql
   -- Restore from pre-restore backup
   psql < /tmp/pre-restore-backup-*.sql
   ```

### RPO Exceeded

1. Check backup schedule is enabled
2. Verify cron job is running
3. Check S3 access
4. Review recent backup logs for errors

### Storage Quota

1. Review retention policies
2. Check backup sizes trending
3. Consider increasing retention period
4. Enable Glacier transition earlier

---

## Disaster Recovery Contacts

Keep this updated in Admin → Backup & DR → Contacts

| Name | Role | Email | Phone |
|------|------|-------|-------|
| Primary Admin | Shop Owner | owner@barbershop.com | 555-0100 |
| Backup Admin | Manager | manager@barbershop.com | 555-0101 |
| IT Lead | Technical | it@barbershop.com | 555-0102 |
| Executive | Decision Maker | exec@barbershop.com | 555-0103 |

---

## Cost Estimation

### Monthly Costs

| Component | Volume | Cost |
|-----------|--------|------|
| S3 Storage | 4.5GB (30 backups @ 150MB) | ~$0.10 |
| Data Transfer Out | 1.5GB/month (restore tests) | ~$0.13 |
| Glacier Transition | 20GB/month → Glacier | ~$0.20 |
| **Total** | | **~$0.43/month** |

### Cost Optimization

- Compress backups (50-70% reduction)
- Move old backups to Glacier (90% cheaper)
- Cleanup failed backups
- Monitor growth trends

---

## Support & Resources

### Documentation
- AWS Backup Best Practices: https://aws.amazon.com/blogs/storage/
- PostgreSQL Backup: https://www.postgresql.org/docs/current/backup.html
- S3 Versioning: https://docs.aws.amazon.com/AmazonS3/latest/dev/Versioning.html

### Emergency Contact

**In case of catastrophic failure:**
1. Contact your IT support immediately
2. Do not attempt restore without verification
3. Provide backup_job_id from logs if available
4. Be prepared with admin credentials

---

## Change Log

| Date | Change |
|------|--------|
| 2026-02-16 | Initial backup & DR system deployment |

---

Last Updated: **February 16, 2026**

For questions or issues, contact your system administrator.
