import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../theme/ThemeContext';
import { Restaurant } from '../types';

// Default GourMap placeholder image when no restaurant image is available
const getPlaceholderImage = (): string => {
  // Use GourMap logo/branding as default placeholder
  return 'https://raw.githubusercontent.com/shini-1/GourMapExpo/main/assets/icon.png';
};

interface EnhancedRestaurantCardProps {
  restaurant: Restaurant;
  onPress: () => void;
  showSyncStatus?: boolean;
  showRanking?: boolean;
  ratingData?: any;
  navigation?: any;
  parsedAddress?: string; // Add parsed address prop
}

const EnhancedRestaurantCard: React.FC<EnhancedRestaurantCardProps> = ({
  restaurant,
  onPress,
  showSyncStatus = true,
  showRanking = true,
  ratingData,
  navigation,
  parsedAddress
}) => {
  const { theme } = useTheme();
  const [animatedScale] = useState(new Animated.Value(1));

  // Animate on mount
  useEffect(() => {
    Animated.spring(animatedScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, []);

  const renderStars = (rating: number): string => {
    const safeRating = (typeof rating === 'number' && !isNaN(rating)) ? rating : 0;
    const fullStars = Math.floor(safeRating);
    return '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
  };

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(animatedScale, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  const rating = typeof restaurant.rating === 'number' ? restaurant.rating : 0;
  const ratingText = rating > 0 ? rating.toFixed(1) : 'No ratings yet';

  // Debug logging and validation for image display
  const imageUri = restaurant.image && restaurant.image.trim() ? restaurant.image.trim() : getPlaceholderImage();
  const isUsingPlaceholder = !restaurant.image || !restaurant.image.trim();
  
  useEffect(() => {
    if (isUsingPlaceholder) {
      console.log(`📷 Restaurant "${restaurant.name}" has no image, using placeholder`);
    } else {
      console.log(`📷 Restaurant "${restaurant.name}" image URL:`, restaurant.image);
      console.log(`📷 Image URI (trimmed):`, imageUri);
    }
  }, [restaurant.image, restaurant.name, imageUri, isUsingPlaceholder]);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: animatedScale }] }]}>
      <TouchableOpacity onPress={handlePress} style={styles.card}>
        {/* Image */}
        <Image
          source={{
            uri: imageUri
          }}
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
            <Text style={styles.heart}>🤍</Text>
          </View>

          {/* Location */}
          <Text style={styles.location} numberOfLines={2}>
            📍 {parsedAddress || `${restaurant.location?.latitude?.toFixed(4) || 'N/A'}, ${restaurant.location?.longitude?.toFixed(4) || 'N/A'}`}
          </Text>

          {/* Category */}
          <Text style={styles.category}>
            {restaurant.category || 'Restaurant'}
          </Text>

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
    fontSize: 16,
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
