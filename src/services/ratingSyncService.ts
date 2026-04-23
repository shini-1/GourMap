import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, TABLES } from '../config/supabase';

interface Rating {
  id: string;
  restaurantId: string;
  userId: string;
  rating: number; // 1-5 stars
  review?: string;
  timestamp: string;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
  lastSyncAttempt?: string;
  conflictResolution?: 'local' | 'remote' | 'merge';
}

interface RatingSyncQueue {
  id: string;
  action: 'create' | 'update' | 'delete';
  rating: Rating;
  timestamp: string;
  retryCount: number;
  lastRetry?: string;
}

interface RatingConflict {
  localRating: Rating;
  remoteRating: Rating;
  conflictType: 'rating_value' | 'review_text' | 'both';
  resolution?: 'local' | 'remote' | 'merge';
}

class RatingSyncService {
  private static instance: RatingSyncService;
  private syncQueue: RatingSyncQueue[] = [];
  private conflicts: Map<string, RatingConflict> = new Map();
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private listeners: ((status: RatingSyncStatus) => void)[] = [];
  
  private readonly RATING_QUEUE_KEY = '@gourmap_rating_queue';
  private readonly RATING_CONFLICTS_KEY = '@gourmap_rating_conflicts';
  private readonly MAX_RETRY_COUNT = 3;
  private readonly SYNC_RETRY_DELAY = 5000; // 5 seconds

  static getInstance(): RatingSyncService {
    if (!RatingSyncService.instance) {
      RatingSyncService.instance = new RatingSyncService();
    }
    return RatingSyncService.instance;
  }

