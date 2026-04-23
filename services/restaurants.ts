import { Restaurant, RestaurantOwner, RestaurantSubmission } from '../types';
import { supabase, TABLES } from '../src/config/supabase';

// Table names (centralized)
const RESTAURANTS_TABLE = TABLES.RESTAURANTS;
const PENDING_RESTAURANTS_TABLE = TABLES.PENDING_RESTAURANTS;
const RESTAURANT_OWNERS_TABLE = TABLES.RESTAURANT_OWNERS;
const SUBMISSIONS_TABLE = TABLES.RESTAURANT_SUBMISSIONS;

/**
 * Get all approved restaurants
 */
export const getRestaurants = async (): Promise<Restaurant[]> => {
  try {
    const { data, error } = await supabase
      .from(RESTAURANTS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data || []) as any[];
    return rows.map((row) => {
      let location: { latitude: number; longitude: number };
      if (row.location && typeof row.location === 'object' && 'latitude' in row.location && 'longitude' in row.location) {
        // Location stored as JSON object
        location = { latitude: Number(row.location.latitude), longitude: Number(row.location.longitude) };
      } else if (row.latitude != null && row.longitude != null) {
        // Location stored in separate columns
        location = { latitude: Number(row.latitude), longitude: Number(row.longitude) };
      } else {
        // Default fallback location
        location = { latitude: 40.7128, longitude: -74.0060 }; // NYC coordinates
      }

      const rating = typeof row.rating === 'number' ? row.rating : (row.rating ? Number(row.rating) : undefined);

      return {
        id: row.id,
        name: row.name,
        location,
        image: row.image ?? undefined,
        category: row.category ?? undefined,
        rating,
        editorialRating: typeof row.editorial_rating === 'number' ? row.editorial_rating : (row.editorial_rating ? Number(row.editorial_rating) : undefined),
        priceRange: row.price_range ?? undefined,
        description: row.description ?? undefined,
        phone: row.phone ?? undefined,
        hours: row.hours ?? undefined,
        website: row.website ?? undefined,
      } as Restaurant;
    });
  } catch (error: any) {
    console.error('Error fetching restaurants:', error);
    throw new Error(error.message || 'Failed to fetch restaurants');
  }
};

/**
 * Get approved restaurants (alias for getRestaurants)
 */
export const getApprovedRestaurants = async (): Promise<Restaurant[]> => {
  return getRestaurants();
};

/**
 * Get pending restaurant submissions
 */
export const getPendingRestaurants = async (): Promise<RestaurantSubmission[]> => {
  try {
    const { data, error } = await supabase
      .from(SUBMISSIONS_TABLE)
      .select('*')
      .eq('status', 'pending');

    if (error) throw new Error(error.message);

    const rows = (data || []) as any[];
    const submissions = rows.map((row) => {
      let location: { latitude: number; longitude: number };
      if (row.location && typeof row.location === 'object' && 'latitude' in row.location && 'longitude' in row.location) {
        location = { latitude: Number(row.location.latitude), longitude: Number(row.location.longitude) };
      } else if (row.latitude != null && row.longitude != null) {
        location = { latitude: Number(row.latitude), longitude: Number(row.longitude) };
      } else {
        location = { latitude: 40.7128, longitude: -74.0060 };
      }

      return {
        id: row.id,
        ownerId: row.owner_id || '',
        businessName: row.business_name || '',
        ownerName: row.owner_name || '',
        email: row.email || '',
        phone: row.phone || '',
        location,
        image: row.image || undefined,
        description: row.description || '',
        cuisineType: row.cuisine_type || '',
        submittedAt: row.submitted_at ? new Date(row.submitted_at).getTime() : Date.now(),
        status: (row.status as any) || 'pending',
      } as RestaurantSubmission;
    });

    return submissions.sort((a, b) => b.submittedAt - a.submittedAt);
  } catch (error: any) {
    console.error('Error fetching pending restaurants:', error);
    throw new Error(error.message || 'Failed to fetch pending restaurants');
  }
};

/**
 * Delete a restaurant by ID
 */
export const deleteRestaurant = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from(RESTAURANTS_TABLE)
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  } catch (error: any) {
    console.error('Error deleting restaurant:', error);
    throw new Error(error.message || 'Failed to delete restaurant');
  }
};

