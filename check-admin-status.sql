-- Quick Admin Access Diagnostic

-- Check if you have any admin users
SELECT 'Admin Users:' as info;
SELECT
    COUNT(*) as admin_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_admins
FROM admins;

-- Check what users exist in auth
SELECT 'Auth Users:' as info;
SELECT
    COUNT(*) as total_users,
    COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_emails
FROM auth.users;

-- List all admin records
SELECT 'Admin Records:' as info;
SELECT
    uid,
    email,
    is_active,
    admin_level
FROM admins
ORDER BY created_at DESC;

-- Test admin permissions (should return 1 row if you have admin access)
SELECT 'Admin Permission Test:' as info;
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM admins
            WHERE admins.uid = auth.uid()
            AND is_active = true
        ) THEN 'You have admin access'
        ELSE 'You do NOT have admin access'
    END as admin_status;

-- Check RLS status
SELECT 'RLS Status:' as info;
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('restaurants', 'business_owners', 'admins')
ORDER BY tablename;
