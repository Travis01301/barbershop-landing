-- Create group_bookings table
CREATE TABLE IF NOT EXISTS group_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  organizer_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE SET NULL,
  group_name VARCHAR(255) NOT NULL,
  group_size INT NOT NULL CHECK (group_size >= 2 AND group_size <= 100),
  total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  subtotal_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'partial-confirmed', 'confirmed', 'completed', 'cancelled')
  ),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create group_booking_members table
CREATE TABLE IF NOT EXISTS group_booking_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_booking_id UUID NOT NULL REFERENCES group_bookings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  barber_id UUID REFERENCES barbers(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  guest_phone VARCHAR(20),
  slot_time TIMESTAMP NOT NULL,
  service_type VARCHAR(100),
  service_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'cancelled', 'no-show', 'completed')
  ),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create group_booking_discounts table (rules per shop)
CREATE TABLE IF NOT EXISTS group_booking_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  min_group_size INT NOT NULL CHECK (min_group_size >= 2),
  discount_percent DECIMAL(5, 2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  description VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, min_group_size)
);

-- Create group_booking_invites table for tracking sent invites
CREATE TABLE IF NOT EXISTS group_booking_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_booking_id UUID NOT NULL REFERENCES group_bookings(id) ON DELETE CASCADE,
  group_member_id UUID NOT NULL REFERENCES group_booking_members(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),
  invite_token VARCHAR(255) UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'sent', 'viewed', 'accepted', 'declined')
  ),
  sent_at TIMESTAMP,
  responded_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create group_booking_payments table for tracking group payment intents
CREATE TABLE IF NOT EXISTS group_booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_booking_id UUID NOT NULL REFERENCES group_bookings(id) ON DELETE CASCADE,
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded', 'cancelled')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for group_bookings
CREATE INDEX IF NOT EXISTS idx_group_bookings_shop_id ON group_bookings(shop_id);
CREATE INDEX IF NOT EXISTS idx_group_bookings_organizer_id ON group_bookings(organizer_customer_id);
CREATE INDEX IF NOT EXISTS idx_group_bookings_status ON group_bookings(status);
CREATE INDEX IF NOT EXISTS idx_group_bookings_created_at ON group_bookings(created_at);

-- Indexes for group_booking_members
CREATE INDEX IF NOT EXISTS idx_group_booking_members_group_id ON group_booking_members(group_booking_id);
CREATE INDEX IF NOT EXISTS idx_group_booking_members_customer_id ON group_booking_members(customer_id);
CREATE INDEX IF NOT EXISTS idx_group_booking_members_barber_id ON group_booking_members(barber_id);
CREATE INDEX IF NOT EXISTS idx_group_booking_members_appointment_id ON group_booking_members(appointment_id);
CREATE INDEX IF NOT EXISTS idx_group_booking_members_status ON group_booking_members(status);
CREATE INDEX IF NOT EXISTS idx_group_booking_members_slot_time ON group_booking_members(slot_time);

-- Indexes for group_booking_discounts
CREATE INDEX IF NOT EXISTS idx_group_booking_discounts_shop_id ON group_booking_discounts(shop_id);
CREATE INDEX IF NOT EXISTS idx_group_booking_discounts_min_size ON group_booking_discounts(min_group_size);

-- Indexes for group_booking_invites
CREATE INDEX IF NOT EXISTS idx_group_booking_invites_group_id ON group_booking_invites(group_booking_id);
CREATE INDEX IF NOT EXISTS idx_group_booking_invites_member_id ON group_booking_invites(group_member_id);
CREATE INDEX IF NOT EXISTS idx_group_booking_invites_token ON group_booking_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_group_booking_invites_status ON group_booking_invites(status);

-- Indexes for group_booking_payments
CREATE INDEX IF NOT EXISTS idx_group_booking_payments_group_id ON group_booking_payments(group_booking_id);
CREATE INDEX IF NOT EXISTS idx_group_booking_payments_stripe_id ON group_booking_payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_group_booking_payments_status ON group_booking_payments(status);
