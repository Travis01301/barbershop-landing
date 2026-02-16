-- Create waitlist_queue table for walk-in customers
CREATE TABLE IF NOT EXISTS waitlist_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  service_type VARCHAR(100) NOT NULL,
  estimated_duration INT DEFAULT 30 COMMENT 'Estimated service duration in minutes',
  position_in_queue INT NOT NULL,
  barber_id UUID REFERENCES barbers(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'waiting' CHECK (
    status IN ('waiting', 'in-service', 'completed', 'no-show', 'cancelled')
  ),
  checked_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_at TIMESTAMP,
  service_started_at TIMESTAMP,
  completed_at TIMESTAMP,
  wait_time_minutes INT,
  sms_notified BOOLEAN DEFAULT FALSE,
  sms_notified_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create queue_analytics table for tracking wait times and throughput
CREATE TABLE IF NOT EXISTS queue_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_walk_ins INT DEFAULT 0,
  total_completed INT DEFAULT 0,
  total_no_shows INT DEFAULT 0,
  total_cancelled INT DEFAULT 0,
  avg_wait_time_minutes INT,
  max_wait_time_minutes INT,
  peak_hour VARCHAR(5),
  peak_hour_count INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, date)
);

-- Indexes for waitlist_queue
CREATE INDEX IF NOT EXISTS idx_waitlist_queue_shop_id ON waitlist_queue(shop_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_queue_status ON waitlist_queue(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_queue_barber_id ON waitlist_queue(barber_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_queue_checked_in ON waitlist_queue(checked_in_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_queue_position ON waitlist_queue(shop_id, position_in_queue) WHERE status = 'waiting';

-- Indexes for queue_analytics
CREATE INDEX IF NOT EXISTS idx_queue_analytics_shop_id ON queue_analytics(shop_id);
CREATE INDEX IF NOT EXISTS idx_queue_analytics_date ON queue_analytics(date);
CREATE INDEX IF NOT EXISTS idx_queue_analytics_shop_date ON queue_analytics(shop_id, date);
