import { supabase, TABLES } from '../config/supabase';
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

export interface RestaurantRating {
  id: string;
  restaurantId: string;
  userId: string;
  stars: number; // 1..5
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

function clampStars(stars: number): number {
  if (Number.isNaN(stars)) return 1;
  if (stars < 1) return 1;
  if (stars > 5) return 5;
  return Math.round(stars);
}

export async function submitRating(
  restaurantId: string,
  userId: string,
  stars: number,
  comment?: string
): Promise<void> {
  const clamped = clampStars(stars);

  // Check if we should use offline mode (food explorers only)
  const useOffline = await shouldUseOfflineMode();

  if (useOffline) {
    console.log('📱 Queueing rating submission for offline sync');
    const ratingId = `rating_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const localRatingData = {
      id: ratingId,
      restaurant_id: restaurantId,
      user_id: userId,
      stars: clamped,
      comment: comment || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'pending' as const
    };

    // Save to local database
    await localDatabase.initialize();
    await localDatabase.insertRating(localRatingData);

    // Queue the operation for when we come back online
    await localDatabase.addPendingOperation({
      table_name: 'restaurant_ratings',
      operation: 'insert',
      data: JSON.stringify(localRatingData)
    });

    return;
  }

  // Online mode: submit directly to Supabase
  const { error: insertError } = await supabase
    .from(TABLES.RESTAURANT_RATINGS)
    .insert({
      restaurant_id: restaurantId,
      user_id: userId,
      stars: clamped,
      comment: comment ?? null,
      updated_at: new Date().toISOString(),
    });

  if (insertError) {
    const code = (insertError as any)?.code;
    if (code === '23505') {
      // Unique violation on (restaurant_id, user_id)
      throw new Error('ALREADY_RATED');
    }
    throw new Error(insertError.message);
  }

  // Recompute combined average (user + device) for the restaurant
  const { average } = await getAverageRating(restaurantId);
  const { error: updateError } = await supabase
    .from(TABLES.RESTAURANTS)
    .update({ rating: average })
    .eq('id', restaurantId);

  if (updateError) throw new Error(updateError.message);
}

export async function getUserRating(
  restaurantId: string,
  userId: string
): Promise<{ stars: number; comment?: string } | null> {
  // Check if we should use offline mode (food explorers only)
  const useOffline = await shouldUseOfflineMode();

  if (useOffline) {
    console.log('📱 Getting user rating from offline DB');
    await localDatabase.initialize();
    return await localDatabase.getUserRating(restaurantId, userId);
  }

  // Online mode: fetch from Supabase
  const { data, error } = await supabase
    .from(TABLES.RESTAURANT_RATINGS)
    .select('stars, comment')
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return { stars: data.stars, comment: data.comment ?? undefined };
}

export async function getAverageRating(
  restaurantId: string
): Promise<{ average: number; count: number }> {
  // Fetch both user and device rating stars
  const [userRes, deviceRes] = await Promise.all([
    supabase
      .from(TABLES.RESTAURANT_RATINGS)
      .select('stars', { count: 'exact' })
      .eq('restaurant_id', restaurantId),
    supabase
      .from(TABLES.RESTAURANT_DEVICE_RATINGS)
      .select('stars', { count: 'exact' })
      .eq('restaurant_id', restaurantId),
  ]);

  if (userRes.error) throw new Error(userRes.error.message);
  if (deviceRes.error) throw new Error(deviceRes.error.message);

  const userRows = (userRes.data ?? []) as any[];
  const userCount = userRes.count ?? userRows.length;
  const userSum = userRows.reduce((s, r: any) => s + (r.stars || 0), 0);

  const deviceRows = (deviceRes.data ?? []) as any[];
  const deviceCount = deviceRes.count ?? deviceRows.length;
  const deviceSum = deviceRows.reduce((s, r: any) => s + (r.stars || 0), 0);

  const totalCount = userCount + deviceCount;
  const totalSum = userSum + deviceSum;
  const avg = totalCount === 0 ? 0 : totalSum / totalCount;
  return { average: avg, count: totalCount };
}
