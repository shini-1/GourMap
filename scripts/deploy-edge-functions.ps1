# Deploy Edge Functions to Supabase
# Run this script to deploy all required edge functions for business owner authentication

Write-Host "🚀 Deploying Edge Functions to Supabase..." -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is available
$supabaseCli = Get-Command npx -ErrorAction SilentlyContinue
if (-not $supabaseCli) {
    Write-Host "❌ Error: npx not found. Please install Node.js and npm." -ForegroundColor Red
    exit 1
}

# Navigate to project directory
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir

Write-Host "📂 Project directory: $projectDir" -ForegroundColor Gray
Write-Host ""

# Check if user is logged in to Supabase
Write-Host "🔐 Checking Supabase login status..." -ForegroundColor Yellow
$loginCheck = npx supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Not logged in to Supabase. Logging in..." -ForegroundColor Yellow
    npx supabase login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Login failed. Please try again." -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Logged in to Supabase" -ForegroundColor Green
Write-Host ""

# Link to project (if not already linked)
Write-Host "🔗 Linking to Supabase project..." -ForegroundColor Yellow
npx supabase link --project-ref dvkpflctotjavgrvbgay
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Project already linked or link failed. Continuing..." -ForegroundColor Yellow
}
Write-Host ""

# Deploy create-owner-profile function
Write-Host "📦 Deploying create-owner-profile function..." -ForegroundColor Cyan
npx supabase functions deploy create-owner-profile
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy create-owner-profile" -ForegroundColor Red
    exit 1
}
Write-Host "✅ create-owner-profile deployed successfully" -ForegroundColor Green
Write-Host ""

# Deploy admin-confirm-owner function
Write-Host "📦 Deploying admin-confirm-owner function..." -ForegroundColor Cyan
npx supabase functions deploy admin-confirm-owner
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy admin-confirm-owner" -ForegroundColor Red
    exit 1
}
Write-Host "✅ admin-confirm-owner deployed successfully" -ForegroundColor Green
Write-Host ""

# Deploy admin-verify-owner function
Write-Host "📦 Deploying admin-verify-owner function..." -ForegroundColor Cyan
npx supabase functions deploy admin-verify-owner
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy admin-verify-owner" -ForegroundColor Red
    exit 1
}
Write-Host "✅ admin-verify-owner deployed successfully" -ForegroundColor Green
Write-Host ""

# Deploy admin-list-owners function
Write-Host "📦 Deploying admin-list-owners function..." -ForegroundColor Cyan
npx supabase functions deploy admin-list-owners
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy admin-list-owners" -ForegroundColor Red
    exit 1
}
Write-Host "✅ admin-list-owners deployed successfully" -ForegroundColor Green
Write-Host ""

Write-Host "🎉 All edge functions deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Test business owner signup in your app" -ForegroundColor White
Write-Host "  2. Verify profile is created in business_owners table" -ForegroundColor White
Write-Host "  3. Check email is auto-confirmed in auth.users table" -ForegroundColor White
Write-Host "  4. Test login (should fail with 'pending verification')" -ForegroundColor White
Write-Host "  5. Admin verifies the account" -ForegroundColor White
Write-Host "  6. Test login again (should succeed)" -ForegroundColor White
Write-Host ""
Write-Host "📖 See BUSINESS_OWNER_AUTH_SETUP.md for detailed instructions" -ForegroundColor Gray
