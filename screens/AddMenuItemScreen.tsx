import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import { menuService, CreateMenuItemData } from '../src/services/menuService';
import { restaurantService } from '../src/services/restaurantService';
import { supabase } from '../src/config/supabase';

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

interface AddMenuItemScreenProps {
  navigation: any;
}

function AddMenuItemScreen({ navigation }: AddMenuItemScreenProps) {
  const { theme } = useTheme();
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddItem = async () => {
    if (!itemName.trim() || !price.trim() || !category.trim() || !description.trim()) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    if (isNaN(parseFloat(price))) {
      Alert.alert('Validation Error', 'Please enter a valid price');
      return;
    }

    setIsLoading(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Get owner's restaurant
      const restaurant = await restaurantService.getRestaurantByOwnerId(user.id);
      if (!restaurant) {
        Alert.alert('Error', 'You must create a restaurant first before adding menu items');
        navigation.navigate('CreateRestaurant');
        return;
      }

      const menuItemData: CreateMenuItemData = {
        restaurantId: restaurant.id,
        name: itemName.trim(),
        description: description.trim(),
        price: parseFloat(price),
        category: category.trim(),
      };

      console.log('🍽️ Adding menu item:', menuItemData);

      await menuService.createMenuItem(menuItemData);

      Alert.alert('Success', 'Menu item added successfully');
      setItemName('');
      setPrice('');
      setCategory('');
      setDescription('');
      navigation.navigate('BusinessDashboard');
    } catch (error: any) {
      console.error('Error adding menu item:', error);
      Alert.alert('Error', error.message || 'Failed to add menu item');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: DESIGN_COLORS.background }]}>
      <Header />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: DESIGN_COLORS.textPrimary }]}>✕</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: DESIGN_COLORS.textPrimary }]}>Add Menu Item</Text>

        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: DESIGN_COLORS.textPrimary }]}>Add New Menu Item</Text>

          <Text style={styles.fieldLabel}>Item Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: DESIGN_COLORS.border,
                backgroundColor: DESIGN_COLORS.cardBackground,
                color: DESIGN_COLORS.textPrimary,
              },
            ]}
            placeholder="e.g., Margherita Pizza"
            placeholderTextColor={DESIGN_COLORS.textPlaceholder}
            value={itemName}
            onChangeText={setItemName}
          />

          <Text style={styles.fieldLabel}>Price <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: DESIGN_COLORS.border,
                backgroundColor: DESIGN_COLORS.cardBackground,
                color: DESIGN_COLORS.textPrimary,
              },
            ]}
            placeholder="e.g., 12.99"
            placeholderTextColor={DESIGN_COLORS.textPlaceholder}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />

          <Text style={styles.fieldLabel}>Category <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: DESIGN_COLORS.border,
                backgroundColor: DESIGN_COLORS.cardBackground,
                color: DESIGN_COLORS.textPrimary,
              },
            ]}
            placeholder="e.g., Main Course, Appetizer"
            placeholderTextColor={DESIGN_COLORS.textPlaceholder}
            value={category}
            onChangeText={setCategory}
          />

          <Text style={styles.fieldLabel}>Description <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: DESIGN_COLORS.border,
                backgroundColor: DESIGN_COLORS.cardBackground,
                color: DESIGN_COLORS.textPrimary,
              },
            ]}
            placeholder="Describe the menu item"
            placeholderTextColor={DESIGN_COLORS.textPlaceholder}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: DESIGN_COLORS.cardBackground, borderColor: DESIGN_COLORS.border }]}
            onPress={handleAddItem}
            disabled={isLoading}
          >
            <Text style={[styles.addButtonText, { color: DESIGN_COLORS.textPrimary }]}>{isLoading ? 'Adding...' : 'Add Item'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    marginBottom: 24,
    textAlign: 'center',
    color: DESIGN_COLORS.textPrimary,
  },
  formSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: DESIGN_COLORS.textPrimary,
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
    minHeight: 48,
  },
  addButton: {
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 2,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
    color: DESIGN_COLORS.textPrimary,
  },
  required: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddMenuItemScreen;
