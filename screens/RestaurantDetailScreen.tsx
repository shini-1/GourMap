import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Restaurant, MenuItem } from '../types';
import { reverseGeocode } from '../src/services/geocodingService';
import { menuService } from '../src/services/menuService';
import { promoService, Promo } from '../src/services/promoService';
import { getAverageRating, getUserRating, submitRating } from '../src/services/ratingsService';
import { getDeviceId } from '../src/services/deviceId';
import { submitDeviceRating, getDeviceRating } from '../src/services/deviceRatingsService';
import { supabase } from '../src/config/supabase';
import Header from '../components/Header';
import MapBoxWebView from '../components/MapBoxWebView';

// Design colors matching the Home Screen exactly
const DESIGN_COLORS = {
  background: '#E6F3FF',      // Light blue - main screen background
  cardBackground: '#FFFFFF',   // White - card backgrounds
  border: '#000000',           // Black - all borders
  textPrimary: '#000000',      // Black - primary text (names, types)
  textSecondary: '#666666',    // Gray - secondary text (locations)
  textPlaceholder: '#999999',  // Light gray - placeholder text
  buttonBackground: '#FFFFFF', // White - button backgrounds
  infoBg: '#000000',          // Black - info button background
  infoText: '#FFFFFF',        // White - info button text
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN_COLORS.background,
    paddingTop: 50, // Account for status bar
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: DESIGN_COLORS.textSecondary,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: DESIGN_COLORS.textPrimary,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
  },
  imageContainer: {
    height: 250,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
  },
  content: {
    padding: 20,
  },
  infoSection: {
    marginBottom: 20,
  },
  restaurantName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: DESIGN_COLORS.textPrimary,
  },
  restaurantCategory: {
    fontSize: 16,
    marginBottom: 16,
    color: DESIGN_COLORS.textSecondary,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
    color: DESIGN_COLORS.textPrimary,
  },
  categoryText: {
    fontSize: 14,
    color: DESIGN_COLORS.textSecondary,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: DESIGN_COLORS.textSecondary,
  },
  contactContainer: {
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactText: {
    fontSize: 16,
    marginLeft: 12,
    color: DESIGN_COLORS.textPrimary,
  },
  hoursText: {
    fontSize: 16,
    lineHeight: 24,
    color: DESIGN_COLORS.textSecondary,
  },
  section: {
    padding: 20,
    marginVertical: 10,
    borderRadius: 12,
    width: '100%',
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    backgroundColor: DESIGN_COLORS.cardBackground,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: DESIGN_COLORS.textPrimary,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
  },
  locationInfo: {
    marginLeft: 12,
    flex: 1,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: DESIGN_COLORS.textPrimary,
  },
  locationSubtext: {
    fontSize: 14,
    color: DESIGN_COLORS.textSecondary,
  },
  directionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
  },
  directionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
  },
});

interface RestaurantDetailScreenProps {
  navigation: any;
  route?: {
    params?: {
      restaurantId?: string;
      restaurant?: Restaurant;
    };
  };
}

