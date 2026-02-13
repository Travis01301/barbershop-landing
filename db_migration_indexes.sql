-- Database Indexes for Performance
-- Speeds up common queries in the barbershop booking app

-- Customer lookups by email (frequent in booking flow)
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Barber schedule queries by date (slots calculation)
CREATE INDEX IF NOT EXISTS idx_barber_schedules_barber_day ON barber_schedules(barber_id, day_of_week);

-- Appointment conflicts (checking availability)
CREATE INDEX IF NOT EXISTS idx_appointments_barber_date ON appointments(barber_id, start_time);

-- Shop lookups by slug (common landing page query)
CREATE INDEX IF NOT EXISTS idx_shops_slug ON shops(slug);

-- Customer appointments (history/cancellation)
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);

-- Payment lookups by intent ID
CREATE INDEX IF NOT EXISTS idx_payments_intent_id ON payments(stripe_payment_intent_id);

-- Review lookups (ratings display)
CREATE INDEX IF NOT EXISTS idx_reviews_barber ON reviews(barber_id);

-- Time-off availability checks
CREATE INDEX IF NOT EXISTS idx_time_off_barber_date ON time_off(barber_id, date);

-- Gift card lookups by code (redemption)
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(code);

-- Service lookups by barber (listing services)
CREATE INDEX IF NOT EXISTS idx_barber_services_barber ON barber_services(barber_id);

-- Composite index for complex appointment queries
CREATE INDEX IF NOT EXISTS idx_appointments_shop_barber_date 
  ON appointments(shop_id, barber_id, start_time DESC);

-- For pagination and recent records
CREATE INDEX IF NOT EXISTS idx_appointments_created ON appointments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_created ON customers(created_at DESC);

-- Stats/reporting queries
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
