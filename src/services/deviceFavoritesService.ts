import { supabase, TABLES } from '../config/supabase';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'device_id';

/**
 * Get or generate a unique device ID
 */
export async function getDeviceId(): Promise<string> {
  try {
    // Try to get existing device ID from storage
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      // Generate new device ID using device info
      const brand = Device.brand || 'unknown';
      const modelName = Device.modelName || 'unknown';
      const osName = Device.osName || 'unknown';
      const osVersion = Device.osVersion || 'unknown';
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      
      deviceId = `${brand}_${modelName}_${osName}_${osVersion}_${timestamp}_${random}`;
      
      // Store for future use
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      console.log('📱 Generated new device ID:', deviceId);
    } else {
      console.log('📱 Using existing device ID:', deviceId);
    }
    
    return deviceId;
  } catch (error) {
    console.error('❌ Failed to get device ID:', error);
    // Fallback to timestamp + random
    return `fallback_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Toggle favorite status for a restaurant (device-based)
 */
export async function toggleDeviceFavorite(restaurantId: string): Promise<boolean> {
  try {
    const deviceId = await getDeviceId();
    
    // Check if already favorited
    const { data: existing, error: checkError } = await supabase
      .from(TABLES.RESTAURANT_DEVICE_FAVORITES)
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('device_id', deviceId)
      .maybeSingle();
    
    if (checkError) {
      // If table doesn't exist, throw friendly error
      if (checkError.message?.includes('does not exist') || checkError.code === '42P01') {
        throw new Error('Favorites feature not yet set up. Please run the database migration.');
      }
      throw new Error(checkError.message);
    }
    
    if (existing) {
      // Remove favorite
      const { error: deleteError } = await supabase
        .from(TABLES.RESTAURANT_DEVICE_FAVORITES)
        .delete()
        .eq('id', existing.id);
      
      if (deleteError) throw new Error(deleteError.message);
      console.log('💔 Removed favorite for restaurant:', restaurantId);
      return false; // Not favorited anymore
    } else {
      // Add favorite
      const { error: insertError } = await supabase
        .from(TABLES.RESTAURANT_DEVICE_FAVORITES)
        .insert({
          restaurant_id: restaurantId,
          device_id: deviceId,
          created_at: new Date().toISOString(),
        });
      
      if (insertError) throw new Error(insertError.message);
      console.log('❤️ Added favorite for restaurant:', restaurantId);
      return true; // Now favorited
    }
  } catch (error: any) {
    console.error('❌ Failed to toggle favorite:', error);
    throw error;
  }
}

/**
 * Check if a restaurant is favorited by this device
 */
export async function isDeviceFavorite(restaurantId: string): Promise<boolean> {
  try {
    const deviceId = await getDeviceId();
    
    const { data, error } = await supabase
      .from(TABLES.RESTAURANT_DEVICE_FAVORITES)
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('device_id', deviceId)
      .maybeSingle();
    
    if (error) throw new Error(error.message);
    return !!data;
  } catch (error) {
    console.error('❌ Failed to check favorite status:', error);
    return false;
  }
}

/**
 * Get all favorite restaurant IDs for this device
 */
export async function getDeviceFavorites(): Promise<string[]> {
  try {
    const deviceId = await getDeviceId();
    
    const { data, error } = await supabase
      .from(TABLES.RESTAURANT_DEVICE_FAVORITES)
      .select('restaurant_id')
      .eq('device_id', deviceId);
    
    if (error) {
      // If table doesn't exist, just return empty array
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.warn('⚠️ Favorites table not yet created. Run CREATE_DEVICE_FAVORITES_TABLE.sql');
        return [];
      }
      throw new Error(error.message);
    }
    return (data || []).map(item => item.restaurant_id);
  } catch (error) {
    console.error('❌ Failed to get device favorites:', error);
    return [];
  }
}

/**
 * Get favorite count for a restaurant
 */
export async function getFavoriteCount(restaurantId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from(TABLES.RESTAURANT_DEVICE_FAVORITES)
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId);
    
    if (error) throw new Error(error.message);
    return count || 0;
  } catch (error) {
    console.error('❌ Failed to get favorite count:', error);
    return 0;
  }
}
