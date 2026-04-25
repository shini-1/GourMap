-- ============================================
-- COMPLETE FAVORITES TABLE INITIALIZATION
-- Run this in Supabase SQL Editor to fix crashes
-- ============================================

-- Step 1: Drop existing table if there are issues (CAREFUL!)
-- Uncomment the next line ONLY if you want to start fresh
-- DROP TABLE IF EXISTS restaurant_device_favorites CASCADE;

-- Step 2: Create the table with all constraints
CREATE TABLE IF NOT EXISTS restaurant_device_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one favorite per device per restaurant
  CONSTRAINT unique_device_restaurant_favorite UNIQUE (restaurant_id, device_id)
);

-- Step 3: Add foreign key constraint (with CASCADE delete)
-- This will fail if restaurants table doesn't exist, but that's okay
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'restaurant_device_favorites_restaurant_id_fkey'
  ) THEN
    ALTER TABLE restaurant_device_favorites 
    ADD CONSTRAINT restaurant_device_favorites_restaurant_id_fkey 
    FOREIGN KEY (restaurant_id) 
    REFERENCES restaurants(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_favorites_restaurant 
  ON restaurant_device_favorites(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_device_favorites_device 
  ON restaurant_device_favorites(device_id);

CREATE INDEX IF NOT EXISTS idx_device_favorites_created 
  ON restaurant_device_favorites(created_at DESC);

-- Step 5: Enable Row Level Security
ALTER TABLE restaurant_device_favorites ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read device favorites" ON restaurant_device_favorites;
DROP POLICY IF EXISTS "Anyone can insert device favorites" ON restaurant_device_favorites;
DROP POLICY IF EXISTS "Anyone can delete their device favorites" ON restaurant_device_favorites;
DROP POLICY IF EXISTS "Anyone can update device favorites" ON restaurant_device_favorites;

-- Step 7: Create RLS policies
CREATE POLICY "Anyone can read device favorites"
  ON restaurant_device_favorites
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert device favorites"
  ON restaurant_device_favorites
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete their device favorites"
  ON restaurant_device_favorites
  FOR DELETE
  USING (true);

CREATE POLICY "Anyone can update device favorites"
  ON restaurant_device_favorites
  FOR UPDATE
  USING (true);

-- Step 8: Grant permissions to anon and authenticated users
GRANT SELECT, INSERT, DELETE, UPDATE ON restaurant_device_favorites TO anon;
GRANT SELECT, INSERT, DELETE, UPDATE ON restaurant_device_favorites TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 9: Add helpful comments
COMMENT ON TABLE restaurant_device_favorites IS 'Stores restaurant favorites by device ID (no authentication required)';
COMMENT ON COLUMN restaurant_device_favorites.device_id IS 'Unique device identifier generated from device info';
COMMENT ON COLUMN restaurant_device_favorites.restaurant_id IS 'Reference to restaurants table';

-- Step 10: Insert a test favorite (optional - only if you have restaurants)
-- This will help verify the table is working
-- Replace 'YOUR_RESTAURANT_ID' with an actual restaurant ID from your database
-- Uncomment the lines below to add a test entry:

/*
DO $$ 
DECLARE
  test_restaurant_id UUID;
BEGIN
  -- Get the first restaurant ID from your database
  SELECT id INTO test_restaurant_id FROM restaurants LIMIT 1;
  
  -- Insert a test favorite if we found a restaurant
  IF test_restaurant_id IS NOT NULL THEN
    INSERT INTO restaurant_device_favorites (restaurant_id, device_id, created_at)
    VALUES (test_restaurant_id, 'test_device_12345', NOW())
    ON CONFLICT (restaurant_id, device_id) DO NOTHING;
    
    RAISE NOTICE 'Test favorite inserted successfully for restaurant: %', test_restaurant_id;
  ELSE
    RAISE NOTICE 'No restaurants found - skipping test favorite insertion';
  END IF;
END $$;
*/

-- Step 11: Verify the table was created
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'restaurant_device_favorites'
ORDER BY ordinal_position;

-- Step 12: Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'restaurant_device_favorites';

-- Step 13: Verify indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'restaurant_device_favorites';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ Favorites table initialization complete!';
  RAISE NOTICE '✅ Table created with proper constraints';
  RAISE NOTICE '✅ RLS policies configured';
  RAISE NOTICE '✅ Permissions granted';
  RAISE NOTICE '✅ Indexes created';
  RAISE NOTICE '';
  RAISE NOTICE 'Your app should now work without crashing!';
END $$;
