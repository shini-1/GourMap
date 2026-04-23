/**
 * Test Admin Login
 * 
 * Run this in your app to test admin login directly
 * This will show you exactly what's failing
 */

import { supabase } from './src/config/supabase';

async function testAdminLogin() {
  const email = 'admin@gourmap.com';
  const password = 'Admin123!';
  
  console.log('=== Testing Admin Login ===');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('');
  
  try {
    // Step 1: Test auth login
    console.log('Step 1: Testing Supabase auth...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (authError) {
      console.error('❌ Auth failed:', authError.message);
      return;
    }
    
    if (!authData.user) {
      console.error('❌ No user returned');
      return;
    }
    
    console.log('✅ Auth successful!');
    console.log('UID:', authData.user.id);
    console.log('Email:', authData.user.email);
    console.log('Email confirmed:', authData.user.email_confirmed_at);
    console.log('');
    
    // Step 2: Check admin table
    console.log('Step 2: Checking admins table...');
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('uid', authData.user.id)
      .single();
    
    if (adminError) {
      console.error('❌ Admin table error:', adminError.message);
      console.error('Error details:', adminError);
      await supabase.auth.signOut();
      return;
    }
    
    if (!adminData) {
      console.error('❌ No admin record found');
      await supabase.auth.signOut();
      return;
    }
    
    console.log('✅ Admin record found!');
    console.log('Admin data:', JSON.stringify(adminData, null, 2));
    console.log('');
    
    // Step 3: Check is_active
    console.log('Step 3: Checking is_active...');
    if (adminData.is_active === false) {
      console.error('❌ Account is suspended');
      await supabase.auth.signOut();
      return;
    }
    
    console.log('✅ Account is active!');
    console.log('');
    
    console.log('=== ✅ ALL TESTS PASSED ===');
    console.log('Admin login should work!');
    
    // Clean up
    await supabase.auth.signOut();
    
  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Export for use in your app
export { testAdminLogin };

// If running directly
if (require.main === module) {
  testAdminLogin();
}
