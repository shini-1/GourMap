-- Check Admin Access and Fix Issues

-- Step 1: Check what admin users exist
SELECT
    a.uid,
    a.email,
    a.first_name,
    a.last_name,
    a.is_active,
    a.admin_level,
    a.created_at,
    u.email_confirmed_at IS NOT NULL as email_confirmed,
    u.last_sign_in_at
FROM admins a
LEFT JOIN auth.users u ON a.uid = u.id
ORDER BY a.created_at DESC;

-- Step 2: Check what users exist in auth.users
SELECT
    id,
    email,
    email_confirmed_at IS NOT NULL as email_confirmed,
    last_sign_in_at,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Step 3: Create admin user if none exists
-- Replace 'admin@gourmap.com' with your admin email
DO $$
DECLARE
    admin_uid UUID;
    admin_email TEXT := 'admin@gourmap.com'; -- CHANGE THIS TO YOUR ADMIN EMAIL
BEGIN
    -- Check if user exists in auth.users
    SELECT id INTO admin_uid FROM auth.users WHERE email = admin_email;

    -- If user doesn't exist, create it
    IF admin_uid IS NULL THEN
        RAISE NOTICE 'User % does not exist. Please create this user first via Supabase Auth Dashboard.', admin_email;
        RETURN;
    END IF;

    -- Confirm email if not confirmed
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = admin_uid;

    -- Set password (change 'Admin123!' to your desired password)
    UPDATE auth.users
    SET encrypted_password = crypt('Admin123!', gen_salt('bf'))
    WHERE id = admin_uid;

    -- Insert or update admin record
    INSERT INTO admins (uid, email, first_name, last_name, admin_level, is_active)
    VALUES (admin_uid, admin_email, 'Admin', 'User', 'super_admin', true)
    ON CONFLICT (uid) DO UPDATE
    SET is_active = true,
        admin_level = 'super_admin',
        email = admin_email;

    RAISE NOTICE 'Admin user % setup complete!', admin_email;
END $$;

-- Step 4: Verify admin permissions work
-- Test query that should work for admin
SELECT COUNT(*) as restaurant_count FROM restaurants LIMIT 1;

-- Step 5: Check RLS policies are applied correctly
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('restaurants', 'restaurant_submissions', 'business_owners', 'admins')
ORDER BY tablename;

-- Step 6: Check current policies
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
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