/**
 * Update a restaurant
 */
export const updateRestaurant = async (id: string, updates: Partial<Restaurant>): Promise<void> => {
  try {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;

    // Handle location field - use separate latitude and longitude columns
    if (updates.location) {
      updateData.latitude = updates.location.latitude;
      updateData.longitude = updates.location.longitude;
    }

    if (updates.image !== undefined) updateData.image = updates.image;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.rating !== undefined) updateData.rating = updates.rating;
    if (updates.editorialRating !== undefined) updateData.editorial_rating = updates.editorialRating;
    if (updates.priceRange !== undefined) updateData.price_range = updates.priceRange;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.hours !== undefined) updateData.hours = updates.hours;
    if (updates.website !== undefined) updateData.website = updates.website;

    console.log('🔄 Updating restaurant with data:', updateData);

    const { error } = await supabase
      .from(RESTAURANTS_TABLE)
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('❌ Restaurant update error:', error);
      throw new Error(error.message);
    }

    console.log('✅ Restaurant updated successfully');
  } catch (error: any) {
    console.error('❌ Error updating restaurant:', error);
    throw new Error(error.message || 'Failed to update restaurant');
  }
};

/**
 * Add a new restaurant
 */
export const addRestaurant = async (restaurantData: Omit<Restaurant, 'id'>): Promise<void> => {
  try {
    const insertData: any = {
      name: restaurantData.name,
      description: restaurantData.description ?? '',
      category: restaurantData.category ?? '',
      price_range: restaurantData.priceRange ?? '',
      // Use separate latitude and longitude columns
      latitude: restaurantData.location?.latitude ?? null,
      longitude: restaurantData.location?.longitude ?? null,
      image: restaurantData.image ?? '',
      phone: restaurantData.phone ?? '',
      website: restaurantData.website ?? '',
      hours: restaurantData.hours ?? '',
      rating: restaurantData.rating ?? 0,
      editorial_rating: restaurantData.editorialRating ?? null,
    };

    console.log('➕ Adding restaurant with data:', insertData);

    const { error } = await supabase
      .from(RESTAURANTS_TABLE)
      .insert([insertData]);

    if (error) {
      console.error('❌ Restaurant add error:', error);
      throw new Error(error.message);
    }

    console.log('✅ Restaurant added successfully');
  } catch (error: any) {
    console.error('❌ Error adding restaurant:', error);
    throw new Error(error.message || 'Failed to add restaurant');
  }
};

export const approveRestaurant = async (submissionId: string): Promise<void> => {
  try {
    // First, get the submission data
    const { data: submission, error } = await supabase
      .from(SUBMISSIONS_TABLE)
      .select('*')
      .eq('id', submissionId)
      .single();

    if (error) throw new Error(error.message);
    if (!submission) throw new Error('Submission not found');

    // Note: User doesn't have restaurant_owners table, so we skip that step
    // Just mark business owner profile as verified
    const { error: verifyError } = await supabase
      .from(TABLES.BUSINESS_OWNERS)
      .update({ is_verified: true, updated_at: new Date().toISOString() })
      .eq('uid', submission.owner_id);

    if (verifyError) throw new Error(verifyError.message);

    // Update submission status
    const { error: updateError } = await supabase
      .from(SUBMISSIONS_TABLE)
      .update({ status: 'approved' })
      .eq('id', submissionId);

    if (updateError) throw new Error(updateError.message);
  } catch (error: any) {
    console.error('Error approving restaurant:', error);
    throw new Error(error.message || 'Failed to approve restaurant');
  }
};

/**
 * Reject a restaurant submission with a reason
 */
export const rejectRestaurant = async (submissionId: string, reason: string): Promise<void> => {
  try {
    const { error: updateError } = await supabase
      .from(SUBMISSIONS_TABLE)
      .update({ status: 'rejected', rejection_reason: reason, rejected_at: new Date().toISOString() })
      .eq('id', submissionId);

    if (updateError) throw new Error(updateError.message);
  } catch (error: any) {
    console.error('Error rejecting restaurant:', error);
    throw new Error(error.message || 'Failed to reject restaurant');
  }
};

