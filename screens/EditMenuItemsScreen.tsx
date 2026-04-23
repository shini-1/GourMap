import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import { menuService } from '../src/services/menuService';
import { restaurantService } from '../src/services/restaurantService';
import { supabase } from '../src/config/supabase';
import { MenuItem } from '../types';

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

interface EditMenuItemsScreenProps {
  navigation: any;
}

function EditMenuItemsScreen({ navigation }: EditMenuItemsScreenProps) {
  const { theme } = useTheme();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Get owner's restaurant
      const restaurant = await restaurantService.getRestaurantByOwnerId(user.id);
      if (!restaurant) {
        Alert.alert('Error', 'You must create a restaurant first');
        navigation.navigate('CreateRestaurant');
        return;
      }

      // Load menu items
      const items = await menuService.getMenuItemsByRestaurant(restaurant.id);
      setMenuItems(items);
    } catch (error: any) {
      console.error('Error loading menu items:', error);
      Alert.alert('Error', error.message || 'Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: MenuItem) => {
    console.log('Edit item:', item);
    Alert.alert('Edit', `Edit functionality for ${item.name} is not implemented yet`);
  };

  const handleDelete = async (itemId: string) => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await menuService.deleteMenuItem(itemId);
            setMenuItems(menuItems.filter(item => item.id !== itemId));
            Alert.alert('Success', 'Item deleted successfully');
          } catch (error: any) {
            console.error('Error deleting menu item:', error);
            Alert.alert('Error', error.message || 'Failed to delete item');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <View style={[styles.menuItem, { borderColor: DESIGN_COLORS.border, backgroundColor: DESIGN_COLORS.cardBackground }]}>
      <Text style={[styles.menuItemName, { color: DESIGN_COLORS.textPrimary }]}>{item.name}</Text>
      <Text style={[styles.menuItemPrice, { color: DESIGN_COLORS.textPrimary }]}>${item.price.toFixed(2)}</Text>
      <Text style={[styles.menuItemCategory, { color: DESIGN_COLORS.textSecondary }]}>{item.category || 'Uncategorized'}</Text>
      <Text style={[styles.menuItemDescription, { color: DESIGN_COLORS.textSecondary }]}>
        {item.description || 'No description'}
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: DESIGN_COLORS.cardBackground, borderColor: DESIGN_COLORS.border }]}
          onPress={() => handleEdit(item)}
        >
          <Text style={[styles.buttonText, { color: DESIGN_COLORS.textPrimary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: DESIGN_COLORS.background }]}>
      <Header />
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: DESIGN_COLORS.textPrimary }]}>✕</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: DESIGN_COLORS.textPrimary }]}>Edit Menu Items</Text>

        <FlatList
          data={menuItems}
          renderItem={renderMenuItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN_COLORS.background,
    paddingTop: 50, // Account for status bar
  },
  content: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 20,
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
    zIndex: 1000,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: DESIGN_COLORS.textPrimary,
  },
  listContainer: {
    gap: 12,
  },
  menuItem: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  menuItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  menuItemCategory: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  menuItemDescription: {
    fontSize: 13,
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 2,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#ff4444',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default EditMenuItemsScreen;
