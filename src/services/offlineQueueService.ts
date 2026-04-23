import AsyncStorage from '@react-native-async-storage/async-storage';
import { submitRating } from './ratingsService';
import { submitDeviceRating } from './deviceRatingsService';
import { toggleDeviceFavorite } from './deviceFavoritesService';

const QUEUE_KEY = 'offline_action_queue';

export interface QueuedAction {
  id: string;
  type: 'rating' | 'device_rating' | 'favorite' | 'restaurant_create';
  data: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
}

export class OfflineQueueService {
  /**
   * Add action to offline queue
   */
  static async enqueueAction(type: QueuedAction['type'], data: any): Promise<void> {
    try {
      const queue = await this.getQueue();
      const action: QueuedAction = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending'
      };
      
      queue.push(action);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      console.log('📥 Queued offline action:', type, action.id);
    } catch (error) {
      console.error('❌ Failed to enqueue action:', error);
      throw error;
    }
  }

  /**
   * Get all queued actions
   */
  static async getQueue(): Promise<QueuedAction[]> {
    try {
      const queueData = await AsyncStorage.getItem(QUEUE_KEY);
      if (!queueData) return [];
      return JSON.parse(queueData);
    } catch (error) {
      console.error('❌ Failed to get queue:', error);
      return [];
    }
  }

  /**
   * Get pending actions count
   */
  static async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.filter(a => a.status === 'pending').length;
  }

  /**
   * Process all queued actions
   */
  static async processQueue(): Promise<{ success: number; failed: number }> {
    const queue = await this.getQueue();
    const pendingActions = queue.filter(a => a.status === 'pending');
    
    if (pendingActions.length === 0) {
      console.log('📤 No pending actions to sync');
      return { success: 0, failed: 0 };
    }

    console.log(`📤 Processing ${pendingActions.length} queued actions...`);
    
    let successCount = 0;
    let failedCount = 0;
    const updatedQueue: QueuedAction[] = [];

    for (const action of queue) {
      if (action.status !== 'pending') {
        // Keep non-pending actions as-is
        updatedQueue.push(action);
        continue;
      }

      try {
        action.status = 'syncing';
        await this.executeAction(action);
        
        // Success - don't add to updated queue (remove it)
        successCount++;
        console.log('✅ Synced action:', action.type, action.id);
      } catch (error) {
        console.error('❌ Failed to sync action:', action.type, action.id, error);
        action.status = 'failed';
        action.retryCount++;
        
        // Keep failed actions for retry (up to 3 attempts)
        if (action.retryCount < 3) {
          action.status = 'pending';
          updatedQueue.push(action);
        } else {
          console.log('⚠️ Action exceeded retry limit, discarding:', action.id);
        }
        failedCount++;
      }
    }

    // Save updated queue
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));
    console.log(`📤 Sync complete: ${successCount} success, ${failedCount} failed`);
    
    return { success: successCount, failed: failedCount };
  }

  /**
   * Execute a single queued action
   */
  private static async executeAction(action: QueuedAction): Promise<void> {
    switch (action.type) {
      case 'rating':
        await submitRating(
          action.data.restaurantId,
          action.data.userId,
          action.data.stars,
          action.data.comment
        );
        break;
        
      case 'device_rating':
        await submitDeviceRating(
          action.data.restaurantId,
          action.data.deviceId,
          action.data.stars,
          action.data.comment
        );
        break;
        
      case 'favorite':
        // Toggle favorite (will add or remove based on current state)
        await toggleDeviceFavorite(action.data.restaurantId);
        console.log('❤️ Synced favorite action for restaurant:', action.data.restaurantId);
        break;
        
      case 'restaurant_create':
        // TODO: Implement restaurant creation sync
        console.log('⚠️ Restaurant creation sync not yet implemented');
        break;
        
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Clear all queued actions
   */
  static async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(QUEUE_KEY);
      console.log('📤 Cleared action queue');
    } catch (error) {
      console.error('❌ Failed to clear queue:', error);
    }
  }

  /**
   * Remove specific action from queue
   */
  static async removeAction(actionId: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const filtered = queue.filter(a => a.id !== actionId);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
      console.log('📤 Removed action from queue:', actionId);
    } catch (error) {
      console.error('❌ Failed to remove action:', error);
    }
  }
}
