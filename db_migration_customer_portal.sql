-- Customer Portal Schema Migration
-- Public booking interface tables for multi-tenant barbershop SaaS

-- Public shop links (allows shops to share a public booking URL)
CREATE TABLE IF NOT EXISTS public_shop_links (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  access_token VARCHAR(255) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  custom_colors JSONB, -- {primaryColor, secondaryColor, accentColor}
  custom_copy JSONB, -- {headerText, footerText, etc}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_public_shop_links_slug ON public_shop_links(slug);
CREATE INDEX IF NOT EXISTS idx_public_shop_links_access_token ON public_shop_links(access_token);
CREATE INDEX IF NOT EXISTS idx_public_shop_links_shop_id ON public_shop_links(shop_id);

-- Portal bookings (bookings made through the public interface)
CREATE TABLE IF NOT EXISTS portal_bookings (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  barber_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  service_id INTEGER REFERENCES barber_services(id) ON DELETE SET NULL,
  
  -- Booking details
  scheduled_date TIMESTAMP NOT NULL,
  estimated_duration_minutes INTEGER DEFAULT 30,
  
  -- Payment info
  deposit_amount_cents INTEGER DEFAULT 1000, -- $10
  total_amount_cents INTEGER,
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, completed, refunded, failed
  stripe_payment_intent_id VARCHAR(255),
  
  -- Preferences
  styling_notes TEXT,
  first_time_customer BOOLEAN DEFAULT true,
  style_photo_url TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  cancel_reason TEXT,
  cancelled_at TIMESTAMP,
  
  -- Booking token for management without auth
  booking_token VARCHAR(64) NOT NULL UNIQUE,
  token_expires_at TIMESTAMP,
  
  -- Tracking
  created_from_ip VARCHAR(45),
  user_agent TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portal_bookings_shop_id ON portal_bookings(shop_id);
CREATE INDEX IF NOT EXISTS idx_portal_bookings_email ON portal_bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_portal_bookings_booking_token ON portal_bookings(booking_token);
CREATE INDEX IF NOT EXISTS idx_portal_bookings_status ON portal_bookings(status);
CREATE INDEX IF NOT EXISTS idx_portal_bookings_scheduled_date ON portal_bookings(shop_id, scheduled_date);

-- Portal analytics (tracking views, conversions, abandoned carts)
CREATE TABLE IF NOT EXISTS portal_analytics (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- view, barber_clicked, service_selected, slots_viewed, checkout_started, checkout_completed, cart_abandoned
  
  -- Session tracking
  session_id VARCHAR(64),
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Event details
  barber_id INTEGER,
  service_id INTEGER,
  step_name VARCHAR(100), -- booking_page, barber_selection, time_picker, service_selection, customer_form, payment, confirmation
  
  -- UTM parameters
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portal_analytics_shop_id ON portal_analytics(shop_id);
CREATE INDEX IF NOT EXISTS idx_portal_analytics_event_type ON portal_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_portal_analytics_session_id ON portal_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_portal_analytics_created_at ON portal_analytics(shop_id, created_at);

-- Barber specialties (what services each barber offers)
CREATE TABLE IF NOT EXISTS barber_specialties (
  id SERIAL PRIMARY KEY,
  barber_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES barber_services(id) ON DELETE CASCADE,
  
  -- Specialty details
  specialty_name VARCHAR(255), -- e.g., "Fades", "Beard Design", "Line-ups"
  description TEXT,
  is_featured BOOLEAN DEFAULT false,
  
  -- Rating for this specialty
  average_rating NUMERIC(3,2),
  review_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(barber_id, specialty_name)
);

CREATE INDEX IF NOT EXISTS idx_barber_specialties_barber_id ON barber_specialties(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_specialties_shop_id ON barber_specialties(shop_id);
CREATE INDEX IF NOT EXISTS idx_barber_specialties_service_id ON barber_specialties(service_id);

-- Service add-ons (optional extras for services)
CREATE TABLE IF NOT EXISTS service_add_ons (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES barber_services(id) ON DELETE CASCADE,
  
  -- Add-on details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  duration_minutes INTEGER DEFAULT 5,
  
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_add_ons_shop_id ON service_add_ons(shop_id);
CREATE INDEX IF NOT EXISTS idx_service_add_ons_service_id ON service_add_ons(service_id);

-- Portal bookings reviews/ratings
CREATE TABLE IF NOT EXISTS portal_booking_reviews (
  id SERIAL PRIMARY KEY,
  portal_booking_id INTEGER NOT NULL REFERENCES portal_bookings(id) ON DELETE CASCADE,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  barber_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Rating
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  
  -- What did the customer like/dislike
  service_quality_rating INTEGER CHECK (service_quality_rating >= 1 AND service_quality_rating <= 5),
  cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  
  -- Flags
  is_verified_purchase BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portal_booking_reviews_shop_id ON portal_booking_reviews(shop_id);
CREATE INDEX IF NOT EXISTS idx_portal_booking_reviews_barber_id ON portal_booking_reviews(barber_id);
CREATE INDEX IF NOT EXISTS idx_portal_booking_reviews_portal_booking_id ON portal_booking_reviews(portal_booking_id);

-- Abandoned carts (for conversion tracking and recovery emails)
CREATE TABLE IF NOT EXISTS portal_abandoned_carts (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  session_id VARCHAR(64) NOT NULL,
  
  -- Cart state
  barber_id INTEGER,
  service_id INTEGER,
  scheduled_date TIMESTAMP,
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  
  -- Recovery
  recovery_email_sent BOOLEAN DEFAULT false,
  recovery_email_sent_at TIMESTAMP,
  recovered BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  abandoned_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_shop_id ON portal_abandoned_carts(shop_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_session_id ON portal_abandoned_carts(session_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_created_at ON portal_abandoned_carts(shop_id, created_at);

-- Promo code validations for portal
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS is_portal_only BOOLEAN DEFAULT false;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS min_booking_value_cents INTEGER;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS applicable_services JSONB; -- array of service IDs, null = all services

-- Add portal-specific columns to shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN DEFAULT false;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS portal_slug VARCHAR(100) UNIQUE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS portal_analytics_enabled BOOLEAN DEFAULT true;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS portal_sms_reminders BOOLEAN DEFAULT true;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS portal_email_reminders BOOLEAN DEFAULT true;

-- Add columns to appointments to track portal bookings
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS portal_booking_id INTEGER REFERENCES portal_bookings(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_from_portal BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS portal_deposit_paid BOOLEAN DEFAULT false;

-- Add barber photo/bio for portal display
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialties JSONB; -- array of specialty names
ALTER TABLE users ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Add to shops for portal display
ALTER TABLE shops ADD COLUMN IF NOT EXISTS about_text TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS faq_items JSONB; -- array of {question, answer} objects

COMMIT;
