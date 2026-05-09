/**
 * User Profile Service
 *
 * Handles authentication and profile management for Food Explorer users.
 * Creates a row in the `user_profiles` table on sign-up.
 *
 * Required Supabase table (run in SQL editor):
 *
 *   create table public.user_profiles (
 *     id          uuid primary key references auth.users(id) on delete cascade,
 *     email       text not null,
 *     display_name text,
 *     avatar_url  text,
 *     created_at  timestamptz default now(),
 *     updated_at  timestamptz default now()
 *   );
 *
 *   alter table public.user_profiles enable row level security;
 *
 *   create policy "Users can read own profile"
 *     on public.user_profiles for select
 *     using (auth.uid() = id);
 *
 *   create policy "Users can update own profile"
 *     on public.user_profiles for update
 *     using (auth.uid() = id);
 *
 *   -- Allow service role to insert (used during sign-up)
 *   create policy "Service role can insert"
 *     on public.user_profiles for insert
 *     with check (true);
 */

import { supabase } from '../config/supabase';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface SignUpData {
  email: string;
  password: string;
  displayName: string;
}

class UserProfileService {
  private readonly TABLE = 'user_profiles';

  // ── Auth ────────────────────────────────────────────────────────────────────

  async signUp(data: SignUpData): Promise<UserProfile> {
    const { email, password, displayName } = data;

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { display_name: displayName.trim(), role: 'user' },
      },
    });

    if (authError) throw new Error(this.friendlyError(authError.message));
    if (!authData.user) throw new Error('Failed to create account. Please try again.');

    const uid = authData.user.id;

    // 2. Create profile row
    const profileRow = {
      id:           uid,
      email:        email.trim().toLowerCase(),
      display_name: displayName.trim(),
      created_at:   new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    };

    const { error: profileError } = await supabase
      .from(this.TABLE)
      .insert(profileRow);

    if (profileError) {
      // Profile creation failed — not fatal, user can still use the app
      console.warn('⚠️ Profile row creation failed:', profileError.message);
    }

    return {
      id:          uid,
      email:       email.trim().toLowerCase(),
      displayName: displayName.trim(),
      createdAt:   new Date().toISOString(),
    };
  }

  async signIn(email: string, password: string): Promise<UserProfile> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) throw new Error(this.friendlyError(error.message));
    if (!data.user) throw new Error('Login failed. Please try again.');

    // Fetch profile row
    const profile = await this.getProfile(data.user.id);

    if (!profile) {
      // Profile row missing — create it from auth metadata
      const meta = data.user.user_metadata || {};
      const fallback: UserProfile = {
        id:          data.user.id,
        email:       data.user.email || email,
        displayName: meta.display_name || email.split('@')[0],
        createdAt:   data.user.created_at || new Date().toISOString(),
      };
      await this.ensureProfile(fallback);
      return fallback;
    }

    return profile;
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase()
    );
    if (error) throw new Error(this.friendlyError(error.message));
  }

  // ── Profile ─────────────────────────────────────────────────────────────────

  async getProfile(uid: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from(this.TABLE)
      .select('*')
      .eq('id', uid)
      .single();

    if (error || !data) return null;

    return {
      id:          data.id,
      email:       data.email,
      displayName: data.display_name || data.email.split('@')[0],
      avatarUrl:   data.avatar_url || undefined,
      createdAt:   data.created_at,
    };
  }

  async updateProfile(uid: string, updates: { displayName?: string; avatarUrl?: string }): Promise<void> {
    const row: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.displayName !== undefined) row.display_name = updates.displayName.trim();
    if (updates.avatarUrl   !== undefined) row.avatar_url   = updates.avatarUrl;

    const { error } = await supabase
      .from(this.TABLE)
      .update(row)
      .eq('id', uid);

    if (error) throw new Error(error.message);
  }

  // ── Session restore ──────────────────────────────────────────────────────────

  /**
   * Restore the current session from Supabase's persisted token.
   * Call this on app launch to keep the user logged in.
   */
  async restoreSession(): Promise<UserProfile | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) return null;

      const user = session.user;

      // Only restore Food Explorer sessions (not business owners / admins)
      const role = user.user_metadata?.role;
      if (role && role !== 'user') return null;

      return await this.getProfile(user.id) ?? {
        id:          user.id,
        email:       user.email || '',
        displayName: user.user_metadata?.display_name || (user.email || '').split('@')[0],
        createdAt:   user.created_at || new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async ensureProfile(profile: UserProfile): Promise<void> {
    const { error } = await supabase
      .from(this.TABLE)
      .upsert({
        id:           profile.id,
        email:        profile.email,
        display_name: profile.displayName,
        created_at:   profile.createdAt,
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) console.warn('⚠️ ensureProfile failed:', error.message);
  }

  private friendlyError(msg: string): string {
    const m = msg.toLowerCase();
    if (m.includes('already registered') || m.includes('already been registered')) {
      return 'An account with this email already exists. Please log in instead.';
    }
    if (m.includes('invalid login credentials') || m.includes('invalid credentials')) {
      return 'Incorrect email or password. Please try again.';
    }
    if (m.includes('email not confirmed')) {
      return 'Please verify your email before logging in. Check your inbox.';
    }
    if (m.includes('password should be')) {
      return 'Password must be at least 6 characters.';
    }
    if (m.includes('rate limit') || m.includes('too many')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (m.includes('network') || m.includes('fetch')) {
      return 'Network error. Please check your internet connection.';
    }
    return msg;
  }
}

export const userProfileService = new UserProfileService();
