import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_DIR = `${FileSystem.cacheDirectory}restaurant-images/`;
const IMAGE_CACHE_KEY = 'cached_image_urls';
const MAX_CACHE_SIZE_MB = 50; // 50MB max cache size

interface CachedImage {
  url: string;
  localPath: string;
  timestamp: number;
  size: number;
}

export class ImageCacheService {
  /**
   * Initialize cache directory
   */
  static async initCache(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
        console.log('📁 Created image cache directory');
      }
    } catch (error) {
      console.error('❌ Failed to initialize cache directory:', error);
    }
  }

  /**
   * Get cached image or download if not cached
   */
  static async getCachedImage(url: string): Promise<string> {
    if (!url || !url.startsWith('http')) {
      return url; // Return as-is if not a URL
    }

    try {
      // Check if image is already cached
      const cache = await this.getImageCache();
      const cached = cache.find(img => img.url === url);

      if (cached) {
        // Check if cached file still exists
        const fileInfo = await FileSystem.getInfoAsync(cached.localPath);
        if (fileInfo.exists) {
          console.log('📷 Using cached image:', url);
          return cached.localPath;
        } else {
          // Remove from cache if file doesn't exist
          await this.removeCachedImage(url);
        }
      }

      // Download and cache the image
      return await this.downloadAndCacheImage(url);
    } catch (error) {
      console.error('❌ Failed to get cached image:', error);
      return url; // Return original URL on error
    }
  }

  /**
   * Download and cache an image
   */
  static async downloadAndCacheImage(url: string): Promise<string> {
    try {
      await this.initCache();

      // Generate filename from URL
      const filename = this.getFilenameFromUrl(url);
      const localPath = `${CACHE_DIR}${filename}`;

      // Download the image
      console.log('📥 Downloading image:', url);
      const downloadResult = await FileSystem.downloadAsync(url, localPath);

      if (downloadResult.status === 200) {
        // Get file size
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        const size = fileInfo.size || 0;

        // Add to cache index
        const cache = await this.getImageCache();
        cache.push({
          url,
          localPath,
          timestamp: Date.now(),
          size,
        });

        await this.saveImageCache(cache);
        await this.enforceMaxCacheSize();

        console.log('✅ Cached image:', url);
        return localPath;
      } else {
        console.error('❌ Failed to download image:', downloadResult.status);
        return url;
      }
    } catch (error) {
      console.error('❌ Failed to download and cache image:', error);
      return url;
    }
  }

  /**
   * Get image cache index
   */
  static async getImageCache(): Promise<CachedImage[]> {
    try {
      const cacheData = await AsyncStorage.getItem(IMAGE_CACHE_KEY);
      return cacheData ? JSON.parse(cacheData) : [];
    } catch (error) {
      console.error('❌ Failed to get image cache:', error);
      return [];
    }
  }

  /**
   * Save image cache index
   */
  static async saveImageCache(cache: CachedImage[]): Promise<void> {
    try {
      await AsyncStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('❌ Failed to save image cache:', error);
    }
  }

  /**
   * Remove cached image
   */
  static async removeCachedImage(url: string): Promise<void> {
    try {
      const cache = await this.getImageCache();
      const cached = cache.find(img => img.url === url);

      if (cached) {
        // Delete file
        await FileSystem.deleteAsync(cached.localPath, { idempotent: true });

        // Remove from cache index
        const updatedCache = cache.filter(img => img.url !== url);
        await this.saveImageCache(updatedCache);

        console.log('🗑️ Removed cached image:', url);
      }
    } catch (error) {
      console.error('❌ Failed to remove cached image:', error);
    }
  }

  /**
   * Enforce maximum cache size
   */
  static async enforceMaxCacheSize(): Promise<void> {
    try {
      const cache = await this.getImageCache();
      const totalSize = cache.reduce((sum, img) => sum + img.size, 0);
      const maxSizeBytes = MAX_CACHE_SIZE_MB * 1024 * 1024;

      if (totalSize > maxSizeBytes) {
        console.log('⚠️ Cache size exceeded, cleaning up...');

        // Sort by timestamp (oldest first)
        cache.sort((a, b) => a.timestamp - b.timestamp);

        let currentSize = totalSize;
        const toRemove: string[] = [];

        // Remove oldest images until under limit
        for (const img of cache) {
          if (currentSize <= maxSizeBytes) break;

          toRemove.push(img.url);
          currentSize -= img.size;
        }

        // Remove images
        for (const url of toRemove) {
          await this.removeCachedImage(url);
        }

        console.log(`🗑️ Removed ${toRemove.length} old images from cache`);
      }
    } catch (error) {
      console.error('❌ Failed to enforce cache size:', error);
    }
  }

  /**
   * Clear all cached images
   */
  static async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      await AsyncStorage.removeItem(IMAGE_CACHE_KEY);
      console.log('🗑️ Cleared all cached images');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  /**
   * Get cache size info
   */
  static async getCacheInfo(): Promise<{ count: number; sizeMB: number }> {
    try {
      const cache = await this.getImageCache();
      const totalSize = cache.reduce((sum, img) => sum + img.size, 0);
      return {
        count: cache.length,
        sizeMB: totalSize / (1024 * 1024),
      };
    } catch (error) {
      console.error('❌ Failed to get cache info:', error);
      return { count: 0, sizeMB: 0 };
    }
  }

  /**
   * Preload images for restaurants
   */
  static async preloadRestaurantImages(imageUrls: string[]): Promise<void> {
    console.log(`📥 Preloading ${imageUrls.length} restaurant images...`);

    for (const url of imageUrls) {
      try {
        await this.getCachedImage(url);
      } catch (error) {
        console.error('❌ Failed to preload image:', url, error);
      }
    }

    console.log('✅ Finished preloading images');
  }

  /**
   * Generate filename from URL
   */
  private static getFilenameFromUrl(url: string): string {
    // Create a hash-like filename from URL
    const hash = url.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);

    const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
    return `img_${Math.abs(hash)}.${extension}`;
  }
}
