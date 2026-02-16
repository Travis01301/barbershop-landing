-- Migration: Add Waitlist Management System
-- Allows customers to join waitlists when a barber is fully booked

-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  barber_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_date DATE NOT NULL,
  preferred_time TIME,
  priority_rank INTEGER NOT NULL DEFAULT 0,
  priority_level VARCHAR(50) NOT NULL DEFAULT 'standard', -- 'standard', 'priority'
  priority_fee_charged DECIMAL(10, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'waiting', -- 'waiting', 'promoted', 'expired', 'cancelled'
  promotion_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create waitlist_history table to track promotions
CREATE TABLE IF NOT EXISTS waitlist_history (
  id SERIAL PRIMARY KEY,
  waitlist_id INTEGER NOT NULL REFERENCES waitlist(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'joined', 'priority_upgraded', 'promoted', 'cancelled', 'expired'
  action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  promoted_to_appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_shop_id ON waitlist(shop_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_customer_id ON waitlist(customer_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_barber_id ON waitlist(barber_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_preferred_date ON waitlist(preferred_date);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_history_waitlist_id ON waitlist_history(waitlist_id);
