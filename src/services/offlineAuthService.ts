import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { networkService } from './networkService';

const AUTH_CACHE_KEY = '@gourmap_auth_cache';
const AUTH_CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export interface CachedAuthData {
  user: any;
  session: any;
  role: string;
  cachedAt: number;
  expiresAt: number;
}

class OfflineAuthService {
  private cachedAuth: CachedAuthData | null = null;

  /**
   * Cache the current user session for offline use
   */
  async cacheCurrentSession(): Promise<void> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return;

      const { data: { session } } = await supabase.auth.getSession();

      const role = user.user_metadata?.role || 'user';
      const now = Date.now();

      const cacheData: CachedAuthData = {
        user,
        session,
        role,
        cachedAt: now,
        expiresAt: now + AUTH_CACHE_EXPIRY
      };

      this.cachedAuth = cacheData;
      await AsyncStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cacheData));

      console.log('✅ Auth session cached for offline use');
    } catch (error) {
      console.error('❌ Failed to cache auth session:', error);
    }
  }

  /**
   * Get cached auth data if valid
   */
  async getCachedAuth(): Promise<CachedAuthData | null> {
    try {
      // If we have in-memory cache and it's still valid, use it
      if (this.cachedAuth && Date.now() < this.cachedAuth.expiresAt) {
        return this.cachedAuth;
      }

      // Otherwise, try to load from storage
      const cached = await AsyncStorage.getItem(AUTH_CACHE_KEY);
      if (!cached) return null;

      const cacheData: CachedAuthData = JSON.parse(cached);

      // Check if cache is expired
      if (Date.now() > cacheData.expiresAt) {
        await this.clearCache();
        return null;
      }

      this.cachedAuth = cacheData;
      return cacheData;
    } catch (error) {
      console.error('❌ Failed to get cached auth:', error);
      return null;
    }
  }

  /**
   * Check if user has valid offline access
   */
  async hasOfflineAccess(): Promise<boolean> {
    const cached = await this.getCachedAuth();
    if (!cached) return false;

    // Only food explorers get offline access
    return cached.role === 'user' && !networkService.isOnline();
  }

  /**
   * Get current user, preferring online auth but falling back to cache
   */
  async getCurrentUser() {
    if (networkService.isOnline()) {
      // Online: get fresh data and cache it
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        await this.cacheCurrentSession();
        return user;
      }
    }

    // Offline or error: try cache
    const cached = await this.getCachedAuth();
    return cached?.user || null;
  }

  /**
   * Get user role, with offline fallback
   */
  async getUserRole(): Promise<string | null> {
    if (networkService.isOnline()) {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        const role = user.user_metadata?.role || 'user';
        await this.cacheCurrentSession(); // Refresh cache
        return role;
      }
    }

    // Offline fallback
    const cached = await this.getCachedAuth();
    return cached?.role || null;
  }

  /**
   * Clear cached auth data
   */
  async clearCache(): Promise<void> {
    this.cachedAuth = null;
    await AsyncStorage.removeItem(AUTH_CACHE_KEY);
    console.log('🗑️ Auth cache cleared');
  }

  /**
   * Initialize offline auth (call this on app start)
   */
  async initialize(): Promise<void> {
    // Cache current session if online
    if (networkService.isOnline()) {
      await this.cacheCurrentSession();
    }

    // Listen for auth changes to update cache
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await this.cacheCurrentSession();
      } else if (event === 'SIGNED_OUT') {
        await this.clearCache();
      }
    });
  }
}

export const offlineAuthService = new OfflineAuthService();
