-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  campaign_type VARCHAR(50) NOT NULL CHECK (
    campaign_type IN ('promotion', 'service_announcement', 'reactivation', 'custom')
  ),
  subject VARCHAR(255) NOT NULL,
  preview_text VARCHAR(255),
  html_content TEXT NOT NULL,
  plain_text_content TEXT,
  sender_name VARCHAR(255),
  sender_email VARCHAR(255),
  reply_to_email VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'failed')
  ),
  scheduled_send_at TIMESTAMP,
  sent_at TIMESTAMP,
  total_recipients INT DEFAULT 0,
  total_sent INT DEFAULT 0,
  total_failed INT DEFAULT 0,
  total_bounced INT DEFAULT 0,
  a_b_test_enabled BOOLEAN DEFAULT FALSE,
  a_b_test_variant VARCHAR(50),
  notes TEXT,
  created_by UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create campaign_segments table for audience segmentation
CREATE TABLE IF NOT EXISTS campaign_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  segment_name VARCHAR(255) NOT NULL,
  segment_type VARCHAR(50) NOT NULL CHECK (
    segment_type IN ('service', 'frequency', 'last_visit', 'custom')
  ),
  segment_value VARCHAR(255),
  segment_operator VARCHAR(20) CHECK (
    segment_operator IN ('equals', 'contains', 'greater_than', 'less_than', 'between')
  ),
  customer_count INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create campaign_emails table for tracking sent emails
CREATE TABLE IF NOT EXISTS campaign_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  recipient_email VARCHAR(255) NOT NULL,
  variant VARCHAR(50),
  tracking_code VARCHAR(255) UNIQUE,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  bounced_at TIMESTAMP,
  bounce_type VARCHAR(50) CHECK (bounce_type IN ('hard', 'soft', 'complaint')),
  bounce_reason TEXT,
  opened BOOLEAN DEFAULT FALSE,
  opened_at TIMESTAMP,
  opened_count INT DEFAULT 0,
  clicked BOOLEAN DEFAULT FALSE,
  clicked_at TIMESTAMP,
  clicked_count INT DEFAULT 0,
  clicked_links TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'sent', 'delivered', 'bounced', 'failed', 'complaint')
  ),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create campaign_analytics table for tracking campaign performance
CREATE TABLE IF NOT EXISTS campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  total_recipients INT DEFAULT 0,
  total_delivered INT DEFAULT 0,
  total_bounced INT DEFAULT 0,
  total_opened INT DEFAULT 0,
  total_clicked INT DEFAULT 0,
  unique_opens INT DEFAULT 0,
  unique_clicks INT DEFAULT 0,
  open_rate DECIMAL(5, 2) DEFAULT 0,
  click_rate DECIMAL(5, 2) DEFAULT 0,
  bounce_rate DECIMAL(5, 2) DEFAULT 0,
  conversion_count INT DEFAULT 0,
  conversion_value DECIMAL(10, 2) DEFAULT 0,
  revenue_generated DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(campaign_id)
);

-- Create campaign_auto_triggers table for automation rules
CREATE TABLE IF NOT EXISTS campaign_auto_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  trigger_name VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL CHECK (
    trigger_type IN ('no_book', 'first_time', 'birthday', 'custom_event')
  ),
  trigger_condition VARCHAR(255) NOT NULL,
  trigger_value INT,
  trigger_unit VARCHAR(20) CHECK (
    trigger_unit IN ('days', 'weeks', 'months')
  ),
  enabled BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create campaign_redemptions table for tracking coupon/promotion usage
CREATE TABLE IF NOT EXISTS campaign_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  campaign_email_id UUID NOT NULL REFERENCES campaign_emails(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  coupon_code VARCHAR(50) NOT NULL UNIQUE,
  discount_value DECIMAL(10, 2),
  discount_percent DECIMAL(5, 2),
  redeemed BOOLEAN DEFAULT FALSE,
  redeemed_at TIMESTAMP,
  redeemed_order_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_shop_id ON campaigns(shop_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_type ON campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_send ON campaigns(scheduled_send_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);

-- Indexes for campaign_segments
CREATE INDEX IF NOT EXISTS idx_campaign_segments_campaign_id ON campaign_segments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_segments_segment_type ON campaign_segments(segment_type);

-- Indexes for campaign_emails
CREATE INDEX IF NOT EXISTS idx_campaign_emails_campaign_id ON campaign_emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_emails_customer_id ON campaign_emails(customer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_emails_status ON campaign_emails(status);
CREATE INDEX IF NOT EXISTS idx_campaign_emails_tracking_code ON campaign_emails(tracking_code);
CREATE INDEX IF NOT EXISTS idx_campaign_emails_sent_at ON campaign_emails(sent_at);

-- Indexes for campaign_analytics
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_campaign_id ON campaign_analytics(campaign_id);

-- Indexes for campaign_auto_triggers
CREATE INDEX IF NOT EXISTS idx_campaign_auto_triggers_shop_id ON campaign_auto_triggers(shop_id);
CREATE INDEX IF NOT EXISTS idx_campaign_auto_triggers_enabled ON campaign_auto_triggers(enabled);

-- Indexes for campaign_redemptions
CREATE INDEX IF NOT EXISTS idx_campaign_redemptions_campaign_id ON campaign_redemptions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_redemptions_customer_id ON campaign_redemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_redemptions_coupon_code ON campaign_redemptions(coupon_code);
CREATE INDEX IF NOT EXISTS idx_campaign_redemptions_redeemed ON campaign_redemptions(redeemed);
