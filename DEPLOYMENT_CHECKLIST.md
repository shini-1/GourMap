# 🚀 Production Deployment Checklist

Quick checklist to get your GourMap app production-ready with admin approval workflow.

## ✅ Completed (Already Done)

- [x] Removed hardcoded service role key from code
- [x] Created Edge Functions for admin operations
- [x] Updated GitHub Actions workflow
- [x] Created comprehensive documentation
- [x] Updated signup flow with approval message
- [x] Fixed text wrapping in Admin Panel

## 📋 To Do (Follow in Order)

### 1. GitHub Secrets (5 minutes)

Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`

Add these secrets:

- [ ] `EXPO_PUBLIC_SUPABASE_URL` = `https://dvkpflctotjavgrvbgay.supabase.co`
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a3BmbGN0b3RqYXZncnZiZ2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTYwMTQsImV4cCI6MjA3ODA3MjAxNH0.MZ15GS6Ftz3mR8mKu8fhcP6fh6YWY8f_6GMy1ZVGx_Q`
- [ ] `EXPO_PUBLIC_USE_EDGE_FUNCTIONS` = `true`

### 2. Supabase Function Secret (2 minutes)

Go to: https://supabase.com/dashboard/project/dvkpflctotjavgrvbgay/functions

- [ ] Click **Secrets** tab
- [ ] Add secret: `SERVICE_ROLE_KEY`
- [ ] Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a3BmbGN0b3RqYXZncnZiZ2F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ5NjAxNCwiZXhwIjoyMDc4MDcyMDE0fQ.J6dm0Lm11pNVMvwLkwf94VKaWqymsP1SdpA8-g7khH0`
- [ ] Save

### 3. Deploy Edge Functions (10 minutes)

Go to: https://supabase.com/dashboard/project/dvkpflctotjavgrvbgay/functions

Deploy each function by copying code from local files:

- [ ] **admin-confirm-owner** (from `supabase/functions/admin-confirm-owner/index.ts`)
- [ ] **admin-verify-owner** (from `supabase/functions/admin-verify-owner/index.ts`)
- [ ] **admin-list-owners** (from `supabase/functions/admin-list-owners/index.ts`)
- [ ] **create-owner-profile** (from `supabase/functions/create-owner-profile/index.ts`)

### 4. Configure Supabase Auth (2 minutes)

Go to: https://supabase.com/dashboard/project/dvkpflctotjavgrvbgay/auth/providers

- [ ] Click **Email** provider
- [ ] Toggle **OFF**: "Enable email confirmations"
- [ ] Save

### 5. Add Admin Account (3 minutes)

Go to: https://supabase.com/dashboard/project/dvkpflctotjavgrvbgay/editor

- [ ] Open **admins** table
- [ ] Insert your UID and email
- [ ] Save

### 6. Push to GitHub (1 minute)

```bash
git add .
git commit -m "feat: production setup with Edge Functions"
git push origin main
```

- [ ] Push committed
- [ ] GitHub Actions build started
- [ ] Build completed successfully

### 7. Test Production Build (10 minutes)

- [ ] Download APK from GitHub Actions artifacts
- [ ] Install on device
- [ ] Register new business owner
- [ ] Verify approval message shows
- [ ] Login as admin
- [ ] Open Admin Panel → Owners tab
- [ ] Click "Confirm Email" button
- [ ] Click "Verify" button
- [ ] Test owner can login

## 📚 Documentation Reference

| Guide | Purpose |
|-------|---------|
| `GITHUB_ACTIONS_SETUP.md` | Complete GitHub Actions setup |
| `supabase/DEPLOY_VIA_DASHBOARD.md` | Deploy functions via Dashboard |
| `docs/ADMIN_APPROVAL_SETUP.md` | Admin workflow guide |
| `.env.example` | Local development setup |

## 🔗 Quick Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/dvkpflctotjavgrvbgay
- **GitHub Actions:** Check your repo's Actions tab
- **Edge Functions:** https://supabase.com/dashboard/project/dvkpflctotjavgrvbgay/functions

## ⏱️ Estimated Time

- **Total:** ~35 minutes
- **GitHub Secrets:** 5 min
- **Supabase Config:** 7 min
- **Deploy Functions:** 10 min
- **Testing:** 10 min
- **Buffer:** 3 min

## 🎯 Success Criteria

✅ All 4 Edge Functions deployed and showing in Dashboard  
✅ GitHub Actions build completes without errors  
✅ Business owner registration shows approval message  
✅ Admin can confirm and verify owners  
✅ Verified owners can login successfully  

## 🆘 Need Help?

- **Detailed Steps:** See `GITHUB_ACTIONS_SETUP.md`
- **Function Deployment:** See `supabase/DEPLOY_VIA_DASHBOARD.md`
- **Troubleshooting:** Check function logs in Supabase Dashboard

---

**Start Here:** Step 1 - Add GitHub Secrets 👆
