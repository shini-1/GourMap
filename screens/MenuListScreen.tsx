import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import { DESIGN_COLORS, SHADOW_STYLE, BORDER_RADIUS } from '../src/config/designColors';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface MenuListScreenProps {
  navigation: any;
}

function MenuListScreen({ navigation }: MenuListScreenProps) {
  const { theme } = useTheme();
  const [menuItems] = useState<MenuItem[]>([
    { id: '1', name: 'Margherita Pizza', price: 12.99, category: 'Italian' },
    { id: '2', name: 'Caesar Salad', price: 8.99, category: 'Salad' },
    { id: '3', name: 'Grilled Chicken', price: 15.99, category: 'Main Course' },
    { id: '4', name: 'Chocolate Cake', price: 6.99, category: 'Dessert' },
  ]);

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <TouchableOpacity
      style={styles.menuItem}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemContent}>
        <Text style={styles.menuItemName}>{item.name}</Text>
        <View style={styles.menuItemDetails}>
          <Text style={styles.menuItemPrice}>${item.price.toFixed(2)}</Text>
          <Text style={styles.menuItemCategory}>{item.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Menu List</Text>
        <Text style={styles.subtitle}>Your Menu Items</Text>

        <FlatList
          data={menuItems}
          renderItem={renderMenuItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.listContainer}
        />

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddMenuItem')}
        >
          <Text style={styles.addButtonText}>+ Add New Item</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN_COLORS.background,
    paddingTop: 50,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.circle,
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW_STYLE,
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
    color: DESIGN_COLORS.textPrimary,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    color: DESIGN_COLORS.textSecondary,
  },
  listContainer: {
    gap: 12,
    marginBottom: 16,
  },
  menuItem: {
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.medium,
    padding: 16,
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderColor: DESIGN_COLORS.border,
    ...SHADOW_STYLE,
  },
  menuItemContent: {
    gap: 8,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: DESIGN_COLORS.textPrimary,
  },
  menuItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
  },
  menuItemCategory: {
    fontSize: 12,
    fontStyle: 'italic',
    color: DESIGN_COLORS.textSecondary,
  },
  addButton: {
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 'auto',
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    ...SHADOW_STYLE,
  },
  addButtonText: {
    color: DESIGN_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MenuListScreen;
