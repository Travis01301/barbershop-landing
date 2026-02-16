-- Migration: Add Loyalty & Referral Program
-- Tracks customer loyalty points and referral rewards

-- Add columns to customer_profiles table
ALTER TABLE customer_profiles 
  ADD COLUMN IF NOT EXISTS loyalty_points DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_customer_id INTEGER REFERENCES customer_profiles(id) ON DELETE SET NULL;

-- Create loyalty_transactions table
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  transaction_type VARCHAR(50) NOT NULL, -- 'earn', 'redeem', 'referral_reward', 'admin_adjustment'
  points_amount DECIMAL(10, 2) NOT NULL,
  amount_usd DECIMAL(10, 2),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create referral_rewards table
CREATE TABLE IF NOT EXISTS referral_rewards (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  referrer_customer_id INTEGER NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  referee_customer_id INTEGER NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  referral_code VARCHAR(50) NOT NULL,
  reward_amount DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
  reward_credited_to_referrer BOOLEAN NOT NULL DEFAULT false,
  reward_credited_to_referee BOOLEAN NOT NULL DEFAULT false,
  referee_first_appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_shop_id ON loyalty_transactions(shop_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer_id ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_appointment_id ON loyalty_transactions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_shop_id ON referral_rewards(shop_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer_id ON referral_rewards(referrer_customer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referee_id ON referral_rewards(referee_customer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referral_code ON referral_rewards(referral_code);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_referral_code ON customer_profiles(referral_code);
