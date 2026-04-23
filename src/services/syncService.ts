import { supabase, TABLES } from '../config/supabase';
import { localDatabase, PendingOperation, LocalRestaurant, LocalMenuItem, LocalRating } from './localDatabase';
import { networkService } from './networkService';

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
  errors: string[];
}

export interface SyncOptions {
  forceFullSync?: boolean;
  maxRetries?: number;
  syncRestaurants?: boolean;
  syncMenuItems?: boolean;
  syncRatings?: boolean;
}

class SyncService {
  private isSyncing = false;
  private syncListeners: ((result: SyncResult) => void)[] = [];

  /**
   * Start synchronization process
   */
  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('🔄 Sync already in progress');
      return { success: false, syncedItems: 0, failedItems: 0, errors: ['Sync already in progress'] };
    }

    if (!networkService.isOnline()) {
      console.log('📴 Cannot sync: device is offline');
      return { success: false, syncedItems: 0, failedItems: 0, errors: ['Device is offline'] };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      errors: []
    };

    try {
      console.log('🔄 Starting sync process...');

      // Initialize local database if needed
      await localDatabase.initialize();

      // Push pending operations first
      const pushResult = await this.pushPendingOperations(options.maxRetries || 3);
      result.syncedItems += pushResult.syncedItems;
      result.failedItems += pushResult.failedItems;
      result.errors.push(...pushResult.errors);

      // Pull latest data from Supabase
      if (options.forceFullSync || options.syncRestaurants !== false) {
        const pullRestaurantsResult = await this.pullRestaurants();
        result.syncedItems += pullRestaurantsResult.syncedItems;
        result.failedItems += pullRestaurantsResult.failedItems;
        result.errors.push(...pullRestaurantsResult.errors);
      }

      if (options.forceFullSync || options.syncMenuItems !== false) {
        const pullMenuItemsResult = await this.pullMenuItems();
        result.syncedItems += pullMenuItemsResult.syncedItems;
        result.failedItems += pullMenuItemsResult.failedItems;
        result.errors.push(...pullMenuItemsResult.errors);
      }

      if (options.forceFullSync || options.syncRatings !== false) {
        const pullRatingsResult = await this.pullRatings();
        result.syncedItems += pullRatingsResult.syncedItems;
        result.failedItems += pullRatingsResult.failedItems;
        result.errors.push(...pullRatingsResult.errors);
      }

      console.log('✅ Sync completed:', result);
      return result;

    } catch (error: any) {
      console.error('❌ Sync failed:', error);
      result.success = false;
      result.errors.push(error.message || 'Unknown sync error');
      return result;
    } finally {
      this.isSyncing = false;
      this.notifyListeners(result);
    }
  }

  /**
   * Push pending operations to Supabase
   */
  private async pushPendingOperations(maxRetries: number = 3): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      errors: []
    };

    try {
      const pendingOps = await localDatabase.getPendingOperations();

      for (const op of pendingOps) {
        try {
          await this.executePendingOperation(op, maxRetries);
          await localDatabase.removePendingOperation(op.id);
          result.syncedItems++;
        } catch (error: any) {
          console.error(`Failed to execute pending operation ${op.id}:`, error);
          result.failedItems++;
          result.errors.push(`Operation ${op.id}: ${error.message}`);

          // Increment retry count
          await localDatabase.incrementRetryCount(op.id);

          // If max retries exceeded, remove the operation
          if (op.retry_count >= maxRetries) {
            await localDatabase.removePendingOperation(op.id);
            console.warn(`Removed failed operation ${op.id} after ${maxRetries} retries`);
          }
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Push operations error: ${error.message}`);
    }

    return result;
  }

  /**
   * Execute a single pending operation
   */
  private async executePendingOperation(op: PendingOperation, maxRetries: number): Promise<void> {
    const data = JSON.parse(op.data);

    switch (op.table_name) {
      case 'restaurants':
        await this.syncRestaurantOperation(op.operation, data);
        break;
      case 'menu_items':
        await this.syncMenuItemOperation(op.operation, data);
        break;
      case 'restaurant_ratings':
        await this.syncRatingOperation(op.operation, data);
        break;
      default:
        throw new Error(`Unknown table: ${op.table_name}`);
    }
  }

  private async syncRestaurantOperation(operation: string, data: any): Promise<void> {
    switch (operation) {
      case 'insert':
      case 'update':
        const { error } = await supabase
          .from(TABLES.RESTAURANTS)
          .upsert({
            id: data.id,
            name: data.name,
            description: data.description,
            category: data.category,
            price_range: data.price_range,
            latitude: data.latitude,
            longitude: data.longitude,
            image: data.image,
            phone: data.phone,
            website: data.website,
            hours: data.hours,
            rating: data.rating,
            owner_id: data.owner_id,
          });

        if (error) throw error;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(TABLES.RESTAURANTS)
          .delete()
          .eq('id', data.id);

        if (deleteError) throw deleteError;
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  private async syncMenuItemOperation(operation: string, data: any): Promise<void> {
    switch (operation) {
      case 'insert':
      case 'update':
        const { error } = await supabase
          .from(TABLES.MENU_ITEMS)
          .upsert({
            id: data.id,
            restaurant_id: data.restaurant_id,
            name: data.name,
            description: data.description,
            price: data.price,
            category: data.category,
            image: data.image,
            is_available: data.is_available,
          });

        if (error) throw error;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(TABLES.MENU_ITEMS)
          .delete()
          .eq('id', data.id);

        if (deleteError) throw deleteError;
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  private async syncRatingOperation(operation: string, data: any): Promise<void> {
    switch (operation) {
      case 'insert':
      case 'update':
        const { error } = await supabase
          .from(TABLES.RESTAURANT_RATINGS)
          .upsert({
            id: data.id,
            restaurant_id: data.restaurant_id,
            user_id: data.user_id,
            stars: data.stars,
            comment: data.comment,
          });

        if (error) throw error;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(TABLES.RESTAURANT_RATINGS)
          .delete()
          .eq('id', data.id);

        if (deleteError) throw deleteError;
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Pull restaurants from Supabase
   */
  private async pullRestaurants(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      errors: []
    };

    try {
      const { data, error } = await supabase
        .from(TABLES.RESTAURANTS)
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      for (const item of data || []) {
        try {
          // Check if we have this item locally
          const existingLocal = await localDatabase.getRestaurantById(item.id);

          let finalData: any = item;

          if (existingLocal && existingLocal.sync_status === 'synced') {
            // Check for conflicts
            const hasConflict = await this.checkForConflicts('restaurants', existingLocal, item);
            if (hasConflict) {
              console.log('⚠️ Conflict detected for restaurant:', item.id);
              finalData = this.resolveConflict(existingLocal, item);
            }
          }

          const restaurant: LocalRestaurant = {
            id: finalData.id,
            name: finalData.name,
            description: finalData.description || '',
            category: finalData.category || '',
            price_range: finalData.price_range || '$',
            latitude: parseFloat(finalData.latitude || finalData.location?.latitude || 40.7128),
            longitude: parseFloat(finalData.longitude || finalData.location?.longitude || -74.0060),
            image: finalData.image || '',
            phone: finalData.phone || '',
            website: finalData.website || '',
            hours: finalData.hours || '',
            rating: finalData.rating || 0,
            owner_id: finalData.owner_id,
            created_at: finalData.created_at,
            updated_at: finalData.updated_at,
            sync_status: 'synced'
          };

          await localDatabase.insertRestaurant(restaurant);
          result.syncedItems++;
        } catch (error: any) {
          result.failedItems++;
          result.errors.push(`Restaurant ${item.id}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Pull restaurants error: ${error.message}`);
    }

    return result;
  }

  /**
   * Pull menu items from Supabase
   */
  private async pullMenuItems(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      errors: []
    };

    try {
      const { data, error } = await supabase
        .from(TABLES.MENU_ITEMS)
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      for (const item of data || []) {
        try {
          const menuItem: LocalMenuItem = {
            id: item.id,
            restaurant_id: item.restaurant_id,
            name: item.name,
            description: item.description || '',
            price: item.price,
            category: item.category || '',
            image: item.image || '',
            is_available: item.is_available,
            created_at: item.created_at,
            updated_at: item.updated_at,
            sync_status: 'synced'
          };

          await localDatabase.insertMenuItem(menuItem);
          result.syncedItems++;
        } catch (error: any) {
          result.failedItems++;
          result.errors.push(`Menu item ${item.id}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Pull menu items error: ${error.message}`);
    }

    return result;
  }

  /**
   * Pull ratings from Supabase
   */
  private async pullRatings(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      errors: []
    };

    try {
      const { data, error } = await supabase
        .from(TABLES.RESTAURANT_RATINGS)
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      for (const item of data || []) {
        try {
          const rating: LocalRating = {
            id: item.id,
            restaurant_id: item.restaurant_id,
            user_id: item.user_id,
            stars: item.stars,
            comment: item.comment || '',
            created_at: item.created_at,
            updated_at: item.updated_at,
            sync_status: 'synced'
          };

          await localDatabase.insertRating(rating);
          result.syncedItems++;
        } catch (error: any) {
          result.failedItems++;
          result.errors.push(`Rating ${item.id}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Pull ratings error: ${error.message}`);
    }

    return result;
  }

  /**
   * Add a sync listener
   */
  addSyncListener(callback: (result: SyncResult) => void): () => void {
    this.syncListeners.push(callback);
    return () => {
      const index = this.syncListeners.indexOf(callback);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(result: SyncResult): void {
    this.syncListeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  /**
   * Check if sync is currently running
   */
  isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Force sync now (if online)
   */
  async forceSyncNow(): Promise<SyncResult> {
    return this.sync({ forceFullSync: true });
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    isOnline: boolean;
    isSyncing: boolean;
    localData: Awaited<ReturnType<typeof localDatabase.getStats>>;
    pendingOperations: number;
  }> {
    const [localStats, pendingOps] = await Promise.all([
      localDatabase.getStats(),
      localDatabase.getPendingOperations().then(ops => ops.length)
    ]);

    return {
      isOnline: networkService.isOnline(),
      isSyncing: this.isSyncing,
      localData: localStats,
      pendingOperations: pendingOps
    };
  }

  /**
   * Resolve conflicts between local and remote data
   * Uses "last write wins" strategy based on updated_at timestamp
   */
  private resolveConflict(localData: any, remoteData: any): any {
    const localTime = new Date(localData.updated_at).getTime();
    const remoteTime = new Date(remoteData.updated_at).getTime();

    // Last write wins
    if (localTime > remoteTime) {
      console.log('⚖️ Conflict resolved: local data wins');
      return localData;
    } else {
      console.log('⚖️ Conflict resolved: remote data wins');
      return remoteData;
    }
  }

  /**
   * Check for conflicts when syncing data
   */
  private async checkForConflicts(tableName: string, localData: any, remoteData: any): Promise<boolean> {
    // For now, assume conflict if both have been modified (different updated_at)
    const localTime = new Date(localData.updated_at).getTime();
    const remoteTime = new Date(remoteData.updated_at).getTime();
    const timeDiff = Math.abs(localTime - remoteTime);

    // If timestamps differ by more than 5 seconds, consider it a conflict
    return timeDiff > 5000;
  }
}

// Export singleton instance
export const syncService = new SyncService();
