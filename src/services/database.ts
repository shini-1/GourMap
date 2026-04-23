// src/services/database.ts
import * as SQLite from 'expo-sqlite';
import { RestaurantRow, FavoriteRow, SyncMetadata, ConflictResolution } from '../types/database';

const DATABASE_NAME = 'gourmap.db';

export class DatabaseService {
  private static db: SQLite.SQLiteDatabase | null = null;
  private static isInitialized = false;

  static async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      console.log('🔄 Initializing database...');
      try {
        this.db = SQLite.openDatabaseSync(DATABASE_NAME);
        await this.initializeDatabase();
        this.isInitialized = true;
        console.log('✅ Database initialized successfully');
      } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
      }
    }
    return this.db;
  }

  static isDatabaseReady(): boolean {
    return this.isInitialized && !!this.db;
  }

  private static async initializeDatabase(): Promise<void> {
    const db = await this.getDatabase();

    // Create tables mirroring Supabase schema
    await db.execAsync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS restaurants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        address TEXT,
        latitude REAL,
        longitude REAL,
        category TEXT NOT NULL,
        price_range TEXT,
        rating REAL,
        image_url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        _sync_status TEXT DEFAULT 'synced',
        _last_modified TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS favorites (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        _sync_status TEXT DEFAULT 'synced',
        _last_modified TEXT NOT NULL,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
      );

      CREATE TABLE IF NOT EXISTS sync_metadata (
        table_name TEXT PRIMARY KEY,
        last_sync_timestamp TEXT NOT NULL,
        pending_changes INTEGER DEFAULT 0,
        conflicts INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS conflicts (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        row_id TEXT NOT NULL,
        local_data TEXT NOT NULL,
        server_data TEXT NOT NULL,
        resolution TEXT DEFAULT 'manual',
        resolved_at TEXT,
        created_at TEXT NOT NULL
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_restaurants_category ON restaurants(category);
      CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants(latitude, longitude);
      CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
      CREATE INDEX IF NOT EXISTS idx_favorites_restaurant ON favorites(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_sync_status ON restaurants(_sync_status);
      CREATE INDEX IF NOT EXISTS idx_last_modified ON restaurants(_last_modified);
    `);
  }

  // Restaurant operations
  static async saveRestaurants(restaurants: RestaurantRow[]): Promise<void> {
    const db = await this.getDatabase();

    const insertOrReplace = `
      INSERT OR REPLACE INTO restaurants
      (id, name, description, address, latitude, longitude, category, price_range, rating, image_url, created_at, updated_at, _sync_status, _last_modified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const restaurant of restaurants) {
      await db.runAsync(insertOrReplace, [
        restaurant.id,
        restaurant.name,
        restaurant.description || null,
        restaurant.address || null,
        restaurant.latitude || null,
        restaurant.longitude || null,
        restaurant.category,
        restaurant.price_range || null,
        restaurant.rating || null,
        restaurant.image_url || null,
        restaurant.created_at,
        restaurant.updated_at,
        restaurant._sync_status,
        restaurant._last_modified
      ]);
    }
  }

  static async getRestaurants(limit: number = 20, offset: number = 0): Promise<RestaurantRow[]> {
    const db = await this.getDatabase();
    const result = await db.getAllAsync<RestaurantRow>(
      'SELECT * FROM restaurants ORDER BY _last_modified DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return result;
  }

  static async searchRestaurants(query: string, limit: number = 20): Promise<RestaurantRow[]> {
    const db = await this.getDatabase();
    const searchTerm = `%${query}%`;
    const result = await db.getAllAsync<RestaurantRow>(
      'SELECT * FROM restaurants WHERE name LIKE ? OR description LIKE ? ORDER BY _last_modified DESC LIMIT ?',
      [searchTerm, searchTerm, limit]
    );
    return result;
  }

  // Favorites operations
  static async addFavorite(restaurantId: string, userId: string): Promise<void> {
    const db = await this.getDatabase();
    const id = `fav_${userId}_${restaurantId}`;

    await db.runAsync(`
      INSERT OR REPLACE INTO favorites
      (id, restaurant_id, user_id, created_at, _sync_status, _last_modified)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `, [id, restaurantId, userId, new Date().toISOString(), new Date().toISOString()]);
  }

  static async removeFavorite(restaurantId: string, userId: string): Promise<void> {
    const db = await this.getDatabase();
    const id = `fav_${userId}_${restaurantId}`;

    await db.runAsync(`
      UPDATE favorites SET _sync_status = 'deleted', _last_modified = ? WHERE id = ?
    `, [new Date().toISOString(), id]);
  }

  static async getFavorites(userId: string): Promise<FavoriteRow[]> {
    const db = await this.getDatabase();
    const result = await db.getAllAsync<FavoriteRow>(
      'SELECT * FROM favorites WHERE user_id = ? AND _sync_status != \'deleted\'',
      [userId]
    );
    return result;
  }

  // Sync operations
  static async getPendingChanges(): Promise<{ restaurants: RestaurantRow[], favorites: FavoriteRow[] }> {
    const db = await this.getDatabase();

    const restaurants = await db.getAllAsync<RestaurantRow>(
      'SELECT * FROM restaurants WHERE _sync_status = \'pending\''
    );

    const favorites = await db.getAllAsync<FavoriteRow>(
      'SELECT * FROM favorites WHERE _sync_status IN (\'pending\', \'deleted\')'
    );

    return { restaurants, favorites };
  }

  static async markSynced(table: string, ids: string[]): Promise<void> {
    const db = await this.getDatabase();

    for (const id of ids) {
      await db.runAsync(
        `UPDATE ${table} SET _sync_status = 'synced' WHERE id = ?`,
        [id]
      );
    }
  }

  static async updateSyncMetadata(tableName: string, timestamp: string, pendingChanges: number, conflicts: number): Promise<void> {
    const db = await this.getDatabase();

    await db.runAsync(`
      INSERT OR REPLACE INTO sync_metadata
      (table_name, last_sync_timestamp, pending_changes, conflicts)
      VALUES (?, ?, ?, ?)
    `, [tableName, timestamp, pendingChanges, conflicts]);
  }

  static async getSyncMetadata(tableName: string): Promise<SyncMetadata | null> {
    const db = await this.getDatabase();
    const result = await db.getFirstAsync<SyncMetadata>(
      'SELECT * FROM sync_metadata WHERE table_name = ?',
      [tableName]
    );
    return result || null;
  }

  // Utility methods
  static async clearAllData(): Promise<void> {
    const db = await this.getDatabase();
    await db.execAsync(`
      DELETE FROM favorites;
      DELETE FROM restaurants;
      DELETE FROM sync_metadata;
      DELETE FROM conflicts;
    `);
  }

  static async getDatabaseStats(): Promise<{
    restaurants: number;
    favorites: number;
    pendingChanges: number;
  }> {
    const db = await this.getDatabase();

    const restaurantCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM restaurants');
    const favoriteCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM favorites');
    const pendingCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM restaurants WHERE _sync_status = \'pending\' UNION ALL SELECT COUNT(*) as count FROM favorites WHERE _sync_status IN (\'pending\', \'deleted\')'
    );

    return {
      restaurants: restaurantCount?.count || 0,
      favorites: favoriteCount?.count || 0,
      pendingChanges: pendingCount?.count || 0,
    };
  }
}
