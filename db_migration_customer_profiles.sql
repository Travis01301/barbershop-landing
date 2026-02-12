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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_profiles_shop_email ON customer_profiles(shop_id, email);

-- Add customer_id column to appointments table if it doesn't exist
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customer_profiles(id) ON DELETE SET NULL;

-- Create index on appointments.customer_id
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);
