-- Minimal RLS Policy Fix - Only for existing tables
-- Check which tables exist first, then apply policies

-- Step 1: Check existing tables
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Step 2: Enable RLS only on tables that exist
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Check and enable RLS for restaurants
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'restaurants'
    ) INTO table_exists;

    IF table_exists THEN
        EXECUTE 'ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY';
        RAISE NOTICE 'Enabled RLS on restaurants table';
    ELSE
        RAISE NOTICE 'restaurants table does not exist, skipping';
    END IF;

    -- Check and enable RLS for restaurant_submissions
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'restaurant_submissions'
    ) INTO table_exists;

    IF table_exists THEN
        EXECUTE 'ALTER TABLE restaurant_submissions ENABLE ROW LEVEL SECURITY';
        RAISE NOTICE 'Enabled RLS on restaurant_submissions table';
    ELSE
        RAISE NOTICE 'restaurant_submissions table does not exist, skipping';
    END IF;

    -- Check and enable RLS for business_owners
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'business_owners'
    ) INTO table_exists;

    IF table_exists THEN
        EXECUTE 'ALTER TABLE business_owners ENABLE ROW LEVEL SECURITY';
        RAISE NOTICE 'Enabled RLS on business_owners table';
    ELSE
        RAISE NOTICE 'business_owners table does not exist, skipping';
    END IF;

    -- Check and enable RLS for admins
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'admins'
    ) INTO table_exists;

    IF table_exists THEN
        EXECUTE 'ALTER TABLE admins ENABLE ROW LEVEL SECURITY';
        RAISE NOTICE 'Enabled RLS on admins table';
    ELSE
        RAISE NOTICE 'admins table does not exist, skipping';
    END IF;
END $$;

-- Step 3: Drop existing policies for tables that exist
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Drop policies for restaurants if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'restaurants'
    ) INTO table_exists;

    IF table_exists THEN
        EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated users to read restaurants" ON restaurants';
        EXECUTE 'DROP POLICY IF EXISTS "Allow service role to manage restaurants" ON restaurants';
        EXECUTE 'DROP POLICY IF EXISTS "Allow admins to manage restaurants" ON restaurants';
        RAISE NOTICE 'Dropped existing policies for restaurants';
    END IF;

    -- Drop policies for restaurant_submissions if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'restaurant_submissions'
    ) INTO table_exists;

    IF table_exists THEN
        EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated users to read restaurant_submissions" ON restaurant_submissions';
        EXECUTE 'DROP POLICY IF EXISTS "Allow service role to manage restaurant_submissions" ON restaurant_submissions';
        EXECUTE 'DROP POLICY IF EXISTS "Allow admins to manage restaurant_submissions" ON restaurant_submissions';
        RAISE NOTICE 'Dropped existing policies for restaurant_submissions';
    END IF;

    -- Drop policies for business_owners if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'business_owners'
    ) INTO table_exists;

    IF table_exists THEN
        EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated users to read business_owners" ON business_owners';
        EXECUTE 'DROP POLICY IF EXISTS "Allow service role to manage business_owners" ON business_owners';
        EXECUTE 'DROP POLICY IF EXISTS "Allow admins to manage business_owners" ON business_owners';
        RAISE NOTICE 'Dropped existing policies for business_owners';
    END IF;

    -- Drop policies for admins if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'admins'
    ) INTO table_exists;

    IF table_exists THEN
        EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated users to read admins" ON admins';
        EXECUTE 'DROP POLICY IF EXISTS "Allow service role to manage admins" ON admins';
        RAISE NOTICE 'Dropped existing policies for admins';
    END IF;
END $$;

-- Step 4: Create policies only for existing tables
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Create policies for restaurants if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'restaurants'
    ) INTO table_exists;

    IF table_exists THEN
        EXECUTE 'CREATE POLICY "Public can read approved restaurants" ON restaurants FOR SELECT TO authenticated, anon USING (true)';
        EXECUTE 'CREATE POLICY "Service role can manage restaurants" ON restaurants FOR ALL TO service_role USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "Admins can manage restaurants" ON restaurants FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.uid = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.uid = auth.uid()))';
        RAISE NOTICE 'Created policies for restaurants';
    END IF;

    -- Create policies for restaurant_submissions if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'restaurant_submissions'
    ) INTO table_exists;

    IF table_exists THEN
        EXECUTE 'CREATE POLICY "Public can read restaurant_submissions" ON restaurant_submissions FOR SELECT TO authenticated, anon USING (true)';
        EXECUTE 'CREATE POLICY "Service role can manage restaurant_submissions" ON restaurant_submissions FOR ALL TO service_role USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "Admins can manage restaurant_submissions" ON restaurant_submissions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.uid = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.uid = auth.uid()))';
        EXECUTE 'CREATE POLICY "Business owners can create submissions" ON restaurant_submissions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM business_owners WHERE business_owners.uid = auth.uid() AND business_owners.is_verified = true))';
        RAISE NOTICE 'Created policies for restaurant_submissions';
    END IF;

    -- Create policies for business_owners if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'business_owners'
    ) INTO table_exists;

    IF table_exists THEN
        EXECUTE 'CREATE POLICY "Service role can manage business_owners" ON business_owners FOR ALL TO service_role USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "Admins can manage business_owners" ON business_owners FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.uid = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.uid = auth.uid()))';
        EXECUTE 'CREATE POLICY "Business owners can manage their own profiles" ON business_owners FOR ALL TO authenticated USING (uid = auth.uid()) WITH CHECK (uid = auth.uid())';
        RAISE NOTICE 'Created policies for business_owners';
    END IF;

    -- Create policies for admins if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'admins'
    ) INTO table_exists;

    IF table_exists THEN
        EXECUTE 'CREATE POLICY "Service role can manage admins" ON admins FOR ALL TO service_role USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "Admins can read admins" ON admins FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.uid = auth.uid()))';
        RAISE NOTICE 'Created policies for admins';
    END IF;
END $$;

-- Step 5: Grant permissions for existing tables
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Grant permissions for restaurants if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'restaurants'
    ) INTO table_exists;

    IF table_exists THEN
        EXECUTE 'GRANT SELECT ON restaurants TO authenticated';
        EXECUTE 'GRANT ALL ON restaurants TO service_role';
        RAISE NOTICE 'Granted permissions for restaurants';
    END IF;

    -- Grant permissions for restaurant_submissions if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'restaurant_submissions'
    ) INTO table_exists;

    IF table_exists THEN
        EXECUTE 'GRANT SELECT ON restaurant_submissions TO authenticated';
        EXECUTE 'GRANT ALL ON restaurant_submissions TO service_role';
        RAISE NOTICE 'Granted permissions for restaurant_submissions';
    END IF;

    -- Grant permissions for business_owners if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'business_owners'
    ) INTO table_exists;

    IF table_exists THEN
        EXECUTE 'GRANT SELECT ON business_owners TO authenticated';
        EXECUTE 'GRANT ALL ON business_owners TO service_role';
        RAISE NOTICE 'Granted permissions for business_owners';
    END IF;

    -- Grant permissions for admins if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'admins'
    ) INTO table_exists;

    IF table_exists THEN
        EXECUTE 'GRANT SELECT ON admins TO authenticated';
        EXECUTE 'GRANT ALL ON admins TO service_role';
        RAISE NOTICE 'Granted permissions for admins';
    END IF;
END $$;

-- Step 6: Verify the setup
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('restaurants', 'restaurant_submissions', 'business_owners', 'admins')
ORDER BY tablename;
