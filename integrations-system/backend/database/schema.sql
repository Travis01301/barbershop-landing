-- Advanced Integrations System Schema

-- Integrations Table
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  provider VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'inactive',
  config JSONB NOT NULL,
  webhook_url TEXT,
  webhook_secret VARCHAR(255),
  enabled_triggers TEXT[] DEFAULT '{}',
  enabled_actions TEXT[] DEFAULT '{}',
  last_sync TIMESTAMP,
  sync_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_provider CHECK (provider IN ('google_calendar', 'outlook_calendar', 'shopify', 'zapier')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'error')),
  UNIQUE(business_id, provider)
);

-- OAuth Connections Table
CREATE TABLE oauth_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  scope TEXT,
  user_email VARCHAR(255),
  user_id VARCHAR(255),
  is_encrypted BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Integration Logs Table
CREATE TABLE integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  action VARCHAR(100),
  status VARCHAR(20),
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  error_code VARCHAR(50),
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_event_type CHECK (event_type IN ('sync', 'auth', 'webhook', 'action')),
  CONSTRAINT valid_log_status CHECK (status IN ('success', 'failed', 'pending', 'retrying'))
);

-- Webhook Events Table (Outgoing Queue)
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  next_retry_at TIMESTAMP,
  last_error TEXT,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_webhook_status CHECK (status IN ('pending', 'delivered', 'failed', 'abandoned'))
);

-- Calendar Event Sync Tracking
CREATE TABLE calendar_sync_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  local_appointment_id UUID NOT NULL,
  provider_event_id VARCHAR(500),
  provider_calendar_id VARCHAR(500),
  sync_direction VARCHAR(20),
  last_synced_at TIMESTAMP,
  local_hash VARCHAR(64),
  remote_hash VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(integration_id, local_appointment_id),
  CONSTRAINT valid_sync_direction CHECK (sync_direction IN ('local_to_remote', 'remote_to_local', 'bidirectional'))
);

-- Shopify Sync Tracking
CREATE TABLE shopify_sync_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL,
  order_id VARCHAR(255),
  total_revenue DECIMAL(10, 2),
  product_revenue DECIMAL(10, 2),
  service_revenue DECIMAL(10, 2),
  barber_id UUID,
  synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhook Signature Verification Log
CREATE TABLE webhook_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  provider VARCHAR(50),
  signature VARCHAR(500),
  verified BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_signature_provider CHECK (provider IN ('google', 'microsoft', 'shopify', 'zapier'))
);

-- Indexes for Performance
CREATE INDEX idx_integrations_business_id ON integrations(business_id);
CREATE INDEX idx_integrations_provider ON integrations(provider);
CREATE INDEX idx_integrations_status ON integrations(status);
CREATE INDEX idx_oauth_connections_integration_id ON oauth_connections(integration_id);
CREATE INDEX idx_oauth_connections_provider ON oauth_connections(provider);
CREATE INDEX idx_integration_logs_integration_id ON integration_logs(integration_id);
CREATE INDEX idx_integration_logs_status ON integration_logs(status);
CREATE INDEX idx_integration_logs_created_at ON integration_logs(created_at DESC);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_next_retry ON webhook_events(next_retry_at);
CREATE INDEX idx_calendar_sync_tracking_integration ON calendar_sync_tracking(integration_id);
CREATE INDEX idx_shopify_sync_tracking_appointment ON shopify_sync_tracking(appointment_id);

-- Encrypted token function (for at-rest encryption)
CREATE OR REPLACE FUNCTION encrypt_token(token TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    pgp_sym_encrypt(token, current_setting('integrations.encryption_key')),
    'base64'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrypt_token(encrypted_token TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    decode(encrypted_token, 'base64'),
    current_setting('integrations.encryption_key')
  )::TEXT;
END;
$$ LANGUAGE plpgsql;
