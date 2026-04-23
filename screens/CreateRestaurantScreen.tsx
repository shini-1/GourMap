import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import { restaurantService, CreateRestaurantData } from '../src/services/restaurantService';
import * as ImagePicker from 'expo-image-picker';
import { LocationService } from '../services/expoLocationService';
import { reverseGeocode } from '../src/services/geocodingService';
import { uploadImageToRestaurantBucket } from '../src/services/imageService';

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

interface CreateRestaurantScreenProps {
  navigation: any;
}

function CreateRestaurantScreen({ navigation }: CreateRestaurantScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  console.log('🏪 CreateRestaurantScreen loaded - VERSION WITH LOCATION & IMAGE PICKER');

  // Form state
  const [restaurantName, setRestaurantName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priceRange, setPriceRange] = useState('₱₱');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [hours, setHours] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const handleGetLocation = async () => {
    try {
      setLocationLoading(true);
      console.log('📍 Getting current location...');

      const locationServiceInstance = new LocationService();
      const location = await locationServiceInstance.getCurrentLocation();
      
      if (location) {
        setLatitude(location.latitude.toString());
        setLongitude(location.longitude.toString());
        console.log('📍 Location obtained:', location);

        try {
          const address = await reverseGeocode(location.latitude, location.longitude);
          Alert.alert('Success', `Location updated!\n${address || 'Coordinates: ' + (typeof location.latitude === 'number' && !isNaN(location.latitude) ? location.latitude.toFixed(4) : '0.0000') + ', ' + (typeof location.longitude === 'number' && !isNaN(location.longitude) ? location.longitude.toFixed(4) : '0.0000')}`);
        } catch (geocodeError) {
          console.warn('📍 Reverse geocoding failed:', geocodeError);
          Alert.alert('Success', `Location updated!\nCoordinates: ${(typeof location.latitude === 'number' && !isNaN(location.latitude) ? location.latitude.toFixed(4) : '0.0000')}, ${(typeof location.longitude === 'number' && !isNaN(location.longitude) ? location.longitude.toFixed(4) : '0.0000')}`);
        }
      } else {
        console.warn('📍 Failed to get location');
        Alert.alert('Location Error', 'Unable to get your current location. Please check location permissions and try again.');
      }
    } catch (error: any) {
      console.error('📍 Location error:', error);
      Alert.alert('Location Error', `Failed to access location services: ${error.message}`);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSelectImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        console.log('📷 Selected image URI:', imageUri);
        setImageUploading(true);

        try {
          const tempRestaurantId = `temp_${Date.now()}`;
          const uploadedImageUrl = await uploadImageToRestaurantBucket(imageUri, tempRestaurantId);
          
          setImageUrl(uploadedImageUrl);
          Alert.alert('Success', 'Image uploaded successfully!');
        } catch (uploadError: any) {
          console.error('Image upload error:', uploadError);
          Alert.alert('Error', `Failed to upload image: ${uploadError?.message || 'Unknown error'}`);
        } finally {
          setImageUploading(false);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handleCreateRestaurant = async () => {
    // Basic validation
    if (!restaurantName.trim() || !category.trim()) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Category)');
      return;
    }

    if (!latitude || !longitude) {
      Alert.alert('Error', 'Please use the "Get Location" button to set the restaurant location');
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Error', 'Invalid location coordinates');
      return;
    }

    setIsLoading(true);
    try {
      const restaurantData: CreateRestaurantData = {
        name: restaurantName.trim(),
        description: description.trim(),
        category: category.trim(),
        priceRange: priceRange,
        location: `${lat},${lng}`,
        imageUrl: imageUrl.trim(),
        phone: phone.trim(),
        website: website.trim(),
        hours: hours.trim(),
      };

      console.log('🍽️ Creating restaurant with data:', restaurantData);

      const createdRestaurant = await restaurantService.createRestaurant(restaurantData);

      Alert.alert('Success', `Restaurant "${createdRestaurant.name}" created successfully!`);
      navigation.navigate('BusinessDashboard');
    } catch (error: any) {
      console.error('❌ Error creating restaurant:', error);
      Alert.alert('Error', error.message || 'Failed to create restaurant');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { top: insets.top + 10 }]}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create Restaurant</Text>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Restaurant Details</Text>

          <Text style={styles.fieldLabel}>Restaurant Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Restaurant Name *"
            placeholderTextColor={DESIGN_COLORS.textPlaceholder}
            value={restaurantName}
            onChangeText={setRestaurantName}
          />

          <Text style={styles.fieldLabel}>Category <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Category * (e.g., Italian, Chinese, Fast Food)"
            placeholderTextColor={DESIGN_COLORS.textPlaceholder}
            value={category}
            onChangeText={setCategory}
          />

          <Text style={styles.fieldLabel}>Location <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity
            onPress={handleGetLocation}
            disabled={locationLoading}
            style={styles.locationButton}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color={DESIGN_COLORS.textPrimary} />
            ) : (
              <Text style={styles.locationButtonText}>📍 Get Location</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Price Range</Text>
          <View style={styles.priceRangeContainer}>
            {['₱','₱₱','₱₱₱','₱₱₱₱'].map((pr) => (
              <TouchableOpacity
                key={pr}
                onPress={() => setPriceRange(pr)}
                style={[
                  styles.priceRangeButton,
                  {
                    backgroundColor: priceRange === pr ? DESIGN_COLORS.infoBg : DESIGN_COLORS.cardBackground,
                    borderColor: DESIGN_COLORS.border,
                  }
                ]}
              >
                <Text style={[
                  styles.priceRangeText,
                  { color: priceRange === pr ? DESIGN_COLORS.infoText : DESIGN_COLORS.textPrimary }
                ]}>
                  {pr}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Restaurant Image</Text>
          <View style={styles.imagePickerContainer}>
            <TouchableOpacity
              onPress={handleSelectImage}
              disabled={imageUploading}
              style={styles.imagePickerButton}
            >
              {imageUploading ? (
                <ActivityIndicator size="small" color={DESIGN_COLORS.textPrimary} />
              ) : (
                <Text style={styles.imagePickerButtonText}>📷 Select Image</Text>
              )}
            </TouchableOpacity>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.noImageText}>No image selected</Text>
            )}
          </View>

          <Text style={styles.fieldLabel}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor={DESIGN_COLORS.textPlaceholder}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>Website URL</Text>
          <TextInput
            style={styles.input}
            placeholder="Website URL"
            placeholderTextColor={DESIGN_COLORS.textPlaceholder}
            value={website}
            onChangeText={setWebsite}
            keyboardType="url"
          />

          <Text style={styles.fieldLabel}>Hours</Text>
          <TextInput
            style={styles.input}
            placeholder="Hours (e.g., Mon-Fri: 9AM-10PM, Sat-Sun: 10AM-11PM)"
            placeholderTextColor={DESIGN_COLORS.textPlaceholder}
            value={hours}
            onChangeText={setHours}
            multiline
            numberOfLines={2}
          />

          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={styles.input}
            placeholder="Description"
            placeholderTextColor={DESIGN_COLORS.textPlaceholder}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateRestaurant}
            disabled={isLoading}
          >
            <Text style={styles.createButtonText}>
              {isLoading ? 'Creating...' : 'Create Restaurant'}
            </Text>
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
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: DESIGN_COLORS.textPrimary,
    borderColor: DESIGN_COLORS.border,
  },
  createButton: {
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    alignItems: 'center',
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  createButtonText: {
    color: DESIGN_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationButton: {
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  locationButtonText: {
    color: DESIGN_COLORS.textPrimary,
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
  priceRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  priceRangeButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceRangeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  imagePickerButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  imagePickerButtonText: {
    color: DESIGN_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  noImageText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: DESIGN_COLORS.textSecondary,
  },
  required: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreateRestaurantScreen;
