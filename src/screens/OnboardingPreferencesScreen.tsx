/**
 * Onboarding Preferences Screen
 *
 * Shown once after a new Food Explorer signs up.
 * User picks 3+ favorite food categories to personalize their experience.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { favoritesService } from '../services/favoritesService';
import { CATEGORY_CONFIG } from '../config/categoryConfig';

const C = {
  bg:       '#E6F3FF',
  card:     '#FFFFFF',
  border:   '#000000',
  text:     '#000000',
  textSub:  '#666666',
  selected: '#000000',
  selText:  '#FFFFFF',
};

// Curated list of categories to show during onboarding (most relevant for Kalibo)
const ONBOARDING_CATEGORIES = [
  'filipino', 'seafood', 'grill', 'bbq', 'fast_food', 'cafe', 'bakery',
  'dessert', 'buffet', 'noodles', 'chicken', 'breakfast', 'snacks',
  'chinese', 'korean', 'japanese', 'italian', 'vegetarian',
];

interface Props {
  userId: string;
  onComplete: (selectedCategories: string[]) => void;
  onSkip: () => void;
}

export default function OnboardingPreferencesScreen({ userId, onComplete, onSkip }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    const categories = Array.from(selected);
    setSaving(true);
    try {
      await favoritesService.savePreferences(userId, categories);
      onComplete(categories);
    } catch (err) {
      console.warn('⚠️ Failed to save preferences:', err);
      onComplete(categories); // proceed anyway
    } finally {
      setSaving(false);
    }
  };

  const categories = ONBOARDING_CATEGORIES
    .map(key => ({ key, ...CATEGORY_CONFIG[key] }))
    .filter(c => c.label); // only show categories that exist in config

  const canContinue = selected.size >= 1;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.emoji}>🍽️</Text>
        <Text style={styles.title}>What do you love to eat?</Text>
        <Text style={styles.subtitle}>
          Pick your favorite food types so we can personalize your experience.
          {'\n'}Select at least 1 to continue.
        </Text>
      </View>

      {/* Category grid */}
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {categories.map(cat => {
          const isSelected = selected.has(cat.key);
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggle(cat.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.chipEmoji}>{cat.emoji}</Text>
              <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                {cat.label}
              </Text>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.selectedCount}>
          {selected.size} selected
        </Text>

        <TouchableOpacity
          style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
          onPress={handleSave}
          disabled={!canContinue || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={C.selText} />
          ) : (
            <Text style={styles.continueBtnText}>
              {canContinue ? 'Start Exploring 🚀' : 'Pick at least 1'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  emoji: {
    fontSize: 52,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  chipSelected: {
    backgroundColor: C.selected,
  },
  chipEmoji: {
    fontSize: 18,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  chipLabelSelected: {
    color: C.selText,
  },
  checkmark: {
    fontSize: 12,
    color: C.selText,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: C.bg,
  },
  selectedCount: {
    fontSize: 13,
    color: C.textSub,
    marginBottom: 12,
  },
  continueBtn: {
    width: '100%',
    backgroundColor: C.selected,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  continueBtnDisabled: {
    backgroundColor: '#CCCCCC',
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.selText,
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: C.textSub,
  },
});
