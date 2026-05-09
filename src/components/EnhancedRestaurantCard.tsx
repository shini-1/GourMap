import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../theme/ThemeContext';
import { Restaurant } from '../types';
import { resolveCategoryConfig } from '../config/categoryConfig';
import { favoritesService } from '../services/favoritesService';
import { useAuth } from './AuthContext';

// Local placeholder image — bundled with the app, no network required
const PLACEHOLDER_IMAGE = require('../../assets/icon.png');

interface EnhancedRestaurantCardProps {
  restaurant: Restaurant;
  onPress: () => void;
  showSyncStatus?: boolean;
  showRanking?: boolean;
  ratingData?: any;
  navigation?: any;
  parsedAddress?: string;
}

const EnhancedRestaurantCard: React.FC<EnhancedRestaurantCardProps> = ({
  restaurant,
  onPress,
  parsedAddress,
}) => {
  const { explorerUser } = useAuth();
  const [animatedScale] = useState(new Animated.Value(1));
  const [heartScale]    = useState(new Animated.Value(1));
  const [isFavorited, setIsFavorited] = useState(false);
  const [favLoading, setFavLoading]   = useState(false);

  // Load favorite state when user is logged in
  useEffect(() => {
    if (!explorerUser) { setIsFavorited(false); return; }
    favoritesService.isFavorited(explorerUser.id, restaurant.id)
      .then(setIsFavorited)
      .catch(() => {});
  }, [explorerUser, restaurant.id]);

  const handleFavoriteToggle = useCallback(async (e: any) => {
    e.stopPropagation?.();
    if (!explorerUser || favLoading) return;

    // Optimistic update
    const next = !isFavorited;
    setIsFavorited(next);

    // Bounce animation
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.4, duration: 120, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 1,   duration: 120, useNativeDriver: true }),
    ]).start();

    setFavLoading(true);
    try {
      await favoritesService.toggleFavorite(explorerUser.id, restaurant.id, !next);
    } catch {
      setIsFavorited(!next); // revert on error
    } finally {
      setFavLoading(false);
    }
  }, [explorerUser, isFavorited, favLoading, restaurant.id, heartScale]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(animatedScale, { toValue: 0.98, duration: 100, useNativeDriver: true }),
      Animated.timing(animatedScale, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  const renderStars = (rating: number): string => {
    const safe = (typeof rating === 'number' && !isNaN(rating)) ? rating : 0;
    const full = Math.floor(safe);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  };

  const rating = typeof restaurant.rating === 'number' ? restaurant.rating : 0;
  const ratingText = rating > 0 ? rating.toFixed(1) : 'No ratings yet';
  const categoryConfig = resolveCategoryConfig(restaurant.category, restaurant.name);
  const categoryDisplay = `${categoryConfig.emoji} ${categoryConfig.label}`;
  const imageSource = (restaurant.image && restaurant.image.trim())
    ? { uri: restaurant.image.trim() }
    : PLACEHOLDER_IMAGE;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: animatedScale }] }]}>
      <TouchableOpacity onPress={handlePress} style={styles.card} activeOpacity={0.9}>
        {/* Image */}
        <Image
          source={imageSource}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
        />

        {/* Content */}
        <View style={styles.content}>
          {/* Title and Heart */}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {restaurant.name}
            </Text>

            {/* Heart button — only shown when logged in */}
            {explorerUser ? (
              <TouchableOpacity
                onPress={handleFavoriteToggle}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={favLoading}
              >
                <Animated.Text
                  style={[styles.heart, { transform: [{ scale: heartScale }] }]}
                >
                  {isFavorited ? '❤️' : '🤍'}
                </Animated.Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.heart}>🤍</Text>
            )}
          </View>

          {/* Location */}
          <Text style={styles.location} numberOfLines={2}>
            📍 {parsedAddress || `${restaurant.location?.latitude?.toFixed(4) || 'N/A'}, ${restaurant.location?.longitude?.toFixed(4) || 'N/A'}`}
          </Text>

          {/* Category */}
          <Text style={styles.category}>{categoryDisplay}</Text>

          {/* Rating Row */}
          <View style={styles.ratingRow}>
            <Text style={styles.stars}>{renderStars(rating)}</Text>
            <Text style={styles.ratingValue}>{ratingText}</Text>
            <Text style={styles.priceRange}>{restaurant.priceRange || '₱₱'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000000',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 10,
    margin: 10,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 10,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
    lineHeight: 18,
  },
  heart: {
    fontSize: 18,
    marginLeft: 6,
  },
  location: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 2,
    lineHeight: 13,
  },
  category: {
    fontSize: 10,
    color: '#999999',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stars: {
    fontSize: 11,
    color: '#FFD700',
    letterSpacing: 0.2,
  },
  ratingValue: {
    fontSize: 10,
    color: '#666666',
  },
  priceRange: {
    fontSize: 10,
    color: '#000000',
    fontWeight: '600',
  },
});

export default EnhancedRestaurantCard;
