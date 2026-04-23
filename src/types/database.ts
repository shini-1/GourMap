// src/types/database.ts
export interface RestaurantRow {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  category: string;
  price_range?: string | null;
  rating?: number | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
  _sync_status: 'synced' | 'pending' | 'conflict';
  _last_modified: string;
}

export interface FavoriteRow {
  id: string;
  restaurant_id: string;
  user_id: string;
  created_at: string;
  _sync_status: 'synced' | 'pending' | 'deleted';
  _last_modified: string;
}

export interface SyncMetadata {
  table_name: string;
  last_sync_timestamp: string;
  pending_changes: number;
  conflicts: number;
}

export interface ConflictResolution {
  table_name: string;
  row_id: string;
  local_data: any;
  server_data: any;
  resolution: 'local' | 'server' | 'manual';
  resolved_at?: string;
}
