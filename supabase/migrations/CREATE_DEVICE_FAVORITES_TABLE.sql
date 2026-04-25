-- Create restaurant_device_favorites table for device-based favorites
-- This allows users to favorite restaurants without requiring authentication
-- Similar to how device ratings work

CREATE TABLE IF NOT EXISTS restaurant_device_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one favorite per device per restaurant
  CONSTRAINT unique_device_restaurant_favorite UNIQUE (restaurant_id, device_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_device_favorites_restaurant 
  ON restaurant_device_favorites(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_device_favorites_device 
  ON restaurant_device_favorites(device_id);

-- Enable Row Level Security
ALTER TABLE restaurant_device_favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read favorites
CREATE POLICY "Anyone can read device favorites"
  ON restaurant_device_favorites
  FOR SELECT
  USING (true);

-- Policy: Anyone can insert favorites
CREATE POLICY "Anyone can insert device favorites"
  ON restaurant_device_favorites
  FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can delete their own favorites (by device_id)
CREATE POLICY "Anyone can delete their device favorites"
  ON restaurant_device_favorites
  FOR DELETE
  USING (true);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON restaurant_device_favorites TO anon;
GRANT SELECT, INSERT, DELETE ON restaurant_device_favorites TO authenticated;

COMMENT ON TABLE restaurant_device_favorites IS 'Stores restaurant favorites by device ID (no authentication required)';
COMMENT ON COLUMN restaurant_device_favorites.device_id IS 'Unique device identifier generated from device info';
