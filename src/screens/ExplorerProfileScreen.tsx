/**
 * Explorer Profile Screen
 *
 * Shows the logged-in Food Explorer's profile:
 * - Display name (editable)
 * - Email
 * - Favorites count
 * - Preferred categories
 * - Logout button
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../components/AuthContext';
import { userProfileService } from '../services/userProfileService';
import { favoritesService } from '../services/favoritesService';
import { CATEGORY_CONFIG } from '../config/categoryConfig';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';

const C = {
  bg:      '#E6F3FF',
  card:    '#FFFFFF',
  border:  '#000000',
  text:    '#000000',
  textSub: '#666666',
  muted:   '#999999',
  danger:  '#C62828',
};

export default function ExplorerProfileScreen({ navigation }: { navigation: any }) {
  const { explorerUser, setExplorerUser, logoutExplorer } = useAuth();

  const [displayName, setDisplayName]     = useState(explorerUser?.displayName || '');
  const [editingName, setEditingName]     = useState(false);
  const [savingName, setSavingName]       = useState(false);
  const [favCount, setFavCount]           = useState(0);
  const [ratingCount, setRatingCount]     = useState(0);
  const [preferences, setPreferences]     = useState<string[]>([]);
  const [loadingStats, setLoadingStats]   = useState(true);

  // Reload stats every time the screen comes into focus (handles unsave from FavoritesScreen)
  useFocusEffect(
    useCallback(() => {
      if (!explorerUser) return;
      const load = async () => {
        try {
          const [favIds, prefs] = await Promise.all([
            favoritesService.getFavoriteIds(explorerUser.id),
            favoritesService.getPreferences(explorerUser.id),
          ]);
          setFavCount(favIds.length);
          setPreferences(prefs);

          // Count ratings
          const { count } = await supabase
            .from('restaurant_ratings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', explorerUser.id);
          setRatingCount(count || 0);
        } catch (err) {
          console.warn('⚠️ Profile stats load error:', err);
        } finally {
          setLoadingStats(false);
        }
      };
      load();
    }, [explorerUser])
  );
  const handleSaveName = useCallback(async () => {
    if (!explorerUser || !displayName.trim()) return;
    setSavingName(true);
    try {
      await userProfileService.updateProfile(explorerUser.id, { displayName: displayName.trim() });
      setExplorerUser({ ...explorerUser, displayName: displayName.trim() });
      setEditingName(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update name.');
    } finally {
      setSavingName(false);
    }
  }, [explorerUser, displayName, setExplorerUser]);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logoutExplorer();
            navigation.navigate('RoleSelection');
          },
        },
      ]
    );
  };

  const handleEditPreferences = () => {
    if (!explorerUser) return;
    navigation.navigate('OnboardingPreferences', {
      userId: explorerUser.id,
      isEditing: true,
    });
  };

  if (!explorerUser) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Not logged in.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Avatar placeholder */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>🍽️</Text>
        </View>
        <Text style={styles.memberSince}>
          Member since {new Date(explorerUser.createdAt).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
        </Text>
      </View>

      {/* Display name */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Display Name</Text>
        <View style={styles.nameRow}>
          {editingName ? (
            <>
              <TextInput
                style={styles.nameInput}
                value={displayName}
                onChangeText={setDisplayName}
                autoFocus
                maxLength={40}
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
              <TouchableOpacity
                style={styles.saveNameBtn}
                onPress={handleSaveName}
                disabled={savingName}
              >
                {savingName
                  ? <ActivityIndicator size="small" color={C.text} />
                  : <Text style={styles.saveNameBtnText}>Save</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelNameBtn}
                onPress={() => { setDisplayName(explorerUser.displayName); setEditingName(false); }}
              >
                <Text style={styles.cancelNameBtnText}>✕</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.nameText}>{explorerUser.displayName}</Text>
              <TouchableOpacity onPress={() => setEditingName(true)} style={styles.editBtn}>
                <Text style={styles.editBtnText}>✏️ Edit</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Email */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Email</Text>
        <Text style={styles.infoText}>{explorerUser.email}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('Favorites')}
          activeOpacity={0.8}
        >
          {loadingStats
            ? <ActivityIndicator size="small" color={C.text} />
            : <Text style={styles.statNumber}>{favCount}</Text>
          }
          <Text style={styles.statLabel}>❤️ Saved</Text>
          <Text style={styles.statArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('RatingHistory')}
          activeOpacity={0.8}
        >
          {loadingStats
            ? <ActivityIndicator size="small" color={C.text} />
            : <Text style={styles.statNumber}>{ratingCount}</Text>
          }
          <Text style={styles.statLabel}>⭐ Rated</Text>
          <Text style={styles.statArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Preferred categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>Food Preferences</Text>
          <TouchableOpacity onPress={handleEditPreferences}>
            <Text style={styles.editBtnText}>✏️ Edit</Text>
          </TouchableOpacity>
        </View>
        {preferences.length === 0 ? (
          <TouchableOpacity style={styles.emptyPrefsBtn} onPress={handleEditPreferences}>
            <Text style={styles.emptyPrefsText}>+ Set your food preferences</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.prefChips}>
            {preferences.map(key => {
              const cat = CATEGORY_CONFIG[key];
              if (!cat) return null;
              return (
                <View key={key} style={styles.prefChip}>
                  <Text style={styles.prefChipText}>{cat.emoji} {cat.label}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutBtnText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
  },
  emptyText: {
    fontSize: 16,
    color: C.textSub,
    marginBottom: 16,
  },
  backBtn: {
    padding: 12,
    backgroundColor: C.card,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.border,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
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
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 2,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: C.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.bg,
    borderWidth: 2,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarEmoji: {
    fontSize: 36,
  },
  memberSince: {
    fontSize: 13,
    color: C.textSub,
  },
  section: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.border,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameText: {
    fontSize: 17,
    fontWeight: '600',
    color: C.text,
    flex: 1,
  },
  nameInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: C.text,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
    paddingVertical: 4,
  },
  saveNameBtn: {
    backgroundColor: C.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveNameBtnText: {
    color: C.card,
    fontSize: 13,
    fontWeight: '700',
  },
  cancelNameBtn: {
    padding: 6,
  },
  cancelNameBtnText: {
    fontSize: 16,
    color: C.textSub,
  },
  editBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editBtnText: {
    fontSize: 13,
    color: C.textSub,
    fontWeight: '500',
  },
  infoText: {
    fontSize: 15,
    color: C.text,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.border,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: C.textSub,
  },
  statArrow: {
    fontSize: 18,
    color: C.muted,
    marginTop: 4,
  },
  prefChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prefChip: {
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  prefChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: C.text,
  },
  emptyPrefsBtn: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  emptyPrefsText: {
    fontSize: 14,
    color: C.textSub,
  },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.danger,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  logoutBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.danger,
  },
});
