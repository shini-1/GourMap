import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import { promoService } from '../src/services/promoService';
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

interface PostPromoScreenProps {
  navigation: any;
}

function PostPromoScreen({ navigation }: PostPromoScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDescription, setPromoDescription] = useState('');
  const [discount, setDiscount] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePostPromo = async () => {
    if (!promoTitle.trim() || !promoDescription.trim() || !discount.trim() || !expiryDate.trim()) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    const discountValue = parseFloat(discount);
    if (isNaN(discountValue) || discountValue <= 0 || discountValue > 100) {
      Alert.alert('Validation Error', 'Please enter a valid discount percentage (1-100)');
      return;
    }

    // Validate expiry date
    const today = new Date().toISOString().split('T')[0];
    if (expiryDate < today) {
      Alert.alert('Validation Error', 'Expiry date must be in the future');
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
        Alert.alert('Error', 'You must create a restaurant first before posting promos');
        navigation.navigate('CreateRestaurant');
        return;
      }

      console.log('Posting promo for restaurant:', restaurant.id, {
        promoTitle,
        promoDescription,
        discount: discountValue,
        expiryDate,
      });

      await promoService.createPromo({
        restaurantId: restaurant.id,
        title: promoTitle.trim(),
        description: promoDescription.trim(),
        discount: discountValue,
        expiryDate,
      });

      Alert.alert('Success', 'Promo posted successfully');
      setPromoTitle('');
      setPromoDescription('');
      setDiscount('');
      setExpiryDate('');
      navigation.navigate('BusinessDashboard');
    } catch (error: any) {
      console.error('Error posting promo:', error);
      Alert.alert('Error', error.message || 'Failed to post promo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: DESIGN_COLORS.background }]}>
      <Header />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { top: insets.top + 10 }]}>
          <Text style={[styles.backButtonText, { color: DESIGN_COLORS.textPrimary }]}>✕</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: DESIGN_COLORS.textPrimary }]}>Post Promo</Text>

        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: DESIGN_COLORS.textPrimary }]}>Create New Promotion</Text>

          <Text style={styles.fieldLabel}>Promo Title <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: DESIGN_COLORS.border,
                backgroundColor: DESIGN_COLORS.cardBackground,
                color: DESIGN_COLORS.textPrimary,
              },
            ]}
            placeholder="e.g., Weekend Special: 20% Off"
            placeholderTextColor={DESIGN_COLORS.textPlaceholder}
            value={promoTitle}
            onChangeText={setPromoTitle}
          />

          <Text style={styles.fieldLabel}>Promo Description <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: DESIGN_COLORS.border,
                backgroundColor: DESIGN_COLORS.cardBackground,
                color: DESIGN_COLORS.textPrimary,
              },
            ]}
            placeholder="Describe your promotion in detail"
            placeholderTextColor={DESIGN_COLORS.textPlaceholder}
            value={promoDescription}
            onChangeText={setPromoDescription}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.fieldLabel}>Discount Percentage <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: DESIGN_COLORS.border,
                backgroundColor: DESIGN_COLORS.cardBackground,
                color: DESIGN_COLORS.textPrimary,
              },
            ]}
            placeholder="e.g., 20 for 20% off"
            placeholderTextColor={DESIGN_COLORS.textPlaceholder}
            value={discount}
            onChangeText={setDiscount}
            keyboardType="decimal-pad"
          />

          <Text style={styles.fieldLabel}>Expiry Date <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: DESIGN_COLORS.border,
                backgroundColor: DESIGN_COLORS.cardBackground,
                color: DESIGN_COLORS.textPrimary,
              },
            ]}
            placeholder="YYYY-MM-DD (e.g., 2024-12-31)"
            placeholderTextColor={DESIGN_COLORS.textPlaceholder}
            value={expiryDate}
            onChangeText={setExpiryDate}
          />

          <TouchableOpacity
            style={[styles.postButton, { backgroundColor: DESIGN_COLORS.cardBackground, borderColor: DESIGN_COLORS.border }]}
            onPress={handlePostPromo}
            disabled={isLoading}
          >
            <Text style={[styles.postButtonText, { color: DESIGN_COLORS.textPrimary }]}>{isLoading ? 'Posting...' : 'Post Promo'}</Text>
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
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderColor: DESIGN_COLORS.border,
    color: DESIGN_COLORS.textPrimary,
  },
  postButton: {
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
  postButtonText: {
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

export default PostPromoScreen;
