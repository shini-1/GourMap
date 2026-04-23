# Deploy Edge Functions via Supabase Dashboard

Since your app builds automatically via GitHub Actions, you can deploy Edge Functions directly through the Supabase Dashboard without needing the CLI locally.

## Step 1: Set Service Role Key Secret

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: **dvkpflctotjavgrvbgay**
3. Navigate to **Edge Functions** (in left sidebar)
4. Click **Secrets** tab
5. Click **Add Secret**
6. Set:
   - **Name:** `SERVICE_ROLE_KEY`
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a3BmbGN0b3RqYXZncnZiZ2F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ5NjAxNCwiZXhwIjoyMDc4MDcyMDE0fQ.J6dm0Lm11pNVMvwLkwf94VKaWqymsP1SdpA8-g7khH0`
7. Click **Save**

## Step 2: Deploy Functions via Dashboard

For each function, follow these steps:

### Function 1: admin-confirm-owner

1. Click **Create a new function**
2. **Function name:** `admin-confirm-owner`
3. Copy the code from: `supabase/functions/admin-confirm-owner/index.ts`
4. Paste into the editor
5. Click **Deploy**

### Function 2: admin-verify-owner

1. Click **Create a new function**
2. **Function name:** `admin-verify-owner`
3. Copy the code from: `supabase/functions/admin-verify-owner/index.ts`
4. Paste into the editor
5. Click **Deploy**

### Function 3: admin-list-owners

1. Click **Create a new function**
2. **Function name:** `admin-list-owners`
3. Copy the code from: `supabase/functions/admin-list-owners/index.ts`
4. Paste into the editor
5. Click **Deploy**

### Function 4: create-owner-profile

1. Click **Create a new function**
2. **Function name:** `create-owner-profile`
3. Copy the code from: `supabase/functions/create-owner-profile/index.ts`
4. Paste into the editor
5. Click **Deploy**

## Step 3: Configure GitHub Actions Environment Variables

Add these secrets to your GitHub repository:

1. Go to your GitHub repo: **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://dvkpflctotjavgrvbgay.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a3BmbGN0b3RqYXZncnZiZ2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTYwMTQsImV4cCI6MjA3ODA3MjAxNH0.MZ15GS6Ftz3mR8mKu8fhcP6fh6YWY8f_6GMy1ZVGx_Q` |
| `EXPO_PUBLIC_USE_EDGE_FUNCTIONS` | `true` |

**DO NOT** add `SUPABASE_SERVICE_ROLE_KEY` to GitHub secrets - it should only be in Supabase Edge Functions secrets!

## Step 4: Update GitHub Actions Workflow

Your workflow should use these environment variables. If you have an `eas-build.yml` or similar, ensure it includes:

```yaml
env:
  EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.EXPO_PUBLIC_SUPABASE_URL }}
  EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.EXPO_PUBLIC_SUPABASE_ANON_KEY }}
  EXPO_PUBLIC_USE_EDGE_FUNCTIONS: ${{ secrets.EXPO_PUBLIC_USE_EDGE_FUNCTIONS }}
```

## Step 5: Disable Email Confirmations

1. Go to **Authentication** → **Providers**
2. Click on **Email** provider
3. Toggle **OFF**: "Enable email confirmations"
4. Click **Save**

## Step 6: Add Yourself as Admin

1. Go to **Table Editor** → **admins** table
2. Click **Insert** → **Insert row**
3. Fill in:
   - **uid:** Your user ID (get from Authentication → Users)
   - **email:** Your admin email
   - **created_at:** (auto-filled)
4. Click **Save**

## Step 7: Test the Deployment

After your next GitHub Actions build:

1. Open your deployed app
2. Register a new business owner
3. Verify approval message appears
4. Login as admin
5. Go to Admin Panel → Owners tab
6. Test "Confirm Email" and "Verify" buttons
7. Verify owner can login after approval

## Verify Functions Are Working

In Supabase Dashboard:

1. Go to **Edge Functions**
2. Click on each function
3. Check **Logs** tab for any errors
4. Verify **Invocations** shows activity

## Local Development Setup

For local development (not production), create a `.env` file:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://dvkpflctotjavgrvbgay.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a3BmbGN0b3RqYXZncnZiZ2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTYwMTQsImV4cCI6MjA3ODA3MjAxNH0.MZ15GS6Ftz3mR8mKu8fhcP6fh6YWY8f_6GMy1ZVGx_Q
EXPO_PUBLIC_USE_EDGE_FUNCTIONS=false
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a3BmbGN0b3RqYXZncnZiZ2F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ5NjAxNCwiZXhwIjoyMDc4MDcyMDE0fQ.J6dm0Lm11pNVMvwLkwf94VKaWqymsP1SdpA8-g7khH0
```

This allows you to test locally without deploying functions.

## Summary

✅ **No CLI needed** - Deploy via Dashboard  
✅ **GitHub Actions handles builds** - Just push to repo  
✅ **Edge Functions secure** - Service key stays server-side  
✅ **Local dev still works** - Use service key in `.env` locally  

**Next Steps:**
1. Deploy 4 functions via Dashboard (copy/paste code)
2. Add GitHub secrets for environment variables
3. Push to repo and let GitHub Actions build
4. Test the admin approval workflow

---

**Dashboard URL:** https://supabase.com/dashboard/project/dvkpflctotjavgrvbgay
