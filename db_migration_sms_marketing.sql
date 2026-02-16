-- SMS Marketing System Migration
-- Tables for managing SMS campaigns, segmentation, and analytics

-- SMS campaign templates/campaigns table
CREATE TABLE IF NOT EXISTS sms_campaigns (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  campaign_name VARCHAR(255) NOT NULL,
  campaign_type VARCHAR(50) NOT NULL, -- 'promotion', 'announcement', 'referral', 'custom', 'auto_trigger'
  message_content TEXT NOT NULL,
  sender_id VARCHAR(50), -- Twilio sender ID
  scheduled_time TIMESTAMP,
  send_now BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, sent, paused, cancelled
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_campaigns_shop_id ON sms_campaigns(shop_id);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_status ON sms_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_campaign_type ON sms_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_scheduled_time ON sms_campaigns(scheduled_time);

-- SMS customer segments table
CREATE TABLE IF NOT EXISTS sms_segments (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  segment_name VARCHAR(255) NOT NULL,
  segment_type VARCHAR(50) NOT NULL, -- 'service_based', 'frequency', 'vip', 'custom'
  criteria JSONB NOT NULL, -- stores filter criteria (service, min_visits, etc.)
  customer_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_segments_shop_id ON sms_segments(shop_id);
CREATE INDEX IF NOT EXISTS idx_sms_segments_segment_type ON sms_segments(segment_type);

-- SMS campaign segments (many-to-many)
CREATE TABLE IF NOT EXISTS sms_campaign_segments (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES sms_campaigns(id) ON DELETE CASCADE,
  segment_id INTEGER NOT NULL REFERENCES sms_segments(id) ON DELETE CASCADE,
  UNIQUE(campaign_id, segment_id)
);

CREATE INDEX IF NOT EXISTS idx_sms_campaign_segments_campaign_id ON sms_campaign_segments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_campaign_segments_segment_id ON sms_campaign_segments(segment_id);

-- SMS messages table (individual message delivery tracking)
CREATE TABLE IF NOT EXISTS sms_messages (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  campaign_id INTEGER NOT NULL REFERENCES sms_campaigns(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  message_content TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, failed, bounced
  twilio_sid VARCHAR(255) UNIQUE,
  error_code VARCHAR(100),
  error_message TEXT,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  failed_at TIMESTAMP,
  is_unsubscribed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_messages_shop_id ON sms_messages(shop_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_campaign_id ON sms_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_customer_id ON sms_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_status ON sms_messages(status);
CREATE INDEX IF NOT EXISTS idx_sms_messages_sent_at ON sms_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_sms_messages_twilio_sid ON sms_messages(twilio_sid);

-- SMS analytics table
CREATE TABLE IF NOT EXISTS sms_analytics (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  campaign_id INTEGER NOT NULL REFERENCES sms_campaigns(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  delivery_rate NUMERIC(5,2) DEFAULT 0, -- percentage
  failure_rate NUMERIC(5,2) DEFAULT 0, -- percentage
  conversion_count INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0, -- percentage
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, campaign_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_sms_analytics_shop_id ON sms_analytics(shop_id);
CREATE INDEX IF NOT EXISTS idx_sms_analytics_campaign_id ON sms_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_analytics_metric_date ON sms_analytics(metric_date);

-- SMS auto-trigger rules table
CREATE TABLE IF NOT EXISTS sms_auto_triggers (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  trigger_name VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL, -- 'anniversary', 'birthday', 'service_reminder', 'referral_prompt'
  message_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  trigger_criteria JSONB NOT NULL, -- stores trigger conditions
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_auto_triggers_shop_id ON sms_auto_triggers(shop_id);
CREATE INDEX IF NOT EXISTS idx_sms_auto_triggers_trigger_type ON sms_auto_triggers(trigger_type);

-- SMS unsubscribe management table
CREATE TABLE IF NOT EXISTS sms_unsubscribes (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  unsubscribe_reason VARCHAR(255),
  unsubscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_sms_unsubscribes_shop_id ON sms_unsubscribes(shop_id);
CREATE INDEX IF NOT EXISTS idx_sms_unsubscribes_customer_id ON sms_unsubscribes(customer_id);
CREATE INDEX IF NOT EXISTS idx_sms_unsubscribes_unsubscribed_at ON sms_unsubscribes(unsubscribed_at);
