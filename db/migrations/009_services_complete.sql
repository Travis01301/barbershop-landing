-- Services and Barber Services Complete Migration
-- Ensures proper schema for services system

-- Drop existing tables if needed for clean setup (dev only - comment out for production)
-- DROP TABLE IF EXISTS barber_services CASCADE;
-- DROP TABLE IF EXISTS services CASCADE;

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, name),
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

-- Create barber_services junction table (per-barber pricing and availability)
CREATE TABLE IF NOT EXISTS barber_services (
  barber_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  price DECIMAL(10, 2),
  duration_minutes INTEGER,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (barber_id, service_id),
  FOREIGN KEY (barber_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- Add service-related columns to appointments table if they don't exist
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS service_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS service_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS service_duration_minutes INTEGER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_services_shop_id ON services(shop_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(shop_id, category);
CREATE INDEX IF NOT EXISTS idx_barber_services_barber_id ON barber_services(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_services_service_id ON barber_services(service_id);
CREATE INDEX IF NOT EXISTS idx_barber_services_available ON barber_services(is_available);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_name ON appointments(service_name);

-- Add comment to describe the schema
COMMENT ON TABLE services IS 'Shop services (haircuts, trims, etc.) with pricing and duration';
COMMENT ON TABLE barber_services IS 'Junction table mapping barbers to services with optional barber-specific pricing';
COMMENT ON COLUMN services.price IS 'Base/default price for the service';
COMMENT ON COLUMN barber_services.price IS 'Override price if barber charges differently (NULL uses service.price)';
