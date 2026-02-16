-- Staff Shift Scheduling System Migration
-- Comprehensive shift management for barbershop SaaS

-- 1. Shop Operating Hours Table
CREATE TABLE IF NOT EXISTS shop_operating_hours (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  is_open BOOLEAN NOT NULL DEFAULT true,
  open_time TIME,
  close_time TIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, day_of_week)
);

-- 2. Shift Templates (recurring shift definitions)
CREATE TABLE IF NOT EXISTS shift_templates (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, -- e.g., "Morning Shift", "Afternoon Shift"
  description TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  min_barbers_required INTEGER DEFAULT 1,
  max_barbers_allowed INTEGER DEFAULT 5,
  is_recurring BOOLEAN DEFAULT true,
  recurring_pattern VARCHAR(50), -- 'daily', 'weekdays', 'weekly', 'custom'
  recurring_days TEXT, -- JSON array of days [0-6] or cron-like pattern
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, name)
);

-- 3. Barber Availability (weekly availability patterns)
CREATE TABLE IF NOT EXISTS barber_availability (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  barber_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_available BOOLEAN NOT NULL DEFAULT true,
  availability_type VARCHAR(50) DEFAULT 'flexible', -- 'regular', 'flexible', 'unavailable'
  start_time TIME,
  end_time TIME,
  preference_level VARCHAR(50) DEFAULT 'willing', -- 'preferred', 'willing', 'unavailable'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, barber_id, day_of_week)
);

-- 4. Barber Shifts (actual shift assignments)
CREATE TABLE IF NOT EXISTS barber_shifts (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  barber_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_template_id INTEGER REFERENCES shift_templates(id) ON DELETE SET NULL,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(50) DEFAULT 'assigned', -- 'assigned', 'pending', 'confirmed', 'cancelled'
  notes TEXT,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP -- soft delete
);

-- 5. Time Off Requests (vacation, sick, personal days)
CREATE TABLE IF NOT EXISTS time_off_requests (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  barber_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(50), -- 'vacation', 'sick', 'personal', 'other'
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'denied'
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  denial_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Shift Swaps (barber A asks to swap with barber B)
CREATE TABLE IF NOT EXISTS shift_swaps (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  requesting_barber_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_barber_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_id_to_give INTEGER NOT NULL REFERENCES barber_shifts(id) ON DELETE CASCADE,
  shift_id_to_receive INTEGER NOT NULL REFERENCES barber_shifts(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'denied', 'cancelled'
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Shift History (audit trail for schedule changes)
CREATE TABLE IF NOT EXISTS shift_history (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  shift_id INTEGER REFERENCES barber_shifts(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'assigned', 'confirmed', 'swapped'
  changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  old_values JSONB, -- JSON of previous values
  new_values JSONB, -- JSON of new values
  change_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============ INDEXES FOR PERFORMANCE ============

-- Shop Operating Hours Indexes
CREATE INDEX IF NOT EXISTS idx_shop_operating_hours_shop_id ON shop_operating_hours(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_operating_hours_day ON shop_operating_hours(shop_id, day_of_week);

-- Shift Templates Indexes
CREATE INDEX IF NOT EXISTS idx_shift_templates_shop_id ON shift_templates(shop_id);
CREATE INDEX IF NOT EXISTS idx_shift_templates_active ON shift_templates(shop_id, is_active);

-- Barber Availability Indexes
CREATE INDEX IF NOT EXISTS idx_barber_availability_shop_barber ON barber_availability(shop_id, barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_availability_day ON barber_availability(shop_id, day_of_week);

-- Barber Shifts Indexes
CREATE INDEX IF NOT EXISTS idx_barber_shifts_shop_barber ON barber_shifts(shop_id, barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_shifts_date ON barber_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_barber_shifts_shop_date ON barber_shifts(shop_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_barber_shifts_status ON barber_shifts(status);
CREATE INDEX IF NOT EXISTS idx_barber_shifts_deleted ON barber_shifts(deleted_at);

-- Time Off Requests Indexes
CREATE INDEX IF NOT EXISTS idx_time_off_shop_barber ON time_off_requests(shop_id, barber_id);
CREATE INDEX IF NOT EXISTS idx_time_off_dates ON time_off_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_time_off_status ON time_off_requests(status);
CREATE INDEX IF NOT EXISTS idx_time_off_shop_status ON time_off_requests(shop_id, status);

-- Shift Swaps Indexes
CREATE INDEX IF NOT EXISTS idx_shift_swaps_shop ON shift_swaps(shop_id);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_requesting_barber ON shift_swaps(requesting_barber_id);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_requested_barber ON shift_swaps(requested_barber_id);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_status ON shift_swaps(status);

-- Shift History Indexes
CREATE INDEX IF NOT EXISTS idx_shift_history_shop_id ON shift_history(shop_id);
CREATE INDEX IF NOT EXISTS idx_shift_history_shift_id ON shift_history(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_history_action ON shift_history(action);

-- ============ INITIAL DATA ============

-- Insert default operating hours for test shop (9am-5pm Mon-Fri, closed weekends)
WITH shop_data AS (
  SELECT id FROM shops WHERE slug = 'test-shop'
)
INSERT INTO shop_operating_hours (shop_id, day_of_week, is_open, open_time, close_time)
SELECT 
  shop_data.id, 
  day, 
  CASE WHEN day >= 1 AND day <= 5 THEN true ELSE false END, -- Monday-Friday open, Sat-Sun closed
  CASE WHEN day >= 1 AND day <= 5 THEN '09:00:00'::time ELSE NULL END,
  CASE WHEN day >= 1 AND day <= 5 THEN '17:00:00'::time ELSE NULL END
FROM shop_data
CROSS JOIN (VALUES (0), (1), (2), (3), (4), (5), (6)) AS days(day)
ON CONFLICT DO NOTHING;

-- Insert default shift templates for test shop
WITH shop_data AS (
  SELECT id FROM shops WHERE slug = 'test-shop'
)
INSERT INTO shift_templates (shop_id, name, description, start_time, end_time, min_barbers_required, max_barbers_allowed, recurring_pattern, recurring_days)
VALUES
  (
    (SELECT id FROM shop_data),
    'Morning Shift',
    'Morning shift from 9am to 1pm',
    '09:00:00'::time,
    '13:00:00'::time,
    1,
    3,
    'weekdays',
    '[1, 2, 3, 4, 5]'
  ),
  (
    (SELECT id FROM shop_data),
    'Afternoon Shift',
    'Afternoon shift from 1pm to 5pm',
    '13:00:00'::time,
    '17:00:00'::time,
    1,
    3,
    'weekdays',
    '[1, 2, 3, 4, 5]'
  )
ON CONFLICT DO NOTHING;

-- Insert default availability for test barber (available all weekdays)
WITH barber_data AS (
  SELECT u.id, u.shop_id FROM users u
  JOIN shops s ON u.shop_id = s.id
  WHERE s.slug = 'test-shop' AND u.role = 'barber'
  LIMIT 1
)
INSERT INTO barber_availability (shop_id, barber_id, day_of_week, is_available, availability_type, start_time, end_time, preference_level)
SELECT barber_data.shop_id, barber_data.id, day, true, 'regular', '09:00:00'::time, '17:00:00'::time, 'preferred'
FROM barber_data
CROSS JOIN (VALUES (1), (2), (3), (4), (5)) AS days(day)
ON CONFLICT DO NOTHING;
