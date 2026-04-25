-- FIX: Add user to admin table

-- First, check what user you're trying to login with
SELECT 'Current auth users:' as info;
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Replace 'your-admin-email@example.com' with your actual admin email
-- This will add your current user to the admins table

DO $$
DECLARE
    your_email TEXT := 'your-admin-email@example.com'; -- CHANGE THIS!
    user_uid UUID;
BEGIN
    -- Get the user ID for your email
    SELECT id INTO user_uid FROM auth.users WHERE email = your_email;

    IF user_uid IS NULL THEN
        RAISE EXCEPTION 'User with email % not found. Please check the email and try again.', your_email;
    END IF;

    -- Check if already an admin
    IF EXISTS (SELECT 1 FROM admins WHERE uid = user_uid) THEN
        RAISE NOTICE 'User % is already an admin!', your_email;
        RETURN;
    END IF;

    -- Add to admins table
    INSERT INTO admins (uid, email, first_name, last_name, admin_level, is_active, created_at)
    VALUES (
        user_uid,
        your_email,
        'Admin',
        'User',
        'super_admin',
        true,
        NOW()
    );

    RAISE NOTICE 'Successfully added % as admin!', your_email;
END $$;

-- Verify the fix
SELECT 'Admins table after fix:' as info;
SELECT uid, email, is_active, admin_level FROM admins ORDER BY created_at DESC;
