import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export type SortOption = 'highest' | 'lowest' | 'trending' | 'mostReviewed' | 'newest' | 'name';

interface RatingSortSelectorProps {
  selectedSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  compact?: boolean;
}

const sortOptions: { value: SortOption; label: string; icon: string; description: string }[] = [
  {
    value: 'highest',
    label: 'Highest Rated',
    icon: '⭐',
    description: 'Restaurants with highest ratings first'
  },
  {
    value: 'lowest',
    label: 'Lowest Rated',
    icon: '⬇️',
    description: 'Restaurants with lowest ratings first'
  },
  {
    value: 'trending',
    label: 'Trending Up',
    icon: '📈',
    description: 'Restaurants with improving ratings'
  },
  {
    value: 'mostReviewed',
    label: 'Most Reviewed',
    icon: '💬',
    description: 'Restaurants with most customer reviews'
  },
  {
    value: 'newest',
    label: 'Newest First',
    icon: '🆕',
    description: 'Recently added restaurants'
  },
  {
    value: 'name',
    label: 'Name A-Z',
    icon: '🔤',
    description: 'Alphabetical order'
  }
];

const RatingSortSelector: React.FC<RatingSortSelectorProps> = ({
  selectedSort,
  onSortChange,
  compact = false
}) => {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const currentOption = sortOptions.find(option => option.value === selectedSort);

  const handleSortSelect = (sort: SortOption) => {
    onSortChange(sort);
    setModalVisible(false);
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, { backgroundColor: theme.surface }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.compactIcon}>{currentOption?.icon || '⭐'}</Text>
        <Text style={[styles.compactText, { color: theme.text }]}>
          {currentOption?.label || 'Sort'}
        </Text>
        <Text style={[styles.compactArrow, { color: theme.textSecondary }]}>▼</Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.container, { backgroundColor: theme.surface }]}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.leftSection}>
          <Text style={styles.icon}>{currentOption?.icon || '⭐'}</Text>
          <View style={styles.textSection}>
            <Text style={[styles.label, { color: theme.text }]}>
              Sort by: {currentOption?.label || 'Rating'}
            </Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {currentOption?.description || 'Sort restaurants'}
            </Text>
          </View>
        </View>
        <Text style={[styles.arrow, { color: theme.textSecondary }]}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Sort Restaurants
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionItem,
                    {
                      backgroundColor: selectedSort === option.value ? theme.primary + '20' : 'transparent',
                      borderColor: selectedSort === option.value ? theme.primary : theme.border
                    }
                  ]}
                  onPress={() => handleSortSelect(option.value)}
                >
                  <View style={styles.optionLeft}>
                    <Text style={styles.optionIcon}>{option.icon}</Text>
                    <View style={styles.optionText}>
                      <Text style={[
                        styles.optionLabel,
                        {
                          color: selectedSort === option.value ? theme.primary : theme.text,
                          fontWeight: selectedSort === option.value ? '600' : '400'
                        }
                      ]}>
                        {option.label}
                      </Text>
                      <Text style={[styles.optionDescription, { color: theme.textSecondary }]}>
                        {option.description}
                      </Text>
                    </View>
                  </View>
                  {selectedSort === option.value && (
                    <Text style={[styles.selectedIcon, { color: theme.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 16,
    marginRight: 12,
  },
  textSection: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
  },
  arrow: {
    fontSize: 12,
    marginLeft: 12,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginHorizontal: 16,
    marginVertical: 4,
  },
  compactIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  compactText: {
    fontSize: 12,
    flex: 1,
  },
  compactArrow: {
    fontSize: 10,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  optionsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 4,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
  },
  selectedIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default RatingSortSelector;
