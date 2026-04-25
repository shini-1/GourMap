@echo off
echo =======================================================
echo QUICK ADMIN FIX - Add Your User to Admins Table
echo =======================================================
echo.
echo This fixes the "Access denied: Not an admin account" error.
echo.
echo IMPORTANT: You need to edit the email in the SQL script first!
echo Change 'your-admin-email@example.com' to your actual login email.
echo.
echo Supabase SQL Editor URL:
echo https://supabase.com/dashboard/project/dvkpflctotjavgrvbgay/sql
echo.
echo =======================================================
echo SQL SCRIPT START
echo =======================================================
echo.

type "QUICK_ADMIN_FIX.sql"

echo.
echo =======================================================
echo SQL SCRIPT END
echo =======================================================
echo.
echo Instructions:
echo 1. Edit QUICK_ADMIN_FIX.sql - change the email to YOUR login email
echo 2. Copy all the SQL between the START and END markers
echo 3. Go to the Supabase SQL Editor URL above
echo 4. Paste and run the SQL script
echo 5. Try logging in as admin again
echo.
echo This will add your user account to the admins table!
echo.
pause
