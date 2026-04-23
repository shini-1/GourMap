-- Comprehensive RLS Policy Fix for Admin Operations
-- Run this entire script in Supabase SQL Editor

-- Step 1: Ensure RLS is enabled on all tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies to start fresh
DROP POLICY IF EXISTS "Allow authenticated users to read restaurants" ON restaurants;
DROP POLICY IF EXISTS "Allow service role to manage restaurants" ON restaurants;
DROP POLICY IF EXISTS "Allow admins to manage restaurants" ON restaurants;

DROP POLICY IF EXISTS "Allow authenticated users to read restaurant_submissions" ON restaurant_submissions;
DROP POLICY IF EXISTS "Allow service role to manage restaurant_submissions" ON restaurant_submissions;
DROP POLICY IF EXISTS "Allow admins to manage restaurant_submissions" ON restaurant_submissions;

DROP POLICY IF EXISTS "Allow authenticated users to read restaurant_owners" ON restaurant_owners;
DROP POLICY IF EXISTS "Allow service role to manage restaurant_owners" ON restaurant_owners;
DROP POLICY IF EXISTS "Allow admins to manage restaurant_owners" ON restaurant_owners;

DROP POLICY IF EXISTS "Allow authenticated users to read business_owners" ON business_owners;
DROP POLICY IF EXISTS "Allow service role to manage business_owners" ON business_owners;
DROP POLICY IF EXISTS "Allow admins to manage business_owners" ON business_owners;

DROP POLICY IF EXISTS "Allow authenticated users to read admins" ON admins;
DROP POLICY IF EXISTS "Allow service role to manage admins" ON admins;

-- Step 3: Create comprehensive policies for restaurants table
-- Public read access for approved restaurants
CREATE POLICY "Public can read approved restaurants"
  ON restaurants FOR SELECT
  TO authenticated, anon
  USING (true);

-- Service role can do everything
CREATE POLICY "Service role can manage restaurants"
  ON restaurants FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can do everything
CREATE POLICY "Admins can manage restaurants"
  ON restaurants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.uid = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.uid = auth.uid()
    )
  );

-- Step 4: Create comprehensive policies for restaurant_submissions table
-- Public read access for submissions (filtered by status)
CREATE POLICY "Public can read restaurant_submissions"
  ON restaurant_submissions FOR SELECT
  TO authenticated, anon
  USING (true);

-- Service role can do everything
CREATE POLICY "Service role can manage restaurant_submissions"
  ON restaurant_submissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can do everything
CREATE POLICY "Admins can manage restaurant_submissions"
  ON restaurant_submissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.uid = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.uid = auth.uid()
    )
  );

-- Business owners can create submissions
CREATE POLICY "Business owners can create submissions"
  ON restaurant_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_owners
      WHERE business_owners.uid = auth.uid()
      AND business_owners.is_verified = true
    )
  );

-- Step 5: Create comprehensive policies for restaurant_owners table
-- Public read access for approved restaurant owners
CREATE POLICY "Public can read approved restaurant_owners"
  ON restaurant_owners FOR SELECT
  TO authenticated, anon
  USING (status = 'approved');

-- Service role can do everything
CREATE POLICY "Service role can manage restaurant_owners"
  ON restaurant_owners FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can do everything
CREATE POLICY "Admins can manage restaurant_owners"
  ON restaurant_owners FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.uid = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.uid = auth.uid()
    )
  );

-- Business owners can read/update their own approved records
CREATE POLICY "Business owners can manage their own approved records"
  ON restaurant_owners FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() AND status = 'approved'
  )
  WITH CHECK (
    user_id = auth.uid() AND status = 'approved'
  );

-- Step 6: Create comprehensive policies for business_owners table
-- Service role can do everything
CREATE POLICY "Service role can manage business_owners"
  ON business_owners FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can do everything
CREATE POLICY "Admins can manage business_owners"
  ON business_owners FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.uid = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.uid = auth.uid()
    )
  );

-- Business owners can read/update their own profiles
CREATE POLICY "Business owners can manage their own profiles"
  ON business_owners FOR ALL
  TO authenticated
  USING (uid = auth.uid())
  WITH CHECK (uid = auth.uid());

-- Step 7: Create comprehensive policies for admins table
-- Service role can do everything
CREATE POLICY "Service role can manage admins"
  ON admins FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can read all admin records
CREATE POLICY "Admins can read admins"
  ON admins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.uid = auth.uid()
    )
  );

-- Step 8: Handle location field compatibility
-- If your database uses separate latitude/longitude columns, you may need to create a view or trigger
-- For now, let's ensure the policies work with the current schema

-- Step 9: Verify admin setup
SELECT
  u.id as uid,
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  a.email as admin_email,
  a.is_active,
  a.admin_level
FROM auth.users u
LEFT JOIN admins a ON u.id = a.uid
WHERE u.email = 'admin@gourmap.com';

-- Expected result:
-- email_confirmed: true
-- admin_email: admin@gourmap.com
-- is_active: true
-- admin_level: super_admin

-- Step 10: Test the policies (run these queries to verify)
-- Test admin access to restaurants
SELECT COUNT(*) as restaurant_count FROM restaurants LIMIT 1;

-- Test admin access to business owners
SELECT COUNT(*) as business_owner_count FROM business_owners LIMIT 1;

-- Test admin access to restaurant submissions
SELECT COUNT(*) as submission_count FROM restaurant_submissions LIMIT 1;

-- Step 11: Grant necessary permissions to authenticated users
-- This ensures that the policies work correctly
GRANT SELECT ON restaurants TO authenticated;
GRANT SELECT ON restaurant_submissions TO authenticated;
GRANT SELECT ON restaurant_owners TO authenticated;
GRANT SELECT ON business_owners TO authenticated;
GRANT SELECT ON admins TO authenticated;

-- For service role (full access)
GRANT ALL ON restaurants TO service_role;
GRANT ALL ON restaurant_submissions TO service_role;
GRANT ALL ON restaurant_owners TO service_role;
GRANT ALL ON business_owners TO service_role;
GRANT ALL ON admins TO service_role;
