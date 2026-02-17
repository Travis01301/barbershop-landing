-- Create appointment_analytics table for historical tracking
CREATE TABLE IF NOT EXISTS appointment_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  
  -- Time features
  appointment_date DATE NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 6=Saturday
  hour_of_day INTEGER NOT NULL, -- 0-23
  
  -- Outcome
  no_show BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled BOOLEAN NOT NULL DEFAULT FALSE,
  completed BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Customer history snapshot
  customer_total_appointments INTEGER NOT NULL DEFAULT 0,
  customer_no_show_count INTEGER NOT NULL DEFAULT 0,
  customer_cancellation_count INTEGER NOT NULL DEFAULT 0,
  
  -- Barber stats snapshot
  barber_no_show_rate DECIMAL(5, 2) DEFAULT 0,
  barber_total_appointments INTEGER DEFAULT 0,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create no_show_predictions table for storing predictions
CREATE TABLE IF NOT EXISTS no_show_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  
  -- Prediction score (0-100)
  no_show_risk_score DECIMAL(5, 2) NOT NULL,
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  
  -- Factors contributing to prediction
  factors JSONB DEFAULT '{}',
  
  -- Alert sent
  alert_sent BOOLEAN DEFAULT FALSE,
  alert_sent_at TIMESTAMP,
  
  -- Actual outcome (after appointment)
  actual_outcome VARCHAR(20) CHECK (actual_outcome IN ('showed', 'no_show', 'cancelled')),
  prediction_correct BOOLEAN,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create barber_no_show_rates table for aggregate statistics
CREATE TABLE IF NOT EXISTS barber_no_show_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  
  -- Total stats
  total_appointments INTEGER NOT NULL DEFAULT 0,
  no_show_count INTEGER NOT NULL DEFAULT 0,
  cancellation_count INTEGER NOT NULL DEFAULT 0,
  completed_count INTEGER NOT NULL DEFAULT 0,
  
  -- Rates (0-100)
  no_show_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  cancellation_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  completion_rate DECIMAL(5, 2) NOT NULL DEFAULT 100,
  
  -- Time-based analysis
  peak_no_show_hour INTEGER, -- Which hour has highest no-shows
  peak_no_show_day INTEGER, -- Which day of week has highest no-shows
  
  -- Last updated
  last_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create booking_patterns table for time/day analysis
CREATE TABLE IF NOT EXISTS booking_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  
  -- Time slot
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  hour_of_day INTEGER NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  
  -- Statistics
  total_bookings INTEGER NOT NULL DEFAULT 0,
  completed_bookings INTEGER NOT NULL DEFAULT 0,
  cancelled_bookings INTEGER NOT NULL DEFAULT 0,
  no_show_count INTEGER NOT NULL DEFAULT 0,
  
  -- Rates
  no_show_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  cancellation_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  completion_rate DECIMAL(5, 2) NOT NULL DEFAULT 100,
  
  -- Availability
  average_wait_time_minutes INTEGER DEFAULT 0,
  busiest BOOLEAN DEFAULT FALSE,
  
  last_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(shop_id, day_of_week, hour_of_day)
);

-- Create AI_training_sessions for tracking model training
CREATE TABLE IF NOT EXISTS ai_training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  
  model_type VARCHAR(50) NOT NULL, -- 'no_show_predictor', 'booking_recommender', etc.
  training_data_points INTEGER NOT NULL,
  accuracy_score DECIMAL(5, 2),
  
  -- Training metadata
  last_trained_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  next_training_at TIMESTAMP,
  
  -- Model version
  model_version VARCHAR(50),
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointment_analytics_shop_id ON appointment_analytics(shop_id);
CREATE INDEX IF NOT EXISTS idx_appointment_analytics_customer_id ON appointment_analytics(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointment_analytics_barber_id ON appointment_analytics(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointment_analytics_no_show ON appointment_analytics(no_show);
CREATE INDEX IF NOT EXISTS idx_appointment_analytics_appointment_date ON appointment_analytics(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointment_analytics_day_hour ON appointment_analytics(day_of_week, hour_of_day);

CREATE INDEX IF NOT EXISTS idx_no_show_predictions_appointment_id ON no_show_predictions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_no_show_predictions_customer_id ON no_show_predictions(customer_id);
CREATE INDEX IF NOT EXISTS idx_no_show_predictions_barber_id ON no_show_predictions(barber_id);
CREATE INDEX IF NOT EXISTS idx_no_show_predictions_risk_level ON no_show_predictions(risk_level);
CREATE INDEX IF NOT EXISTS idx_no_show_predictions_alert_sent ON no_show_predictions(alert_sent);

CREATE INDEX IF NOT EXISTS idx_barber_no_show_rates_shop_id ON barber_no_show_rates(shop_id);
CREATE INDEX IF NOT EXISTS idx_barber_no_show_rates_barber_id ON barber_no_show_rates(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_no_show_rates_no_show_rate ON barber_no_show_rates(no_show_rate);

CREATE INDEX IF NOT EXISTS idx_booking_patterns_shop_id ON booking_patterns(shop_id);
CREATE INDEX IF NOT EXISTS idx_booking_patterns_day_hour ON booking_patterns(day_of_week, hour_of_day);
CREATE INDEX IF NOT EXISTS idx_booking_patterns_busiest ON booking_patterns(busiest);

CREATE INDEX IF NOT EXISTS idx_ai_training_sessions_shop_id ON ai_training_sessions(shop_id);
CREATE INDEX IF NOT EXISTS idx_ai_training_sessions_model_type ON ai_training_sessions(model_type);
