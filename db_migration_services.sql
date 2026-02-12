-- Services and Barber Services Tables Migration

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  base_price DECIMAL(10, 2) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  category VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, name)
);

-- Create barber_services table (per-barber pricing and availability)
CREATE TABLE IF NOT EXISTS barber_services (
  id SERIAL PRIMARY KEY,
  barber_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  price DECIMAL(10, 2),
  duration_minutes INTEGER,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (barber_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE(barber_id, service_id)
);

-- Add service_id column to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES services(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_name VARCHAR(100);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_duration_minutes INTEGER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_services_shop_id ON services(shop_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_barber_services_barber_id ON barber_services(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_services_service_id ON barber_services(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_name ON appointments(service_name);
