/**
 * Favorites Service
 *
 * Manages saved restaurants for logged-in Food Explorer users.
 * Syncs to Supabase `user_favorites` table.
 *
 * Required Supabase table (run in SQL editor):
 *
 *   create table public.user_favorites (
 *     id            uuid primary key default gen_random_uuid(),
 *     user_id       uuid not null references auth.users(id) on delete cascade,
 *     restaurant_id text not null,
 *     created_at    timestamptz default now(),
 *     unique(user_id, restaurant_id)
 *   );
 *
 *   alter table public.user_favorites enable row level security;
 *
 *   create policy "Users manage own favorites"
 *     on public.user_favorites for all
 *     using (auth.uid() = user_id)
 *     with check (auth.uid() = user_id);
 *
 * Required update to user_profiles table:
 *
 *   alter table public.user_profiles
 *     add column if not exists preferred_categories text[] default '{}',
 *     add column if not exists onboarding_complete boolean default false;
 */

import { supabase } from '../config/supabase';

const TABLE = 'user_favorites';

class FavoritesService {
  // ── Favorites ────────────────────────────────────────────────────────────────

  /** Fetch all favorited restaurant IDs for a user */
  async getFavoriteIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('restaurant_id')
      .eq('user_id', userId);

    if (error) {
      console.warn('⚠️ getFavoriteIds error:', error.message);
      return [];
    }
    return (data || []).map((r: any) => r.restaurant_id);
  }

  /** Add a restaurant to favorites */
  async addFavorite(userId: string, restaurantId: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .insert({ user_id: userId, restaurant_id: restaurantId });

    if (error && !error.message.includes('duplicate')) {
      throw new Error(error.message);
    }
  }

  /** Remove a restaurant from favorites */
  async removeFavorite(userId: string, restaurantId: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId);

    if (error) throw new Error(error.message);
  }

  /** Toggle favorite — returns the new state (true = now favorited) */
  async toggleFavorite(userId: string, restaurantId: string, currentlyFavorited: boolean): Promise<boolean> {
    if (currentlyFavorited) {
      await this.removeFavorite(userId, restaurantId);
      return false;
    } else {
      await this.addFavorite(userId, restaurantId);
      return true;
    }
  }

  /** Check if a single restaurant is favorited */
  async isFavorited(userId: string, restaurantId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (error) return false;
    return !!data;
  }

  // ── Preferences ──────────────────────────────────────────────────────────────

  /** Save the user's preferred food categories (from onboarding) */
  async savePreferences(userId: string, categories: string[]): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        preferred_categories: categories,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw new Error(error.message);
  }

  /** Get the user's preferred categories */
  async getPreferences(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('preferred_categories')
      .eq('id', userId)
      .single();

    if (error || !data) return [];
    return data.preferred_categories || [];
  }

  /** Check if the user has completed onboarding */
  async hasCompletedOnboarding(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('onboarding_complete')
      .eq('id', userId)
      .single();

    if (error || !data) return false;
    return data.onboarding_complete === true;
  }
}

export const favoritesService = new FavoritesService();
