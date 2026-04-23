# Admin Approval Setup Guide

## Overview

GourMap uses an **admin-only approval workflow** for business owner accounts. This means:

- ✅ Business owners can register accounts
- ❌ NO automatic email confirmations are sent
- ✅ Admins manually approve accounts via the Admin Panel
- ✅ Users are notified to wait for admin approval

## Supabase Configuration Required

### Step 1: Disable Email Confirmations

1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Click on **Email** provider
3. Find the toggle: **"Enable email confirmations"**
4. Toggle it **OFF** (disabled)
5. Click **Save**

**Result:** New users will be created in Supabase Auth without receiving confirmation emails.

### Step 2: Configure Site URL (Optional)

1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Keep **Site URL** as: `http://localhost:3000` (or update for production)
3. Add **Redirect URLs**:
   ```
   http://localhost:3000/*
   http://localhost:19000/*
   exp://localhost:19000/*
   gourmap://*
   ```
4. Click **Save**

**Note:** Since email confirmations are disabled, the Site URL is not critical for the approval workflow.

## How It Works

### User Registration Flow

1. **User registers** via `RegisterScreenNew.tsx`
2. **Account created** in Supabase Auth (email NOT confirmed)
3. **Profile created** in `business_owners` table (is_verified = false)
4. **User sees message**: "Account created and is pending admin approval. This typically takes 1-2 business days."
5. **User CANNOT login** until admin approves

### Admin Approval Flow

1. **Admin logs in** to Admin Panel
2. **Navigate to Owners tab**
3. **New owners appear** in the list with:
   - Email: Not Confirmed (yellow)
   - Verified: No (yellow)
4. **Admin clicks buttons**:
   - **Confirm Email**: Sets `email_confirmed_at` in Supabase Auth
   - **Verify**: Sets `is_verified: true` in `business_owners` table
   - **Confirm + Verify**: Does both actions at once
5. **Owner can now login** after verification

## Admin Panel Features

### Owners Tab

- **All/Pending filter**: Toggle between all owners and pending approvals
- **Pull-to-refresh**: Swipe down to refresh the list
- **Auto-refresh**: List updates every 10 seconds while tab is active
- **Realtime updates**: List updates when database changes occur

### Action Buttons

| Button | Action | Result |
|--------|--------|--------|
| **Confirm Email** | Confirms email via Supabase Admin API | Sets `email_confirmed_at` timestamp |
| **Verify** | Marks owner as verified | Sets `is_verified: true` in DB |
| **Confirm + Verify** | Does both actions | Fully activates the account |

### Button States

- **Blue** = Action available
- **Green** = Action available (Verify)
- **Purple** = Combined action available
- **Gray** = Already completed
- **Loading** = Action in progress

## User Experience

### Registration Success Message

When a business owner registers, they see:

```
Account Created Successfully! 🎉

Your business owner account has been created and is pending admin approval.

You will be able to log in once an administrator reviews and activates your account. This typically takes 1-2 business days.

Thank you for your patience!
```

### Login Before Approval

If a user tries to login before approval, they see:

```
Your account is pending verification by the admin. Please try again later.
```

## Technical Implementation

### Services

**File:** `src/services/adminBusinessOwnersService.ts`

```typescript
// Confirm email via Supabase Admin API
export async function confirmOwnerEmail(uid: string): Promise<void> {
  const { error } = await serviceSupabase.auth.admin.updateUserById(uid, { 
    email_confirm: true 
  });
  if (error) throw new Error(error.message ?? 'Failed to confirm email');
}

// Verify owner in database
export async function verifyOwner(uid: string): Promise<void> {
  const { data, error } = await serviceSupabase
    .from(TABLES.BUSINESS_OWNERS)
    .update({ is_verified: true })
    .eq('uid', uid)
    .select('uid');
  
  if (error) throw new Error(error.message ?? 'Failed to verify owner');
  
  // If no row exists, create it
  if (!data || data.length === 0) {
    const { data: userData } = await serviceSupabase.auth.admin.getUserById(uid);
    const email = userData?.user?.email ?? '';
    await serviceSupabase.from(TABLES.BUSINESS_OWNERS).insert({
      uid, email, first_name: '', last_name: '', 
      phone_number: null, business_name: null,
      role: 'business_owner', created_at: new Date().toISOString(),
      is_verified: true,
    });
  }
}

// Combined action
export async function confirmAndVerify(uid: string): Promise<void> {
  await confirmOwnerEmail(uid);
  await verifyOwner(uid);
}
```

