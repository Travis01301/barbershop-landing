-- Backup & Disaster Recovery System Migration
-- Creates tables for automated backups, restore operations, and audit trail

-- Backup Jobs Table
CREATE TABLE IF NOT EXISTS backup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  backup_date TIMESTAMP NOT NULL DEFAULT NOW(),
  backup_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'weekly_snapshot'
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, failed
  size_bytes BIGINT,
  duration_seconds INTEGER,
  s3_path VARCHAR(500),
  s3_version_id VARCHAR(255),
  integrity_check_passed BOOLEAN,
  integrity_check_date TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL,
  UNIQUE(shop_id, backup_date, backup_type),
  CONSTRAINT positive_size CHECK (size_bytes IS NULL OR size_bytes > 0),
  CONSTRAINT positive_duration CHECK (duration_seconds IS NULL OR duration_seconds > 0)
);

-- Backup Logs Table
CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_job_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  log_level VARCHAR(20) NOT NULL, -- 'info', 'warning', 'error', 'debug'
  message TEXT NOT NULL,
  metadata JSONB, -- Additional context (file count, table count, etc.)
  timestamp TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (backup_job_id) REFERENCES backup_jobs(id) ON DELETE CASCADE,
  CONSTRAINT valid_level CHECK (log_level IN ('info', 'warning', 'error', 'debug'))
);

-- Restore Operations Table
CREATE TABLE IF NOT EXISTS restore_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_job_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  initiated_by UUID NOT NULL,
  initiated_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, failed, rolled_back
  duration_seconds INTEGER,
  verification_passed BOOLEAN,
  verification_date TIMESTAMP,
  data_loss_estimate VARCHAR(100),
  error_message TEXT,
  rollback_performed BOOLEAN DEFAULT false,
  rollback_date TIMESTAMP,
  test_restore BOOLEAN DEFAULT false, -- true if restored to staging
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (backup_job_id) REFERENCES backup_jobs(id) ON DELETE CASCADE,
  CONSTRAINT positive_duration CHECK (duration_seconds IS NULL OR duration_seconds > 0)
);

-- Backup Metadata Table (enhanced metadata about what's included)
CREATE TABLE IF NOT EXISTS backup_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_job_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  database_size_bytes BIGINT,
  table_count INTEGER,
  table_details JSONB, -- {table_name: {row_count, size_bytes}}
  file_count INTEGER,
  files_backup_size_bytes BIGINT,
  included_services JSONB, -- Backup of customers, appointments, barbers, etc.
  excluded_schemas JSONB, -- pg_internal, information_schema, etc.
  backup_start_time TIMESTAMP,
  backup_end_time TIMESTAMP,
  compression_ratio DECIMAL(5, 2), -- Compressed size / uncompressed size
  encryption_algorithm VARCHAR(50) DEFAULT 'AES-256',
  checksum VARCHAR(256), -- SHA-256 or similar
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (backup_job_id) REFERENCES backup_jobs(id) ON DELETE CASCADE
);

-- Backup Retention Policies Table
CREATE TABLE IF NOT EXISTS backup_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID,
  is_default BOOLEAN DEFAULT false,
  policy_name VARCHAR(100),
  daily_retention_days INTEGER DEFAULT 30,
  weekly_retention_weeks INTEGER DEFAULT 12,
  monthly_retention_months INTEGER DEFAULT 24,
  yearly_retention_years INTEGER DEFAULT 7,
  min_free_storage_percent INTEGER DEFAULT 10,
  auto_cleanup_enabled BOOLEAN DEFAULT true,
  glacier_transition_days INTEGER DEFAULT 90,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL,
  UNIQUE(shop_id, is_default),
  CONSTRAINT valid_retention CHECK (
    daily_retention_days > 0 AND
    weekly_retention_weeks > 0 AND
    monthly_retention_months > 0 AND
    yearly_retention_years > 0
  )
);

-- Backup Schedule Configuration
CREATE TABLE IF NOT EXISTS backup_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  schedule_type VARCHAR(50) NOT NULL DEFAULT 'daily', -- daily, weekly, monthly
  backup_time TIME NOT NULL DEFAULT '02:00:00', -- 2 AM UTC
  backup_day_of_week INTEGER, -- 0-6 for weekly, NULL for daily
  backup_day_of_month INTEGER, -- 1-31 for monthly, NULL for others
  enabled BOOLEAN DEFAULT true,
  timezone VARCHAR(50) DEFAULT 'UTC',
  max_concurrent_backups INTEGER DEFAULT 1,
  alert_on_failure BOOLEAN DEFAULT true,
  alert_email VARCHAR(255),
  slack_webhook_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL,
  UNIQUE(shop_id, schedule_type),
  CONSTRAINT valid_day_of_week CHECK (backup_day_of_week IS NULL OR (backup_day_of_week >= 0 AND backup_day_of_week <= 6)),
  CONSTRAINT valid_day_of_month CHECK (backup_day_of_month IS NULL OR (backup_day_of_month >= 1 AND backup_day_of_month <= 31))
);

-- Disaster Recovery Contacts
CREATE TABLE IF NOT EXISTS dr_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20),
  role VARCHAR(100), -- 'primary_admin', 'backup_admin', 'it_lead', 'executive'
  notification_on_failure BOOLEAN DEFAULT true,
  notification_on_restore BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(shop_id, contact_email)
);

-- Backup Statistics (for monitoring & dashboards)
CREATE TABLE IF NOT EXISTS backup_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  stat_date DATE NOT NULL,
  total_backups_attempted INTEGER DEFAULT 0,
  total_backups_successful INTEGER DEFAULT 0,
  total_backups_failed INTEGER DEFAULT 0,
  average_backup_duration_seconds INTEGER,
  total_backup_size_bytes BIGINT,
  total_storage_used_bytes BIGINT,
  storage_cost_estimate DECIMAL(10, 2),
  success_rate DECIMAL(5, 2), -- Percentage
  last_successful_backup_date TIMESTAMP,
  days_since_last_backup INTEGER,
  recovery_tests_passed INTEGER DEFAULT 0,
  recovery_tests_failed INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(shop_id, stat_date)
);

-- Create Indexes for Performance
CREATE INDEX idx_backup_jobs_shop_date ON backup_jobs(shop_id, backup_date DESC);
CREATE INDEX idx_backup_jobs_status ON backup_jobs(status);
CREATE INDEX idx_backup_jobs_type ON backup_jobs(backup_type);
CREATE INDEX idx_backup_logs_job_id ON backup_logs(backup_job_id);
CREATE INDEX idx_backup_logs_level ON backup_logs(log_level);
CREATE INDEX idx_restore_operations_backup_id ON restore_operations(backup_job_id);
CREATE INDEX idx_restore_operations_shop_status ON restore_operations(shop_id, status);
CREATE INDEX idx_restore_operations_initiated_by ON restore_operations(initiated_by);
CREATE INDEX idx_backup_metadata_job_id ON backup_metadata(backup_job_id);
CREATE INDEX idx_backup_retention_shop ON backup_retention_policies(shop_id);
CREATE INDEX idx_backup_schedules_shop ON backup_schedules(shop_id);
CREATE INDEX idx_backup_schedules_enabled ON backup_schedules(enabled);
CREATE INDEX idx_dr_contacts_shop ON dr_contacts(shop_id);
CREATE INDEX idx_backup_statistics_shop_date ON backup_statistics(shop_id, stat_date DESC);

-- Grant permissions to backup user (will be created separately)
-- GRANT SELECT, INSERT, UPDATE ON backup_jobs, backup_logs, restore_operations, backup_metadata TO backup_user;
