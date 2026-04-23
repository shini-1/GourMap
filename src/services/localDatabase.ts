import * as SQLite from 'expo-sqlite';

// Database schema and operations for offline mode
export interface LocalRestaurant {
  id: string;
  name: string;
  description: string;
  category: string;
  price_range: string;
  latitude: number;
  longitude: number;
  image: string;
  phone: string;
  website: string;
  hours: string;
  rating: number;
  owner_id: string;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'conflict'; // For sync tracking
}

export interface LocalMenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'conflict';
}

export interface LocalRating {
  id: string;
  restaurant_id: string;
  user_id: string;
  stars: number;
  comment: string;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'conflict';
}

export interface LocalDeviceRating {
  id: string;
  restaurant_id: string;
  stars: number;
  created_at: string;
  sync_status: 'synced' | 'pending' | 'conflict';
}

export interface PendingOperation {
  id: string;
  table_name: string;
  operation: 'insert' | 'update' | 'delete';
  data: string; // JSON string of the data
  created_at: string;
  retry_count: number;
}

class LocalDatabase {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    if (this.db) return;

    this.db = SQLite.openDatabaseSync('gourmap_offline.db');

    await this.createTables();
    console.log('✅ Local database initialized');
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Restaurants table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        price_range TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        image TEXT,
        phone TEXT,
        website TEXT,
        hours TEXT,
        rating REAL DEFAULT 0,
        owner_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending'
      );
    `);

    // Menu items table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        category TEXT,
        image TEXT,
        is_available INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending',
        FOREIGN KEY (restaurant_id) REFERENCES restaurants (id)
      );
    `);

    // Restaurant ratings table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS restaurant_ratings (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
        comment TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending',
        FOREIGN KEY (restaurant_id) REFERENCES restaurants (id),
        UNIQUE (restaurant_id, user_id)
      );
    `);

    // Restaurant device ratings table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS restaurant_device_ratings (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending',
        FOREIGN KEY (restaurant_id) REFERENCES restaurants (id)
      );
    `);

    // Pending operations queue
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_operations (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        retry_count INTEGER DEFAULT 0
      );
    `);

    // Create indexes for better performance
    await this.db.execAsync(`CREATE INDEX IF NOT EXISTS idx_restaurants_owner ON restaurants(owner_id);`);
    await this.db.execAsync(`CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);`);
    await this.db.execAsync(`CREATE INDEX IF NOT EXISTS idx_ratings_restaurant ON restaurant_ratings(restaurant_id);`);
    await this.db.execAsync(`CREATE INDEX IF NOT EXISTS idx_device_ratings_restaurant ON restaurant_device_ratings(restaurant_id);`);
  }

  // Restaurant operations
  async insertRestaurant(restaurant: Omit<LocalRestaurant, 'created_at' | 'updated_at' | 'sync_status'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT OR REPLACE INTO restaurants
      (id, name, description, category, price_range, latitude, longitude, image, phone, website, hours, rating, owner_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    await this.db.runAsync(query, [
      restaurant.id,
      restaurant.name,
      restaurant.description || '',
      restaurant.category || '',
      restaurant.price_range || '$',
      restaurant.latitude,
      restaurant.longitude,
      restaurant.image || '',
      restaurant.phone || '',
      restaurant.website || '',
      restaurant.hours || '',
      restaurant.rating || 0,
      restaurant.owner_id,
      new Date().toISOString()
    ]);
  }

  async getAllRestaurants(): Promise<LocalRestaurant[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync<LocalRestaurant>('SELECT * FROM restaurants ORDER BY created_at DESC');
    return result;
  }

  async getRestaurantById(id: string): Promise<LocalRestaurant | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<LocalRestaurant>('SELECT * FROM restaurants WHERE id = ?', [id]);
    return result || null;
  }

  async getRestaurantByOwnerId(ownerId: string): Promise<LocalRestaurant | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<LocalRestaurant>('SELECT * FROM restaurants WHERE owner_id = ?', [ownerId]);
    return result || null;
  }

  async getUnsyncedRestaurants(): Promise<LocalRestaurant[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync<LocalRestaurant>('SELECT * FROM restaurants WHERE sync_status != ? ORDER BY created_at DESC', ['synced']);
    return result;
  }

  // Menu item operations
  async insertMenuItem(menuItem: Omit<LocalMenuItem, 'created_at' | 'updated_at' | 'sync_status'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT OR REPLACE INTO menu_items
      (id, restaurant_id, name, description, price, category, image, is_available, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    await this.db.runAsync(query, [
      menuItem.id,
      menuItem.restaurant_id,
      menuItem.name,
      menuItem.description || '',
      menuItem.price,
      menuItem.category || '',
      menuItem.image || '',
      menuItem.is_available ? 1 : 0,
      new Date().toISOString()
    ]);
  }

  async getMenuItemsByRestaurant(restaurantId: string): Promise<LocalMenuItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync<LocalMenuItem>(
      'SELECT * FROM menu_items WHERE restaurant_id = ? ORDER BY category, name',
      [restaurantId]
    );
    return result;
  }

  async getMenuItemById(id: string): Promise<LocalMenuItem | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<LocalMenuItem>('SELECT * FROM menu_items WHERE id = ?', [id]);
    return result || null;
  }

  async updateMenuItem(id: string, updates: Partial<LocalMenuItem>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.price !== undefined) {
      fields.push('price = ?');
      values.push(updates.price);
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }
    if (updates.image !== undefined) {
      fields.push('image = ?');
      values.push(updates.image);
    }
    if (updates.is_available !== undefined) {
      fields.push('is_available = ?');
      values.push(updates.is_available ? 1 : 0);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());

    const query = `UPDATE menu_items SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);

    await this.db.runAsync(query, values);
  }

  async deleteMenuItem(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM menu_items WHERE id = ?', [id]);
  }

  // Rating operations
  async insertRating(rating: Omit<LocalRating, 'created_at' | 'updated_at' | 'sync_status'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT OR REPLACE INTO restaurant_ratings
      (id, restaurant_id, user_id, stars, comment, updated_at)
      VALUES (?, ?, ?, ?, ?, ?);
    `;

    await this.db.runAsync(query, [
      rating.id,
      rating.restaurant_id,
      rating.user_id,
      rating.stars,
      rating.comment || '',
      new Date().toISOString()
    ]);
  }

  async getUserRating(restaurantId: string, userId: string): Promise<{ stars: number; comment?: string } | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<{ stars: number; comment: string }>(
      'SELECT stars, comment FROM restaurant_ratings WHERE restaurant_id = ? AND user_id = ?',
      [restaurantId, userId]
    );

    if (!result) return null;
    return { stars: result.stars, comment: result.comment || undefined };
  }

  // Pending operations queue
  async addPendingOperation(operation: Omit<PendingOperation, 'id' | 'created_at' | 'retry_count'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `${operation.table_name}_${operation.operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.db.runAsync(
      'INSERT INTO pending_operations (id, table_name, operation, data) VALUES (?, ?, ?, ?)',
      [id, operation.table_name, operation.operation, operation.data]
    );
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAllAsync<PendingOperation>('SELECT * FROM pending_operations ORDER BY created_at ASC');
  }

  async removePendingOperation(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM pending_operations WHERE id = ?', [id]);
  }

  async incrementRetryCount(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('UPDATE pending_operations SET retry_count = retry_count + 1 WHERE id = ?', [id]);
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync('DELETE FROM pending_operations;');
    await this.db.execAsync('DELETE FROM restaurant_device_ratings;');
    await this.db.execAsync('DELETE FROM restaurant_ratings;');
    await this.db.execAsync('DELETE FROM menu_items;');
    await this.db.execAsync('DELETE FROM restaurants;');
  }

  async getStats(): Promise<{
    restaurants: number;
    menuItems: number;
    ratings: number;
    deviceRatings: number;
    pendingOperations: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const [
      restaurants,
      menuItems,
      ratings,
      deviceRatings,
      pendingOperations
    ] = await Promise.all([
      this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM restaurants'),
      this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM menu_items'),
      this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM restaurant_ratings'),
      this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM restaurant_device_ratings'),
      this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM pending_operations'),
    ]);

    return {
      restaurants: restaurants?.count || 0,
      menuItems: menuItems?.count || 0,
      ratings: ratings?.count || 0,
      deviceRatings: deviceRatings?.count || 0,
      pendingOperations: pendingOperations?.count || 0,
    };
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}

export const localDatabase = new LocalDatabase();
