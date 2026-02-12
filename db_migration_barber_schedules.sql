-- Create barber_schedules table for managing working hours
CREATE TABLE IF NOT EXISTS barber_schedules (
  id SERIAL PRIMARY KEY,
  barber_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_working BOOLEAN NOT NULL DEFAULT true,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(barber_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_barber_schedules_barber_id ON barber_schedules(barber_id);
