-- Staff Scheduling Tables

CREATE TABLE IF NOT EXISTS barber_schedules (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  barber_id INTEGER NOT NULL,
  day_of_week SMALLINT NOT NULL, -- 0=Sunday to 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(barber_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS barber_time_off (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  barber_id INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255),
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, denied
  approved_by INTEGER, -- admin user id
  approved_at TIMESTAMP,
  denial_reason TEXT
);

CREATE TABLE IF NOT EXISTS barber_availability (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  barber_id INTEGER NOT NULL,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  reason VARCHAR(100), -- sick, personal, maintenance, lunch, etc
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(barber_id, date)
);

CREATE TABLE IF NOT EXISTS shift_swaps (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  initiator_barber_id INTEGER NOT NULL,
  target_barber_id INTEGER NOT NULL,
  swap_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, denied
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_barber_schedules_shop_barber ON barber_schedules(shop_id, barber_id);
CREATE INDEX idx_barber_time_off_shop_barber ON barber_time_off(shop_id, barber_id);
CREATE INDEX idx_barber_time_off_status ON barber_time_off(status);
CREATE INDEX idx_barber_availability_date ON barber_availability(barber_id, date);
CREATE INDEX idx_shift_swaps_status ON shift_swaps(status);

COMMIT;
