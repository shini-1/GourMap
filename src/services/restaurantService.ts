import { supabase, TABLES } from '../config/supabase';
import { Restaurant } from '../../types';
import { networkService } from './networkService';
import { localDatabase } from './localDatabase';
import { syncService } from './syncService';
import { offlineAuthService } from './offlineAuthService';

/**
 * Check if offline mode should be enabled for the current user
 * Only food explorers (role: 'user') should have offline mode
 */
async function shouldUseOfflineMode(): Promise<boolean> {
  try {
    const role = await offlineAuthService.getUserRole();
    return role === 'user' && networkService.isOffline();
  } catch (error) {
    console.log('❌ Error checking offline mode:', error);
    // If we can't determine role, assume online mode
    return false;
  }
}

export interface CreateRestaurantData {
  name: string;
  description?: string;
  category?: string;
  priceRange?: string;
  location: string; // We'll parse this into coordinates
  imageUrl?: string;
  phone?: string;
  website?: string;
  hours?: string;
}

class RestaurantService {
  private readonly RESTAURANTS_TABLE = TABLES.RESTAURANTS;

  /**
   * Create a new restaurant
   */
  async createRestaurant(restaurantData: CreateRestaurantData): Promise<Restaurant> {
    try {
      console.log('🍽️ Creating restaurant:', restaurantData);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Check if user already has a restaurant (with error handling)
      try {
        const existingRestaurant = await this.getRestaurantByOwnerId(user.id);
        if (existingRestaurant) {
          throw new Error('You can only create one restaurant per account');
        }
      } catch (checkError: any) {
        // If the check fails for any reason other than "no restaurant found", log but continue
        // This prevents crashes when the database is unavailable
        if (checkError.message?.includes('only create one')) {
          throw checkError; // Re-throw if it's the "already has restaurant" error
        }
        console.warn('⚠️ Could not verify existing restaurant, proceeding with creation:', checkError.message);
      }

      // Parse location string into coordinates (basic implementation)
      // In a real app, you'd use geocoding service
      const location = this.parseLocationString(restaurantData.location);

      const restaurantId = `restaurant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const localRestaurantData = {
        id: restaurantId,
        name: restaurantData.name,
        description: restaurantData.description || '',
        category: restaurantData.category || '',
        price_range: restaurantData.priceRange || '$',
        latitude: location.latitude,
        longitude: location.longitude,
        image: restaurantData.imageUrl || '',
        phone: restaurantData.phone || '',
        website: restaurantData.website || '',
        hours: restaurantData.hours || '',
        rating: 0,
        owner_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'pending' as const
      };

      // Insert directly to Supabase database
      console.log('💾 Inserting restaurant to Supabase...');
      const { data: insertedData, error: insertError } = await supabase
        .from(this.RESTAURANTS_TABLE)
        .insert({
          id: restaurantId,
          name: restaurantData.name,
          description: restaurantData.description || '',
          category: restaurantData.category || '',
          price_range: restaurantData.priceRange || '₱',
          location: {
            latitude: location.latitude,
            longitude: location.longitude
          },
          image: restaurantData.imageUrl || '',
          phone: restaurantData.phone || '',
          website: restaurantData.website || '',
          hours: restaurantData.hours || '',
          rating: 0,
          owner_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Supabase insert error:', insertError);
        throw new Error(`Failed to create restaurant: ${insertError.message}`);
      }

      console.log('✅ Restaurant inserted to Supabase successfully');

      // Also save to local database for offline access
      try {
        await localDatabase.initialize();
        await localDatabase.insertRestaurant(localRestaurantData);
        console.log('✅ Restaurant saved to local database');
      } catch (localError) {
        console.warn('⚠️ Failed to save to local database:', localError);
        // Don't fail the operation if local save fails
      }

      // Return the restaurant in the expected format
      const restaurant: Restaurant = {
        id: restaurantId,
        name: restaurantData.name,
        location,
        image: restaurantData.imageUrl || '',
        category: restaurantData.category || '',
        rating: 0,
        priceRange: restaurantData.priceRange || '$',
        description: restaurantData.description || '',
        phone: restaurantData.phone || '',
        hours: restaurantData.hours || '',
        website: restaurantData.website || '',
      };

      console.log('✅ Restaurant created successfully:', restaurant);
      return restaurant;
    } catch (error: any) {
      console.error('❌ Error creating restaurant:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get restaurant by owner ID
   */
  async getRestaurantByOwnerId(ownerId: string): Promise<Restaurant | null> {
    try {
      console.log('🔍 Fetching restaurant by owner ID:', ownerId);

      // Validate ownerId
      if (!ownerId || typeof ownerId !== 'string') {
        console.warn('⚠️ Invalid ownerId provided:', ownerId);
        return null;
      }

      const { data, error } = await supabase
        .from(this.RESTAURANTS_TABLE)
        .select('*')
        .eq('owner_id', ownerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          console.log('ℹ️ No restaurant found for owner:', ownerId);
          return null;
        }
        // Log the error but don't crash
        console.error('⚠️ Error fetching restaurant:', error);
        throw error;
      }

      // Transform the data to match our Restaurant interface
      let location: { latitude: number; longitude: number };
      if (data.location && typeof data.location === 'object' && 'latitude' in data.location && 'longitude' in data.location) {
        // New format: location is a JSONB object
        location = {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
        };
      } else if (data.latitude && data.longitude) {
        // Old format: separate latitude/longitude fields
        location = {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
        };
      } else {
        // Fallback: default location
        console.warn('⚠️ Restaurant missing location data:', data.name);
        location = {
          latitude: 40.7128, // Default to NYC
          longitude: -74.0060,
        };
      }

      const restaurant: Restaurant = {
        id: data.id,
        name: data.name,
        location,
        image: data.image,
        category: data.category,
        rating: data.rating,
        priceRange: data.price_range,
        description: data.description,
        phone: data.phone,
        hours: data.hours,
        website: data.website,
      };

      console.log('✅ Retrieved restaurant by owner:', restaurant);
      return restaurant;
    } catch (error: any) {
      console.error('❌ Error fetching restaurant by owner:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get all restaurants
   */
  async getAllRestaurants(): Promise<Restaurant[]> {
    try {
      console.log('📋 Fetching all restaurants...');

      // Check if we should use offline mode (food explorers only)
      const useOffline = await shouldUseOfflineMode();

      if (useOffline) {
        console.log('📱 Using offline mode for restaurants');
        await localDatabase.initialize();
        const localRestaurants = await localDatabase.getAllRestaurants();

        // Transform local data to Restaurant interface
        return localRestaurants.map(local => ({
          id: local.id,
          name: local.name,
          location: {
            latitude: local.latitude,
            longitude: local.longitude,
          },
          image: local.image,
          category: local.category,
          rating: local.rating,
          priceRange: local.price_range,
          description: local.description,
          phone: local.phone,
          hours: local.hours,
          website: local.website,
        }));
      }

      // Online mode: fetch from Supabase
      const { data, error } = await supabase
        .from(this.RESTAURANTS_TABLE)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our Restaurant interface
      const restaurants: Restaurant[] = data.map((item: any) => {
        // Handle both location formats: JSONB object or separate lat/lng fields
        let location: { latitude: number; longitude: number };
        if (item.location && typeof item.location === 'object' && 'latitude' in item.location && 'longitude' in item.location) {
          // New format: location is a JSONB object
          location = {
            latitude: item.location.latitude,
            longitude: item.location.longitude,
          };
        } else if (item.latitude && item.longitude) {
          // Old format: separate latitude/longitude fields
          location = {
            latitude: parseFloat(item.latitude),
            longitude: parseFloat(item.longitude),
          };
        } else {
          // Fallback: default location
          console.warn('⚠️ Restaurant missing location data:', item.name);
          location = {
            latitude: 40.7128, // Default to NYC
            longitude: -74.0060,
          };
        }

        return {
          id: item.id,
          name: item.name,
          location,
          image: item.image,
          category: item.category,
          rating: item.rating,
          priceRange: item.price_range,
          description: item.description,
          phone: item.phone,
          hours: item.hours,
          website: item.website,
        };
      });

      console.log('✅ Retrieved restaurants:', restaurants.length);
      return restaurants;
    } catch (error: any) {
      console.error('❌ Error fetching restaurants:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  async getRestaurantsPage(page: number, pageSize: number): Promise<Restaurant[]> {
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from(this.RESTAURANTS_TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const restaurants: Restaurant[] = (data || []).map((item: any) => {
        let location: { latitude: number; longitude: number };
        if (item.location && typeof item.location === 'object' && 'latitude' in item.location && 'longitude' in item.location) {
          location = { latitude: item.location.latitude, longitude: item.location.longitude };
        } else if (item.latitude && item.longitude) {
          location = {
            latitude: parseFloat(item.latitude),
            longitude: parseFloat(item.longitude),
          };
        } else {
          location = { latitude: 40.7128, longitude: -74.0060 };
        }

        return {
          id: item.id,
          name: item.name,
          location,
          image: item.image,
          category: item.category,
          rating: item.rating,
          priceRange: item.price_range,
          description: item.description,
          phone: item.phone,
          hours: item.hours,
          website: item.website,
        } as Restaurant;
      });

      return restaurants;
    } catch (error: any) {
      console.error('❌ Error fetching restaurants page:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  async getRestaurantsPageWithCount(page: number, pageSize: number): Promise<{ items: Restaurant[]; total: number }>{
    try {
      console.log(`📋 Fetching restaurants page ${page}, size ${pageSize}`);
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      console.log('🔍 Querying Supabase for restaurants...');
      const { data, error, count } = await supabase
        .from(this.RESTAURANTS_TABLE)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('❌ Supabase query error:', error);
        throw error;
      }

      console.log(`📊 Supabase returned ${data?.length || 0} restaurants, total count: ${count}`);

      const rows = (data || []) as any[];
      const items: Restaurant[] = rows.map((item: any) => {
        let location: { latitude: number; longitude: number };
        if (item.location && typeof item.location === 'object' && 'latitude' in item.location && 'longitude' in item.location) {
          location = { latitude: item.location.latitude, longitude: item.location.longitude };
        } else if (item.latitude && item.longitude) {
          location = {
            latitude: parseFloat(item.latitude),
            longitude: parseFloat(item.longitude),
          };
        } else {
          location = { latitude: 40.7128, longitude: -74.0060 };
        }

        return {
          id: item.id,
          name: item.name,
          location,
          image: item.image,
          category: item.category,
          rating: item.rating,
          priceRange: item.price_range,
          description: item.description,
          phone: item.phone,
          hours: item.hours,
          website: item.website,
        } as Restaurant;
      });

      const result = { items, total: count ?? rows.length };
      console.log(`✅ Returning ${items.length} restaurants, total: ${result.total}`);
      return result;
    } catch (error: any) {
      console.error('❌ Error fetching restaurants page with count:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get restaurant by ID
   */
  async getRestaurantById(id: string): Promise<Restaurant | null> {
    try {
      console.log('🔍 Fetching restaurant by ID:', id);

      const { data, error } = await supabase
        .from(this.RESTAURANTS_TABLE)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      // Transform the data to match our Restaurant interface
      let location: { latitude: number; longitude: number };
      if (data.location && typeof data.location === 'object' && 'latitude' in data.location && 'longitude' in data.location) {
        // New format: location is a JSONB object
        location = {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
        };
      } else if (data.latitude && data.longitude) {
        // Old format: separate latitude/longitude fields
        location = {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
        };
      } else {
        // Fallback: default location
        console.warn('⚠️ Restaurant missing location data:', data.name);
        location = {
          latitude: 40.7128, // Default to NYC
          longitude: -74.0060,
        };
      }

      const restaurant: Restaurant = {
        id: data.id,
        name: data.name,
        location,
        image: data.image,
        category: data.category,
        rating: data.rating,
        priceRange: data.price_range,
        description: data.description,
        phone: data.phone,
        hours: data.hours,
        website: data.website,
      };

      console.log('✅ Retrieved restaurant:', restaurant);
      return restaurant;
    } catch (error: any) {
      console.error('❌ Error fetching restaurant:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Parse location string into coordinates
   * Basic implementation - in production, use geocoding service
   */
  private parseLocationString(locationString: string): { latitude: number; longitude: number } {
    // Default coordinates (e.g., center of a city)
    // In production, implement proper geocoding
    const defaultCoords = {
      latitude: 40.7128, // New York City coordinates as default
      longitude: -74.0060,
    };

    // Try to extract coordinates if they exist in the string
    const coordMatch = locationString.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (coordMatch) {
      return {
        latitude: parseFloat(coordMatch[1]),
        longitude: parseFloat(coordMatch[2]),
      };
    }

    // For now, return default coordinates
    // TODO: Implement proper geocoding service integration
    console.warn('⚠️ Using default coordinates for location:', locationString);
    return defaultCoords;
  }

  private getErrorMessage(error: any): string {
    // Map Supabase errors to user-friendly messages
    if (error.message?.includes('duplicate key')) {
      return 'A restaurant with this name already exists';
    }
    if (error.message?.includes('violates check constraint')) {
      return 'Invalid data provided';
    }
    if (error.message?.includes('permission denied') || error.code === '42501') {
      return 'Permission denied - You may need to log in first';
    }
    if (error.message?.includes('JWT') || error.code === '401') {
      return 'Authentication required - Please log in to continue';
    }
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      return 'Database table not found - Please check database setup';
    }
    if (error.message?.includes('No rows found') || error.code === 'PGRST116') {
      return 'No restaurants found in database';
    }
    if (error.message?.includes('timeout') || error.message?.includes('network')) {
      return 'Network error - Please check your internet connection';
    }

    console.error('❌ Restaurant service error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });

    return error.message || 'An error occurred while managing restaurants';
  }
}

export const restaurantService = new RestaurantService();
