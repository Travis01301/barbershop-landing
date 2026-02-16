-- Enhanced Reviews & Feedback System
-- Adds Google Reviews integration, sentiment analysis, response templates, and analytics

-- Google Reviews Sync table
CREATE TABLE IF NOT EXISTS google_reviews_sync (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  google_review_id VARCHAR(255) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  google_profile_url TEXT,
  google_review_url TEXT,
  synced_at TIMESTAMP NOT NULL,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_google_review_per_shop UNIQUE(shop_id, google_review_id)
);

CREATE INDEX idx_google_reviews_shop_id ON google_reviews_sync(shop_id);
CREATE INDEX idx_google_reviews_synced_at ON google_reviews_sync(synced_at DESC);

-- Review Responses table
CREATE TABLE IF NOT EXISTS review_responses (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  review_id INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
  google_review_id VARCHAR(255) REFERENCES google_reviews_sync(google_review_id) ON DELETE CASCADE,
  barber_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  response_type VARCHAR(50) DEFAULT 'custom', -- 'template' or 'custom'
  template_id INTEGER REFERENCES review_response_templates(id) ON DELETE SET NULL,
  posted_to_google BOOLEAN DEFAULT false,
  google_response_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_review_responses_shop_id ON review_responses(shop_id);
CREATE INDEX idx_review_responses_review_id ON review_responses(review_id);
CREATE INDEX idx_review_responses_barber_id ON review_responses(barber_id);

-- Review Response Templates
CREATE TABLE IF NOT EXISTS review_response_templates (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  template_text TEXT NOT NULL,
  for_rating INTEGER, -- NULL for all ratings, 1-5 for specific rating
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_template_per_shop UNIQUE(shop_id, name)
);

CREATE INDEX idx_response_templates_shop_id ON review_response_templates(shop_id);

-- Review Sentiment Analysis table
CREATE TABLE IF NOT EXISTS review_sentiment (
  id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  sentiment_score DECIMAL(3,2), -- -1.0 to 1.0
  sentiment_label VARCHAR(50), -- 'positive', 'negative', 'neutral'
  positive_themes TEXT[], -- Array of positive themes
  negative_themes TEXT[], -- Array of negative themes
  analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sentiment_review_id ON review_sentiment(review_id);
CREATE INDEX idx_sentiment_shop_id ON review_sentiment(shop_id);
CREATE INDEX idx_sentiment_label ON review_sentiment(sentiment_label);

-- Review Analytics table
CREATE TABLE IF NOT EXISTS review_analytics (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  barber_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_reviews INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  review_count_1_star INTEGER DEFAULT 0,
  review_count_2_star INTEGER DEFAULT 0,
  review_count_3_star INTEGER DEFAULT 0,
  review_count_4_star INTEGER DEFAULT 0,
  review_count_5_star INTEGER DEFAULT 0,
  response_rate DECIMAL(5,2) DEFAULT 0, -- percentage
  sentiment_positive_count INTEGER DEFAULT 0,
  sentiment_negative_count INTEGER DEFAULT 0,
  sentiment_neutral_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_analytics UNIQUE(shop_id, barber_id, metric_date)
);

CREATE INDEX idx_analytics_shop_id ON review_analytics(shop_id);
CREATE INDEX idx_analytics_barber_id ON review_analytics(barber_id);
CREATE INDEX idx_analytics_metric_date ON review_analytics(metric_date DESC);

-- Review Request Log table (for tracking review requests sent via email/SMS)
CREATE TABLE IF NOT EXISTS review_requests (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  barber_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'in_app'
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  clicked_at TIMESTAMP,
  review_submitted_at TIMESTAMP,
  review_id INTEGER REFERENCES reviews(id) ON DELETE SET NULL
);

CREATE INDEX idx_review_requests_shop_id ON review_requests(shop_id);
CREATE INDEX idx_review_requests_customer_id ON review_requests(customer_id);
CREATE INDEX idx_review_requests_barber_id ON review_requests(barber_id);
CREATE INDEX idx_review_requests_appointment_id ON review_requests(appointment_id);

-- Add Google OAuth credentials column to shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS google_oauth_token TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS google_oauth_refresh_token TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS google_oauth_token_expires_at TIMESTAMP;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS google_business_profile_id VARCHAR(255);

-- Add review request settings to shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS request_reviews_enabled BOOLEAN DEFAULT true;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS request_reviews_delay_minutes INTEGER DEFAULT 120; -- Request review 2 hours after appointment

-- Update reviews table to add sentiment-related columns
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS sentiment_label VARCHAR(50);

-- Create triggers for review analytics updates
CREATE OR REPLACE FUNCTION update_review_analytics()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_sleep(0.1);
  INSERT INTO review_analytics (shop_id, barber_id, metric_date, total_reviews, average_rating, response_rate)
  SELECT 
    NEW.shop_id,
    NEW.barber_id,
    CURRENT_DATE,
    COUNT(*) as total_reviews,
    AVG(r.rating) as average_rating,
    (COUNT(CASE WHEN rr.id IS NOT NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100) as response_rate
  FROM reviews r
  LEFT JOIN review_responses rr ON r.id = rr.review_id
  WHERE r.shop_id = NEW.shop_id 
    AND r.barber_id = NEW.barber_id
    AND DATE(r.created_at) = CURRENT_DATE
  GROUP BY r.shop_id, r.barber_id
  ON CONFLICT (shop_id, barber_id, metric_date) DO UPDATE SET
    total_reviews = EXCLUDED.total_reviews,
    average_rating = EXCLUDED.average_rating,
    response_rate = EXCLUDED.response_rate,
    updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_review_analytics ON reviews;
CREATE TRIGGER trigger_review_analytics
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_review_analytics();

-- Function to update review sentiment
CREATE OR REPLACE FUNCTION update_review_sentiment()
RETURNS TRIGGER AS $$
BEGIN
  -- This will be called when sentiment is updated
  UPDATE review_analytics
  SET sentiment_positive_count = (SELECT COUNT(*) FROM review_sentiment WHERE shop_id = NEW.shop_id AND sentiment_label = 'positive' AND DATE(analyzed_at) = CURRENT_DATE),
      sentiment_negative_count = (SELECT COUNT(*) FROM review_sentiment WHERE shop_id = NEW.shop_id AND sentiment_label = 'negative' AND DATE(analyzed_at) = CURRENT_DATE),
      sentiment_neutral_count = (SELECT COUNT(*) FROM review_sentiment WHERE shop_id = NEW.shop_id AND sentiment_label = 'neutral' AND DATE(analyzed_at) = CURRENT_DATE),
      updated_at = CURRENT_TIMESTAMP
  WHERE shop_id = NEW.shop_id AND metric_date = CURRENT_DATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sentiment ON review_sentiment;
CREATE TRIGGER trigger_update_sentiment
  AFTER INSERT ON review_sentiment
  FOR EACH ROW
  EXECUTE FUNCTION update_review_sentiment();
