import { supabase, TABLES } from '../config/supabase';
import { getAverageRating } from './ratingsService';

interface DeviceRating {
  restaurantId: string;
  deviceId: string;
  stars: number;
  comment?: string;
}

function clampStars(stars: number): number {
  if (Number.isNaN(stars)) return 1;
  if (stars < 1) return 1;
  if (stars > 5) return 5;
  return Math.round(stars);
}

export async function submitDeviceRating(
  restaurantId: string,
  deviceId: string,
  stars: number,
  comment?: string
): Promise<void> {
  const clamped = clampStars(stars);

  const { error: insertError } = await supabase
    .from(TABLES.RESTAURANT_DEVICE_RATINGS)
    .insert({
      restaurant_id: restaurantId,
      device_id: deviceId,
      stars: clamped,
      comment: comment ?? null,
      updated_at: new Date().toISOString(),
    });

  if (insertError) {
    const code = (insertError as any)?.code;
    if (code === '23505') {
      throw new Error('ALREADY_RATED_DEVICE');
    }
    throw new Error(insertError.message);
  }

  // Recompute combined average (user + device) and update restaurants.rating
  const { average } = await getAverageRating(restaurantId);
  const { error: updateError } = await supabase
    .from(TABLES.RESTAURANTS)
    .update({ rating: average })
    .eq('id', restaurantId);

  if (updateError) throw new Error(updateError.message);
}

export async function getDeviceRating(
  restaurantId: string,
  deviceId: string
): Promise<{ stars: number; comment?: string } | null> {
  const { data, error } = await supabase
    .from(TABLES.RESTAURANT_DEVICE_RATINGS)
    .select('stars, comment')
    .eq('restaurant_id', restaurantId)
    .eq('device_id', deviceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return { stars: data.stars, comment: data.comment ?? undefined };
}

export async function getDeviceAggregate(
  restaurantId: string
): Promise<{ average: number; count: number }> {
  const { data, error, count } = await supabase
    .from(TABLES.RESTAURANT_DEVICE_RATINGS)
    .select('stars', { count: 'exact' })
    .eq('restaurant_id', restaurantId);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as any[];
  const c = count ?? rows.length;
  const avg = c === 0 ? 0 : rows.reduce((s, r: any) => s + (r.stars || 0), 0) / c;
  return { average: avg, count: c };
}
