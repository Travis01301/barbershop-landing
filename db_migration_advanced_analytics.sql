-- Advanced Analytics Migration
-- Creates tables for advanced analytics: barber performance, customer LTV, churn signals, cohort analysis

-- Create barber_performance_metrics table
CREATE TABLE IF NOT EXISTS barber_performance_metrics (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  barber_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  appointment_count INTEGER DEFAULT 0,
  average_transaction DECIMAL(10, 2) DEFAULT 0,
  customer_satisfaction_score DECIMAL(3, 2),
  repeat_customer_count INTEGER DEFAULT 0,
  new_customer_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, barber_id, metric_date)
);

-- Create customer_lifetime_value table
CREATE TABLE IF NOT EXISTS customer_lifetime_value (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  appointment_count INTEGER DEFAULT 0,
  average_visit_frequency DECIMAL(5, 2) DEFAULT 0, -- visits per month
  last_visit_date DATE,
  first_visit_date DATE,
  lifetime_value_category VARCHAR(50), -- 'vip', 'high-value', 'regular', 'at-risk', 'inactive'
  predicted_churn_risk DECIMAL(3, 2) DEFAULT 0, -- 0-1 probability
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, customer_id)
);

-- Create churn_predictions table
CREATE TABLE IF NOT EXISTS churn_predictions (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  days_since_visit INTEGER,
  churn_probability DECIMAL(3, 2), -- 0-1
  churn_score INTEGER, -- 0-100
  reasons JSONB, -- Array of churn reasons
  recommended_actions JSONB, -- Array of intervention suggestions
  risk_level VARCHAR(50), -- 'low', 'medium', 'high', 'critical'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, customer_id)
);

-- Create cohort_snapshots table for cohort analysis
CREATE TABLE IF NOT EXISTS cohort_snapshots (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  cohort_month DATE NOT NULL, -- First day of the month when customers were acquired
  cohort_name VARCHAR(255), -- e.g., "Jan 2026 Cohort"
  cohort_size INTEGER,
  acquisition_month_revenue DECIMAL(10, 2),
  month_0_count INTEGER, -- Month of acquisition
  month_0_revenue DECIMAL(10, 2),
  month_1_count INTEGER, -- 1 month after acquisition
  month_1_revenue DECIMAL(10, 2),
  month_2_count INTEGER,
  month_2_revenue DECIMAL(10, 2),
  month_3_count INTEGER,
  month_3_revenue DECIMAL(10, 2),
  month_6_count INTEGER,
  month_6_revenue DECIMAL(10, 2),
  month_12_count INTEGER,
  month_12_revenue DECIMAL(10, 2),
  retention_rate_month_1 DECIMAL(5, 2), -- percentage
  retention_rate_month_3 DECIMAL(5, 2),
  retention_rate_month_6 DECIMAL(5, 2),
  retention_rate_month_12 DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, cohort_month)
);

-- Create service_popularity table
CREATE TABLE IF NOT EXISTS service_popularity_metrics (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES barber_services(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_bookings INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  average_rating DECIMAL(3, 2),
  gross_margin DECIMAL(10, 2) DEFAULT 0, -- revenue - cost
  margin_percentage DECIMAL(5, 2), -- margin / revenue * 100
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, service_id, metric_date)
);

-- Create demand_forecast table
CREATE TABLE IF NOT EXISTS demand_forecasts (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES barber_services(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  day_of_week INTEGER, -- 0-6 (Monday-Sunday)
  hour_of_day INTEGER, -- 0-23
  expected_demand INTEGER, -- predicted number of bookings
  confidence_level DECIMAL(3, 2), -- 0-1
  peak_hour BOOLEAN DEFAULT false,
  recommended_staff_count INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, service_id, forecast_date, hour_of_day)
);

-- Create customer_segments table
CREATE TABLE IF NOT EXISTS customer_segments (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  segment_type VARCHAR(50) NOT NULL, -- 'vip', 'regular', 'at-risk', 'churned', 'dormant'
  segment_score INTEGER, -- 0-100
  characteristics JSONB, -- JSON object with segment characteristics
  recommended_actions JSONB, -- Array of marketing/engagement actions
  assigned_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, customer_id, segment_type)
);

-- Create analytics_cache table for performance optimization
CREATE TABLE IF NOT EXISTS analytics_cache (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  cache_key VARCHAR(255) NOT NULL,
  cache_value JSONB,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, cache_key)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_barber_performance_shop ON barber_performance_metrics(shop_id);
CREATE INDEX IF NOT EXISTS idx_barber_performance_barber ON barber_performance_metrics(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_performance_date ON barber_performance_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_customer_ltv_shop ON customer_lifetime_value(shop_id);
CREATE INDEX IF NOT EXISTS idx_customer_ltv_customer ON customer_lifetime_value(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_ltv_category ON customer_lifetime_value(lifetime_value_category);
CREATE INDEX IF NOT EXISTS idx_customer_ltv_risk ON customer_lifetime_value(predicted_churn_risk);
CREATE INDEX IF NOT EXISTS idx_churn_shop ON churn_predictions(shop_id);
CREATE INDEX IF NOT EXISTS idx_churn_customer ON churn_predictions(customer_id);
CREATE INDEX IF NOT EXISTS idx_churn_risk_level ON churn_predictions(risk_level);
CREATE INDEX IF NOT EXISTS idx_cohort_shop ON cohort_snapshots(shop_id);
CREATE INDEX IF NOT EXISTS idx_cohort_month ON cohort_snapshots(cohort_month);
CREATE INDEX IF NOT EXISTS idx_service_popularity_shop ON service_popularity_metrics(shop_id);
CREATE INDEX IF NOT EXISTS idx_service_popularity_service ON service_popularity_metrics(service_id);
CREATE INDEX IF NOT EXISTS idx_service_popularity_date ON service_popularity_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_demand_forecast_shop ON demand_forecasts(shop_id);
CREATE INDEX IF NOT EXISTS idx_demand_forecast_date ON demand_forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_demand_forecast_hour ON demand_forecasts(day_of_week, hour_of_day);
CREATE INDEX IF NOT EXISTS idx_customer_segments_shop ON customer_segments(shop_id);
CREATE INDEX IF NOT EXISTS idx_customer_segments_customer ON customer_segments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_segments_type ON customer_segments(segment_type);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_shop ON analytics_cache(shop_id);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);
