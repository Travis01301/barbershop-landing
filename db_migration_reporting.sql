-- Add missing columns for advanced reporting

-- Add to appointments table if not exists
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255),
ADD COLUMN IF NOT EXISTS review_submitted BOOLEAN DEFAULT false;

-- Add to payments table if not exists
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'card';

-- Create index for faster report queries
CREATE INDEX IF NOT EXISTS idx_payments_shop_status_created ON payments(shop_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_shop_created ON payments(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_shop_created ON appointments(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_shop_status ON appointments(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON customers(shop_id);

-- Ensure decimal precision for financial data
ALTER TABLE payments
ALTER COLUMN amount TYPE NUMERIC(12,2),
ALTER COLUMN tip_amount TYPE NUMERIC(12,2);

COMMIT;
