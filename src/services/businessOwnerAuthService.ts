import { supabase, TABLES, SUPABASE_CONFIG } from '../config/supabase';
import { createClient } from '@supabase/supabase-js';

export interface BusinessOwnerProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  businessName?: string;
  role: 'business_owner';
  createdAt: Date;
  isVerified: boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  businessName?: string;
}

class BusinessOwnerAuthService {
  private readonly BUSINESS_OWNERS_TABLE = TABLES.BUSINESS_OWNERS;

  /**
   * Sign up a new business owner
   */
  async signUp(signUpData: SignUpData): Promise<BusinessOwnerProfile> {
    try {
      // Sign up with email auto-confirmation disabled
      // Business owners will be verified by admin instead
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          emailRedirectTo: undefined, // No email confirmation needed
          data: {
            role: 'business_owner',
            first_name: signUpData.firstName,
            last_name: signUpData.lastName,
          }
        }
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user account');

      const uid = authData.user.id;
      
      // Always create profile via Edge Function to bypass RLS
      // This ensures profile is created even without email confirmation
      const { data: profileData, error: profileError } = await supabase.functions.invoke('create-owner-profile', {
        body: {
          uid,
          email: signUpData.email,
          firstName: signUpData.firstName,
          lastName: signUpData.lastName,
          phoneNumber: signUpData.phoneNumber,
          businessName: signUpData.businessName,
        }
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Continue anyway - admin can create profile manually if needed
      }

      // Auto-confirm email for business owners using edge function
      // This allows them to log in after admin verification
      try {
        const { error: confirmError } = await supabase.functions.invoke('admin-confirm-owner', {
          body: { uid, autoConfirm: true }
        });
        if (confirmError) {
          console.warn('Auto-confirm email failed:', confirmError);
          // Continue - admin can confirm manually
        }
      } catch (confirmErr) {
        console.warn('Auto-confirm exception:', confirmErr);
      }

      // Create pending submission for admin review (best-effort)
      try {
        await supabase
          .from(TABLES.RESTAURANT_SUBMISSIONS)
          .insert({
            owner_id: uid,
            business_name: signUpData.businessName || '',
            owner_name: `${signUpData.firstName} ${signUpData.lastName}`.trim(),
            email: signUpData.email,
            phone: signUpData.phoneNumber || '',
            location: null,
            image: null,
            description: '',
            cuisine_type: '',
            status: 'pending',
            submitted_at: new Date().toISOString(),
          });
      } catch (submissionErr) {
        console.warn('Submission creation failed:', submissionErr);
      }

      return {
        uid,
        email: signUpData.email,
        firstName: signUpData.firstName,
        lastName: signUpData.lastName,
        phoneNumber: signUpData.phoneNumber,
        businessName: signUpData.businessName,
        role: 'business_owner',
        createdAt: new Date(),
        isVerified: false,
      };
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Sign in existing business owner
   */
  async signIn(email: string, password: string): Promise<BusinessOwnerProfile> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('Authentication failed');
      }

      let profile = await this.getProfile(data.user.id);
      if (!profile) {
        await this.ensureProfileExists(data.user.id, { email });
        profile = await this.getProfile(data.user.id);
      }

      if (!profile) throw new Error('Business owner profile not found');

      // Enforce verification before allowing login
      if (!profile.isVerified) {
        throw new Error('Your account is pending verification by the admin. Please try again later.');
      }

      return profile;
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<BusinessOwnerProfile | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) return null;

      return await this.getProfile(user.id);
    } catch (error) {
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(uid: string, updates: Partial<BusinessOwnerProfile>): Promise<void> {
    try {
      const updateData: any = {};

      if (updates.firstName) updateData.first_name = updates.firstName;
      if (updates.lastName) updateData.last_name = updates.lastName;
      if (updates.phoneNumber !== undefined) updateData.phone_number = updates.phoneNumber;
      if (updates.businessName !== undefined) updateData.business_name = updates.businessName;
      if (updates.isVerified !== undefined) updateData.is_verified = updates.isVerified;

      const { error } = await supabase
        .from(this.BUSINESS_OWNERS_TABLE)
        .update(updateData)
        .eq('uid', uid);

      if (error) throw error;
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Check if email is already registered
   */
  async isEmailRegistered(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(this.BUSINESS_OWNERS_TABLE)
        .select('email')
        .eq('email', email)
        .limit(1);

      if (error) return false;

      return data && data.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Private methods
   */
  private async getProfile(uid: string): Promise<BusinessOwnerProfile | null> {
    try {
      const { data, error } = await supabase
        .from(this.BUSINESS_OWNERS_TABLE)
        .select('*')
        .eq('uid', uid)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        uid: data.uid,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        phoneNumber: data.phone_number,
        businessName: data.business_name,
        role: data.role,
        createdAt: new Date(data.created_at),
        isVerified: data.is_verified || false,
      } as BusinessOwnerProfile;
    } catch (error) {
      return null;
    }
  }

  private async ensureProfileExists(uid: string, base: { email: string; firstName?: string; lastName?: string; phoneNumber?: string; businessName?: string }, client?: any): Promise<void> {
    try {
      const db = client ?? supabase;
      const { error } = await db
        .from(this.BUSINESS_OWNERS_TABLE)
        .insert({
          uid,
          email: base.email,
          first_name: base.firstName || '',
          last_name: base.lastName || '',
          phone_number: base.phoneNumber ?? null,
          business_name: base.businessName ?? null,
          role: 'business_owner',
          created_at: new Date().toISOString(),
          is_verified: false,
        });

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  private getErrorMessage(error: any): string {
    // Map Supabase auth errors to user-friendly messages
    if (error.message?.includes('already registered')) {
      return 'This email is already registered';
    }
    if (error.message?.includes('Password should be')) {
      return 'Password should be at least 6 characters';
    }
    if (error.message?.includes('Invalid email')) {
      return 'Please enter a valid email address';
    }
    if (error.message?.includes('Invalid login credentials')) {
      return 'Invalid email or password';
    }
    if (error.message?.includes('Email not confirmed')) {
      return 'Please check your email and confirm your account';
    }

    return error.message || 'An error occurred';
  }
}

export const businessOwnerAuthService = new BusinessOwnerAuthService();
