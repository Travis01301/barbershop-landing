-- Commission Tracking System Migration
-- Creates all tables for barber commission management

-- Commission Rates Table
CREATE TABLE IF NOT EXISTS commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  rate_type VARCHAR(50) NOT NULL, -- 'flat', 'tiered', 'service_specific'
  base_rate DECIMAL(5, 2) NOT NULL, -- Base commission percentage
  tiered_rules JSONB, -- Array of {threshold: number, rate: number}
  service_rates JSONB, -- Map of {serviceType: rate}
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL,
  CONSTRAINT positive_rate CHECK (base_rate > 0 AND base_rate <= 100)
);

-- Barber Commission Overrides Table
CREATE TABLE IF NOT EXISTS barber_commission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  barber_id UUID NOT NULL,
  rate_type VARCHAR(50),
  base_rate DECIMAL(5, 2),
  tiered_rules JSONB,
  service_rates JSONB,
  effective_date TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL,
  UNIQUE(shop_id, barber_id, effective_date),
  CONSTRAINT positive_rate CHECK (base_rate IS NULL OR (base_rate > 0 AND base_rate <= 100))
);

-- Commission Transactions Table (one per appointment)
CREATE TABLE IF NOT EXISTS commission_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  barber_id UUID NOT NULL,
  appointment_id UUID NOT NULL,
  service_type VARCHAR(100),
  service_price DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  tip_amount DECIMAL(10, 2) DEFAULT 0,
  include_tip_in_commission BOOLEAN DEFAULT false,
  commission_rate DECIMAL(5, 2) NOT NULL,
  base_commission DECIMAL(10, 2) NOT NULL,
  commission_after_adjustments DECIMAL(10, 2),
  transaction_month DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, cancelled, refunded
  transaction_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  cancelled_at TIMESTAMP,
  refund_reason VARCHAR(255),
  UNIQUE(shop_id, appointment_id, barber_id),
  CONSTRAINT positive_price CHECK (service_price >= 0),
  CONSTRAINT positive_commission CHECK (base_commission >= 0)
);

-- Multi-Barber Split Commission Table
CREATE TABLE IF NOT EXISTS commission_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  commission_transaction_id UUID NOT NULL,
  barber_id UUID NOT NULL,
  split_percentage DECIMAL(5, 2) NOT NULL,
  split_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (commission_transaction_id) REFERENCES commission_transactions(id) ON DELETE CASCADE,
  CONSTRAINT positive_split CHECK (split_percentage > 0 AND split_percentage <= 100),
  CONSTRAINT positive_amount CHECK (split_amount >= 0)
);

-- Commission Bonuses Table
CREATE TABLE IF NOT EXISTS commission_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  barber_id UUID NOT NULL,
  bonus_type VARCHAR(50) NOT NULL, -- volume, revenue, retention, rating, custom
  trigger_metric VARCHAR(100), -- e.g., 'appointments', 'monthly_revenue', 'avg_rating'
  trigger_value DECIMAL(10, 2), -- Threshold value
  bonus_amount DECIMAL(10, 2), -- Fixed bonus amount
  bonus_percentage DECIMAL(5, 2), -- Or percentage of base
  calculation_month DATE NOT NULL,
  bonus_status VARCHAR(50) DEFAULT 'pending', -- pending, earned, paid
  earned_at TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL,
  CONSTRAINT positive_bonus CHECK ((bonus_amount > 0) OR (bonus_percentage > 0))
);

-- Commission Deductions Table
CREATE TABLE IF NOT EXISTS commission_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  barber_id UUID NOT NULL,
  deduction_type VARCHAR(50) NOT NULL, -- damages, chargebacks, advances, other
  amount DECIMAL(10, 2) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  related_transaction_id UUID,
  deduction_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, applied, reversed
  applied_at TIMESTAMP,
  reversed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL,
  CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Commission Payouts Table
CREATE TABLE IF NOT EXISTS commission_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  barber_id UUID NOT NULL,
  payout_period_start DATE NOT NULL,
  payout_period_end DATE NOT NULL,
  total_commission DECIMAL(10, 2) NOT NULL,
  bonuses DECIMAL(10, 2) DEFAULT 0,
  deductions DECIMAL(10, 2) DEFAULT 0,
  tax_withheld DECIMAL(10, 2) DEFAULT 0,
  net_payout DECIMAL(10, 2) NOT NULL,
  payout_method VARCHAR(50), -- cash, bank_transfer, stripe_connect
  stripe_payout_id VARCHAR(255),
  payout_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  payout_date TIMESTAMP,
  failure_reason VARCHAR(255),
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL,
  CONSTRAINT positive_payout CHECK (net_payout >= 0)
);

-- Commission Reconciliation (Audit Trail)
CREATE TABLE IF NOT EXISTS commission_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  barber_id UUID NOT NULL,
  reconciliation_period DATE NOT NULL,
  total_appointments INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  total_commission DECIMAL(10, 2) DEFAULT 0,
  total_bonuses DECIMAL(10, 2) DEFAULT 0,
  total_deductions DECIMAL(10, 2) DEFAULT 0,
  tax_withheld DECIMAL(10, 2) DEFAULT 0,
  net_earnings DECIMAL(10, 2) DEFAULT 0,
  payout_status VARCHAR(50),
  dispute_count INTEGER DEFAULT 0,
  notes VARCHAR(1000),
  reconciled_at TIMESTAMP,
  reconciled_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Advance Requests Table
CREATE TABLE IF NOT EXISTS commission_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  barber_id UUID NOT NULL,
  requested_amount DECIMAL(10, 2) NOT NULL,
  available_balance DECIMAL(10, 2) NOT NULL,
  advance_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, paid, rejected
  request_date TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  approved_by UUID,
  paid_at TIMESTAMP,
  rejection_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT positive_amount CHECK (requested_amount > 0 AND requested_amount <= available_balance)
);

-- Create Indexes for Performance
CREATE INDEX idx_commission_rates_shop_id ON commission_rates(shop_id);
CREATE INDEX idx_barber_commission_overrides_shop_barber ON barber_commission_overrides(shop_id, barber_id, effective_date DESC);
CREATE INDEX idx_commission_transactions_shop_barber_month ON commission_transactions(shop_id, barber_id, transaction_month);
CREATE INDEX idx_commission_transactions_appointment ON commission_transactions(appointment_id);
CREATE INDEX idx_commission_transactions_status ON commission_transactions(status);
CREATE INDEX idx_commission_splits_transaction ON commission_splits(commission_transaction_id);
CREATE INDEX idx_commission_bonuses_shop_barber_month ON commission_bonuses(shop_id, barber_id, calculation_month);
CREATE INDEX idx_commission_deductions_shop_barber ON commission_deductions(shop_id, barber_id);
CREATE INDEX idx_commission_payouts_shop_barber_period ON commission_payouts(shop_id, barber_id, payout_period_start);
CREATE INDEX idx_commission_payouts_status ON commission_payouts(payout_status);
CREATE INDEX idx_commission_reconciliation_shop_barber_period ON commission_reconciliation(shop_id, barber_id, reconciliation_period);
CREATE INDEX idx_commission_advances_shop_barber ON commission_advances(shop_id, barber_id);
