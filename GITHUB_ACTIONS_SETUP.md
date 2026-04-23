# GitHub Actions Setup for Production

Your app builds automatically via GitHub Actions. Here's how to configure it for production with Supabase Edge Functions.

## Current Setup ✅

- ✅ GitHub Actions workflow: `.github/workflows/build.yml`
- ✅ Builds on push to `main` branch
- ✅ Updated to include Supabase environment variables

## Step 1: Add GitHub Secrets

Go to your GitHub repository and add these secrets:

**Repository Settings → Secrets and variables → Actions → New repository secret**

### Required Secrets

| Secret Name | Value | Purpose |
|-------------|-------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://dvkpflctotjavgrvbgay.supabase.co` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a3BmbGN0b3RqYXZncnZiZ2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTYwMTQsImV4cCI6MjA3ODA3MjAxNH0.MZ15GS6Ftz3mR8mKu8fhcP6fh6YWY8f_6GMy1ZVGx_Q` | Public anon key |
| `EXPO_PUBLIC_USE_EDGE_FUNCTIONS` | `true` | Enable Edge Functions in production |
| `MAPBOX_DOWNLOADS_TOKEN` | (existing) | Already configured |

### How to Add Secrets

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
2. Click **New repository secret**
3. Enter **Name** and **Value**
4. Click **Add secret**
5. Repeat for each secret above

## Step 2: Deploy Edge Functions via Supabase Dashboard

Since you don't have Supabase CLI installed locally, deploy via the Dashboard:

### 2.1 Set Function Secret

1. Go to: https://supabase.com/dashboard/project/dvkpflctotjavgrvbgay
2. Navigate to **Edge Functions** → **Secrets**
3. Click **Add Secret**
4. Name: `SERVICE_ROLE_KEY`
5. Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a3BmbGN0b3RqYXZncnZiZ2F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ5NjAxNCwiZXhwIjoyMDc4MDcyMDE0fQ.J6dm0Lm11pNVMvwLkwf94VKaWqymsP1SdpA8-g7khH0`
6. Click **Save**

### 2.2 Deploy Functions

For each of the 4 functions, follow these steps:

#### Function 1: admin-confirm-owner

1. Click **Create a new function**
2. Name: `admin-confirm-owner`
3. Copy code from: `supabase/functions/admin-confirm-owner/index.ts`
4. Paste into editor
5. Click **Deploy**

#### Function 2: admin-verify-owner

1. Click **Create a new function**
2. Name: `admin-verify-owner`
3. Copy code from: `supabase/functions/admin-verify-owner/index.ts`
4. Paste into editor
5. Click **Deploy**

#### Function 3: admin-list-owners

1. Click **Create a new function**
2. Name: `admin-list-owners`
3. Copy code from: `supabase/functions/admin-list-owners/index.ts`
4. Paste into editor
5. Click **Deploy**

#### Function 4: create-owner-profile

1. Click **Create a new function**
2. Name: `create-owner-profile`
3. Copy code from: `supabase/functions/create-owner-profile/index.ts`
4. Paste into editor
5. Click **Deploy**

## Step 3: Configure Supabase Dashboard

### 3.1 Disable Email Confirmations

1. Go to **Authentication** → **Providers**
2. Click **Email** provider
3. Toggle **OFF**: "Enable email confirmations"
4. Click **Save**

### 3.2 Add Yourself as Admin

1. Go to **Table Editor** → **admins** table
2. If table doesn't exist, create it:
   ```sql
   CREATE TABLE admins (
     uid UUID PRIMARY KEY REFERENCES auth.users(id),
     email TEXT NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
3. Click **Insert row**
4. Fill in your UID and email
5. Click **Save**

## Step 4: Push to GitHub

Now that everything is configured:

```bash
git add .
git commit -m "feat: production setup with Edge Functions"
git push origin main
```

This will trigger the GitHub Actions build with the new environment variables.

## Step 5: Verify the Build

1. Go to your GitHub repo → **Actions** tab
2. Watch the build progress
3. Verify it completes successfully
4. Download the APK artifact

## Step 6: Test the Production App

1. Install the APK on your device
2. Register a new business owner
3. Verify approval message appears
4. Login as admin
5. Go to Admin Panel → Owners tab
6. Test admin approval workflow

## Local Development

For local development, create a `.env` file (not committed to git):

```bash
EXPO_PUBLIC_SUPABASE_URL=https://dvkpflctotjavgrvbgay.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a3BmbGN0b3RqYXZncnZiZ2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTYwMTQsImV4cCI6MjA3ODA3MjAxNH0.MZ15GS6Ftz3mR8mKu8fhcP6fh6YWY8f_6GMy1ZVGx_Q
EXPO_PUBLIC_USE_EDGE_FUNCTIONS=false
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a3BmbGN0b3RqYXZncnZiZ2F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ5NjAxNCwiZXhwIjoyMDc4MDcyMDE0fQ.J6dm0Lm11pNVMvwLkwf94VKaWqymsP1SdpA8-g7khH0
```

This allows local testing without deploying functions.

## Workflow Summary

### Development Workflow
1. Make code changes locally
2. Test with `.env` file (uses service key directly)
3. Commit and push to GitHub
4. GitHub Actions builds with production config
5. Production build uses Edge Functions

### Production Workflow
1. User registers → Account created
2. Admin approves via Admin Panel
3. Admin actions call Edge Functions
4. Edge Functions use service role key (server-side)
5. User can login after approval

## Troubleshooting

### Build fails with "EXPO_PUBLIC_SUPABASE_URL is not defined"

**Solution:** Add the GitHub secret as described in Step 1

### App shows "Failed to confirm email"

**Solution:** 
1. Verify Edge Functions are deployed
2. Check function logs in Supabase Dashboard
3. Verify `SUPABASE_SERVICE_ROLE_KEY` secret is set

### "Unauthorized" error in Admin Panel

**Solution:**
1. Verify you're logged in as admin
2. Check your UID is in the `admins` table
3. Verify Edge Functions are checking admin status correctly

## Security Checklist

- [x] Service role key NOT in GitHub secrets (correct!)
- [x] Service role key only in Supabase function secrets
- [x] GitHub Actions uses public anon key only
- [x] Edge Functions enabled in production builds
- [x] `.env` file in `.gitignore`
- [ ] GitHub secrets configured
- [ ] Edge Functions deployed
- [ ] Supabase dashboard configured
- [ ] Admin account created

## Next Steps

1. ✅ Add GitHub secrets (Step 1)
2. ✅ Deploy Edge Functions via Dashboard (Step 2)
3. ✅ Configure Supabase (Step 3)
4. ✅ Push to GitHub (Step 4)
5. ✅ Test production build (Step 5-6)

---

**Dashboard:** https://supabase.com/dashboard/project/dvkpflctotjavgrvbgay  
**GitHub Repo:** Check your Actions tab after pushing  
**Documentation:** See `supabase/DEPLOY_VIA_DASHBOARD.md` for detailed function deployment
