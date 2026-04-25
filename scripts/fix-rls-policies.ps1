# RLS Policy Fix Script for Admin Operations
# Run this script to apply comprehensive RLS policy fixes

param()

Write-Host "🔒 Applying RLS Policy Fixes..." -ForegroundColor Cyan
Write-Host ""

# Check if the SQL file exists
$sqlFile = Join-Path $PSScriptRoot "FIX_RLS_POLICIES.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Error: FIX_RLS_POLICIES.sql not found in the current directory" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Found RLS policy fix file: $sqlFile" -ForegroundColor Gray
Write-Host ""

Write-Host "📋 This script will fix the following RLS policy issues:" -ForegroundColor Yellow
Write-Host "  • Admin access to restaurants table" -ForegroundColor White
Write-Host "  • Admin access to restaurant_submissions table" -ForegroundColor White
Write-Host "  • Admin access to restaurant_owners table" -ForegroundColor White
Write-Host "  • Admin access to business_owners table" -ForegroundColor White
Write-Host "  • Location field handling (latitude/longitude)" -ForegroundColor White
Write-Host ""

Write-Host "⚠️  IMPORTANT: Before running this script:" -ForegroundColor Red
Write-Host "  1. Make sure you're logged into Supabase CLI" -ForegroundColor White
Write-Host "  2. Ensure you have admin access to the database" -ForegroundColor White
Write-Host "  3. Back up your database if needed" -ForegroundColor White
Write-Host ""

$confirmation = Read-Host "Do you want to proceed? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ Operation cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🚀 Executing RLS policy fixes..." -ForegroundColor Cyan
Write-Host ""

try {
    # Read the SQL file content
    $sqlContent = Get-Content $sqlFile -Raw -Encoding UTF8

    # Execute the SQL using Supabase CLI
    # Note: Supabase CLI doesn't have a direct SQL execution command,
    # so we'll provide instructions for manual execution
    Write-Host "📝 Please copy and paste the following SQL into your Supabase SQL Editor:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "══════════════════════════════════════════════════════════════" -ForegroundColor Gray
    Write-Host $sqlContent
    Write-Host "══════════════════════════════════════════════════════════════" -ForegroundColor Gray
    Write-Host ""

    Write-Host "🌐 Supabase SQL Editor URL:" -ForegroundColor Cyan
    Write-Host "https://supabase.com/dashboard/project/dvkpflctotjavgrvbgay/sql" -ForegroundColor White
    Write-Host ""

    Write-Host "📋 After running the SQL script, test the following:" -ForegroundColor Green
    Write-Host "  1. Login as admin" -ForegroundColor White
    Write-Host "  2. Try editing a restaurant (location should work)" -ForegroundColor White
    Write-Host "  3. Try adding a new restaurant" -ForegroundColor White
    Write-Host "  4. Try managing business owners" -ForegroundColor White
    Write-Host ""

    Write-Host "✅ RLS policy fix script prepared successfully!" -ForegroundColor Green
    Write-Host "📖 See FIX_RLS_POLICIES.sql for the complete SQL script" -ForegroundColor Gray

} catch {
    Write-Host "❌ Error preparing RLS policy fixes: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
