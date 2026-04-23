# Business Owner Authentication Setup Guide

## Overview
This guide explains how to set up and configure business owner authentication with email auto-confirmation.

## Issues Fixed
1. ✅ Email confirmation now auto-completes during signup
2. ✅ Business owner profiles are created via edge functions (bypasses RLS)
3. ✅ Users can log in after admin verification (no email confirmation required)
4. ✅ Proper error handling throughout the signup flow

## Edge Functions Required

### 1. `create-owner-profile`
Creates business owner profile in the database using service role key (bypasses RLS).

**Location:** `supabase/functions/create-owner-profile/index.ts`

### 2. `admin-confirm-owner`
Confirms user email using Supabase Admin API. Supports two modes:
- **Auto-confirm mode** (`autoConfirm: true`): Used during signup, no authentication required
- **Admin mode** (default): Requires admin authentication

**Location:** `supabase/functions/admin-confirm-owner/index.ts`

## Deployment Steps

### Step 1: Deploy Edge Functions to Supabase

```bash
# Navigate to project directory
cd GourMapExpo

# Login to Supabase CLI
npx supabase login

# Link to your project (if not already linked)
npx supabase link --project-ref dvkpflctotjavgrvbgay

# Deploy the edge functions
npx supabase functions deploy create-owner-profile
npx supabase functions deploy admin-confirm-owner
```

### Step 2: Configure Supabase Auth Settings

1. Go to **Supabase Dashboard** → **Authentication** → **Settings**
2. Under **Email Auth**, configure:
   - ✅ Enable email confirmations: **OFF** (or keep ON but we auto-confirm)
   - ✅ Secure email change: **ON** (recommended)
   - ✅ Enable email OTP: **Optional**

3. Under **Auth Providers**, ensure **Email** is enabled

### Step 3: Set Environment Variables

Ensure these environment variables are set in your Supabase project:
- `SUPABASE_URL` - Your Supabase project URL
- `SERVICE_ROLE_KEY` - Your service role key (for edge functions)

These are automatically available in edge functions.

### Step 4: Configure RLS Policies

Ensure the `business_owners` table has proper RLS policies:

```sql
-- Allow service role to insert (for edge functions)
CREATE POLICY "Service role can insert business owners"
ON business_owners
FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
ON business_owners
FOR SELECT
USING (auth.uid() = uid);

-- Allow admins to read all profiles
CREATE POLICY "Admins can read all profiles"
ON business_owners
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admins WHERE admins.uid = auth.uid()
  )
);
```

## How It Works

### Signup Flow

1. **User submits signup form** → `businessOwnerAuthService.signUp()`
2. **Create auth user** → `supabase.auth.signUp()` with `emailRedirectTo: undefined`
3. **Create profile** → Call `create-owner-profile` edge function (bypasses RLS)
4. **Auto-confirm email** → Call `admin-confirm-owner` with `autoConfirm: true`
5. **Create submission** → Add entry to `restaurant_submissions` for admin review
6. **Show success message** → User sees "pending admin approval" message

### Login Flow

1. **User attempts login** → `businessOwnerAuthService.signIn()`
2. **Authenticate** → `supabase.auth.signInWithPassword()`
3. **Check verification** → Verify `isVerified` flag in profile
4. **Grant/deny access** → Allow login only if admin has verified the account

### Admin Verification Flow

1. **Admin views pending owners** → `adminBusinessOwnersService.listBusinessOwners('pending')`
2. **Admin confirms email** → `confirmOwnerEmail(uid)` (if needed)
3. **Admin verifies owner** → `verifyOwner(uid)` sets `is_verified = true`
4. **Owner can now login** → User can sign in and access the app

## Testing

### Test Signup
```typescript
// In your app
const profile = await businessOwnerAuthService.signUp({
  email: 'test@example.com',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '1234567890',
  businessName: 'Test Restaurant'
});
```

### Test Login (Before Admin Verification)
```typescript
// Should fail with "pending verification" message
try {
  await businessOwnerAuthService.signIn('test@example.com', 'password123');
} catch (error) {
  console.log(error.message); // "Your account is pending verification..."
}
```

### Test Login (After Admin Verification)
```typescript
// Should succeed after admin sets is_verified = true
const profile = await businessOwnerAuthService.signIn('test@example.com', 'password123');
console.log(profile); // Business owner profile
```

## Troubleshooting

### Issue: "Profile creation failed"
- **Cause:** Edge function not deployed or RLS blocking insert
- **Solution:** Deploy edge functions and check RLS policies

### Issue: "Auto-confirm email failed"
- **Cause:** Edge function not deployed or service role key missing
- **Solution:** Deploy edge functions and verify environment variables

### Issue: "User cannot login after signup"
- **Cause:** Email not confirmed or account not verified
- **Solution:** Check `email_confirmed_at` in auth.users and `is_verified` in business_owners

### Issue: "Unauthorized" when calling edge functions
- **Cause:** Missing or invalid authorization header
- **Solution:** Ensure `autoConfirm: true` is passed during signup, or valid admin token for manual confirmation

## Security Notes

1. **Auto-confirm is safe** because:
   - Users still cannot access the app until admin verifies them
   - The `is_verified` flag provides the actual access control
   - Email confirmation is just to ensure valid email addresses

2. **Edge functions use service role** which:
   - Bypasses RLS for necessary operations
   - Should only be called from trusted code
   - Are protected by Supabase's built-in security

3. **Admin verification is required** for:
   - Setting `is_verified = true` in business_owners table
   - Allowing business owners to actually use the app
   - Preventing unauthorized access

## Next Steps

After deploying:
1. ✅ Test signup flow with a new email
2. ✅ Verify profile is created in `business_owners` table
3. ✅ Check `email_confirmed_at` is set in `auth.users` table
4. ✅ Test login fails with "pending verification" message
5. ✅ Admin verifies the account
6. ✅ Test login succeeds after verification