/**
 * Delete a restaurant owner (business owner account)
 */
export const deleteRestaurantOwner = async (businessId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from(TABLES.BUSINESS_OWNERS)
      .delete()
      .eq('uid', businessId); // Use uid instead of id since we're deleting by user ID

    if (error) throw new Error(error.message);
  } catch (error: any) {
    console.error('Error deleting restaurant owner:', error);
    throw new Error(error.message || 'Failed to delete restaurant owner');
  }
};

/**
 * Update a restaurant owner (business owner account)
 */
export const updateRestaurantOwner = async (businessId: string, updates: any): Promise<void> => {
  try {
    const { error } = await supabase
      .from(TABLES.BUSINESS_OWNERS)
      .update(updates)
      .eq('uid', businessId); // Use uid instead of id

    if (error) throw new Error(error.message);
  } catch (error: any) {
    console.error('Error updating restaurant owner:', error);
    throw new Error(error.message || 'Failed to update restaurant owner');
  }
};

/**
 * Get restaurant statistics
 */
export const getRestaurantStats = async (): Promise<any> => {
  try {
    // Get total count of approved restaurants
    const { count: totalCount, error: totalError } = await supabase
      .from(RESTAURANTS_TABLE)
      .select('*', { count: 'exact' });

    if (totalError) throw new Error(totalError.message);

    // Get count of pending restaurants
    const { count: pendingCount, error: pendingError } = await supabase
      .from(SUBMISSIONS_TABLE)
      .select('*', { count: 'exact' })
      .eq('status', 'pending');

    if (pendingError) throw new Error(pendingError.message);

    // For simplicity, return basic stats (you can expand this with more detailed analysis)
    return {
      total: totalCount || 0,
      pending: pendingCount || 0,
      unique: totalCount || 0, // Assuming no duplicates for now
      duplicates: 0,
      nameDuplicates: [],
      coordDuplicates: []
    };
  } catch (error: any) {
    console.error('Error getting restaurant stats:', error);
    throw new Error(error.message || 'Failed to get restaurant stats');
  }
};

/**
 * Clear all restaurants from the database
 */
export const clearAllRestaurants = async (): Promise<number> => {
  try {
    // Get count of restaurants to return how many were deleted
    const { count, error: countError } = await supabase
      .from(RESTAURANTS_TABLE)
      .select('*', { count: 'exact' });

    if (countError) throw new Error(countError.message);

    // Delete all restaurants
    const { error } = await supabase
      .from(RESTAURANTS_TABLE)
      .delete()
      .neq('id', ''); // This is a workaround to delete all rows

    if (error) throw new Error(error.message);

    return count || 0;
  } catch (error: any) {
    console.error('Error clearing all restaurants:', error);
    throw new Error(error.message || 'Failed to clear restaurants');
  }
};

/**
 * Cleanup duplicate restaurants based on name and location
 */
