-- Migration: Add Recurring Appointments System
-- Adds support for customers to schedule repeating appointments

-- Create recurring_appointments table
CREATE TABLE IF NOT EXISTS recurring_appointments (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  barber_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  service_name VARCHAR(255),
  recurrence_type VARCHAR(50) NOT NULL DEFAULT 'weekly', -- 'weekly', 'bi-weekly', 'monthly'
  recurrence_interval INTEGER NOT NULL DEFAULT 1, -- interval in weeks or months
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  time_of_day TIME NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create auto_generated_appointments table to track appointments created from recurring
CREATE TABLE IF NOT EXISTS auto_generated_appointments (
  id SERIAL PRIMARY KEY,
  recurring_appointment_id INTEGER NOT NULL REFERENCES recurring_appointments(id) ON DELETE CASCADE,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(recurring_appointment_id, appointment_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_recurring_appointments_shop_id ON recurring_appointments(shop_id);
CREATE INDEX IF NOT EXISTS idx_recurring_appointments_customer_id ON recurring_appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_recurring_appointments_barber_id ON recurring_appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_recurring_appointments_is_active ON recurring_appointments(is_active);
CREATE INDEX IF NOT EXISTS idx_auto_generated_appointments_recurring_id ON auto_generated_appointments(recurring_appointment_id);
CREATE INDEX IF NOT EXISTS idx_auto_generated_appointments_appointment_id ON auto_generated_appointments(appointment_id);
