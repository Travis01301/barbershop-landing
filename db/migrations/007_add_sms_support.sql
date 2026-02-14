-- Add phone number to customer_profiles if not exists
ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Create SMS logs table for audit trail
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  customer_phone VARCHAR(20) NOT NULL,
  message_type VARCHAR(50) NOT NULL,
  -- 'booking', 'reminder_24h', 'reminder_day', 'cancellation'
  success BOOLEAN NOT NULL DEFAULT true,
  twilio_message_id VARCHAR(100),
  error_message TEXT,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for finding SMS records
CREATE INDEX IF NOT EXISTS idx_sms_logs_appointment_id 
ON sms_logs(appointment_id);

CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at 
ON sms_logs(sent_at);

CREATE INDEX IF NOT EXISTS idx_sms_logs_message_type 
ON sms_logs(message_type);

CREATE INDEX IF NOT EXISTS idx_sms_logs_success 
ON sms_logs(success);

-- Create SMS reminder tracking table
CREATE TABLE IF NOT EXISTS sms_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  customer_phone VARCHAR(20) NOT NULL,
  reminder_type VARCHAR(50) NOT NULL,
  -- '24h', 'day_of'
  scheduled_for TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- 'pending', 'sent', 'failed', 'skipped'
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for finding pending reminders
CREATE INDEX IF NOT EXISTS idx_sms_reminders_scheduled_for 
ON sms_reminders(scheduled_for, status)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_sms_reminders_appointment_id 
ON sms_reminders(appointment_id);

CREATE INDEX IF NOT EXISTS idx_sms_reminders_status 
ON sms_reminders(status);
