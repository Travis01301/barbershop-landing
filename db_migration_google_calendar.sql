-- Database migration to add Google Calendar integration columns to shops table

-- Add Google Calendar columns to shops table
ALTER TABLE shops ADD COLUMN IF NOT EXISTS google_calendar_access_token TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT false;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS google_calendar_connected_at TIMESTAMP;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS google_calendar_sync_enabled BOOLEAN DEFAULT false;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS google_calendar_last_sync TIMESTAMP;

-- Create google_calendar_events table to track synced events
CREATE TABLE IF NOT EXISTS google_calendar_events (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
  google_event_id VARCHAR(255) NOT NULL,
  google_calendar_id VARCHAR(255),
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, google_event_id),
  UNIQUE(appointment_id, google_event_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_google_calendar_events_shop_id ON google_calendar_events(shop_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_events_appointment_id ON google_calendar_events(appointment_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_events_google_event_id ON google_calendar_events(google_event_id);
CREATE INDEX IF NOT EXISTS idx_shops_google_calendar_connected ON shops(google_calendar_connected);

-- Create audit table for sync operations
CREATE TABLE IF NOT EXISTS google_calendar_sync_logs (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL, -- 'appointments_to_calendar' or 'calendar_to_appointments'
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed'
  items_synced INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_google_calendar_sync_logs_shop_id ON google_calendar_sync_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_sync_logs_status ON google_calendar_sync_logs(status);
