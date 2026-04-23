import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, TABLES } from '../config/supabase';

interface CacheStatus {
  isDownloading: boolean;
  downloadProgress: number; // 0-100
  totalItems: number;
  downloadedItems: number;
  cacheSize: number; // in bytes
  lastUpdated: string;
  isComplete: boolean;
  error?: string;
}

interface CacheMetrics {
  restaurantCount: number;
  ratingCount: number;
  imageSizeCount: number;
  totalCacheSize: number;
  cacheHealth: 'excellent' | 'good' | 'fair' | 'poor';
  lastSyncTime: string;
}

class CacheStatusService {
  private static instance: CacheStatusService;
  private cacheStatus: CacheStatus = {
    isDownloading: false,
    downloadProgress: 0,
    totalItems: 0,
    downloadedItems: 0,
    cacheSize: 0,
    lastUpdated: new Date().toISOString(),
    isComplete: false
  };
  private listeners: ((status: CacheStatus) => void)[] = [];
  private CACHE_STATUS_KEY = '@gourmap_cache_status';
  private CACHE_METRICS_KEY = '@gourmap_cache_metrics';

  static getInstance(): CacheStatusService {
    if (!CacheStatusService.instance) {
      CacheStatusService.instance = new CacheStatusService();
    }
    return CacheStatusService.instance;
  }

