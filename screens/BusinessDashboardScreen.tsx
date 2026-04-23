import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
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

interface BusinessDashboardScreenProps {
  navigation: any;
}

function BusinessDashboardScreen({ navigation }: BusinessDashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const [hasRestaurant, setHasRestaurant] = useState(false);
  const [isCheckingRestaurant, setIsCheckingRestaurant] = useState(true);
  const [userRestaurant, setUserRestaurant] = useState<any>(null);

  // Check if user has a restaurant
  const checkUserRestaurant = async () => {
    try {
      setIsCheckingRestaurant(true);
      console.log('🔍 Checking if user has a restaurant...');

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.warn('⚠️ User not authenticated');
        setHasRestaurant(false);
        setIsCheckingRestaurant(false);
        return;
      }

      // Query restaurant by owner_id
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('⚠️ Error checking restaurant:', error);
        setHasRestaurant(false);
      } else if (data) {
        console.log('✅ User has a restaurant:', data.name);
        setHasRestaurant(true);
        setUserRestaurant(data);
      } else {
        console.log('ℹ️ User does not have a restaurant yet');
        setHasRestaurant(false);
        setUserRestaurant(null);
      }
    } catch (error: any) {
      console.error('❌ Error checking restaurant status:', error);
      setHasRestaurant(false);
    } finally {
      setIsCheckingRestaurant(false);
    }
  };

  // Check on mount
  useEffect(() => {
    checkUserRestaurant();
  }, []);

  // Re-check when screen gains focus (after creating restaurant)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 Dashboard focused, re-checking restaurant status...');
      checkUserRestaurant();
    });

    return unsubscribe;
  }, [navigation]);

  const quickActions = [
    {
      id: hasRestaurant ? 'manage-restaurant' : 'create-restaurant',
      label: hasRestaurant ? 'Manage Restaurant' : 'Create Restaurant',
      icon: hasRestaurant ? '⚙️' : '🏪',
    },
    { id: 'edit-profile', label: 'Edit Profile', icon: '👤' },
  ];

  const handleActionPress = (actionId: string) => {
    if (!navigation || typeof navigation.navigate !== 'function') {
      console.error('Navigation object not available');
      return;
    }

    switch (actionId) {
      case 'create-restaurant':
        navigation.navigate('CreateRestaurant');
        break;
      case 'manage-restaurant':
        // Navigate to restaurant management screen
        if (userRestaurant) {
          navigation.navigate('RestaurantDetail', {
            restaurantId: userRestaurant.id,
            restaurant: userRestaurant
          });
        }
        break;
      case 'edit-profile':
        navigation.navigate('EditProfile');
        break;
      default:
        break;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: DESIGN_COLORS.background }]}>
      <Header />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => {
          if (navigation && typeof navigation.navigate === 'function') {
            // Navigate directly to RoleSelection to avoid loop through BusinessPanel
            navigation.navigate('RoleSelection');
          } else {
            console.error('Navigation navigate not available');
          }
        }} style={[styles.backButton, { top: insets.top + 10 }]}>
          <Text style={[styles.backButtonText, { color: DESIGN_COLORS.textPrimary }]}>✕</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: DESIGN_COLORS.textPrimary }]}>Business Dashboard</Text>

        <View style={{ alignItems: 'center', padding: 20 }}>
          {isCheckingRestaurant ? (
            <ActivityIndicator size="small" color={DESIGN_COLORS.textPrimary} />
          ) : (
            <Text style={[styles.sectionTitle, { color: DESIGN_COLORS.textSecondary, textAlign: 'center' }]}>
              Welcome to your Business Dashboard!{'\n'}
              {hasRestaurant ? `Managing: ${userRestaurant?.name}` : 'Create your first restaurant to get started.'}
            </Text>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: DESIGN_COLORS.textPrimary }]}>Quick Actions</Text>

        <View style={styles.gridContainer}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.actionCard,
                { borderColor: DESIGN_COLORS.border },
                index === quickActions.length - 1 && styles.singleItemRow,
              ]}
              onPress={() => handleActionPress(action.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={[styles.actionLabel, { color: DESIGN_COLORS.textPrimary }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 50,
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
    marginBottom: 30,
    textAlign: 'center',
    color: DESIGN_COLORS.textPrimary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: DESIGN_COLORS.textPrimary,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderWidth: 2,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  singleItemRow: {
    width: '48%',
  },
  actionIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default BusinessDashboardScreen;
