-- Add cancellation policy tracking to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(10, 2);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_reason VARCHAR(255);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellation_window_hours INTEGER DEFAULT 24;

-- Create index for finding cancellations for reporting
CREATE INDEX IF NOT EXISTS idx_appointments_cancelled_at 
ON appointments(cancelled_at, shop_id)
WHERE status = 'cancelled';

-- Create cancellation audit table to track all cancellations with fees
CREATE TABLE IF NOT EXISTS appointment_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id),
  shop_id INTEGER NOT NULL REFERENCES shops(id),
  customer_email VARCHAR(255) NOT NULL,
  cancellation_fee DECIMAL(10, 2),
  reason VARCHAR(255),
  cancelled_by VARCHAR(50) NOT NULL DEFAULT 'customer', -- 'customer', 'admin', 'shop'
  cancellation_hours_before DECIMAL(5, 2),
  refund_amount DECIMAL(10, 2),
  is_refundable BOOLEAN DEFAULT true,
  cancelled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for audit trail
CREATE INDEX IF NOT EXISTS idx_appointment_cancellations_appointment_id 
ON appointment_cancellations(appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_cancellations_shop_id 
ON appointment_cancellations(shop_id, cancelled_at);

CREATE INDEX IF NOT EXISTS idx_appointment_cancellations_email 
ON appointment_cancellations(customer_email);
