import { createClient } from '@supabase/supabase-js';
import { supabase, TABLES, SUPABASE_CONFIG } from '../config/supabase';

export interface AdminProfile {
  uid: string;
  email: string;
  role: 'admin';
  firstName: string;
  lastName: string;
  adminLevel: 'super_admin' | 'moderator' | 'support';
  createdAt: Date;
  lastLogin: Date;
  isActive: boolean;
}

class AdminAuthService {
  private readonly ADMINS_TABLE = TABLES.ADMINS;

  /**
   * Sign in as admin - separate from business owners
   */
  async signIn(email: string, password: string): Promise<AdminProfile> {
    try {
      console.log('🔐 Attempting admin login for:', email);
      
      // Sign in with Supabase auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Auth error:', error.message);
        throw error;
      }

      if (!data.user) {
        throw new Error('Authentication failed - no user returned');
      }

      const uid = data.user.id;
      console.log('✅ Auth successful, UID:', uid);

      // Verify this is an admin account
      console.log('🔍 Checking admin table...');
      const { data: adminData, error: adminError } = await supabase
        .from(this.ADMINS_TABLE)
        .select('*')
        .eq('uid', uid)
        .single();

      console.log('Admin data:', adminData);
      console.log('Admin error:', adminError);

      if (adminError) {
        await supabase.auth.signOut();
        console.error('❌ Admin check error:', adminError.message);
        throw new Error('Access denied: Not an admin account');
      }

      if (!adminData) {
        await supabase.auth.signOut();
        throw new Error('Access denied: Not an admin account');
      }

      // Check is_active only if the column exists
      if (adminData.is_active === false) {
        await supabase.auth.signOut();
        throw new Error('Account suspended. Contact support.');
      }

      console.log('✅ Admin login successful!');

      return {
        uid,
        email: adminData.email || email,
        role: 'admin',
        firstName: adminData.first_name || '',
        lastName: adminData.last_name || '',
        adminLevel: adminData.admin_level || 'support',
        createdAt: new Date(adminData.created_at),
        lastLogin: new Date(),
        isActive: adminData.is_active !== false,
      };
    } catch (error: any) {
      console.error('❌ Admin sign-in error:', error);
      throw new Error(error.message || 'Admin authentication failed');
    }
  }

  /**
   * Create new admin account (super admin only) - using service role to bypass email confirmation
   */
  async createAdmin(adminData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    adminLevel: 'super_admin' | 'moderator' | 'support';
  }): Promise<AdminProfile> {
    try {
      // Create a service role client to bypass email confirmation
      const serviceSupabase = createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.serviceRoleKey
      );

      // First create Supabase auth user with service role (bypasses email confirmation)
      const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
        email: adminData.email,
        password: adminData.password,
        email_confirm: true, // Auto-confirm the email
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      const uid = authData.user.id;

      // Create admin profile in database
      const adminProfile = {
        uid,
        email: adminData.email,
        first_name: adminData.firstName,
        last_name: adminData.lastName,
        admin_level: adminData.adminLevel,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        is_active: true,
      };

      const { error: insertError } = await supabase
        .from(this.ADMINS_TABLE)
        .insert(adminProfile);

      if (insertError) {
        // Clean up auth user if profile creation failed
        await serviceSupabase.auth.admin.deleteUser(uid);
        throw insertError;
      }

      return {
        uid,
        email: adminData.email,
        role: 'admin',
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        adminLevel: adminData.adminLevel,
        createdAt: new Date(),
        lastLogin: new Date(),
        isActive: true,
      };
    } catch (error: any) {
      console.error('Create admin error:', error);
      throw new Error(error.message || 'Failed to create admin account');
    }
  }

  /**
   * Get current admin profile
   */
  async getCurrentUser(): Promise<AdminProfile | null> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) return null;

      const { data: adminData, error: adminError } = await supabase
        .from(this.ADMINS_TABLE)
        .select('*')
        .eq('uid', user.id)
        .single();

      if (adminError || !adminData) return null;

      return {
        uid: user.id,
        email: adminData.email || '',
        role: 'admin',
        firstName: adminData.first_name || '',
        lastName: adminData.last_name || '',
        adminLevel: adminData.admin_level || 'support',
        createdAt: new Date(adminData.created_at),
        lastLogin: new Date(adminData.last_login || adminData.created_at),
        isActive: adminData.is_active || false,
      };
    } catch (error) {
      console.error('Get current admin error:', error);
      return null;
    }
  }

  /**
   * Reset admin password
   */
  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch (error: any) {
      console.error('Reset admin password error:', error);
      throw new Error(error.message || 'Failed to send password reset email');
    }
  }

  /**
   * Sign out admin
   */
  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      console.error('Admin sign out error:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  }

  /**
   * Update admin profile
   */
  async updateProfile(uid: string, updates: Partial<AdminProfile>): Promise<void> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.firstName) updateData.first_name = updates.firstName;
      if (updates.lastName) updateData.last_name = updates.lastName;
      if (updates.adminLevel) updateData.admin_level = updates.adminLevel;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { error } = await supabase
        .from(this.ADMINS_TABLE)
        .update(updateData)
        .eq('uid', uid);

      if (error) throw error;
    } catch (error: any) {
      console.error('Update admin profile error:', error);
      throw new Error(error.message || 'Failed to update profile');
    }
  }

  /**
   * Deactivate admin account
   */
  async deactivateAdmin(uid: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.ADMINS_TABLE)
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString(),
        })
        .eq('uid', uid);

      if (error) throw error;
    } catch (error: any) {
      console.error('Deactivate admin error:', error);
      throw new Error(error.message || 'Failed to deactivate admin');
    }
  }

  /**
   * Reactivate admin account
   */
  async reactivateAdmin(uid: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.ADMINS_TABLE)
        .update({
          is_active: true,
          reactivated_at: new Date().toISOString(),
        })
        .eq('uid', uid);

      if (error) throw error;
    } catch (error: any) {
      console.error('Reactivate admin error:', error);
      throw new Error(error.message || 'Failed to reactivate admin');
    }
  }
}

export const adminAuthService = new AdminAuthService();
