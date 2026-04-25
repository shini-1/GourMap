@echo off
echo =======================================================
echo Check Database Tables
echo =======================================================
echo.
echo This will show you what tables exist in your database.
echo Run this first to see what's available before applying RLS policies.
echo.
echo Supabase SQL Editor URL:
echo https://supabase.com/dashboard/project/dvkpflctotjavgrvbgay/sql
echo.
echo =======================================================
echo SQL QUERY
echo =======================================================
echo.

type "check-tables.sql"

echo.
echo =======================================================
echo END QUERY
echo =======================================================
echo.
echo Copy the SQL above and run it in Supabase SQL Editor to see your tables!
echo.
pause
