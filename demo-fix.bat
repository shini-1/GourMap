@echo off
echo =======================================================
echo COMPLETE DEMO FIX - Fixed for Your Tables
echo =======================================================
echo.
echo WARNING: This DISABLES all security for demo purposes!
echo NEVER use this in production!
echo.
echo This will:
echo - Disable RLS on YOUR actual tables (admins, business_owners, etc.)
echo - Create/update admin@gourmap.com / Admin123!
echo - Add demo data using latitude/longitude columns
echo - Grant full permissions to bypass all restrictions
echo - Fix location column errors in restaurant editing
echo.
echo Supabase SQL Editor URL:
echo https://supabase.com/dashboard/project/dvkpflctotjavgrvbgay/sql
echo.
echo =======================================================
echo SQL SCRIPT START
echo =======================================================
echo.

type "COMPLETE_DEMO_FIX.sql"

echo.
echo =======================================================
echo SQL SCRIPT END
echo =======================================================
echo.
echo Instructions:
echo 1. Copy all the SQL between the START and END markers
echo 2. Go to the Supabase SQL Editor URL above
echo 3. Paste and run the SQL script
echo 4. Login with: admin@gourmap.com / Admin123!
echo.
echo This fixes the "location column" error and uses your actual tables!
echo.
pause
