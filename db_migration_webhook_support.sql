-- Database Migration: Add webhook support for payment status tracking
-- Ensures appointments and payments have proper status columns for webhook updates

-- Ensure payments table has status column
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
COMMENT ON COLUMN payments.status IS 'Status: pending, processing, confirmed, failed, refunded';

-- Ensure appointments table has status column
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'scheduled';
COMMENT ON COLUMN appointments.status IS 'Status: scheduled, confirmed, completed, cancelled, no-show';

-- Add index on payment status for queries
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Add index on appointment status for queries
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Ensure created_at and updated_at exist on payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Ensure created_at and updated_at exist on appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create trigger to auto-update updated_at on payments
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payments_updated_at ON payments;
CREATE TRIGGER trigger_update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Create trigger to auto-update updated_at on appointments
CREATE OR REPLACE FUNCTION update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_appointments_updated_at ON appointments;
CREATE TRIGGER trigger_update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_appointments_updated_at();