### Admin Panel Handlers

**File:** `screens/AdminPanelScreen.tsx`

```typescript
const handleConfirmOwnerEmail = async (uid: string) => {
  try {
    setConfirmingOwnerUid(uid);
    await confirmOwnerEmail(uid);
    setOwners(prev => prev.map(o => o.uid === uid ? { ...o, emailConfirmed: true } : o));
    Alert.alert('Success', 'Email confirmed successfully');
  } catch (error: any) {
    Alert.alert('Error', error.message || 'Failed to confirm email');
  } finally {
    setConfirmingOwnerUid(null);
  }
};

const handleVerifyOwner = async (uid: string) => {
  try {
    setVerifyingOwnerUid(uid);
    await verifyOwner(uid);
    setOwners(prev => prev.filter(o => o.uid !== uid));
    Alert.alert('Success', 'Owner verified successfully');
  } catch (error: any) {
    Alert.alert('Error', error.message || 'Failed to verify owner');
  } finally {
    setVerifyingOwnerUid(null);
  }
};

const handleConfirmAndVerifyOwner = async (uid: string) => {
  try {
    setConfirmAndVerifyingUid(uid);
    await confirmAndVerify(uid);
    setOwners(prev => prev.filter(o => o.uid !== uid));
    Alert.alert('Success', 'Email confirmed and owner verified');
  } catch (error: any) {
    Alert.alert('Error', error.message || 'Failed to confirm and verify');
  } finally {
    setConfirmAndVerifyingUid(null);
  }
};
```

## Security Considerations

### Service Role Key

⚠️ **WARNING:** The service role key is currently stored in `src/config/supabase.ts` for development purposes.

**For Production:**
1. Move admin operations to Supabase Edge Functions
2. Remove service role key from client-side code
3. Use RLS policies to secure data access
4. Implement proper admin authentication

### Current Setup (Development Only)

```typescript
// src/config/supabase.ts
export const SUPABASE_CONFIG = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://dvkpflctotjavgrvbgay.supabase.co',
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '...',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '...'
};
```

**Best Practice:** Store in environment variables and never commit to git.

## Troubleshooting

### Issue: Users still receiving confirmation emails

**Solution:** 
1. Check **Authentication** → **Providers** → **Email**
2. Ensure "Enable email confirmations" is **OFF**
3. Clear Supabase cache and try again

### Issue: Admin confirmation not working

**Solution:**
1. Verify service role key is correct in `src/config/supabase.ts`
2. Check browser/app console for errors
3. Verify admin is logged in to Admin Panel
4. Check Supabase logs for API errors

### Issue: Owner can't login after approval

**Solution:**
1. Verify both email confirmed AND verified in Supabase
2. Check `email_confirmed_at` in Auth console
3. Check `is_verified: true` in `business_owners` table
4. Try "Confirm + Verify" button to ensure both are set

### Issue: Owners not appearing in Admin Panel

**Solution:**
1. Check if owner was created in Supabase Auth
2. Verify `business_owners` table has the row
3. Try pull-to-refresh in Admin Panel
4. Check filter is set to "All" not just "Pending"

## Production Deployment Checklist

- [ ] Disable email confirmations in Supabase
- [ ] Update Site URL to production domain
- [ ] Add production redirect URLs
- [ ] Set up custom SMTP provider
- [ ] Move service role operations to Edge Functions
- [ ] Remove service role key from client code
- [ ] Test full approval workflow in production
- [ ] Document SLA for approval time
- [ ] Train admin team on approval process
- [ ] Set up monitoring for approval metrics

## Support

For questions or issues with the admin approval process:

1. Check this documentation
2. Review Supabase Dashboard settings
3. Check application logs
4. Contact development team

---

**Last Updated:** November 25, 2025  
**Version:** 1.0  
**Status:** Active - Admin-Only Approval Workflow