export const cleanupDuplicateRestaurants = async (): Promise<{ deleted: number, kept: number }> => {
  try {
    // Get all restaurants
    const { data: allRestaurants, error } = await supabase
      .from(RESTAURANTS_TABLE)
      .select('*');

    if (error) throw new Error(error.message);
    if (!allRestaurants || allRestaurants.length === 0) return { deleted: 0, kept: 0 };

    // Group by name (case-insensitive) and location proximity
    const uniqueRestaurants: Restaurant[] = [];
    const duplicatesToDelete: string[] = [];

  allRestaurants.forEach(restaurant => {
      // Properly handle location field like getRestaurants() does
      let location: { latitude: number; longitude: number };
      if (restaurant.location && typeof restaurant.location === 'object' && 'latitude' in restaurant.location && 'longitude' in restaurant.location) {
        // Location stored as JSON object
        location = { latitude: Number(restaurant.location.latitude), longitude: Number(restaurant.location.longitude) };
      } else if (restaurant.latitude != null && restaurant.longitude != null) {
        // Location stored in separate columns
        location = { latitude: Number(restaurant.latitude), longitude: Number(restaurant.longitude) };
      } else {
        // Default fallback location
        location = { latitude: 40.7128, longitude: -74.0060 }; // NYC coordinates
      }

      const existing = uniqueRestaurants.find(r => 
        r.name.toLowerCase().trim() === restaurant.name.toLowerCase().trim() &&
        Math.abs(r.location.latitude - location.latitude) < 0.0005 &&
        Math.abs(r.location.longitude - location.longitude) < 0.0005
      );

      if (existing) {
        // Default: keep the first encountered, mark current as duplicate
        duplicatesToDelete.push(restaurant.id);
      } else {
        // Add to unique list with properly formatted location
        uniqueRestaurants.push({
          id: restaurant.id,
          name: restaurant.name,
          location,
          image: restaurant.image ?? undefined,
          category: restaurant.category ?? undefined,
          rating: typeof restaurant.rating === 'number' ? restaurant.rating : (restaurant.rating ? Number(restaurant.rating) : undefined),
          editorialRating: typeof restaurant.editorial_rating === 'number' ? restaurant.editorial_rating : (restaurant.editorial_rating ? Number(restaurant.editorial_rating) : undefined),
          priceRange: restaurant.price_range ?? undefined,
          description: restaurant.description ?? undefined,
          phone: restaurant.phone ?? undefined,
          hours: restaurant.hours ?? undefined,
          website: restaurant.website ?? undefined,
        } as Restaurant);
      }
    });

    // Delete duplicates
    if (duplicatesToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from(RESTAURANTS_TABLE)
        .delete()
        .in('id', duplicatesToDelete);

      if (deleteError) throw new Error(deleteError.message);
    }

    return {
      deleted: duplicatesToDelete.length,
      kept: uniqueRestaurants.length
    };
  } catch (error: any) {
    console.error('Error cleaning up duplicates:', error);
    throw new Error(error.message || 'Failed to cleanup duplicates');
  }
};

/**
 * Add restaurants from Google Maps URLs (parse and add to database)
 */
export const addRestaurantsFromGoogleMaps = async (googleMapsUrls: string[]): Promise<void> => {
  // This function would need a utility to parse Google Maps URLs into restaurant data
  // For now, we'll assume it's not implemented with Supabase directly
  throw new Error('addRestaurantsFromGoogleMaps is not implemented with Supabase yet');
};

export const fetchApprovedRestaurants = async (): Promise<RestaurantOwner[]> => {
  try {
    // Use business_owners table instead of restaurant_owners
    const { data, error } = await supabase
      .from(TABLES.BUSINESS_OWNERS)
      .select('*')
      .eq('is_verified', true);

    if (error) throw new Error(error.message);
    const businessOwners = data || [];

    // Sort by created_at descending in memory
    return businessOwners.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error: any) {
    console.error('Error fetching approved restaurants:', error);
    throw new Error(error.message || 'Failed to fetch approved restaurants');
  }
};

/**
 * Fetch all pending restaurant submissions
 */
export const fetchPendingRestaurants = async (): Promise<RestaurantSubmission[]> => {
  try {
    console.log('🔍 Fetching pending restaurants...');
    const { data, error } = await supabase
      .from(SUBMISSIONS_TABLE)
      .select('*')
      .eq('status', 'pending');

    if (error) throw new Error(error.message);
    const submissions = data || [];

    console.log('🔍 Submissions mapped:', submissions.length);

    // Sort by submittedAt descending in memory
    return submissions.sort((a, b) => b.submittedAt - a.submittedAt);
  } catch (error: any) {
    console.error('❌ Error fetching pending restaurants:', error);
    // Return empty array instead of throwing to prevent app crash
    return [];
  }
};

/**
 * Create a new restaurant submission
 */
export const createRestaurantSubmission = async (submission: Omit<RestaurantSubmission, 'id' | 'submittedAt' | 'status'>): Promise<string> => {
  try {
    const submissionData = {
      ...submission,
      submittedAt: new Date().toISOString(),
      status: 'pending' as const,
    };

    const { data, error } = await supabase
      .from(SUBMISSIONS_TABLE)
      .insert([submissionData])
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    return data.id;
  } catch (error: any) {
    console.error('Error creating restaurant submission:', error);
    throw new Error(error.message || 'Failed to create restaurant submission');
  }
};
