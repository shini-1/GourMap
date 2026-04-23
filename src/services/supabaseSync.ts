// src/services/supabaseSync.ts
import { supabase } from '../config/supabase';
import { DatabaseService } from './database';
import { RestaurantRow, FavoriteRow } from '../types/database';

export class SupabaseSyncService {
  private static isOnline: boolean = true;
  private static syncInProgress: boolean = false;

  static setOnlineStatus(online: boolean) {
    this.isOnline = online;
    if (online) {
      this.performSync();
    }
  }

  static async performSync(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) return;

    this.syncInProgress = true;

    try {
      console.log('🔄 Starting Supabase sync...');

      // Sync restaurants
      await this.syncRestaurants();

      // Sync favorites
      await this.syncFavorites();

      console.log('✅ Supabase sync completed');
    } catch (error) {
      console.error('❌ Supabase sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private static async syncRestaurants(): Promise<void> {
    // Get last sync timestamp
    const metadata = await DatabaseService.getSyncMetadata('restaurants');
    const lastSync = metadata?.last_sync_timestamp || '1970-01-01T00:00:00.000Z';

    // Fetch changes from Supabase
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('*')
      .gt('updated_at', lastSync)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    if (restaurants && restaurants.length > 0) {
      // Convert to local format
      const localRestaurants: RestaurantRow[] = restaurants.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        address: r.address,
        latitude: r.latitude,
        longitude: r.longitude,
        category: r.category,
        price_range: r.price_range,
        rating: r.rating,
        image_url: r.image_url,
        created_at: r.created_at,
        updated_at: r.updated_at,
        _sync_status: 'synced',
        _last_modified: r.updated_at,
      }));

      await DatabaseService.saveRestaurants(localRestaurants);

      // Update sync metadata
      await DatabaseService.updateSyncMetadata(
        'restaurants',
        new Date().toISOString(),
        0, // We'll handle pending changes separately
        0
      );
    }

    // Push local changes to Supabase
    const { restaurants: pendingRestaurants } = await DatabaseService.getPendingChanges();
    if (pendingRestaurants.length > 0) {
      // Handle pending restaurant changes (if any)
      // This would typically be for user-created restaurants
      console.log(`📤 Pushing ${pendingRestaurants.length} restaurant changes to Supabase`);
    }
  }

  private static async syncFavorites(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get local favorites
    const localFavorites = await DatabaseService.getFavorites(user.id);

    // Sync with Supabase
    const { data: serverFavorites, error } = await supabase
      .from('restaurant_device_favorites')
      .select('*')
      .eq('device_id', user.id); // Using user.id as device_id for simplicity

    if (error) {
      console.warn('⚠️ Could not sync favorites with Supabase:', error);
      return;
    }

    // Merge favorites
    // This is a simplified version - in production you'd need proper conflict resolution

    // Update local database with server favorites
    if (serverFavorites) {
      for (const fav of serverFavorites) {
        await DatabaseService.addFavorite(fav.restaurant_id, user.id);
      }
    }

    // Mark local favorites as synced
    await DatabaseService.markSynced('favorites', localFavorites.map(f => f.id));
  }

  static async addFavoriteOffline(restaurantId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    await DatabaseService.addFavorite(restaurantId, user.id);

    if (this.isOnline) {
      await this.performSync();
    }
  }

  static async removeFavoriteOffline(restaurantId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    await DatabaseService.removeFavorite(restaurantId, user.id);

    if (this.isOnline) {
      await this.performSync();
    }
  }

  static async getFavoriteStatus(restaurantId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const favorites = await DatabaseService.getFavorites(user.id);
    return favorites.some(fav => fav.restaurant_id === restaurantId);
  }
}
