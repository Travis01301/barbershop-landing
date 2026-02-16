-- Multi-location Support Migration
-- Extends shops table with hierarchical support for barber chains/franchises

-- Add parent_shop_id column to shops table for hierarchical structure
ALTER TABLE shops ADD COLUMN IF NOT EXISTS parent_shop_id INTEGER REFERENCES shops(id) ON DELETE SET NULL;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_parent_location BOOLEAN DEFAULT false;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS location_type VARCHAR(50) DEFAULT 'standalone'; -- 'parent', 'franchise', 'standalone'
ALTER TABLE shops ADD COLUMN IF NOT EXISTS opening_hours JSONB; -- {"monday": {"open": "09:00", "close": "18:00"}, ...}
ALTER TABLE shops ADD COLUMN IF NOT EXISTS location_settings JSONB; -- Custom settings per location

-- Create location_settings table for more granular control
CREATE TABLE IF NOT EXISTS location_settings (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  business_hours JSONB, -- {"monday": {"open": "09:00", "close": "18:00"}, ...}
  services JSONB, -- Location-specific services with pricing
  staff_assignments JSONB, -- Barbers assigned to this location
  payment_methods JSONB, -- Accepted payment methods at this location
  custom_rules JSONB, -- Any custom business rules
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create staff_location_assignments table for cross-location transfers
CREATE TABLE IF NOT EXISTS staff_location_assignments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  primary_location BOOLEAN DEFAULT false,
  start_date DATE NOT NULL,
  end_date DATE,
  assignment_type VARCHAR(50) DEFAULT 'regular', -- 'regular', 'temporary', 'contract'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, shop_id, start_date)
);

-- Create location_services table to override pricing per location
CREATE TABLE IF NOT EXISTS location_services (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES barber_services(id) ON DELETE CASCADE,
  price_override DECIMAL(10, 2),
  duration_override INTEGER, -- in minutes
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, service_id)
);

-- Create cross_location_transfer table for scheduling transfers
CREATE TABLE IF NOT EXISTS cross_location_transfers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  to_shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  transfer_date DATE NOT NULL,
  reason VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed'
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create consolidated_revenue_view for multi-location reporting
CREATE TABLE IF NOT EXISTS consolidated_revenue (
  id SERIAL PRIMARY KEY,
  parent_shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
  child_shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  revenue_date DATE NOT NULL,
  total_revenue DECIMAL(10, 2),
  appointment_count INTEGER,
  average_transaction DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(child_shop_id, revenue_date)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_shops_parent_id ON shops(parent_shop_id);
CREATE INDEX IF NOT EXISTS idx_shops_location_type ON shops(location_type);
CREATE INDEX IF NOT EXISTS idx_location_settings_shop_id ON location_settings(shop_id);
CREATE INDEX IF NOT EXISTS idx_staff_location_shop_id ON staff_location_assignments(shop_id);
CREATE INDEX IF NOT EXISTS idx_staff_location_user_id ON staff_location_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_location_primary ON staff_location_assignments(primary_location);
CREATE INDEX IF NOT EXISTS idx_location_services_shop_id ON location_services(shop_id);
CREATE INDEX IF NOT EXISTS idx_location_services_service_id ON location_services(service_id);
CREATE INDEX IF NOT EXISTS idx_cross_transfer_user ON cross_location_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_cross_transfer_from ON cross_location_transfers(from_shop_id);
CREATE INDEX IF NOT EXISTS idx_cross_transfer_to ON cross_location_transfers(to_shop_id);
CREATE INDEX IF NOT EXISTS idx_consolidated_revenue_parent ON consolidated_revenue(parent_shop_id);
CREATE INDEX IF NOT EXISTS idx_consolidated_revenue_date ON consolidated_revenue(revenue_date);

-- Add column to appointments for tracking location if needed
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS actual_shop_id INTEGER REFERENCES shops(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_actual_shop ON appointments(actual_shop_id);
