@echo off
echo =======================================================
echo FIX ADMIN ACCESS - Diagnose and Repair
echo =======================================================
echo.
echo This script will help diagnose and fix admin access issues.
echo.
echo IMPORTANT: Before running, edit FIX_ADMIN_ACCESS.sql and change:
echo 'admin@gourmap.com' to your actual admin email address!
echo.
echo Supabase SQL Editor URL:
echo https://supabase.com/dashboard/project/dvkpflctotjavgrvbgay/sql
echo.
echo =======================================================
echo SQL SCRIPT START
echo =======================================================
echo.

type "FIX_ADMIN_ACCESS.sql"

echo.
echo =======================================================
echo SQL SCRIPT END
echo =======================================================
echo.
echo Instructions:
echo 1. Edit FIX_ADMIN_ACCESS.sql - change the admin email to YOUR admin email
echo 2. Copy all the SQL between the START and END markers
echo 3. Go to the Supabase SQL Editor URL above
echo 4. Paste and run the SQL script
echo 5. Try logging in as admin again
echo.
echo This will check and fix admin user setup and permissions!
echo.
pause
