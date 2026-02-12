-- Email tracking table

CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  email_type VARCHAR(50) NOT NULL, -- signup, booking_confirmation, appointment_reminder, cancellation
  related_id INTEGER, -- signup_id, appointment_id, etc
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'sent', -- sent, failed, bounced
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS barber_onboarding (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  barber_id INTEGER REFERENCES barbers(id) ON DELETE SET NULL,
  activation_token VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  is_activated BOOLEAN DEFAULT false,
  activated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days'
);

CREATE INDEX idx_email_logs_shop_type ON email_logs(shop_id, email_type);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX idx_barber_onboarding_token ON barber_onboarding(activation_token);
CREATE INDEX idx_barber_onboarding_shop ON barber_onboarding(shop_id);

COMMIT;
