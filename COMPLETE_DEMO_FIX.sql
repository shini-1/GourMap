-- COMPLETE DEMO FIX: Disable RLS + Create Demo Admin (Updated for actual tables)

-- WARNING: This disables security for demo purposes only!
-- NEVER use this in production!

-- Step 1: Disable RLS on existing tables only
ALTER TABLE IF EXISTS admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS business_owners DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS promos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS restaurant_device_ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS restaurant_ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS restaurant_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS restaurants DISABLE ROW LEVEL SECURITY;

-- Step 2: Grant permissions (demo only!)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Step 3: Create/update demo admin account with provided credentials
DO $$
DECLARE
    demo_email TEXT := 'admin@gourmap.com';
    demo_password TEXT := 'Admin123!';
    user_uid UUID;
BEGIN
    -- Check if demo admin already exists
    SELECT id INTO user_uid FROM auth.users WHERE email = demo_email;

    IF user_uid IS NULL THEN
        -- Create new demo admin user
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, created_at, updated_at,
            confirmation_token, recovery_token, email_change_token_new, user_metadata
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            demo_email,
            crypt(demo_password, gen_salt('bf')),
            NOW(), NOW(), NOW(),
            '', '', '', '{}'::jsonb
        ) RETURNING id INTO user_uid;

        RAISE NOTICE 'Created new demo admin user';
    ELSE
        -- Update existing user's password and confirm email
        UPDATE auth.users
        SET
            encrypted_password = crypt(demo_password, gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW())
        WHERE id = user_uid;

        RAISE NOTICE 'Updated existing demo admin user';
    END IF;

    -- Ensure user is in admins table with correct info
    INSERT INTO admins (uid, email, first_name, last_name, admin_level, is_active, created_at)
    VALUES (user_uid, demo_email, 'Admin', 'User', 'super_admin', true, NOW())
    ON CONFLICT (uid) DO UPDATE SET
        is_active = true,
        admin_level = 'super_admin',
        email = demo_email;

    RAISE NOTICE 'Demo admin account ready! Email: %, Password: %', demo_email, demo_password;
END $$;

-- Step 4: Create some demo data if tables are empty
DO $$
BEGIN
    -- Add demo restaurant if none exist
    IF NOT EXISTS (SELECT 1 FROM restaurants LIMIT 1) THEN
        INSERT INTO restaurants (name, latitude, longitude, category, description, price_range, created_at)
        VALUES (
            'Demo Restaurant',
            40.7128,
            -74.0060,
            'casual',
            'A demo restaurant for testing admin features',
            '₱₱',
            NOW()
        );
        RAISE NOTICE 'Added demo restaurant';
    END IF;

    -- Add demo business owner if none exist
    IF NOT EXISTS (SELECT 1 FROM business_owners LIMIT 1) THEN
        INSERT INTO business_owners (uid, email, first_name, last_name, role, is_verified, created_at)
        VALUES (
            gen_random_uuid(),
            'owner@demo.com',
            'Demo',
            'Owner',
            'business_owner',
            true,
            NOW()
        );
        RAISE NOTICE 'Added demo business owner';
    END IF;

    -- Add demo category if none exist
    IF NOT EXISTS (SELECT 1 FROM categories LIMIT 1) THEN
        INSERT INTO categories (name, emoji, color, created_at)
        VALUES
            ('Italian', '🍕', '#FF6B6B', NOW()),
            ('Cafe', '☕', '#4ECDC4', NOW()),
            ('Fast Food', '🍔', '#FFE66D', NOW());
        RAISE NOTICE 'Added demo categories';
    END IF;

    -- Add demo menu item if none exist and restaurants exist
    IF NOT EXISTS (SELECT 1 FROM menu_items LIMIT 1) AND EXISTS (SELECT 1 FROM restaurants LIMIT 1) THEN
        INSERT INTO menu_items (restaurant_id, name, description, price, category, is_available, created_at)
        SELECT
            r.id,
            'Demo Pizza',
            'A delicious demo pizza',
            15.99,
            'Main Course',
            true,
            NOW()
        FROM restaurants r
        LIMIT 1;
        RAISE NOTICE 'Added demo menu item';
    END IF;
END $$;

-- Step 5: Verify setup
SELECT 'RLS Status:' as check_type;
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('admins', 'business_owners', 'categories', 'menu_items', 'promos', 'restaurant_device_ratings', 'restaurant_ratings', 'restaurant_submissions', 'restaurants')
ORDER BY tablename;

SELECT 'Demo Admin:' as check_type;
SELECT uid, email, is_active, admin_level FROM admins WHERE email = 'admin@gourmap.com';

SELECT 'Demo Data Counts:' as check_type;
SELECT 'Restaurants: ' || COUNT(*) FROM restaurants
UNION ALL
SELECT 'Business Owners: ' || COUNT(*) FROM business_owners
UNION ALL
SELECT 'Categories: ' || COUNT(*) FROM categories
UNION ALL
SELECT 'Menu Items: ' || COUNT(*) FROM menu_items;
