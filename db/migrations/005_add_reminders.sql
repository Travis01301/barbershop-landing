-- Add reminder tracking to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP;

-- Create index for finding appointments due for reminders
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_due 
ON appointments(start_time, status, reminder_sent_at)
WHERE status = 'confirmed' AND reminder_sent_at IS NULL;

-- Create reminders audit table to track all reminders sent
CREATE TABLE IF NOT EXISTS appointment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id),
  customer_email VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for audit trail
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_appointment_id 
ON appointment_reminders(appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_reminders_sent_at 
ON appointment_reminders(sent_at);

CREATE INDEX IF NOT EXISTS idx_appointment_reminders_status 
ON appointment_reminders(status);
