import { adminAuthService } from '../services/adminAuthService';

/**
 * Utility to create the first admin account for testing
 * Run this once to create an admin account
 */
export const createTestAdmin = async () => {
  try {
    console.log('🔧 Creating test admin account...');

    const adminData = {
      email: 'admin@gourmap.com',
      password: 'Admin123!',
      firstName: 'Super',
      lastName: 'Admin',
      adminLevel: 'super_admin' as const,
    };

    const adminProfile = await adminAuthService.createAdmin(adminData);

    console.log('✅ Admin account created successfully!');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Password:', adminData.password);
    console.log('👤 Name:', `${adminData.firstName} ${adminData.lastName}`);
    console.log('🎯 Level:', adminData.adminLevel);

    return adminProfile;
  } catch (error) {
    console.error('❌ Failed to create admin account:', error);
    throw error;
  }
};

/**
 * Alternative: Direct Supabase Auth creation (if database fails)
 */
export const createAdminDirect = async () => {
  try {
    const { supabase } = await import('../../services/firebase');

    const { data, error } = await supabase.auth.signUp({
      email: 'admin@gourmap.com',
      password: 'Admin123!',
    });

    if (error) throw error;

    console.log('✅ Supabase Auth admin created:', data.user?.email);
    console.log('🔑 Password: Admin123!');
    console.log('⚠️ Note: This admin won\'t have database profile - use createTestAdmin() instead');

    return data.user;
  } catch (error) {
    console.error('❌ Failed to create Supabase Auth admin:', error);
    throw error;
  }
};

// Usage: Call createTestAdmin() from a component or console
// This will create a full admin account with Supabase database profile
