import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CONFIG = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
};

export const TABLES = {
  RESTAURANTS: 'restaurants',
  PENDING_RESTAURANTS: 'pending_restaurants',
  RESTAURANT_OWNERS: 'restaurant_owners',
  RESTAURANT_SUBMISSIONS: 'restaurant_submissions',
  BUSINESS_OWNERS: 'business_owners',
  ADMINS: 'admins',
  MENU_ITEMS: 'menu_items',
  PROMOS: 'promos',
  RESTAURANT_RATINGS: 'restaurant_ratings',
  RESTAURANT_DEVICE_RATINGS: 'restaurant_device_ratings',
  RESTAURANT_DEVICE_FAVORITES: 'restaurant_device_favorites',
};

export const BUCKETS = {
  RESTAURANT_IMAGES: 'restaurant-images',
};

// Use Edge Functions for admin operations in production (recommended)
export const USE_EDGE_FUNCTIONS: boolean = (process.env.EXPO_PUBLIC_USE_EDGE_FUNCTIONS === 'true');

export const supabase: SupabaseClient = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey
);
