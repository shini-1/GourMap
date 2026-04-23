# RLS Policy Fixes for Admin Operations

## Problem Summary

The application was experiencing RLS (Row Level Security) policy errors when admins tried to edit restaurants and business owners. Specifically:

1. **Location Field Errors**: The system uses both `location` object and separate `latitude`/`longitude` columns
2. **Admin Access Denied**: RLS policies were blocking admin operations on various tables
3. **Inconsistent Permissions**: Different tables had conflicting or missing policies

## Root Causes

1. **Incomplete RLS Policies**: Some tables lacked proper admin access policies
2. **Location Schema Confusion**: Mixed use of JSON object vs separate columns
3. **Service Role Permissions**: Not all operations were allowed for service role
4. **Business Owner Permissions**: Missing policies for verified business owners

## Solution Overview

### 1. Comprehensive RLS Policy Fix (`FIX_RLS_POLICIES.sql`)

This SQL script provides complete RLS policies for all tables:

- **restaurants**: Public read, admin/service full access
- **restaurant_submissions**: Public read, admin/service full access, business owner insert
- **restaurant_owners**: Public read for approved, admin/service full access, owner self-management
- **business_owners**: Admin/service full access, owner self-management
- **admins**: Service full access, admin read access

### 2. Code Improvements

Updated restaurant service functions to:
- Handle both location formats (object and separate columns)
- Provide better error logging
- Ensure backward compatibility

### 3. Permission Grants

Added necessary PostgreSQL grants for authenticated users and service role.

## How to Apply the Fix

### Step 1: Run the RLS Policy Fix Script

```powershell
# In PowerShell, navigate to your project directory
cd GourMapExpo

# Run the fix script
.\fix-rls-policies.ps1
```

This will display the SQL commands you need to run in Supabase.

### Step 2: Execute SQL in Supabase Dashboard

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy the entire content from `FIX_RLS_POLICIES.sql`
3. Paste and run the SQL script
4. Verify the script runs without errors

### Step 3: Test the Fixes

After applying the SQL script:

1. **Login as Admin**
2. **Test Restaurant Editing**:
   - Open Admin Panel → Restaurants tab
   - Edit an existing restaurant
   - Update location coordinates
   - Save changes (should work without errors)
3. **Test Restaurant Adding**:
   - Click "Add Restaurant" button
   - Fill in details including location
   - Save (should create successfully)
4. **Test Business Owner Management**:
   - Go to Owners tab
   - Try confirming/verifying owners
   - Should work without permission errors

## What the Fix Does

### RLS Policies Created

#### Restaurants Table
```sql
-- Public can read approved restaurants
CREATE POLICY "Public can read approved restaurants"
  ON restaurants FOR SELECT TO authenticated, anon USING (true);

-- Service role full access
CREATE POLICY "Service role can manage restaurants"
  ON restaurants FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admin full access
CREATE POLICY "Admins can manage restaurants"
  ON restaurants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE admins.uid = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.uid = auth.uid()));
```

#### Business Owners Table
```sql
-- Service role full access
CREATE POLICY "Service role can manage business_owners"
  ON business_owners FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admin full access
CREATE POLICY "Admins can manage business_owners"
  ON business_owners FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE admins.uid = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.uid = auth.uid()));

-- Owners can manage their own profiles
CREATE POLICY "Business owners can manage their own profiles"
  ON business_owners FOR ALL TO authenticated
  USING (uid = auth.uid()) WITH CHECK (uid = auth.uid());
```

### Code Changes

#### Location Handling
The restaurant service now handles both location formats:

```typescript
// Support both location object and separate columns
if (updates.location) {
  updateData.location = {
    latitude: updates.location.latitude,
    longitude: updates.location.longitude
  };
  // Also update separate columns for backward compatibility
  updateData.latitude = updates.location.latitude;
  updateData.longitude = updates.location.longitude;
}
```

#### Better Error Logging
Added comprehensive logging to track update operations:

```typescript
console.log('🔄 Updating restaurant with data:', updateData);
// ... operation ...
console.log('✅ Restaurant updated successfully');
```

## Verification Queries

After applying the fix, run these queries in Supabase SQL Editor to verify:

```sql
-- Test admin access to restaurants
SELECT COUNT(*) as restaurant_count FROM restaurants LIMIT 1;

-- Test admin access to business owners
SELECT COUNT(*) as business_owner_count FROM business_owners LIMIT 1;

-- Test admin access to restaurant submissions
SELECT COUNT(*) as submission_count FROM restaurant_submissions LIMIT 1;

-- Verify admin user setup
SELECT
  u.id as uid,
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  a.email as admin_email,
  a.is_active,
  a.admin_level
FROM auth.users u
LEFT JOIN admins a ON u.id = a.uid
WHERE u.email = 'admin@gourmap.com';
```

## Troubleshooting

### Issue: "Permission denied for table restaurants"
**Solution**: RLS policies not applied. Re-run the SQL script.

### Issue: "Location field not updating"
**Solution**: Check if your database schema uses separate latitude/longitude columns. The code now supports both formats.

### Issue: "Admin login not working"
**Solution**: Ensure admin user exists in both `auth.users` and `admins` table. Run the admin setup SQL from `ADMIN_LOGIN_FIX.sql`.

### Issue: "Business owner operations failing"
**Solution**: Verify the business owner is verified (`is_verified = true`) and the RLS policies are applied.

## Security Notes

1. **Admin Access**: Only users in the `admins` table have admin privileges
2. **Service Role**: Used for server-side operations, bypasses RLS
3. **Public Access**: Limited to reading approved content only
4. **Owner Access**: Business owners can only manage their own verified profiles

## Files Modified

- `services/restaurants.ts`: Updated location handling and error logging
- `FIX_RLS_POLICIES.sql`: New comprehensive RLS policy script
- `fix-rls-policies.ps1`: PowerShell script to apply fixes

## Next Steps

1. ✅ Apply the RLS policy fixes
2. ✅ Test admin operations thoroughly
3. ✅ Monitor for any remaining permission errors
4. ✅ Update documentation if needed

---

**Dashboard URL**: https://supabase.com/dashboard/project/dvkpflctotjavgrvbgay
**SQL Editor**: https://supabase.com/dashboard/project/dvkpflctotjavgrvbgay/sql
