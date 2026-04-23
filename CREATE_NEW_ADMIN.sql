-- Alternative: Create a completely new admin account

-- This creates a fresh admin account with a new email/password
-- Change the email and password below

DO $$
DECLARE
    new_admin_email TEXT := 'new-admin@gourmap.com'; -- CHANGE THIS!
    new_admin_password TEXT := 'AdminPass123!'; -- CHANGE THIS!
    user_uid UUID;
BEGIN
    -- Create new user in auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        user_metadata
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        new_admin_email,
        crypt(new_admin_password, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '',
        '',
        '',
        '{}'::jsonb
    ) RETURNING id INTO user_uid;

    -- Add to admins table
    INSERT INTO admins (uid, email, first_name, last_name, admin_level, is_active, created_at)
    VALUES (
        user_uid,
        new_admin_email,
        'Admin',
        'User',
        'super_admin',
        true,
        NOW()
    );

    RAISE NOTICE 'New admin account created! Email: %, Password: %', new_admin_email, new_admin_password;
END $$;

-- Verify the new admin account
SELECT 'New admin account:' as info;
SELECT uid, email, is_active, admin_level FROM admins WHERE email = 'new-admin@gourmap.com';
