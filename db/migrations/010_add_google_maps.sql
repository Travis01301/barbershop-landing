-- Add Google Maps fields to shops table
ALTER TABLE shops ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS google_maps_place_id VARCHAR(255);

-- Create index for geocoding queries
CREATE INDEX IF NOT EXISTS idx_shops_coordinates ON shops(latitude, longitude);

-- Update existing shops with sample coordinates (can be updated via admin panel)
UPDATE shops 
SET 
  latitude = 40.7128,
  longitude = -74.0060
WHERE latitude IS NULL;
