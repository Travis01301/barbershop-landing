-- Complete database setup for Barbershop Booking System

-- Create shops table
CREATE TABLE IF NOT EXISTS shops (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table (for barbers and admins)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'barber', -- 'barber', 'admin'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, email)
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  barber_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'pending'
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customer_profiles table
CREATE TABLE IF NOT EXISTS customer_profiles (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  preferred_barber_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  styling_notes TEXT,
  allergies TEXT,
  health_notes TEXT,
  preferred_contact_method VARCHAR(50),
  do_not_disturb_time VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, email)
);

-- Create barber_schedules table
CREATE TABLE IF NOT EXISTS barber_schedules (
  id SERIAL PRIMARY KEY,
  barber_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_working BOOLEAN NOT NULL DEFAULT true,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(barber_id, day_of_week)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_shops_slug ON shops(slug);
CREATE INDEX IF NOT EXISTS idx_users_shop_id ON users(shop_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_appointments_shop_id ON appointments(shop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_id ON appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_email ON appointments(customer_email);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_shop_email ON customer_profiles(shop_id, email);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON customer_profiles(email);
CREATE INDEX IF NOT EXISTS idx_barber_schedules_barber_id ON barber_schedules(barber_id);

-- Add customer_id column to appointments if it doesn't exist
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customer_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);

-- Insert test data
INSERT INTO shops (name, slug, address, phone, email) 
VALUES ('Test Barbershop', 'test-shop', '123 Main St', '555-1234', 'shop@example.com')
ON CONFLICT DO NOTHING;

-- Get shop ID for test data
WITH shop_data AS (
  SELECT id FROM shops WHERE slug = 'test-shop'
)
INSERT INTO users (shop_id, email, password_hash, name, role)
SELECT 
  shop_data.id,
  'owner@test.com',
  '$2b$10$JzNCnJ8T4Lc4wh0lk4F7J.6JvJ0E0Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', -- password123 hashed
  'Test Owner',
  'admin'
FROM shop_data
ON CONFLICT DO NOTHING;

-- Insert sample barber
WITH shop_data AS (
  SELECT id FROM shops WHERE slug = 'test-shop'
)
INSERT INTO users (shop_id, email, password_hash, name, role)
SELECT 
  shop_data.id,
  'barber@test.com',
  '$2b$10$JzNCnJ8T4Lc4wh0lk4F7J.6JvJ0E0Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z',
  'John the Barber',
  'barber'
FROM shop_data
ON CONFLICT DO NOTHING;

-- Insert barber schedule (Monday-Friday, 9am-5pm)
WITH barber_data AS (
  SELECT u.id FROM users u
  JOIN shops s ON u.shop_id = s.id
  WHERE s.slug = 'test-shop' AND u.role = 'barber'
  LIMIT 1
)
INSERT INTO barber_schedules (barber_id, day_of_week, is_working, start_time, end_time)
SELECT barber_data.id, day, true, '09:00:00'::time, '17:00:00'::time
FROM barber_data
CROSS JOIN (VALUES (0), (1), (2), (3), (4)) AS days(day)
ON CONFLICT DO NOTHING;