  // Subscribe to cache status changes
  subscribe(listener: (status: CacheStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.cacheStatus); // Immediately send current status
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners of status changes
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.cacheStatus);
      } catch (error) {
        console.error('❌ Error notifying cache status listener:', error);
      }
    });
  }

  // Update cache status
  private updateStatus(updates: Partial<CacheStatus>): void {
    this.cacheStatus = { ...this.cacheStatus, ...updates };
    this.cacheStatus.lastUpdated = new Date().toISOString();
    this.saveCacheStatus();
    this.notifyListeners();
  }

  // Start cache download process
  async startCacheDownload(): Promise<void> {
    console.log('🔄 Starting cache download process...');
    
    try {
      this.updateStatus({
        isDownloading: true,
        downloadProgress: 0,
        error: undefined
      });

      // Get total items to download
      const { count: totalRestaurants } = await supabase
        .from(TABLES.RESTAURANTS)
        .select('*', { count: 'exact', head: true });

      const totalItems = totalRestaurants || 0;
      this.updateStatus({ totalItems });

      console.log(`📊 Starting download of ${totalItems} restaurants`);

      // Download restaurants in batches
      const batchSize = 20;
      let downloadedItems = 0;

      for (let offset = 0; offset < totalItems; offset += batchSize) {
        try {
          const { data: restaurants, error } = await supabase
            .from(TABLES.RESTAURANTS)
            .select('*')
            .range(offset, offset + batchSize - 1);

          if (error) throw error;

          if (restaurants) {
            // Process and cache each restaurant
            for (const restaurant of restaurants) {
              await this.cacheRestaurant(restaurant);
              downloadedItems++;
              
              const progress = Math.round((downloadedItems / totalItems) * 100);
              this.updateStatus({
                downloadedItems,
                downloadProgress: progress
              });

              // Add small delay to prevent overwhelming the system
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }

          console.log(`📦 Downloaded batch ${Math.floor(offset / batchSize) + 1}/${Math.ceil(totalItems / batchSize)}`);
        } catch (batchError) {
          console.error('❌ Error downloading batch:', batchError);
          // Continue with next batch instead of failing completely
        }
      }

      // Calculate final cache size
      const cacheSize = await this.calculateCacheSize();
      
      this.updateStatus({
        isDownloading: false,
        isComplete: true,
        downloadProgress: 100,
        cacheSize
      });

      console.log('✅ Cache download completed successfully');
      
    } catch (error) {
      console.error('❌ Cache download failed:', error);
      this.updateStatus({
        isDownloading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Cache individual restaurant data
  private async cacheRestaurant(restaurant: any): Promise<void> {
    try {
      // Store restaurant in AsyncStorage
      const restaurantKey = `restaurant_${restaurant.id}`;
      await AsyncStorage.setItem(restaurantKey, JSON.stringify(restaurant));
      
      // Cache restaurant image if available
      if (restaurant.image) {
        await this.cacheImage(restaurant.image, restaurant.id);
      }
      
    } catch (error) {
      console.error(`❌ Error caching restaurant ${restaurant.id}:`, error);
    }
  }

  // Cache restaurant image
  private async cacheImage(imageUrl: string, restaurantId: string): Promise<void> {
    try {
      // For now, just store the URL reference
      // In a full implementation, you would download and store the actual image
      const imageKey = `image_${restaurantId}`;
      await AsyncStorage.setItem(imageKey, imageUrl);
    } catch (error) {
      console.error(`❌ Error caching image for restaurant ${restaurantId}:`, error);
    }
  }

  // Calculate total cache size
  private async calculateCacheSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith('restaurant_') || key.startsWith('image_') || key.startsWith('rating_')
      );
      
      let totalSize = 0;
      for (const key of cacheKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            // Rough estimation: each character ~ 1 byte
            totalSize += value.length;
          }
        } catch (error) {
          console.error(`❌ Error calculating size for key ${key}:`, error);
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('❌ Error calculating cache size:', error);
      return 0;
    }
  }

  // Get cache metrics
  async getCacheMetrics(): Promise<CacheMetrics> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const restaurantKeys = keys.filter(key => key.startsWith('restaurant_'));
      const ratingKeys = keys.filter(key => key.startsWith('rating_'));
      const imageKeys = keys.filter(key => key.startsWith('image_'));

      const totalCacheSize = await this.calculateCacheSize();
      
      // Determine cache health based on completeness and freshness
      const cacheHealth = this.determineCacheHealth(restaurantKeys.length, totalCacheSize);

      return {
        restaurantCount: restaurantKeys.length,
        ratingCount: ratingKeys.length,
        imageSizeCount: imageKeys.length,
        totalCacheSize,
        cacheHealth,
        lastSyncTime: this.cacheStatus.lastUpdated
      };
    } catch (error) {
      console.error('❌ Error getting cache metrics:', error);
      return {
        restaurantCount: 0,
        ratingCount: 0,
        imageSizeCount: 0,
        totalCacheSize: 0,
        cacheHealth: 'poor',
        lastSyncTime: new Date().toISOString()
      };
    }
  }

  // Determine cache health
  private determineCacheHealth(restaurantCount: number, cacheSize: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (restaurantCount >= 100 && cacheSize > 100000) return 'excellent';
    if (restaurantCount >= 50 && cacheSize > 50000) return 'good';
    if (restaurantCount >= 20 && cacheSize > 20000) return 'fair';
    return 'poor';
  }

  // Clear cache
  async clearCache(): Promise<void> {
    try {
      console.log('🗑️ Clearing cache...');
      
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith('restaurant_') || key.startsWith('image_') || key.startsWith('rating_')
      );

      await AsyncStorage.multiRemove(cacheKeys);
      
      this.updateStatus({
        downloadedItems: 0,
        downloadProgress: 0,
        cacheSize: 0,
        isComplete: false
      });

      console.log('✅ Cache cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      this.updateStatus({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get current cache status
  getCurrentStatus(): CacheStatus {
    return { ...this.cacheStatus };
  }

  // Check if cache is ready for offline mode
  isReadyForOffline(): boolean {
    return this.cacheStatus.isComplete && 
           this.cacheStatus.downloadedItems > 0 && 
           !this.cacheStatus.error;
  }

  // Save cache status to AsyncStorage
  private async saveCacheStatus(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CACHE_STATUS_KEY, JSON.stringify(this.cacheStatus));
    } catch (error) {
      console.error('❌ Error saving cache status:', error);
    }
  }

  // Load cache status from AsyncStorage
  async loadCacheStatus(): Promise<void> {
    try {
      const savedStatus = await AsyncStorage.getItem(this.CACHE_STATUS_KEY);
      if (savedStatus) {
        this.cacheStatus = JSON.parse(savedStatus);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('❌ Error loading cache status:', error);
    }
  }

  // Refresh cache
  async refreshCache(): Promise<void> {
    console.log('🔄 Refreshing cache...');
    await this.clearCache();
    await this.startCacheDownload();
  }
}

export const cacheStatusService = CacheStatusService.getInstance();
export type { CacheStatus, CacheMetrics };
