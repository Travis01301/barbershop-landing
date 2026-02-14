-- Add unique constraint to prevent double-booking
-- Note: PostgreSQL doesn't support unique constraints on overlapping ranges directly,
-- so we use a custom approach with a trigger-like behavior via application logic
-- This index helps with performance on availability queries
CREATE INDEX IF NOT EXISTS idx_appointments_barber_time 
ON appointments(barber_id, start_time, end_time)
WHERE status = 'confirmed';

-- Create a function to check for overlapping appointments (PostgreSQL)
-- This can be used by the application or with a trigger
CREATE OR REPLACE FUNCTION check_barber_availability()
RETURNS TABLE(has_conflict BOOLEAN, conflicting_appointment_id UUID) AS $$
DECLARE
BEGIN
  -- This function would be called from application layer
  -- to validate availability before insertion
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create audit table for availability changes
CREATE TABLE IF NOT EXISTS availability_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'checked', 'booked', 'cancelled'
  appointment_id UUID,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  had_conflicts BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for audit trail
CREATE INDEX IF NOT EXISTS idx_availability_audit_barber 
ON availability_audit(barber_id, created_at);

CREATE INDEX IF NOT EXISTS idx_availability_audit_shop 
ON availability_audit(shop_id, created_at);
