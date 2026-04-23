-- DEMO APP FIX: Disable RLS for all tables (since this is just a demo)

-- This disables Row Level Security for demo purposes
-- WARNING: This is NOT secure for production!

-- Disable RLS on all tables
ALTER TABLE IF EXISTS restaurants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS restaurant_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS restaurant_owners DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS business_owners DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pending_restaurants DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to authenticated users (demo only!)
GRANT ALL ON restaurants TO authenticated;
GRANT ALL ON restaurant_submissions TO authenticated;
GRANT ALL ON restaurant_owners TO authenticated;
GRANT ALL ON business_owners TO authenticated;
GRANT ALL ON admins TO authenticated;
GRANT ALL ON menu_items TO authenticated;
GRANT ALL ON pending_restaurants TO authenticated;

-- Also grant to anon for public access (demo only!)
GRANT SELECT ON restaurants TO anon;
GRANT SELECT ON restaurant_submissions TO anon;
GRANT SELECT ON restaurant_owners TO anon;
GRANT SELECT ON business_owners TO anon;
GRANT SELECT ON admins TO anon;
GRANT SELECT ON menu_items TO anon;
GRANT SELECT ON pending_restaurants TO anon;

-- Grant service role full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Verify RLS is disabled
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
