-- Payments table for tracking all transactions
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  amount INTEGER NOT NULL, -- in cents
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, succeeded, failed, refunded
  payment_method VARCHAR(50), -- card, apple_pay, google_pay
  customer_email VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment settings table for storing shop-specific payment preferences
CREATE TABLE IF NOT EXISTS payment_settings (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  stripe_account_id VARCHAR(255),
  deposit_amount_cents INTEGER DEFAULT 1000, -- $10 default deposit
  enable_deposits BOOLEAN DEFAULT true,
  enable_tips BOOLEAN DEFAULT true,
  tip_percentages INTEGER[] DEFAULT ARRAY[15, 18, 20, 25], -- default tip options
  stripe_public_key VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add payment tracking to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_required BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS total_paid INTEGER DEFAULT 0; -- in cents

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_settings_shop_id ON payment_settings(shop_id);
