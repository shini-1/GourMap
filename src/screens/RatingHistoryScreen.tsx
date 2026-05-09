/**
 * Rating History Screen
 *
 * Shows all restaurants the logged-in Food Explorer has rated,
 * with their star rating and the date it was submitted.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../components/AuthContext';
import { supabase } from '../config/supabase';
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
  gold:    '#FFD700',
};

interface RatingEntry {
  restaurantId: string;
  stars: number;
  comment?: string;
  createdAt: string;
  restaurant?: Restaurant;
}

function StarRow({ stars }: { stars: number }) {
  return (
    <Text style={styles.stars}>
      {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
    </Text>
  );
}

function RatingCard({
  entry,
  onPress,
}: {
  entry: RatingEntry;
  onPress: () => void;
}) {
  const r = entry.restaurant;
  const cat = r ? resolveCategoryConfig(r.category, r.name) : null;
  const src = r?.image?.trim() ? { uri: r.image.trim() } : PLACEHOLDER;
  const date = new Date(entry.createdAt).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Image source={src} style={styles.cardImage} contentFit="cover" cachePolicy="memory-disk" />
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>
          {r?.name || entry.restaurantId}
        </Text>
        {cat && <Text style={styles.cardCat}>{cat.emoji} {cat.label}</Text>}
        <StarRow stars={entry.stars} />
        {entry.comment ? (
          <Text style={styles.cardComment} numberOfLines={2}>"{entry.comment}"</Text>
        ) : null}
        <Text style={styles.cardDate}>{date}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function RatingHistoryScreen({ navigation }: { navigation: any }) {
  const { explorerUser } = useAuth();
  const [ratings, setRatings]   = useState<RatingEntry[]>([]);
  const [loading, setLoading]   = useState(true);

  const loadRatings = useCallback(async () => {
    if (!explorerUser) return;
    setLoading(true);
    try {
      // Fetch user's ratings from Supabase
      const { data, error } = await supabase
        .from('restaurant_ratings')
        .select('restaurant_id, stars, comment, created_at')
        .eq('user_id', explorerUser.id)
        .order('created_at', { ascending: false });

      if (error || !data) { setRatings([]); return; }

      // Fetch restaurant details for each rating
      const allRestaurants = await restaurantService.getAllRestaurants();
      const restaurantMap = new Map(allRestaurants.map(r => [r.id, r]));

      const entries: RatingEntry[] = data.map((row: any) => ({
        restaurantId: row.restaurant_id,
        stars:        row.stars,
        comment:      row.comment || undefined,
        createdAt:    row.created_at,
        restaurant:   restaurantMap.get(row.restaurant_id),
      }));

      setRatings(entries);
    } catch (err) {
      console.warn('⚠️ RatingHistoryScreen load error:', err);
    } finally {
      setLoading(false);
    }
  }, [explorerUser]);

  useFocusEffect(useCallback(() => { loadRatings(); }, [loadRatings]));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⭐ My Ratings</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading ratings...</Text>
        </View>
      ) : ratings.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>⭐</Text>
          <Text style={styles.emptyTitle}>No ratings yet</Text>
          <Text style={styles.emptySubtitle}>
            Rate restaurants to see your history here.
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
          data={ratings}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <RatingCard
              entry={item}
              onPress={() => item.restaurant && navigation.navigate('RestaurantDetail', {
                restaurantId: item.restaurantId,
                restaurant: item.restaurant,
              })}
            />
          )}
          ListHeaderComponent={
            <Text style={styles.countLabel}>
              {ratings.length} restaurant{ratings.length !== 1 ? 's' : ''} rated
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
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
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.bg, borderWidth: 2, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  backBtnText: { fontSize: 16, fontWeight: 'bold', color: C.text },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 15, color: C.textSub },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  browseBtn: {
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
  },
  browseBtnText: { fontSize: 15, fontWeight: '700', color: C.text },
  list: { padding: 16, gap: 12 },
  countLabel: { fontSize: 13, color: C.textSub, marginBottom: 8 },
  card: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.border,
    overflow: 'hidden',
    alignItems: 'flex-start',
  },
  cardImage: { width: 80, height: 90, backgroundColor: '#F0F0F0' },
  cardContent: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  cardName: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
  cardCat: { fontSize: 11, color: C.textSub, marginBottom: 4 },
  stars: { fontSize: 16, color: C.gold, marginBottom: 4 },
  cardComment: { fontSize: 12, color: C.textSub, fontStyle: 'italic', marginBottom: 4, lineHeight: 16 },
  cardDate: { fontSize: 11, color: C.muted },
});
