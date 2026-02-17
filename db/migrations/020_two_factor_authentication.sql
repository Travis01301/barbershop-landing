-- Two-Factor Authentication Tables

-- User 2FA Settings table
CREATE TABLE IF NOT EXISTS user_two_factor_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  method VARCHAR(20) NOT NULL CHECK (method IN ('sms', 'totp', 'none')) DEFAULT 'none',
  phone_number VARCHAR(20),
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  totp_secret VARCHAR(255),
  backup_codes_generated_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_2fa UNIQUE (user_id, shop_id)
);

-- Create indexes for 2FA settings lookups
CREATE INDEX idx_user_2fa_settings_user_id ON user_two_factor_settings(user_id);
CREATE INDEX idx_user_2fa_settings_shop_id ON user_two_factor_settings(shop_id);
CREATE INDEX idx_user_2fa_settings_enabled ON user_two_factor_settings(is_enabled) WHERE is_enabled = TRUE;

-- Backup Codes table (for recovery)
CREATE TABLE IF NOT EXISTS user_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  code_hash VARCHAR(255) NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for backup codes
CREATE INDEX idx_user_backup_codes_user_id ON user_backup_codes(user_id);
CREATE INDEX idx_user_backup_codes_shop_id ON user_backup_codes(shop_id);
CREATE INDEX idx_user_backup_codes_used_at ON user_backup_codes(used_at) WHERE used_at IS NULL;

-- 2FA Sessions table (for rate limiting during verification)
CREATE TABLE IF NOT EXISTS two_factor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  attempt_id VARCHAR(100) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  code_expires_at TIMESTAMP NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  session_expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_2fa_session UNIQUE (user_id, shop_id, attempt_id)
);

-- Create indexes for 2FA sessions
CREATE INDEX idx_2fa_sessions_user_id ON two_factor_sessions(user_id);
CREATE INDEX idx_2fa_sessions_shop_id ON two_factor_sessions(shop_id);
CREATE INDEX idx_2fa_sessions_expires_at ON two_factor_sessions(session_expires_at) WHERE session_expires_at > CURRENT_TIMESTAMP;

-- Audit table for 2FA events
CREATE TABLE IF NOT EXISTS two_factor_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  method VARCHAR(20),
  success BOOLEAN NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for 2FA audit
CREATE INDEX idx_2fa_audit_user_id ON two_factor_audit(user_id);
CREATE INDEX idx_2fa_audit_shop_id ON two_factor_audit(shop_id);
CREATE INDEX idx_2fa_audit_event_type ON two_factor_audit(event_type);
CREATE INDEX idx_2fa_audit_created_at ON two_factor_audit(created_at);

-- Add 2FA verification column to auth session
ALTER TABLE blacklisted_tokens ADD COLUMN IF NOT EXISTS two_factor_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE blacklisted_tokens ADD COLUMN IF NOT EXISTS two_factor_verified_at TIMESTAMP;

-- Create index for 2FA verification tracking
CREATE INDEX IF NOT EXISTS idx_blacklisted_tokens_2fa_verified ON blacklisted_tokens(two_factor_verified);
