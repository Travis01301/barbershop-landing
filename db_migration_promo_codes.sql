-- Promo Code System Migration
-- Tables for managing promotional codes and tracking their usage

-- Promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  duration_months INTEGER NOT NULL DEFAULT 6,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  stripe_coupon_id VARCHAR(255),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

-- Create index for code lookup
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promo_codes_expires_at ON promo_codes(expires_at);

-- Promo code usage tracking table
CREATE TABLE IF NOT EXISTS promo_code_usage (
  id SERIAL PRIMARY KEY,
  code_id INTEGER NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  subscription_id VARCHAR(255),
  redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  discount_applied NUMERIC(10,2),
  discount_end_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for promo code usage
CREATE INDEX IF NOT EXISTS idx_promo_usage_code_id ON promo_code_usage(code_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_shop_id ON promo_code_usage(shop_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_subscription_id ON promo_code_usage(subscription_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_redeemed_at ON promo_code_usage(redeemed_at);

-- Add promo_code column to shop subscriptions if not exists
ALTER TABLE shops ADD COLUMN IF NOT EXISTS active_promo_code_id INTEGER REFERENCES promo_codes(id) ON DELETE SET NULL;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS promo_discount_percent NUMERIC(5,2);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS promo_expires_at TIMESTAMP;

-- Create index for shop promo lookup
CREATE INDEX IF NOT EXISTS idx_shops_active_promo_code ON shops(active_promo_code_id);
