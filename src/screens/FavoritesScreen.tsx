/**
 * Favorites Screen
 *
 * Shows all restaurants the logged-in Food Explorer has saved.
 * Tapping a card navigates to RestaurantDetail.
 * Tapping the heart unsaves the restaurant in real time.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '../components/AuthContext';
import { favoritesService } from '../services/favoritesService';
import { restaurantService } from '../services/restaurantService';
import { resolveCategoryConfig } from '../config/categoryConfig';
import { Restaurant } from '../types';

const PLACEHOLDER = require('../../assets/icon.png');

const C = {
  bg:      '#E6F3FF',
  card:    '#FFFFFF',
  border:  '#000000',
  text:    '#000000',
  textSub: '#666666',
  muted:   '#999999',
};

function FavoriteCard({
  restaurant,
  onPress,
  onUnsave,
}: {
  restaurant: Restaurant;
  onPress: () => void;
  onUnsave: () => void;
}) {
  const cat = resolveCategoryConfig(restaurant.category, restaurant.name);
  const rating = typeof restaurant.rating === 'number' ? restaurant.rating : 0;
  const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
  const src = restaurant.image?.trim() ? { uri: restaurant.image.trim() } : PLACEHOLDER;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Image source={src} style={styles.cardImage} contentFit="cover" cachePolicy="memory-disk" />
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>{restaurant.name}</Text>
        <Text style={styles.cardCat}>{cat.emoji} {cat.label}</Text>
        <View style={styles.cardRatingRow}>
          <Text style={styles.cardStars}>{stars}</Text>
          <Text style={styles.cardRating}>
            {rating > 0 ? rating.toFixed(1) : 'No ratings'}
          </Text>
          {restaurant.priceRange ? (
            <Text style={styles.cardPrice}>{restaurant.priceRange}</Text>
          ) : null}
        </View>
      </View>
      <TouchableOpacity
        style={styles.unsaveBtn}
        onPress={onUnsave}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.unsaveBtnText}>❤️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function FavoritesScreen({ navigation }: { navigation: any }) {
  const { explorerUser } = useAuth();
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [loading, setLoading]     = useState(true);

  const loadFavorites = useCallback(async () => {
    if (!explorerUser) return;
    setLoading(true);
    try {
      const ids = await favoritesService.getFavoriteIds(explorerUser.id);
      if (ids.length === 0) { setFavorites([]); return; }

      // Fetch all restaurants and filter to favorited ones
      const all = await restaurantService.getAllRestaurants();
      const favSet = new Set(ids);
      setFavorites(all.filter(r => favSet.has(r.id)));
    } catch (err) {
      console.warn('⚠️ FavoritesScreen load error:', err);
    } finally {
      setLoading(false);
    }
  }, [explorerUser]);

  useEffect(() => { loadFavorites(); }, [loadFavorites]);

  const handleUnsave = useCallback(async (restaurantId: string) => {
    if (!explorerUser) return;
    // Optimistic remove
    setFavorites(prev => prev.filter(r => r.id !== restaurantId));
    try {
      await favoritesService.removeFavorite(explorerUser.id, restaurantId);
    } catch {
      // Revert on error
      loadFavorites();
    }
  }, [explorerUser, loadFavorites]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>❤️ My Favorites</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🤍</Text>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the heart on any restaurant card to save it here.
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.browseBtnText}>Browse Restaurants</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={r => r.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <FavoriteCard
              restaurant={item}
              onPress={() => navigation.navigate('RestaurantDetail', {
                restaurantId: item.id,
                restaurant: item,
              })}
              onUnsave={() => handleUnsave(item.id)}
            />
          )}
          ListHeaderComponent={
            <Text style={styles.countLabel}>
              {favorites.length} saved restaurant{favorites.length !== 1 ? 's' : ''}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: C.card,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 2,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: C.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: C.textSub,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  browseBtn: {
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  browseBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  countLabel: {
    fontSize: 13,
    color: C.textSub,
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.border,
    overflow: 'hidden',
    alignItems: 'center',
  },
  cardImage: {
    width: 80,
    height: 80,
    backgroundColor: '#F0F0F0',
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginBottom: 3,
  },
  cardCat: {
    fontSize: 12,
    color: C.textSub,
    marginBottom: 4,
  },
  cardRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardStars: {
    fontSize: 11,
    color: '#FFD700',
  },
  cardRating: {
    fontSize: 11,
    color: C.textSub,
  },
  cardPrice: {
    fontSize: 11,
    fontWeight: '600',
    color: C.text,
  },
  unsaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  unsaveBtnText: {
    fontSize: 22,
  },
});
