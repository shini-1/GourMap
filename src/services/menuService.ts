import { supabase, TABLES } from '../config/supabase';
import { MenuItem } from '../../types';
import { networkService } from './networkService';
import { localDatabase } from './localDatabase';
import { syncService } from './syncService';
import { offlineAuthService } from './offlineAuthService';

/**
 * Check if offline mode should be enabled for the current user
 * Only food explorers (role: 'user') should have offline mode
 */
async function shouldUseOfflineMode(): Promise<boolean> {
  const role = await offlineAuthService.getUserRole();
  return role === 'user' && networkService.isOffline();
}

export interface CreateMenuItemData {
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  image?: string;
  isAvailable?: boolean;
}

class MenuService {
  private readonly MENU_ITEMS_TABLE = TABLES.MENU_ITEMS;

  /**
   * Create a new menu item
   */
  async createMenuItem(menuItemData: CreateMenuItemData): Promise<MenuItem> {
    try {
      console.log('🍽️ Creating menu item:', menuItemData);

      const { data, error } = await supabase
        .from(this.MENU_ITEMS_TABLE)
        .insert({
          restaurant_id: menuItemData.restaurantId,
          name: menuItemData.name,
          description: menuItemData.description || '',
          price: menuItemData.price,
          category: menuItemData.category || '',
          image: menuItemData.image || '',
          is_available: menuItemData.isAvailable ?? true,
        })
        .select()
        .single();

      if (error) throw error;

      // Transform the data back to match our MenuItem interface
      const menuItem: MenuItem = {
        id: data.id,
        restaurantId: data.restaurant_id,
        name: data.name,
        description: data.description,
        price: data.price,
        category: data.category,
        image: data.image,
        isAvailable: data.is_available,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      console.log('✅ Menu item created successfully:', menuItem);
      return menuItem;
    } catch (error: any) {
      console.error('❌ Error creating menu item:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get all menu items for a restaurant
   */
  async getMenuItemsByRestaurant(restaurantId: string): Promise<MenuItem[]> {
    try {
      console.log('📋 Fetching menu items for restaurant:', restaurantId);

      // Check if we should use offline mode (food explorers only)
      const useOffline = await shouldUseOfflineMode();

      if (useOffline) {
        console.log('📱 Using offline mode for menu items');
        await localDatabase.initialize();
        const localMenuItems = await localDatabase.getMenuItemsByRestaurant(restaurantId);

        // Transform local data to MenuItem interface
        return localMenuItems.map(local => ({
          id: local.id,
          restaurantId: local.restaurant_id,
          name: local.name,
          description: local.description,
          price: local.price,
          category: local.category,
          image: local.image,
          isAvailable: local.is_available,
          createdAt: local.created_at,
          updatedAt: local.updated_at,
        }));
      }

      // Online mode: fetch from Supabase
      const { data, error } = await supabase
        .from(this.MENU_ITEMS_TABLE)
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      // Transform the data to match our MenuItem interface
      const menuItems: MenuItem[] = data.map((item: any) => ({
        id: item.id,
        restaurantId: item.restaurant_id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        image: item.image,
        isAvailable: item.is_available,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

      console.log('✅ Retrieved menu items:', menuItems.length);
      return menuItems;
    } catch (error: any) {
      console.error('❌ Error fetching menu items:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get menu item by ID
   */
  async getMenuItemById(id: string): Promise<MenuItem | null> {
    try {
      console.log('🔍 Fetching menu item by ID:', id);

      const { data, error } = await supabase
        .from(this.MENU_ITEMS_TABLE)
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

      // Transform the data to match our MenuItem interface
      const menuItem: MenuItem = {
        id: data.id,
        restaurantId: data.restaurant_id,
        name: data.name,
        description: data.description,
        price: data.price,
        category: data.category,
        image: data.image,
        isAvailable: data.is_available,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      console.log('✅ Retrieved menu item:', menuItem);
      return menuItem;
    } catch (error: any) {
      console.error('❌ Error fetching menu item:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Update a menu item
   */
  async updateMenuItem(id: string, updates: Partial<CreateMenuItemData & { isAvailable: boolean }>): Promise<MenuItem> {
    try {
      console.log('🔄 Updating menu item:', id, updates);

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.image !== undefined) updateData.image = updates.image;
      if (updates.isAvailable !== undefined) updateData.is_available = updates.isAvailable;

      const { data, error } = await supabase
        .from(this.MENU_ITEMS_TABLE)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Transform the data back to match our MenuItem interface
      const menuItem: MenuItem = {
        id: data.id,
        restaurantId: data.restaurant_id,
        name: data.name,
        description: data.description,
        price: data.price,
        category: data.category,
        image: data.image,
        isAvailable: data.is_available,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      console.log('✅ Menu item updated successfully:', menuItem);
      return menuItem;
    } catch (error: any) {
      console.error('❌ Error updating menu item:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Delete a menu item
   */
  async deleteMenuItem(id: string): Promise<void> {
    try {
      console.log('🗑️ Deleting menu item:', id);

      const { error } = await supabase
        .from(this.MENU_ITEMS_TABLE)
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('✅ Menu item deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting menu item:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get menu items grouped by category
   */
  async getMenuItemsGroupedByCategory(restaurantId: string): Promise<Record<string, MenuItem[]>> {
    try {
      const menuItems = await this.getMenuItemsByRestaurant(restaurantId);

      // Group by category
      const grouped: Record<string, MenuItem[]> = {};
      menuItems.forEach(item => {
        const category = item.category || 'Other';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(item);
      });

      console.log('✅ Menu items grouped by category:', Object.keys(grouped));
      return grouped;
    } catch (error: any) {
      console.error('❌ Error grouping menu items:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  private getErrorMessage(error: any): string {
    // Map Supabase errors to user-friendly messages
    if (error.message?.includes('duplicate key')) {
      return 'A menu item with this name already exists';
    }
    if (error.message?.includes('violates check constraint')) {
      return 'Invalid data provided';
    }
    if (error.message?.includes('permission denied')) {
      return 'You do not have permission to perform this action';
    }
    if (error.message?.includes('foreign key')) {
      return 'Invalid restaurant reference';
    }

    return error.message || 'An error occurred while managing menu items';
  }
}

export const menuService = new MenuService();