function RestaurantDetailScreen({ navigation, route }: RestaurantDetailScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Extract restaurant data from route params
  const { restaurantId, restaurant: initialRestaurant } = route?.params || {};

  // Component state
  const [restaurant, setRestaurant] = useState<Restaurant | null>(initialRestaurant || null);
  const [loading, setLoading] = useState(!initialRestaurant);
  const [address, setAddress] = useState<string>('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [avgRating, setAvgRating] = useState<number>(initialRestaurant?.rating ?? 0);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [submittingRating, setSubmittingRating] = useState<boolean>(false);

  // Debug logging
  useEffect(() => {
    console.log('🔍 RestaurantDetailScreen - route params:', route?.params);
    console.log('🔍 RestaurantDetailScreen - restaurantId:', restaurantId);
    console.log('🔍 RestaurantDetailScreen - initialRestaurant:', initialRestaurant);
  }, [route?.params, restaurantId, initialRestaurant]);

  // Load restaurant data if not provided
  useEffect(() => {
    if (initialRestaurant) {
      setRestaurant(initialRestaurant);
      setLoading(false);
    } else if (restaurantId) {
      // TODO: Implement fetching individual restaurant by ID
      console.log('🔍 Would fetch restaurant by ID:', restaurantId);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [initialRestaurant, restaurantId]);

  // Load device ID once
  useEffect(() => {
    (async () => {
      try {
        const id = await getDeviceId();
        setDeviceId(id);
      } catch {}
    })();
  }, []);

  // Load rating aggregate and user/device rating
  useEffect(() => {
    const loadRatings = async () => {
      if (!restaurant?.id) return;
      try {
        const { average, count } = await getAverageRating(restaurant.id);
        setAvgRating(average);
        setRatingCount(count);
      } catch {}
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data?.user?.id;
        if (uid) {
          const ur = await getUserRating(restaurant.id, uid);
          if (ur) setMyRating(ur.stars);
        } else if (deviceId) {
          const dr = await getDeviceRating(restaurant.id, deviceId);
          if (dr) setMyRating(dr.stars);
        } else {
          setMyRating(null);
        }
      } catch {}
    };
    if (restaurant) loadRatings();
  }, [restaurant, deviceId]);

  // Fetch address from coordinates
  useEffect(() => {
    const fetchAddress = async () => {
      if (restaurant?.location) {
        console.log('🔍 Geocoding for restaurant:', restaurant.name, 'at', restaurant.location.latitude, restaurant.location.longitude);
        const addr = await reverseGeocode(restaurant.location.latitude, restaurant.location.longitude);
        console.log('🔍 Geocoding result:', addr);
        setAddress(addr);
      } else {
        console.log('🔍 No location for restaurant:', restaurant);
      }
    };
    if (restaurant) {
      fetchAddress();
    }
  }, [restaurant]);

  // Fetch menu items for the restaurant
  useEffect(() => {
    const fetchMenuItems = async () => {
      if (restaurant?.id) {
        try {
          setMenuLoading(true);
          console.log('🍽️ Fetching menu items for restaurant:', restaurant.id);
          const items = await menuService.getMenuItemsByRestaurant(restaurant.id);
          console.log('🍽️ Fetched menu items:', items.length);
          setMenuItems(items);
        } catch (error) {
          console.error('❌ Error fetching menu items:', error);
          setMenuItems([]);
        } finally {
          setMenuLoading(false);
        }
      }
    };

    if (restaurant) {
      fetchMenuItems();
    }
  }, [restaurant]);

  // Fetch active promos for the restaurant
  useEffect(() => {
    const fetchPromos = async () => {
      if (restaurant?.id) {
        try {
          setPromoLoading(true);
          console.log('📢 Fetching active promos for restaurant:', restaurant.id);
          const activePromos = await promoService.getActivePromosByRestaurant(restaurant.id);
          console.log('📢 Fetched active promos:', activePromos.length);
          setPromos(activePromos);
        } catch (error) {
          console.error('❌ Error fetching promos:', error);
          setPromos([]);
        } finally {
          setPromoLoading(false);
        }
      }
    };

    if (restaurant) {
      fetchPromos();
    }
  }, [restaurant]);

  // Parse address from restaurant name (format: "Restaurant Name, Street, City, Province, Zip")
  const parseAddressFromName = (fullName: string): string => {
    const parts = fullName.split(', ');
    if (parts.length >= 4) {
      // Take Street, City, Province (parts 1, 2, 3)
      return parts.slice(1, 4).join(', ');
    } else if (parts.length >= 2) {
      // Fallback to removing just the restaurant name
      const addressParts = parts.slice(1);
      return addressParts.join(', ');
    }
    return fullName; // Fallback to full name if parsing fails
  };
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>
          Loading restaurant details...
        </Text>
      </View>
    );
  }

  // Error state
  if (!restaurant) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Restaurant not found</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView style={styles.container}>
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: restaurant.image || 'https://raw.githubusercontent.com/shini-1/GourMapExpo/main/assets/icon.png' }}
            style={styles.headerImage}
          />
          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + 10 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: DESIGN_COLORS.textPrimary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Restaurant Info */}
        <View style={styles.content}>
          <View style={styles.infoSection}>
            <Text style={[styles.restaurantName, { color: DESIGN_COLORS.textPrimary }]}>
              {restaurant.name.split(', ')[0]}
            </Text>

            {/* Rating and Category */}
            <View style={styles.ratingSection}>
              <View style={styles.ratingContainer}>
                <Text style={{ color: '#FFD700', fontSize: 16 }}>
                  {(() => {
                    const r = Math.round(avgRating || 0);
                    const full = '★'.repeat(Math.max(0, Math.min(5, r)));
                    const empty = '☆'.repeat(5 - Math.max(0, Math.min(5, r)));
                    return full + empty;
                  })()}
                </Text>
                <Text style={[styles.ratingText, { color: DESIGN_COLORS.textPrimary }]}>
                  {avgRating && typeof avgRating === 'number' && !isNaN(avgRating) ? avgRating.toFixed(1) : 'No ratings yet'}{ratingCount ? ` (${ratingCount})` : ''}
                </Text>
              </View>
              <Text style={[styles.categoryText, { color: DESIGN_COLORS.textSecondary }]}>
                {restaurant.category || 'Restaurant'} - {restaurant.priceRange || '₱'}
              </Text>
            </View>

            {/* Interactive rating for user or device (one-time) */}
            {myRating != null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <View key={star} style={{ marginRight: 6 }}>
                    <Text style={{ fontSize: 22, color: '#FFD700' }}>
                      {myRating >= star ? '★' : '☆'}
                    </Text>
                  </View>
                ))}
                <Text style={{ marginLeft: 8, color: DESIGN_COLORS.textSecondary }}>
                  You rated {myRating || 0}★
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={async () => {
                      try {
                        if (!restaurant?.id) return;
                        const { data } = await supabase.auth.getUser();
                        const uid = data?.user?.id;
                        setSubmittingRating(true);
                        if (uid) {
                          await submitRating(restaurant.id, uid, star);
                          setMyRating(star);
                        } else {
                          const id = deviceId || (await getDeviceId());
                          await submitDeviceRating(restaurant.id, id, star);
                          setDeviceId(id);
                          setMyRating(star);
                        }
                        const { average, count } = await getAverageRating(restaurant.id);
                        setAvgRating(average);
                        setRatingCount(count);
                      } catch (e: any) {
                        if (e?.message === 'ALREADY_RATED' || e?.message === 'ALREADY_RATED_DEVICE') {
                          Alert.alert('Already rated', 'You have already rated this restaurant.');
                          try {
                            const { data } = await supabase.auth.getUser();
                            const uid = data?.user?.id;
                            if (uid) {
                              const ur = await getUserRating(restaurant.id, uid);
                              if (ur) setMyRating(ur.stars);
                            } else if (deviceId) {
                              const dr = await getDeviceRating(restaurant.id, deviceId);
                              if (dr) setMyRating(dr.stars);
                            }
                          } catch {}
                        } else {
                          console.warn('Rating submit failed', e);
                        }
                      } finally {
                        setSubmittingRating(false);
                      }
                    }}
                    disabled={submittingRating}
                    style={{ marginRight: 6 }}
                  >
                    <Text style={{ fontSize: 22, color: '#FFD700' }}>
                      {'☆'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Description */}
          {restaurant.description && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: DESIGN_COLORS.textPrimary }]}>About</Text>
              <Text style={[styles.descriptionText, { color: DESIGN_COLORS.textSecondary }]}>
                {restaurant.description}
              </Text>
            </View>
          )}

          {/* Contact Information */}
          {(restaurant.phone || restaurant.website) && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: DESIGN_COLORS.textPrimary }]}>Contact</Text>
              <View style={styles.contactContainer}>
                {restaurant.phone && (
                  <TouchableOpacity
                    style={styles.contactItem}
                    onPress={() => Linking.openURL(`tel:${restaurant.phone}`)}
                  >
                    <Text style={{color: DESIGN_COLORS.textPrimary, fontSize: 20}}>📞</Text>
                    <Text style={[styles.contactText, { color: DESIGN_COLORS.textPrimary }]}>{restaurant.phone}</Text>
                  </TouchableOpacity>
                )}
                {restaurant.website && (
                  <TouchableOpacity
                    style={styles.contactItem}
                    onPress={() => Linking.openURL(restaurant.website!.startsWith('http') ? restaurant.website! : `https://${restaurant.website!}`)}
                  >
                    <Text style={{color: DESIGN_COLORS.textPrimary, fontSize: 20}}>🌐</Text>
                    <Text style={[styles.contactText, { color: DESIGN_COLORS.textPrimary }]}>{restaurant.website}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Hours */}
          {restaurant.hours && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: DESIGN_COLORS.textPrimary }]}>Hours</Text>
              <Text style={[styles.hoursText, { color: DESIGN_COLORS.textSecondary }]}>
                {restaurant.hours}
              </Text>
            </View>
          )}

          {/* Menu */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: DESIGN_COLORS.textPrimary }]}>Menu</Text>
            {menuLoading ? (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <ActivityIndicator size="small" color="#000000" />
                <Text style={[styles.descriptionText, { color: DESIGN_COLORS.textSecondary, marginTop: 8 }]}>
                  Loading menu...
                </Text>
              </View>
            ) : menuItems.length === 0 ? (
              <Text style={[styles.descriptionText, { color: DESIGN_COLORS.textSecondary, textAlign: 'center', paddingVertical: 20 }]}>
                No menu items available
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                {(() => {
                  // Group menu items by category
                  const groupedItems: Record<string, MenuItem[]> = {};
                  menuItems.forEach(item => {
                    const category = item.category || 'Other';
                    if (!groupedItems[category]) {
                      groupedItems[category] = [];
                    }
                    groupedItems[category].push(item);
                  });

                  return Object.entries(groupedItems).map(([category, items]) => (
                    <View key={category} style={{ marginBottom: 16 }}>
                      <Text style={[styles.sectionTitle, { color: DESIGN_COLORS.textPrimary, fontSize: 16, marginBottom: 8 }]}>
                        {category}
                      </Text>
                      {items.map(item => (
                        <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: DESIGN_COLORS.border + '30' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.restaurantName, { color: DESIGN_COLORS.textPrimary, fontSize: 16 }]}>
                              {item.name}
                            </Text>
                            {item.description && (
                              <Text style={[styles.descriptionText, { color: DESIGN_COLORS.textSecondary, fontSize: 14, marginTop: 2 }]}>
                                {item.description}
                              </Text>
                            )}
                          </View>
                          <Text style={[styles.restaurantName, { color: DESIGN_COLORS.textPrimary, fontSize: 16, fontWeight: 'bold' }]}>
                            ₱{item.price.toFixed(2)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ));
                })()}
              </View>
            )}
          </View>

          {/* Promotions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: DESIGN_COLORS.textPrimary }]}>Promotions</Text>
            {promoLoading ? (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <ActivityIndicator size="small" color="#000000" />
                <Text style={[styles.descriptionText, { color: DESIGN_COLORS.textSecondary, marginTop: 8 }]}>
                  Loading promotions...
                </Text>
              </View>
            ) : promos.length === 0 ? (
              <Text style={[styles.descriptionText, { color: DESIGN_COLORS.textSecondary, textAlign: 'center', paddingVertical: 20 }]}>
                No active promotions
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                {promos.map(promo => (
                  <View key={promo.id} style={{ padding: 16, backgroundColor: DESIGN_COLORS.cardBackground, borderRadius: 8, borderWidth: 1, borderColor: DESIGN_COLORS.border + '30' }}>
                    <Text style={[styles.restaurantName, { color: DESIGN_COLORS.textPrimary, fontSize: 18, fontWeight: 'bold' }]}>
                      {promo.title}
                    </Text>
                    <Text style={[styles.descriptionText, { color: DESIGN_COLORS.textSecondary, marginTop: 4 }]}>
                      {promo.description}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <Text style={[styles.categoryText, { color: DESIGN_COLORS.textPrimary, fontSize: 16, fontWeight: 'bold' }]}>
                        {promo.discount}% OFF
                      </Text>
                      <Text style={[styles.categoryText, { color: DESIGN_COLORS.textSecondary, fontSize: 14 }]}>
                        Expires: {new Date(promo.expiryDate).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Location Details */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: DESIGN_COLORS.textPrimary }]}>Location Details</Text>
            <View style={styles.locationCard}>
              <View style={styles.locationInfo}>
                <Text style={[styles.locationText, { color: DESIGN_COLORS.textPrimary }]}>
                  Location: {address || parseAddressFromName(restaurant.name)}
                </Text>
                <Text style={[styles.locationSubtext, { color: DESIGN_COLORS.textSecondary }]}>
                  Coordinates: {restaurant.location.latitude.toFixed(6)}, {restaurant.location.longitude.toFixed(6)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.directionButton}
                onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${restaurant.location.latitude},${restaurant.location.longitude}`)}
              >
                <Text style={[styles.directionButtonText, { color: DESIGN_COLORS.textPrimary }]}>Directions</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.mapContainer}>
              <MapBoxWebView restaurants={[restaurant]} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default RestaurantDetailScreen;

