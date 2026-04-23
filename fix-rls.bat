@echo off
echo =======================================================
echo SAFE RLS Policy Fix - Only for existing tables
echo =======================================================
echo.
echo This script will display the SAFE SQL commands to fix RLS policies.
echo It only applies policies to tables that actually exist in your database.
echo.
echo Supabase SQL Editor URL:
echo https://supabase.com/dashboard/project/dvkpflctotjavgrvbgay/sql
echo.
echo =======================================================
echo SQL SCRIPT START
echo =======================================================
echo.

type "FIX_RLS_POLICIES_SAFE.sql"

echo.
echo =======================================================
echo SQL SCRIPT END
echo =======================================================
echo.
echo Instructions:
echo 1. Copy all the SQL between the START and END markers
echo 2. Go to the Supabase SQL Editor URL above
echo 3. Paste and run the SQL script
echo 4. Test admin operations after running
echo.
echo This script is SAFE - it checks for table existence before applying policies!
echo.
pause