  // Subscribe to sync status changes
  subscribe(listener: (status: RatingSyncStatus) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify listeners of sync status changes
  private notifyListeners(status: RatingSyncStatus): void {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('❌ Error notifying rating sync listener:', error);
      }
    });
  }

  // Initialize sync service
  async initialize(): Promise<void> {
    try {
      await this.loadSyncQueue();
      await this.loadConflicts();
      await this.startSyncProcess();
      console.log('✅ Rating sync service initialized');
    } catch (error) {
      console.error('❌ Error initializing rating sync service:', error);
    }
  }

  // Add or update a rating
  async addRating(ratingData: Omit<Rating, 'id' | 'timestamp' | 'syncStatus'>): Promise<string> {
    try {
      const rating: Rating = {
        ...ratingData,
        id: `rating_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        syncStatus: 'pending'
      };

      // Save to local storage
      await this.saveRatingLocal(rating);

      // Add to sync queue
      const queueItem: RatingSyncQueue = {
        id: `queue_${Date.now()}`,
        action: 'create',
        rating,
        timestamp: new Date().toISOString(),
        retryCount: 0
      };

      this.syncQueue.push(queueItem);
      await this.saveSyncQueue();

      // Attempt immediate sync if online
      if (this.isOnline) {
        await this.processSyncQueue();
      }

      console.log('✅ Rating added to sync queue:', rating.id);
      return rating.id;
    } catch (error) {
      console.error('❌ Error adding rating:', error);
      throw error;
    }
  }

  // Update an existing rating
  async updateRating(ratingId: string, updates: Partial<Pick<Rating, 'rating' | 'review'>>): Promise<void> {
    try {
      const existingRating = await this.getRatingLocal(ratingId);
      if (!existingRating) {
        throw new Error('Rating not found');
      }

      const updatedRating: Rating = {
        ...existingRating,
        ...updates,
        timestamp: new Date().toISOString(),
        syncStatus: 'pending'
      };

      // Save updated rating locally
      await this.saveRatingLocal(updatedRating);

      // Add to sync queue
      const queueItem: RatingSyncQueue = {
        id: `queue_${Date.now()}`,
        action: 'update',
        rating: updatedRating,
        timestamp: new Date().toISOString(),
        retryCount: 0
      };

      this.syncQueue.push(queueItem);
      await this.saveSyncQueue();

      // Attempt immediate sync if online
      if (this.isOnline) {
        await this.processSyncQueue();
      }

      console.log('✅ Rating update added to sync queue:', ratingId);
    } catch (error) {
      console.error('❌ Error updating rating:', error);
      throw error;
    }
  }

  // Delete a rating
  async deleteRating(ratingId: string): Promise<void> {
    try {
      const existingRating = await this.getRatingLocal(ratingId);
      if (!existingRating) {
        throw new Error('Rating not found');
      }

      // Mark as deleted locally
      const deletedRating: Rating = {
        ...existingRating,
        syncStatus: 'pending'
      };

      // Add to sync queue
      const queueItem: RatingSyncQueue = {
        id: `queue_${Date.now()}`,
        action: 'delete',
        rating: deletedRating,
        timestamp: new Date().toISOString(),
        retryCount: 0
      };

      this.syncQueue.push(queueItem);
      await this.saveSyncQueue();

      // Remove from local storage (will be restored if sync fails)
      await AsyncStorage.removeItem(`rating_${ratingId}`);

      // Attempt immediate sync if online
      if (this.isOnline) {
        await this.processSyncQueue();
      }

      console.log('✅ Rating deletion added to sync queue:', ratingId);
    } catch (error) {
      console.error('❌ Error deleting rating:', error);
      throw error;
    }
  }

  // Get rating from local storage
  async getRatingLocal(ratingId: string): Promise<Rating | null> {
    try {
      const ratingData = await AsyncStorage.getItem(`rating_${ratingId}`);
      return ratingData ? JSON.parse(ratingData) : null;
    } catch (error) {
      console.error('❌ Error getting rating from local storage:', error);
      return null;
    }
  }

  // Save rating to local storage
  private async saveRatingLocal(rating: Rating): Promise<void> {
    try {
      await AsyncStorage.setItem(`rating_${rating.id}`, JSON.stringify(rating));
    } catch (error) {
      console.error('❌ Error saving rating locally:', error);
      throw error;
    }
  }

  // Process sync queue
  private async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    this.notifyListeners({ status: 'syncing', queueLength: this.syncQueue.length });

    try {
      const queueToProcess = [...this.syncQueue];
      const failedItems: RatingSyncQueue[] = [];

      for (const queueItem of queueToProcess) {
        try {
          await this.processQueueItem(queueItem);
          
          // Remove processed item from queue
          const index = this.syncQueue.findIndex(item => item.id === queueItem.id);
          if (index > -1) {
            this.syncQueue.splice(index, 1);
          }
        } catch (error) {
          console.error(`❌ Failed to process queue item ${queueItem.id}:`, error);
          
          // Increment retry count
          queueItem.retryCount++;
          queueItem.lastRetry = new Date().toISOString();

          if (queueItem.retryCount >= this.MAX_RETRY_COUNT) {
            // Mark as error
            queueItem.rating.syncStatus = 'error';
            await this.saveRatingLocal(queueItem.rating);
          } else {
            failedItems.push(queueItem);
          }
        }
      }

      // Update queue
      this.syncQueue = [...failedItems];
      await this.saveSyncQueue();

      this.notifyListeners({ 
        status: 'completed', 
        queueLength: this.syncQueue.length,
        conflictsCount: this.conflicts.size
      });

    } catch (error) {
      console.error('❌ Error processing sync queue:', error);
      this.notifyListeners({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      this.syncInProgress = false;
    }
  }

  // Process individual queue item
  private async processQueueItem(queueItem: RatingSyncQueue): Promise<void> {
    const { action, rating } = queueItem;

    switch (action) {
      case 'create':
        await this.createRatingRemote(rating);
        break;
      case 'update':
        await this.updateRatingRemote(rating);
        break;
      case 'delete':
        await this.deleteRatingRemote(rating);
        break;
    }

    // Mark as synced
    rating.syncStatus = 'synced';
    rating.lastSyncAttempt = new Date().toISOString();
    await this.saveRatingLocal(rating);
  }

  // Create rating on remote server
  private async createRatingRemote(rating: Rating): Promise<void> {
    const { data, error } = await supabase
      .from(TABLES.RATINGS)
      .insert({
        id: rating.id,
        restaurant_id: rating.restaurantId,
        user_id: rating.userId,
        rating: rating.rating,
        review: rating.review,
        created_at: rating.timestamp,
        updated_at: rating.timestamp
      });

    if (error) {
      // Check for conflict
      if (error.code === '23505') { // Unique violation
        await this.handleRatingConflict(rating, 'create');
      } else {
        throw error;
      }
    }
  }

  // Update rating on remote server
  private async updateRatingRemote(rating: Rating): Promise<void> {
    const { data, error } = await supabase
      .from(TABLES.RATINGS)
      .update({
        rating: rating.rating,
        review: rating.review,
        updated_at: new Date().toISOString()
      })
      .eq('id', rating.id)
      .eq('user_id', rating.userId);

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        await this.handleRatingConflict(rating, 'update');
      } else {
        throw error;
      }
    }
  }

  // Delete rating on remote server
  private async deleteRatingRemote(rating: Rating): Promise<void> {
    const { error } = await supabase
      .from(TABLES.RATINGS)
      .delete()
      .eq('id', rating.id)
      .eq('user_id', rating.userId);

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        console.warn('⚠️ Rating not found on remote, may have been deleted already');
      } else {
        throw error;
      }
    }
  }

  // Handle rating conflicts
  private async handleRatingConflict(localRating: Rating, action: 'create' | 'update'): Promise<void> {
    try {
      // Get remote rating
      const { data: remoteRating, error } = await supabase
        .from(TABLES.RATINGS)
        .select('*')
        .eq('restaurant_id', localRating.restaurantId)
        .eq('user_id', localRating.userId)
        .single();

      if (error || !remoteRating) {
        throw new Error('Unable to fetch remote rating for conflict resolution');
      }

      const conflict: RatingConflict = {
        localRating,
        remoteRating: {
          id: remoteRating.id,
          restaurantId: remoteRating.restaurant_id,
          userId: remoteRating.user_id,
          rating: remoteRating.rating,
          review: remoteRating.review,
          timestamp: remoteRating.updated_at || remoteRating.created_at,
          syncStatus: 'synced'
        },
        conflictType: this.determineConflictType(localRating, remoteRating)
      };

      this.conflicts.set(localRating.id, conflict);
      await this.saveConflicts();

      // Mark local rating as conflicted
      localRating.syncStatus = 'conflict';
      await this.saveRatingLocal(localRating);

      console.warn('⚠️ Rating conflict detected:', conflict);
    } catch (error) {
      console.error('❌ Error handling rating conflict:', error);
      throw error;
    }
  }

  // Determine conflict type
  private determineConflictType(local: Rating, remote: Rating): 'rating_value' | 'review_text' | 'both' {
    const ratingDiff = local.rating !== remote.rating;
    const reviewDiff = local.review !== remote.review;
    
    if (ratingDiff && reviewDiff) return 'both';
    if (ratingDiff) return 'rating_value';
    return 'review_text';
  }

  // Resolve rating conflict
  async resolveConflict(ratingId: string, resolution: 'local' | 'remote' | 'merge'): Promise<void> {
    try {
      const conflict = this.conflicts.get(ratingId);
      if (!conflict) {
        throw new Error('Conflict not found');
      }

      let finalRating: Rating;

      switch (resolution) {
        case 'local':
          finalRating = conflict.localRating;
          await this.updateRatingRemote(finalRating);
          break;
        case 'remote':
          finalRating = conflict.remoteRating;
          await this.saveRatingLocal(finalRating);
          break;
        case 'merge':
          finalRating = {
            ...conflict.localRating,
            rating: Math.max(conflict.localRating.rating, conflict.remoteRating.rating),
            review: conflict.localRating.review || conflict.remoteRating.review
          };
          await this.updateRatingRemote(finalRating);
          await this.saveRatingLocal(finalRating);
          break;
      }

      finalRating.syncStatus = 'synced';
      finalRating.conflictResolution = resolution;
      await this.saveRatingLocal(finalRating);

      // Remove from conflicts
      this.conflicts.delete(ratingId);
      await this.saveConflicts();

      console.log('✅ Rating conflict resolved:', ratingId, resolution);
    } catch (error) {
      console.error('❌ Error resolving rating conflict:', error);
      throw error;
    }
  }

  // Get all ratings for a restaurant
  async getRatingsForRestaurant(restaurantId: string): Promise<Rating[]> {
    try {
      // Try to get from remote first if online
      if (this.isOnline) {
        const { data, error } = await supabase
          .from(TABLES.RATINGS)
          .select('*')
          .eq('restaurant_id', restaurantId);

        if (!error && data) {
          // Save to local cache
          for (const ratingData of data) {
            const rating: Rating = {
              id: ratingData.id,
              restaurantId: ratingData.restaurant_id,
              userId: ratingData.user_id,
              rating: ratingData.rating,
              review: ratingData.review,
              timestamp: ratingData.updated_at || ratingData.created_at,
              syncStatus: 'synced'
            };
            await this.saveRatingLocal(rating);
          }
        }
      }

      // Get all local ratings for this restaurant
      const keys = await AsyncStorage.getAllKeys();
      const ratingKeys = keys.filter(key => key.startsWith('rating_'));
      const ratings: Rating[] = [];

      for (const key of ratingKeys) {
        try {
          const ratingData = await AsyncStorage.getItem(key);
          if (ratingData) {
            const rating: Rating = JSON.parse(ratingData);
            if (rating.restaurantId === restaurantId) {
              ratings.push(rating);
            }
          }
        } catch (error) {
          console.error(`❌ Error parsing rating from key ${key}:`, error);
        }
      }

      return ratings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('❌ Error getting ratings for restaurant:', error);
      return [];
    }
  }

  // Calculate average rating for a restaurant
  async getAverageRating(restaurantId: string): Promise<{ rating: number; count: number }> {
    try {
      const ratings = await this.getRatingsForRestaurant(restaurantId);
      const validRatings = ratings.filter(r => r.syncStatus !== 'error');
      
      if (validRatings.length === 0) {
        return { rating: 0, count: 0 };
      }

      const totalRating = validRatings.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = totalRating / validRatings.length;

      return { rating: Math.round(averageRating * 10) / 10, count: validRatings.length };
    } catch (error) {
      console.error('❌ Error calculating average rating:', error);
      return { rating: 0, count: 0 };
    }
  }

  // Set online status
  setOnlineStatus(isOnline: boolean): void {
    this.isOnline = isOnline;
    if (isOnline) {
      this.startSyncProcess();
    }
  }

  // Start sync process
  private async startSyncProcess(): Promise<void> {
    if (this.syncQueue.length > 0) {
      await this.processSyncQueue();
    }
  }

  // Get sync status
  getSyncStatus(): RatingSyncStatus {
    return {
      status: this.syncInProgress ? 'syncing' : 'idle',
      queueLength: this.syncQueue.length,
      conflictsCount: this.conflicts.size,
      isOnline: this.isOnline
    };
  }

  // Load sync queue from storage
  private async loadSyncQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(this.RATING_QUEUE_KEY);
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('❌ Error loading sync queue:', error);
    }
  }

  // Save sync queue to storage
  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.RATING_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('❌ Error saving sync queue:', error);
    }
  }

  // Load conflicts from storage
  private async loadConflicts(): Promise<void> {
    try {
      const conflictsData = await AsyncStorage.getItem(this.RATING_CONFLICTS_KEY);
      if (conflictsData) {
        const conflictsArray = JSON.parse(conflictsData);
        this.conflicts = new Map(conflictsArray);
      }
    } catch (error) {
      console.error('❌ Error loading conflicts:', error);
    }
  }

  // Save conflicts to storage
  private async saveConflicts(): Promise<void> {
    try {
      const conflictsArray = Array.from(this.conflicts.entries());
      await AsyncStorage.setItem(this.RATING_CONFLICTS_KEY, JSON.stringify(conflictsArray));
    } catch (error) {
      console.error('❌ Error saving conflicts:', error);
    }
  }
}

export interface RatingSyncStatus {
  status: 'idle' | 'syncing' | 'completed' | 'error';
  queueLength: number;
  conflictsCount?: number;
  isOnline?: boolean;
  error?: string;
}

export const ratingSyncService = RatingSyncService.getInstance();
export type { Rating, RatingSyncQueue, RatingConflict };
