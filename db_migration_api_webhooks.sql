-- API & Webhooks System for Third-party Integrations
-- Comprehensive tables for API keys, webhooks, integrations, and usage tracking

-- API Keys table for third-party developers
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  key_name VARCHAR(255) NOT NULL,
  api_key VARCHAR(255) UNIQUE NOT NULL,
  api_secret VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) UNIQUE NOT NULL, -- Hash of api_key for storage
  last_used_at TIMESTAMP,
  rate_limit INTEGER DEFAULT 1000, -- requests per hour
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_api_keys_shop_id ON api_keys(shop_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  webhook_secret VARCHAR(255) NOT NULL,
  events TEXT[] NOT NULL, -- Array of events: ['appointment_created', 'payment_completed', etc]
  is_active BOOLEAN DEFAULT true,
  headers JSONB DEFAULT '{}', -- Custom headers to send with webhook
  retry_enabled BOOLEAN DEFAULT true,
  max_retries INTEGER DEFAULT 5,
  retry_backoff_seconds INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_webhooks_shop_id ON webhooks(shop_id);
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);

-- Webhook Logs table (for tracking delivery and retries)
CREATE TABLE IF NOT EXISTS webhook_logs (
  id SERIAL PRIMARY KEY,
  webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  http_status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  sent_at TIMESTAMP NOT NULL,
  next_retry_at TIMESTAMP,
  delivered_at TIMESTAMP,
  is_delivered BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_shop_id ON webhook_logs(shop_id);
CREATE INDEX idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_is_delivered ON webhook_logs(is_delivered);
CREATE INDEX idx_webhook_logs_sent_at ON webhook_logs(sent_at DESC);

-- API Usage table (for rate limiting and analytics)
CREATE TABLE IF NOT EXISTS api_usage (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  api_key_id INTEGER NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_usage_shop_id ON api_usage(shop_id);
CREATE INDEX idx_api_usage_api_key_id ON api_usage(api_key_id);
CREATE INDEX idx_api_usage_created_at ON api_usage(created_at DESC);
CREATE INDEX idx_api_usage_endpoint ON api_usage(endpoint);

-- Integrations table (for tracking third-party app connections)
CREATE TABLE IF NOT EXISTS integrations (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  integration_type VARCHAR(100) NOT NULL, -- 'zapier', 'pos', 'google', 'stripe', etc
  integration_name VARCHAR(255) NOT NULL,
  configuration JSONB DEFAULT '{}', -- Store integration-specific config
  oauth_access_token TEXT,
  oauth_refresh_token TEXT,
  oauth_token_expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  sync_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT unique_integration_per_shop UNIQUE(shop_id, integration_type)
);

CREATE INDEX idx_integrations_shop_id ON integrations(shop_id);
CREATE INDEX idx_integrations_integration_type ON integrations(integration_type);
CREATE INDEX idx_integrations_is_active ON integrations(is_active);

-- OAuth Connections table (for managing OAuth app connections)
CREATE TABLE IF NOT EXISTS oauth_connections (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  provider VARCHAR(100) NOT NULL, -- 'google', 'zapier', etc
  provider_user_id VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  scope TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_oauth_per_shop_provider UNIQUE(shop_id, provider)
);

CREATE INDEX idx_oauth_connections_shop_id ON oauth_connections(shop_id);
CREATE INDEX idx_oauth_connections_provider ON oauth_connections(provider);

-- API Documentation/Endpoints table (for API marketplace)
CREATE TABLE IF NOT EXISTS api_endpoints (
  id SERIAL PRIMARY KEY,
  endpoint_path VARCHAR(255) UNIQUE NOT NULL,
  http_method VARCHAR(10) NOT NULL,
  description TEXT,
  authentication_required BOOLEAN DEFAULT true,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  parameters JSONB DEFAULT '{}',
  example_request JSONB,
  example_response JSONB,
  error_codes JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_endpoints_path ON api_endpoints(endpoint_path);
CREATE INDEX idx_api_endpoints_method ON api_endpoints(http_method);

-- Marketplace Apps table (for third-party app marketplace)
CREATE TABLE IF NOT EXISTS marketplace_apps (
  id SERIAL PRIMARY KEY,
  app_name VARCHAR(255) UNIQUE NOT NULL,
  app_description TEXT,
  app_icon_url TEXT,
  developer_name VARCHAR(255) NOT NULL,
  developer_url TEXT,
  oauth_client_id VARCHAR(255) UNIQUE NOT NULL,
  oauth_client_secret VARCHAR(255) NOT NULL,
  oauth_redirect_urls TEXT[] NOT NULL,
  webhook_events TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  installation_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_marketplace_apps_app_name ON marketplace_apps(app_name);
CREATE INDEX idx_marketplace_apps_is_published ON marketplace_apps(is_published);

-- Marketplace Installations table (tracking which shops have installed which apps)
CREATE TABLE IF NOT EXISTS marketplace_installations (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  app_id INTEGER NOT NULL REFERENCES marketplace_apps(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  configuration JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uninstalled_at TIMESTAMP,
  CONSTRAINT unique_app_per_shop UNIQUE(shop_id, app_id)
);

CREATE INDEX idx_marketplace_installations_shop_id ON marketplace_installations(shop_id);
CREATE INDEX idx_marketplace_installations_app_id ON marketplace_installations(app_id);
CREATE INDEX idx_marketplace_installations_is_active ON marketplace_installations(is_active);

-- Add webhook event triggers and functions
CREATE OR REPLACE FUNCTION log_webhook_delivery(
  p_webhook_id INTEGER,
  p_shop_id INTEGER,
  p_event_type VARCHAR,
  p_payload JSONB,
  p_http_status INTEGER,
  p_response_body TEXT,
  p_error_message TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_webhook_log_id INTEGER;
BEGIN
  INSERT INTO webhook_logs (
    webhook_id, shop_id, event_type, payload,
    http_status_code, response_body, error_message,
    sent_at, is_delivered
  )
  VALUES (
    p_webhook_id, p_shop_id, p_event_type, p_payload,
    p_http_status, p_response_body, p_error_message,
    CURRENT_TIMESTAMP, CASE WHEN p_http_status >= 200 AND p_http_status < 300 THEN true ELSE false END
  )
  RETURNING id INTO v_webhook_log_id;
  
  RETURN v_webhook_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to schedule webhook retry
CREATE OR REPLACE FUNCTION schedule_webhook_retry(
  p_webhook_log_id INTEGER,
  p_backoff_seconds INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE webhook_logs
  SET attempt_number = attempt_number + 1,
      next_retry_at = CURRENT_TIMESTAMP + (p_backoff_seconds * INTERVAL '1 second')
  WHERE id = p_webhook_log_id
  AND attempt_number < (SELECT max_retries FROM webhooks WHERE id = webhook_logs.webhook_id);
END;
$$ LANGUAGE plpgsql;
