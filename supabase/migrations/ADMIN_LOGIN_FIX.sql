-- Complete Admin Login Fix
-- Run this entire script in Supabase SQL Editor

-- Step 1: Drop and recreate admins table with proper structure
DROP TABLE IF EXISTS admins CASCADE;

CREATE TABLE admins (
  uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  admin_level TEXT DEFAULT 'super_admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Enable RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Step 3: Create permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to read admins" ON admins;
DROP POLICY IF EXISTS "Allow service role to manage admins" ON admins;

CREATE POLICY "Allow authenticated users to read admins"
  ON admins FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow service role to manage admins"
  ON admins FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Step 4: Create or update admin user
DO $$
DECLARE
  admin_uid UUID;
BEGIN
  -- Check if user exists
  SELECT id INTO admin_uid FROM auth.users WHERE email = 'admin@gourmap.com';
  
  -- If user doesn't exist, create it
  IF admin_uid IS NULL THEN
    -- Note: You need to create the user via Dashboard first
    RAISE NOTICE 'User admin@gourmap.com does not exist. Create it via Dashboard first.';
  ELSE
    -- Confirm email
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = admin_uid;
    
    -- Reset password
    UPDATE auth.users
    SET encrypted_password = crypt('Admin123!', gen_salt('bf'))
    WHERE id = admin_uid;
    
    -- Insert or update admin record
    INSERT INTO admins (uid, email, first_name, last_name, admin_level, is_active)
    VALUES (admin_uid, 'admin@gourmap.com', 'Admin', 'User', 'super_admin', true)
    ON CONFLICT (uid) DO UPDATE 
    SET is_active = true,
        admin_level = 'super_admin';
    
    RAISE NOTICE 'Admin account setup complete!';
  END IF;
END $$;

-- Step 5: Verify the setup
SELECT 
  u.id as uid,
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  u.encrypted_password IS NOT NULL as has_password,
  a.email as admin_email,
  a.is_active,
  a.admin_level
FROM auth.users u
LEFT JOIN admins a ON u.id = a.uid
WHERE u.email = 'admin@gourmap.com';

-- Expected result:
-- email_confirmed: true
-- has_password: true
-- admin_email: admin@gourmap.com
-- is_active: true
-- admin_level: super_admin
