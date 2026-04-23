# Simple RLS Policy Fix Script (Alternative)
# Run this if the main script has issues

Write-Host "🔒 RLS Policy Fix Helper" -ForegroundColor Cyan
Write-Host ""

# Check if the SQL file exists
$sqlFile = Join-Path $PSScriptRoot "FIX_RLS_POLICIES.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Error: FIX_RLS_POLICIES.sql not found in the current directory" -ForegroundColor Red
    Write-Host "Current directory: $PSScriptRoot" -ForegroundColor Yellow
    exit 1
}

Write-Host "📄 Found RLS policy fix file: $sqlFile" -ForegroundColor Green
Write-Host ""

Write-Host "📋 This will display the SQL commands to fix RLS policies" -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Continue? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ Cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "📝 Copy and paste this SQL into your Supabase SQL Editor:" -ForegroundColor Cyan
Write-Host "URL: https://supabase.com/dashboard/project/dvkpflctotjavgrvbgay/sql" -ForegroundColor White
Write-Host ""
Write-Host "══════════════════════════════════════════════════════════════" -ForegroundColor Gray

try {
    Get-Content $sqlFile -Raw -Encoding UTF8
} catch {
    Write-Host "❌ Error reading SQL file: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "══════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ SQL script displayed above!" -ForegroundColor Green
Write-Host "📖 Run it in Supabase SQL Editor to apply the fixes" -ForegroundColor Gray
