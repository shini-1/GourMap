import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, Alert, TouchableOpacity, Modal, TextInput, ScrollView, StyleSheet, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import { getRestaurants, deleteRestaurant, getApprovedRestaurants, getPendingRestaurants, approveRestaurant, rejectRestaurant, deleteRestaurantOwner, updateRestaurantOwner, getRestaurantStats, updateRestaurant, addRestaurant } from '../services/restaurants';
import { menuService } from '../src/services/menuService';
import { uploadAndUpdateRestaurantImage } from '../src/services/imageService';
import { Restaurant, RestaurantOwner, RestaurantSubmission, MenuItem } from '../types';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { reverseGeocode } from '../src/services/geocodingService';
import { LocationService } from '../services/expoLocationService';
import { listOwnersFromAuth, confirmOwnerEmail, verifyOwner, confirmAndVerify, BusinessOwnerAdminView } from '../src/services/adminBusinessOwnersService';
import { adminAuthService } from '../src/services/adminAuthService';
import { supabase, TABLES, SUPABASE_CONFIG } from '../src/config/supabase';

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

function AdminPanelScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();

  const [locationAvailable, setLocationAvailable] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [pendingBusinesses, setPendingBusinesses] = useState<RestaurantSubmission[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectingBusinessId, setRejectingBusinessId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loadingPending, setLoadingPending] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    latitude: '',
    longitude: '',
    image: '',
    category: 'casual',
    description: '',
    priceRange: '₱₱',
    editorialRating: '',
    phone: '',
    hours: '',
    website: ''
  });
  const [activeTab, setActiveTab] = useState<'restaurants' | 'pending' | 'menu' | 'owners'>('restaurants');
  const [addressCache, setAddressCache] = useState<{[key: string]: string}>({});
  const [imageUploading, setImageUploading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showMenuEditModal, setShowMenuEditModal] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [selectedRestaurantForMenu, setSelectedRestaurantForMenu] = useState<Restaurant | null>(null);
  const [menuEditForm, setMenuEditForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: '',
    isAvailable: true
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    latitude: '',
    longitude: '',
    image: '',
    description: '',
    category: 'casual',
    priceRange: '₱₱',
    phone: '',
    hours: '',
    website: ''
  });
  const [addLoading, setAddLoading] = useState(false);
  const [owners, setOwners] = useState<BusinessOwnerAdminView[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [confirmingOwnerUid, setConfirmingOwnerUid] = useState<string | null>(null);
  const [verifyingOwnerUid, setVerifyingOwnerUid] = useState<string | null>(null);
  const [confirmAndVerifyingUid, setConfirmAndVerifyingUid] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [refreshingOwners, setRefreshingOwners] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'pending'>('all');

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const data = await getRestaurants();
        setRestaurants(data);
      } catch (error) {
        console.error('Failed to fetch restaurants:', error);
        Alert.alert('Error', 'Failed to load restaurants');
      }
    };

    fetchRestaurants();
  }, []);

  const handleGetLocationForAdd = async () => {
    try {
      setLocationLoading(true);
      console.log('📍 Admin(Add): Getting current location...');

      const locationServiceInstance = new LocationService();
      const location = await locationServiceInstance.getCurrentLocation();
      if (location) {
        setAddForm(prev => ({
          ...prev,
          latitude: location.latitude.toString(),
          longitude: location.longitude.toString()
        }));
        console.log('📍 Admin(Add): Location obtained:', location);

        try {
          const address = await reverseGeocode(location.latitude, location.longitude);
          Alert.alert('Success', `Location updated!\n${address || 'Coordinates: ' + (typeof location.latitude === 'number' && !isNaN(location.latitude) ? location.latitude.toFixed(4) : '0.0000') + ', ' + (typeof location.longitude === 'number' && !isNaN(location.longitude) ? location.longitude.toFixed(4) : '0.0000')}`);
        } catch (geocodeError) {
          console.warn('📍 Admin(Add): Reverse geocoding failed:', geocodeError);
          Alert.alert('Success', `Location updated!\nCoordinates: ${(typeof location.latitude === 'number' && !isNaN(location.latitude) ? location.latitude.toFixed(4) : '0.0000')}, ${(typeof location.longitude === 'number' && !isNaN(location.longitude) ? location.longitude.toFixed(4) : '0.0000')}`);
        }
      } else {
        console.warn('📍 Admin(Add): Failed to get location');
        Alert.alert('Location Error', 'Unable to get your current location. Please check location permissions and try again.');
      }
    } catch (error: any) {
      console.error('📍 Admin(Add): Location error:', error);
      Alert.alert('Location Error', `Failed to access location services: ${error.message}`);
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    const checkLocationAvailability = async () => {
      try {
        console.log('📍 Admin: Checking location availability...');
        const locationServiceInstance = new LocationService();
        const location = await locationServiceInstance.getCurrentLocation();
        setLocationAvailable(!!location);
        console.log('📍 Admin: Location available:', !!location);
      } catch (error) {
        console.warn('📍 Admin: Location not available:', error);
        setLocationAvailable(false);
      }
    };
    checkLocationAvailability();
  }, []);

  useEffect(() => {
    const fetchPendingBusinesses = async () => {
      try {
        setLoadingPending(true);
        const data = await getPendingRestaurants();
        setPendingBusinesses(data);
      } catch (error) {
        console.error('Failed to fetch pending businesses:', error);
        Alert.alert('Error', 'Failed to load pending submissions');
      } finally {
        setLoadingPending(false);
      }
    };
    fetchPendingBusinesses();
  }, [activeTab]);

  useEffect(() => {
    (async () => {
      try {
        const admin = await adminAuthService.getCurrentUser();
        setIsAdmin(!!admin);
      } catch {}
    })();
  }, []);

  const loadOwners = async () => {
    try {
      setLoadingOwners(true);
      const data = await listOwnersFromAuth(ownerFilter);
      setOwners(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load business owners');
    } finally {
      setLoadingOwners(false);
    }
  };

  const refreshOwners = async () => {
    try {
      setRefreshingOwners(true);
      const data = await listOwnersFromAuth(ownerFilter);
      setOwners(data);
    } finally {
      setRefreshingOwners(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'owners') return;
    loadOwners();
  }, [activeTab, ownerFilter]);

  useEffect(() => {
    if (activeTab !== 'owners') return;
    const channel = supabase
      .channel('owners_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.BUSINESS_OWNERS }, () => {
        refreshOwners();
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'owners') return;
    const id = setInterval(() => {
      refreshOwners();
    }, 10000);
    return () => clearInterval(id);
  }, [activeTab, ownerFilter]);

  const handleDeleteBusiness = async (businessId: string) => {
    try {
      await deleteRestaurantOwner(businessId);
    } catch (error: any) {
      Alert.alert('Error', `Delete failed: ${error.message}`);
    }
  };

  const handleApproveBusiness = async (submissionId: string) => {
    try {
      await approveRestaurant(submissionId);
      setPendingBusinesses(prev => prev.filter(s => s.id !== submissionId));
      Alert.alert('Success', 'Restaurant approved successfully!');
      const updatedPending = await getPendingRestaurants();
      setPendingBusinesses(updatedPending);
    } catch (error: any) {
      Alert.alert('Error', `Approval failed: ${error.message}`);
    }
  };

  const handleRejectBusiness = async () => {
    if (!rejectingBusinessId) return;

    try {
      await rejectRestaurant(rejectingBusinessId, rejectionReason);
      setPendingBusinesses(prev => prev.filter(s => s.id !== rejectingBusinessId));
      setShowRejectionModal(false);
      setRejectingBusinessId(null);
      setRejectionReason('');
      Alert.alert('Success', 'Restaurant listing rejected successfully!');
    } catch (error: any) {
      Alert.alert('Error', `Rejection failed: ${error.message}`);
    }
  };

  const handleConfirmOwnerEmail = async (uid: string) => {
    try {
      setConfirmingOwnerUid(uid);
      await confirmOwnerEmail(uid);
      setOwners(prev => prev.map(o => o.uid === uid ? { ...o, emailConfirmed: true } : o));
      Alert.alert('Success', 'Email confirmed successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to confirm email');
    } finally {
      setConfirmingOwnerUid(null);
    }
  };

  const handleVerifyOwner = async (uid: string) => {
    try {
      setVerifyingOwnerUid(uid);
      await verifyOwner(uid);
      setOwners(prev => prev.filter(o => o.uid !== uid));
      Alert.alert('Success', 'Owner verified successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify owner');
    } finally {
      setVerifyingOwnerUid(null);
    }
  };

  const handleOpenSupabaseAuth = (uid: string) => {
    const projectRef = SUPABASE_CONFIG.url.split('/').pop();
    const authUrl = `https://supabase.com/dashboard/project/${projectRef}/auth/users?search=${uid}`;
    Linking.openURL(authUrl).catch(err => {
      console.error('Failed to open Supabase auth console:', err);
      Alert.alert('Error', 'Failed to open Supabase authentication console');
    });
  };

  const handleGetCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      console.log('📍 Admin: Getting current location...');

      const locationServiceInstance = new LocationService();
      const location = await locationServiceInstance.getCurrentLocation();
      if (location) {
        setEditForm(prev => ({
          ...prev,
          latitude: location.latitude.toString(),
          longitude: location.longitude.toString()
        }));
        console.log('📍 Admin: Location obtained:', location);

        try {
          const address = await reverseGeocode(location.latitude, location.longitude);
          Alert.alert('Success', `Location updated!\n${address || 'Coordinates: ' + (typeof location.latitude === 'number' && !isNaN(location.latitude) ? location.latitude.toFixed(4) : '0.0000') + ', ' + (typeof location.longitude === 'number' && !isNaN(location.longitude) ? location.longitude.toFixed(4) : '0.0000')}`);
        } catch (geocodeError) {
          console.warn('📍 Admin: Reverse geocoding failed:', geocodeError);
          Alert.alert('Success', `Location updated!\nCoordinates: ${(typeof location.latitude === 'number' && !isNaN(location.latitude) ? location.latitude.toFixed(4) : '0.0000')}, ${(typeof location.longitude === 'number' && !isNaN(location.longitude) ? location.longitude.toFixed(4) : '0.0000')}`);
        }
      } else {
        console.warn('📍 Admin: Failed to get location');
        Alert.alert('Location Error', 'Unable to get your current location. Please check location permissions and try again.');
      }
    } catch (error: any) {
      console.error('📍 Admin: Location error:', error);
      Alert.alert('Location Error', `Failed to access location services: ${error.message}`);
    } finally {
      setLocationLoading(false);
    }
  };

  const pickImage = async () => {
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
          const restaurantId = editingRestaurant?.id;
          if (!restaurantId) {
            Alert.alert('Error', 'No restaurant selected for editing');
            return;
          }

          const uploadedImageUrl = await uploadAndUpdateRestaurantImage(imageUri, restaurantId, 'logo');

          // If we get here, the upload was successful
          setEditForm(prev => ({
            ...prev,
            image: uploadedImageUrl
          }));

          setRestaurants(prev => prev.map(r =>
            r.id === editingRestaurant.id ? { ...r, image: uploadedImageUrl } : r
          ));

          Alert.alert('Success', 'Image uploaded and saved successfully!');

        } catch (uploadError: any) {
          console.error('Image upload error:', uploadError);
          
          // Provide more specific error messages
          let errorMessage = 'Failed to upload image';
          
          if (uploadError.message.includes('Failed to process image for upload')) {
            errorMessage = 'Failed to process the selected image. Please try a different image.';
          } else if (uploadError.message.includes('Failed to upload image')) {
            errorMessage = 'Failed to upload image to storage. Please check your internet connection.';
          } else if (uploadError.message.includes('Failed to update restaurant')) {
            errorMessage = 'Image uploaded but failed to update restaurant record. Please try again.';
          } else if (uploadError.message) {
            errorMessage = `Image upload failed: ${uploadError.message}`;
          }
          
          Alert.alert('Image Upload Error', errorMessage + '\n\nThe restaurant data was not modified. Please try again.');
        } finally {
          setImageUploading(false);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const getAddressDisplay = (latitude: number, longitude: number): string => {
    const key = `${(typeof latitude === 'number' && !isNaN(latitude) ? latitude.toFixed(4) : '0.0000')},${(typeof longitude === 'number' && !isNaN(longitude) ? longitude.toFixed(4) : '0.0000')}`;
    return addressCache[key] || `${(typeof latitude === 'number' && !isNaN(latitude) ? latitude.toFixed(4) : '0.0000')}, ${(typeof longitude === 'number' && !isNaN(longitude) ? longitude.toFixed(4) : '0.0000')}`;
  };

  const handleEdit = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setEditForm({
      name: restaurant.name,
      latitude: restaurant.location.latitude.toString(),
      longitude: restaurant.location.longitude.toString(),
      image: restaurant.image || '',
      category: restaurant.category || 'casual',
      description: restaurant.description || '',
      priceRange: restaurant.priceRange || '₱₱',
      editorialRating: typeof restaurant.editorialRating === 'number' ? restaurant.editorialRating.toString() : '',
      phone: restaurant.phone || '',
      hours: restaurant.hours || '',
      website: restaurant.website || ''
    });
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRestaurant(id);
      setRestaurants(prev => prev.filter(r => r.id !== id));
      Alert.alert('Success', 'Restaurant deleted!');
    } catch (error: any) {
      Alert.alert('Error', `Delete failed: ${error.message}`);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRestaurant) return;

    try {
      const name = editForm.name.trim();
      const latitude = parseFloat(editForm.latitude);
      const longitude = parseFloat(editForm.longitude);

      if (!name) {
        Alert.alert('Error', 'Restaurant name is required');
        return;
      }

      if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        Alert.alert('Error', 'Latitude must be between -90 and 90');
        return;
      }

      if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        Alert.alert('Error', 'Longitude must be between -180 and 180');
        return;
      }

      const editorialValue = parseFloat(editForm.editorialRating);
      const clampedEditorial = Number.isFinite(editorialValue)
        ? Math.max(0, Math.min(5, editorialValue))
        : undefined;

      await updateRestaurant(editingRestaurant.id, {
        name,
        location: { latitude, longitude },
        image: editForm.image.trim() || undefined,
        category: editForm.category,
        priceRange: editForm.priceRange,
        editorialRating: clampedEditorial,
        description: editForm.description.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        hours: editForm.hours.trim() || undefined,
        website: editForm.website.trim() || undefined
      });

      const updatedRestaurant: Restaurant = {
        ...editingRestaurant,
        name,
        location: { latitude, longitude },
        image: editForm.image.trim() || undefined,
        category: editForm.category,
        priceRange: editForm.priceRange,
        editorialRating: clampedEditorial,
        description: editForm.description.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        hours: editForm.hours.trim() || undefined,
        website: editForm.website.trim() || undefined
      };

      setRestaurants(prev => prev.map(r =>
        r.id === editingRestaurant.id ? updatedRestaurant : r
      ));

      setShowEditModal(false);
      setEditingRestaurant(null);

      Alert.alert('Success', 'Restaurant updated successfully in database!');

    } catch (error: any) {
      Alert.alert('Error', `Update failed: ${error.message}`);
    }
  };

  const handleSaveAdd = async () => {
    try {
      setAddLoading(true);
      console.log('🏪 Admin(Add): Starting restaurant creation process');

      const name = addForm.name.trim();
      const latitude = parseFloat(addForm.latitude);
      const longitude = parseFloat(addForm.longitude);

      console.log('🏪 Admin(Add): Validating inputs:', { name, latitude, longitude, hasImage: !!addForm.image });

      if (!name) {
        Alert.alert('Error', 'Restaurant name is required');
        return;
      }

      if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        Alert.alert('Error', 'Latitude must be between -90 and 90');
        return;
      }

      if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        Alert.alert('Error', 'Longitude must be between -180 and 180');
        return;
      }

      const restaurantData = {
        name,
        location: { latitude, longitude },
        category: addForm.category,
        image: addForm.image.trim() || undefined,
        description: addForm.description.trim() || undefined,
        phone: addForm.phone.trim() || undefined,
        hours: addForm.hours.trim() || undefined,
        website: addForm.website.trim() || undefined,
        rating: undefined,
        priceRange: addForm.priceRange
      };

      // Validate image URL if present
      if (restaurantData.image && restaurantData.image.length > 0) {
        try {
          new URL(restaurantData.image);
          console.log('🏪 Admin(Add): Image URL validated successfully');
        } catch (urlError) {
          console.warn('🏪 Admin(Add): Invalid image URL, removing:', restaurantData.image);
          restaurantData.image = undefined;
        }
      }

      console.log('🏪 Admin(Add): Final restaurant data:', restaurantData);

      await addRestaurant(restaurantData);
      console.log('🏪 Admin(Add): Restaurant added to database successfully');

      const updatedRestaurants = await getRestaurants();
      setRestaurants(updatedRestaurants);
      console.log('🏪 Admin(Add): Restaurant list refreshed');

      setAddForm({
        name: '',
        latitude: '',
        longitude: '',
        image: '',
        description: '',
        category: 'casual',
        priceRange: '₱₱',
        phone: '',
        hours: '',
        website: ''
      });
      setShowAddModal(false);

      Alert.alert('Success', 'Restaurant added successfully!');

    } catch (error: any) {
      console.error('🏪 Admin(Add): Error during restaurant creation:', error);
      console.error('🏪 Admin(Add): Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      Alert.alert('Error', `Failed to add restaurant: ${error.message}`);
    } finally {
      setAddLoading(false);
    }
  };

  const handleCleanupDuplicates = async () => {
    try {
      Alert.alert('Cleaning up', 'Removing duplicate restaurants...');
      const { cleanupDuplicateRestaurants } = await import('../services/restaurants');
      const result = await cleanupDuplicateRestaurants();
      Alert.alert('Success', `Cleanup complete! Deleted ${result.deleted} duplicates, kept ${result.kept} unique restaurants.`);
    } catch (error: any) {
      Alert.alert('Error', `Cleanup failed: ${error.message}`);
    }
  };

  const handleShowStats = async () => {
    try {
      const { getRestaurantStats } = await import('../services/restaurants');
      const stats = await getRestaurantStats();

      Alert.alert(
        'Restaurant Statistics',
        `Total: ${stats.total}\nUnique: ${stats.unique}\nDuplicates: ${stats.duplicates}\n\nName duplicates: ${stats.nameDuplicates.length}\nCoord duplicates: ${stats.coordDuplicates.length}`
      );
    } catch (error: any) {
      Alert.alert('Error', `Failed to get stats: ${error.message}`);
    }
  };

  const handleClearDatabase = async () => {
    Alert.alert(
      '⚠️ Clear Database',
      'This will permanently delete ALL restaurants from the database. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'DELETE ALL',
          style: 'destructive',
          onPress: async () => {
            try {
              const { clearAllRestaurants } = await import('../services/restaurants');
              const deletedCount = await clearAllRestaurants();
              Alert.alert('Success', `Database cleared! Deleted ${deletedCount} restaurants.`);
            } catch (error: any) {
              Alert.alert('Error', `Clear failed: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const handleImportRestaurants = async () => {
    const { addRestaurantsFromGoogleMaps } = await import('../services/restaurants');
    const { restaurantUrls } = await import('../utils/importRestaurants');

    try {
      Alert.alert('Importing', 'Please wait...');
      await addRestaurantsFromGoogleMaps(restaurantUrls);
      Alert.alert('Success', 'Restaurants imported successfully!');
      const data = await getRestaurants();
      setRestaurants(data);
    } catch (error: any) {
      Alert.alert('Error', `Import failed: ${error.message}`);
    }
  };

  const loadMenuItems = async (restaurant: Restaurant) => {
    try {
      setSelectedRestaurantForMenu(restaurant);
      const items = await menuService.getMenuItemsByRestaurant(restaurant.id);
      setMenuItems(items);
    } catch (error: any) {
      console.error('Failed to load menu items:', error);
      Alert.alert('Error', `Failed to load menu items: ${error.message}`);
    }
  };

  const handleMenuEdit = (menuItem: MenuItem) => {
    setEditingMenuItem(menuItem);
    setMenuEditForm({
      name: menuItem.name,
      description: menuItem.description || '',
      price: menuItem.price.toString(),
      category: menuItem.category || '',
      image: menuItem.image || '',
      isAvailable: menuItem.isAvailable
    });
    setShowMenuEditModal(true);
  };

  const handleAddMenuItem = () => {
    setEditingMenuItem(null);
    setMenuEditForm({
      name: '',
      description: '',
      price: '',
      category: '',
      image: '',
      isAvailable: true
    });
    setShowMenuEditModal(true);
  };

  const handleSaveMenuItem = async () => {
    if (!selectedRestaurantForMenu) return;

    try {
      const price = parseFloat(menuEditForm.price);
      if (isNaN(price) || price < 0) {
        Alert.alert('Error', 'Please enter a valid price');
        return;
      }

      const menuItemData = {
        restaurantId: selectedRestaurantForMenu.id,
        name: menuEditForm.name.trim(),
        description: menuEditForm.description.trim(),
        price: price,
        category: menuEditForm.category.trim(),
        image: menuEditForm.image.trim(),
        isAvailable: menuEditForm.isAvailable
      };

      if (editingMenuItem) {
        await menuService.updateMenuItem(editingMenuItem.id, menuItemData);
        Alert.alert('Success', 'Menu item updated successfully!');
      } else {
        await menuService.createMenuItem(menuItemData);
        Alert.alert('Success', 'Menu item created successfully!');
      }

      await loadMenuItems(selectedRestaurantForMenu);
      setShowMenuEditModal(false);
      setEditingMenuItem(null);

    } catch (error: any) {
      Alert.alert('Error', `Failed to save menu item: ${error.message}`);
    }
  };

  const handleDeleteMenuItem = async (menuItemId: string) => {
    Alert.alert(
      'Delete Menu Item',
      'Are you sure you want to delete this menu item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await menuService.deleteMenuItem(menuItemId);
              if (selectedRestaurantForMenu) {
                await loadMenuItems(selectedRestaurantForMenu);
              }
              Alert.alert('Success', 'Menu item deleted successfully!');
            } catch (error: any) {
              Alert.alert('Error', `Failed to delete menu item: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const restaurantCategories = [
    { value: 'all', label: 'All Types', emoji: '🍽️' },
    { value: 'italian', label: 'Italian', emoji: '🍕' },
    { value: 'cafe', label: 'Cafe', emoji: '☕' },
    { value: 'fast_food', label: 'Fast Food', emoji: '🍔' },
    { value: 'asian', label: 'Asian', emoji: '🥢' },
    { value: 'japanese', label: 'Japanese', emoji: '🍱' },
    { value: 'bakery', label: 'Bakery', emoji: '🥖' },
    { value: 'grill', label: 'Grill', emoji: '🥩' },
    { value: 'seafood', label: 'Seafood', emoji: '🦞' },
    { value: 'mexican', label: 'Mexican', emoji: '🌮' },
    { value: 'thai', label: 'Thai', emoji: '🍜' },
    { value: 'buffet', label: 'Buffet', emoji: '🍽️' },
    { value: 'fine_dining', label: 'Fine Dining', emoji: '🍾' },
    { value: 'fast_casual', label: 'Fast Casual', emoji: '🏃' },
    { value: 'family', label: 'Family', emoji: '👨‍👩‍👧‍👦' },
    { value: 'diner', label: 'Diner', emoji: '🍳' },
    { value: 'casual', label: 'Casual', emoji: '🍽️' }
  ];

  const handleVerifyDataIntegrity = async () => {
    try {
      const { getRestaurants } = await import('../services/restaurants');
      const { restaurantUrls } = await import('../utils/importRestaurants');
      const { parseGoogleMapsUrl } = await import('../utils/googleMapsParser');

      const currentRestaurants = await getRestaurants();
      const expectedRestaurants = restaurantUrls.map(url => parseGoogleMapsUrl(url)).filter(r => r !== null);

      console.log('🔍 Data Integrity Check:');
      console.log('📊 Current in DB:', currentRestaurants.length);
      console.log('📊 Expected from URLs:', expectedRestaurants.length);
      console.log('📊 URLs provided:', restaurantUrls.length);

      const currentNames = currentRestaurants.map(r => r.name.toLowerCase().trim());
      const expectedNames = expectedRestaurants.map(r => r.name.toLowerCase().trim());

      const missing = expectedNames.filter(name => !currentNames.includes(name));
      const extra = currentNames.filter(name => !expectedNames.includes(name));

      let message = `Data Integrity Check:\n\nCurrent: ${currentRestaurants.length} restaurants\nExpected: ${expectedRestaurants.length} restaurants\nURLs: ${restaurantUrls.length}\n\n`;

      if (missing.length > 0) {
        message += `❌ Missing restaurants: ${missing.length}\n${missing.join(', ')}\n\n`;
      }

      if (extra.length > 0) {
        message += `⚠️ Extra restaurants: ${extra.length}\n${extra.join(', ')}\n\n`;
      }

      if (missing.length === 0 && extra.length === 0) {
        message += '✅ Data integrity verified - all expected restaurants present!';
      }

      Alert.alert('Data Integrity Check', message);

      console.log('Missing restaurants:', missing);
      console.log('Extra restaurants:', extra);
      console.log('Current names:', currentNames);
      console.log('Expected names:', expectedNames);

    } catch (error: any) {
      Alert.alert('Error', `Integrity check failed: ${error.message}`);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: DESIGN_COLORS.background, padding: 20 }}>
      <Header />
      <TouchableOpacity
        onPress={() => navigation.navigate('RoleSelection')}
        style={{ padding: 10, backgroundColor: DESIGN_COLORS.cardBackground, marginBottom: 20, alignSelf: 'flex-start', borderRadius: 12, borderWidth: 2, borderColor: DESIGN_COLORS.border, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 }}
      >
        <Text style={{ color: DESIGN_COLORS.textPrimary }}>Back to Role Selection</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 24, marginBottom: 20, color: DESIGN_COLORS.textPrimary }}>GourMap Admin</Text>

      <View style={{ flexDirection: 'row', marginBottom: 20, backgroundColor: DESIGN_COLORS.cardBackground, borderRadius: 12, padding: 5, borderWidth: 2, borderColor: DESIGN_COLORS.border }}>
        <TouchableOpacity
          onPress={() => setActiveTab('restaurants')}
          style={[
            styles.tabButton,
            activeTab === 'restaurants' && { backgroundColor: DESIGN_COLORS.infoBg }
          ]}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'restaurants' ? DESIGN_COLORS.infoText : DESIGN_COLORS.textPrimary }
          ]}>
            🍽️ Restaurants
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('menu')}
          style={[
            styles.tabButton,
            activeTab === 'menu' && { backgroundColor: DESIGN_COLORS.infoBg }
          ]}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'menu' ? DESIGN_COLORS.infoText : DESIGN_COLORS.textPrimary }
          ]}>
            📋 Menu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('pending')}
          style={[
            styles.tabButton,
            activeTab === 'pending' && { backgroundColor: DESIGN_COLORS.infoBg }
          ]}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'pending' ? DESIGN_COLORS.infoText : DESIGN_COLORS.textPrimary }
          ]}>
            ⏳ Pending
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('owners')}
          style={[
            styles.tabButton,
            activeTab === 'owners' && { backgroundColor: DESIGN_COLORS.infoBg }
          ]}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'owners' ? DESIGN_COLORS.infoText : DESIGN_COLORS.textPrimary }
          ]}>
            👥 Owners
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20, gap: 10 }}>
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          style={[styles.iconButton, { backgroundColor: '#28a745' }]}
        >
          <Text style={styles.iconText}>➕</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCleanupDuplicates}
          style={[styles.iconButton, { backgroundColor: 'orange' }]}
        >
          <Text style={styles.iconText}>🧹</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={async () => {
            try {
              console.log('🧪 Testing image upload...');
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
                console.log('🧪 Test image URI:', imageUri);

                const { uploadImageToRestaurantBucket } = await import('../src/services/imageService');
                const testId = `test_${Date.now()}`;
                const uploadedUrl = await uploadImageToRestaurantBucket(imageUri, testId);

                console.log('🧪 Test upload successful:', uploadedUrl);
                Alert.alert('Test Success', `Image uploaded successfully!\nURL: ${uploadedUrl.substring(0, 50)}...`);
              }
            } catch (error: any) {
              console.error('🧪 Test upload failed:', error);
              Alert.alert('Test Failed', `Image upload test failed: ${error.message}`);
            }
          }}
          style={[styles.iconButton, { backgroundColor: '#007bff' }]}
        >
          <Text style={styles.iconText}>🖼️</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 12, color: DESIGN_COLORS.textSecondary, textAlign: 'center' }}>
          ➕ Add Restaurant • 🧹 Cleanup Duplicates • 🖼️ Test Image Upload
        </Text>
      </View>

      {activeTab === 'restaurants' && (
        <>
          <Text style={{ fontSize: 18, marginBottom: 10, color: DESIGN_COLORS.textPrimary }}>Restaurants:</Text>
          <FlatList
            data={restaurants}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: DESIGN_COLORS.border, backgroundColor: DESIGN_COLORS.cardBackground, borderRadius: 8, marginBottom: 8, borderWidth: 2, borderColor: DESIGN_COLORS.border }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ color: DESIGN_COLORS.textPrimary, fontSize: 16, fontWeight: '500' }} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={{ color: DESIGN_COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {typeof item.location.latitude === 'number' && !isNaN(item.location.latitude) ? item.location.latitude.toFixed(4) : '0.0000'}, {typeof item.location.longitude === 'number' && !isNaN(item.location.longitude) ? item.location.longitude.toFixed(4) : '0.0000'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => handleEdit(item)}
                    style={{ backgroundColor: DESIGN_COLORS.cardBackground, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 2, borderColor: DESIGN_COLORS.border, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 }}
                  >
                    <Text style={{ color: DESIGN_COLORS.textPrimary, fontSize: 12, fontWeight: 'bold' }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    style={{ backgroundColor: '#dc3545', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                  >
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            style={{ backgroundColor: DESIGN_COLORS.cardBackground, borderRadius: 8, marginTop: 10 }}
          />
        </>
      )}

      {activeTab === 'menu' && (
        <>
          <Text style={{ fontSize: 18, marginBottom: 10, color: DESIGN_COLORS.textPrimary }}>Menu Management</Text>

          <Text style={{ fontSize: 16, marginBottom: 8, color: DESIGN_COLORS.textPrimary }}>Select Restaurant:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {restaurants.map((restaurant) => (
              <TouchableOpacity
                key={restaurant.id}
                onPress={() => loadMenuItems(restaurant)}
                style={[
                  {
                    backgroundColor: selectedRestaurantForMenu?.id === restaurant.id ? DESIGN_COLORS.infoBg : DESIGN_COLORS.cardBackground,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 12,
                    marginRight: 12,
                    borderWidth: 2,
                    borderColor: DESIGN_COLORS.border
                  }
                ]}
              >
                <Text style={{
                  color: selectedRestaurantForMenu?.id === restaurant.id ? DESIGN_COLORS.infoText : DESIGN_COLORS.textPrimary,
                  fontWeight: 'bold',
                  fontSize: 14
                }}>
                  {restaurant.name.split(', ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedRestaurantForMenu && (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 16, color: DESIGN_COLORS.textPrimary }}>
                  Menu Items for {selectedRestaurantForMenu.name.split(', ')[0]}
                </Text>
                <TouchableOpacity
                  onPress={handleAddMenuItem}
                  style={{ backgroundColor: '#28a745', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>+ Add Item</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={menuItems}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: DESIGN_COLORS.border, backgroundColor: DESIGN_COLORS.cardBackground, borderRadius: 8, marginBottom: 8, borderWidth: 2, borderColor: DESIGN_COLORS.border }}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={{ color: DESIGN_COLORS.textPrimary, fontSize: 16, fontWeight: '500' }}>
                        {item.name}
                      </Text>
                      <Text style={{ color: DESIGN_COLORS.textSecondary, fontSize: 14, marginTop: 2 }}>
                        {item.category} • ₱{typeof item.price === 'number' && !isNaN(item.price) ? item.price.toFixed(2) : '0.00'}
                      </Text>
                      {item.description && (
                        <Text style={{ color: DESIGN_COLORS.textSecondary, fontSize: 12, marginTop: 2, fontStyle: 'italic' }} numberOfLines={1}>
                          {item.description}
                        </Text>
                      )}
                      <Text style={{ color: item.isAvailable ? '#28a745' : '#dc3545', fontSize: 12, marginTop: 2 }}>
                        {item.isAvailable ? 'Available' : 'Unavailable'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => handleMenuEdit(item)}
                        style={{ backgroundColor: DESIGN_COLORS.cardBackground, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 2, borderColor: DESIGN_COLORS.border, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 }}
                      >
                        <Text style={{ color: DESIGN_COLORS.textPrimary, fontSize: 12, fontWeight: 'bold' }}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteMenuItem(item.id)}
                        style={{ backgroundColor: '#dc3545', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                      >
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                style={{ backgroundColor: DESIGN_COLORS.cardBackground, borderRadius: 8, marginTop: 10 }}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', padding: 20 }}>
                    <Text style={{ color: DESIGN_COLORS.textSecondary, fontSize: 16 }}>
                      No menu items for this restaurant
                    </Text>
                    <TouchableOpacity
                      onPress={handleAddMenuItem}
                      style={{ backgroundColor: DESIGN_COLORS.cardBackground, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginTop: 10, borderWidth: 2, borderColor: DESIGN_COLORS.border, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 }}
                    >
                      <Text style={{ color: DESIGN_COLORS.textPrimary, fontWeight: 'bold' }}>Add First Item</Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            </>
          )}

          {!selectedRestaurantForMenu && (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: DESIGN_COLORS.cardBackground, borderRadius: 8, marginTop: 10, borderWidth: 2, borderColor: DESIGN_COLORS.border }}>
              <Text style={{ fontSize: 24, color: DESIGN_COLORS.textSecondary, marginBottom: 10 }}>🍽️</Text>
              <Text style={{ fontSize: 18, color: DESIGN_COLORS.textPrimary, marginBottom: 10 }}>Select a Restaurant</Text>
              <Text style={{ fontSize: 14, color: DESIGN_COLORS.textSecondary, textAlign: 'center' }}>
                Choose a restaurant above to manage its menu items
              </Text>
            </View>
          )}
        </>
      )}

      {activeTab === 'pending' && (
        <>
          <Text style={{ fontSize: 18, marginBottom: 10, color: DESIGN_COLORS.textPrimary }}>Pending Reviews</Text>
          {loadingPending ? (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <Text style={{ color: DESIGN_COLORS.textSecondary }}>Loading pending submissions...</Text>
            </View>
          ) : pendingBusinesses.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: DESIGN_COLORS.cardBackground, borderRadius: 8, marginTop: 10, borderWidth: 2, borderColor: DESIGN_COLORS.border }}>
              <Text style={{ fontSize: 24, color: DESIGN_COLORS.textSecondary, marginBottom: 10 }}>⏳</Text>
              <Text style={{ fontSize: 18, color: DESIGN_COLORS.textPrimary, marginBottom: 10 }}>No Pending Submissions</Text>
              <Text style={{ fontSize: 14, color: DESIGN_COLORS.textSecondary, textAlign: 'center' }}>
                Restaurant owner submissions will appear here{'\n'}for approval or rejection.
              </Text>
            </View>
          ) : (
            <FlatList
              data={pendingBusinesses}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: DESIGN_COLORS.border, backgroundColor: DESIGN_COLORS.cardBackground, borderRadius: 8, marginBottom: 8, borderWidth: 2, borderColor: DESIGN_COLORS.border }}>
                  <View style={{ flex: 1, marginRight: 10, minWidth: 0 }}>
                    <Text style={{ color: DESIGN_COLORS.textPrimary, fontSize: 16, fontWeight: '500' }} numberOfLines={2}>
                      {item.businessName}
                    </Text>
                    <Text style={{ color: DESIGN_COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
                      Owner: {item.ownerName}
                    </Text>
                    <Text style={{ color: DESIGN_COLORS.textSecondary, fontSize: 12 }}>
                      📧 {item.email} | 📞 {item.phone}
                    </Text>
                    <Text style={{ color: DESIGN_COLORS.textSecondary, fontSize: 12 }}>
                      📍 {getAddressDisplay(item.location.latitude, item.location.longitude)}
                    </Text>
                    <Text style={{ color: '#ffc107', fontSize: 12, marginTop: 2 }}>
                      Submitted: {new Date(item.submittedAt).toLocaleDateString()}
                    </Text>
                    {item.description && (
                      <Text style={{ color: DESIGN_COLORS.textSecondary, fontSize: 12, marginTop: 2, fontStyle: 'italic' }} numberOfLines={2}>
                        "{item.description}"
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleApproveBusiness(item.id)}
                      style={{ backgroundColor: '#28a745', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                    >
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✅ Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setRejectingBusinessId(item.id);
                        setShowRejectionModal(true);
                      }}
                      style={{ backgroundColor: '#dc3545', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                    >
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>❌ Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              style={{ backgroundColor: DESIGN_COLORS.cardBackground, borderRadius: 8, marginTop: 10 }}
            />
          )}
        </>
      )}

      {activeTab === 'owners' && (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 18, color: DESIGN_COLORS.textPrimary }}>Authentication Users</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setOwnerFilter('all')}
                style={{
                  backgroundColor: ownerFilter === 'all' ? DESIGN_COLORS.infoBg : DESIGN_COLORS.cardBackground,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: DESIGN_COLORS.border,
                  elevation: 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 2,
                }}
              >
                <Text style={{ color: ownerFilter === 'all' ? DESIGN_COLORS.infoText : DESIGN_COLORS.textPrimary, fontSize: 12, fontWeight: 'bold' }}>
                  All ({owners.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setOwnerFilter('pending')}
                style={{
                  backgroundColor: ownerFilter === 'pending' ? DESIGN_COLORS.infoBg : DESIGN_COLORS.cardBackground,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: DESIGN_COLORS.border,
                  elevation: 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 2,
                }}
              >
                <Text style={{ color: ownerFilter === 'pending' ? DESIGN_COLORS.infoText : DESIGN_COLORS.textPrimary, fontSize: 12, fontWeight: 'bold' }}>
                  Pending
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {loadingOwners ? (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <ActivityIndicator size="large" color="#000000" />
              <Text style={{ color: DESIGN_COLORS.textSecondary, marginTop: 10 }}>Loading users...</Text>
            </View>
          ) : owners.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: DESIGN_COLORS.cardBackground, borderRadius: 8, marginTop: 10, padding: 20, borderWidth: 2, borderColor: DESIGN_COLORS.border }}>
              <Text style={{ fontSize: 24, color: DESIGN_COLORS.textSecondary, marginBottom: 10 }}>👥</Text>
              <Text style={{ fontSize: 18, color: DESIGN_COLORS.textPrimary, marginBottom: 10 }}>No Users Found</Text>
              <Text style={{ fontSize: 14, color: DESIGN_COLORS.textSecondary, textAlign: 'center' }}>
                {ownerFilter === 'pending' ? 'No pending users to verify' : 'No authentication users in the system'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={owners}
              keyExtractor={(item) => item.uid}
              refreshControl={
                <RefreshControl
                  refreshing={refreshingOwners}
                  onRefresh={refreshOwners}
                  tintColor="#000000"
                />
              }
              renderItem={({ item }) => (
                <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: DESIGN_COLORS.border, backgroundColor: DESIGN_COLORS.cardBackground, borderRadius: 8, marginBottom: 8, borderWidth: 2, borderColor: DESIGN_COLORS.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={{ color: DESIGN_COLORS.textPrimary, fontSize: 16, fontWeight: '500' }}>
                        {item.email}
                      </Text>
                      <Text style={{ color: DESIGN_COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
                        UID: {item.uid.substring(0, 8)}...
                      </Text>
                      {item.firstName || item.lastName ? (
                        <Text style={{ color: DESIGN_COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
                          Name: {item.firstName} {item.lastName}
                        </Text>
                      ) : null}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        <Text style={{
                          color: item.emailConfirmed ? '#28a745' : '#ffc107',
                          fontSize: 11,
                          fontWeight: 'bold'
                        }}>
                          {item.emailConfirmed ? '✅ Email Confirmed' : '⏳ Email Pending'}
                        </Text>
                        {item.isVerified && (
                          <Text style={{ color: '#28a745', fontSize: 11, fontWeight: 'bold' }}>
                            ✅ Verified
                          </Text>
                        )}
                      </View>
                      {item.createdAt && (
                        <Text style={{ color: DESIGN_COLORS.textSecondary, fontSize: 11, marginTop: 2 }}>
                          Created: {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                    <View style={{ gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => handleOpenSupabaseAuth(item.uid)}
                        style={{
                          backgroundColor: '#6f42c1',
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          minWidth: 100
                        }}
                      >
                        <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold', textAlign: 'center' }}>
                          🔗 Open in Supabase
                        </Text>
                      </TouchableOpacity>
                      {!item.emailConfirmed && (
                        <TouchableOpacity
                          onPress={() => handleConfirmOwnerEmail(item.uid)}
                          disabled={confirmingOwnerUid === item.uid}
                          style={{
                            backgroundColor: confirmingOwnerUid === item.uid ? DESIGN_COLORS.border : '#17a2b8',
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                            minWidth: 100
                          }}
                        >
                          {confirmingOwnerUid === item.uid ? (
                            <ActivityIndicator color="white" size="small" />
                          ) : (
                            <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold', textAlign: 'center' }}>
                              ✉️ Confirm Email
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}
                      {!item.isVerified && item.emailConfirmed && (
                        <TouchableOpacity
                          onPress={() => handleVerifyOwner(item.uid)}
                          disabled={verifyingOwnerUid === item.uid}
                          style={{
                            backgroundColor: verifyingOwnerUid === item.uid ? DESIGN_COLORS.border : '#28a745',
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                            minWidth: 100
                          }}
                        >
                          {verifyingOwnerUid === item.uid ? (
                            <ActivityIndicator color="white" size="small" />
                          ) : (
                            <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold', textAlign: 'center' }}>
                              ✅ Verify Owner
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              )}
              style={{ backgroundColor: DESIGN_COLORS.cardBackground, borderRadius: 8, marginTop: 10 }}
            />
          )}
        </>
      )}

      <Modal
        visible={showMenuEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMenuEditModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: DESIGN_COLORS.cardBackground, borderRadius: 12, padding: 20, width: '90%', maxWidth: 400, maxHeight: '80%', borderWidth: 2, borderColor: DESIGN_COLORS.border }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: DESIGN_COLORS.textPrimary }}>
              {editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 16, marginBottom: 8, color: DESIGN_COLORS.textPrimary }}>Name:</Text>
              <TextInput
                value={menuEditForm.name}
                onChangeText={(text) => setMenuEditForm(prev => ({ ...prev, name: text }))}
                style={{
                  borderWidth: 2,
                  borderColor: DESIGN_COLORS.border,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 15,
                  color: DESIGN_COLORS.textPrimary,
                  backgroundColor: DESIGN_COLORS.cardBackground,
                  fontSize: 16
                }}
                placeholder="Menu item name"
                placeholderTextColor={DESIGN_COLORS.textPlaceholder}
              />

              <Text style={{ fontSize: 16, marginBottom: 8, color: DESIGN_COLORS.textPrimary }}>Price:</Text>
              <TextInput
                value={menuEditForm.price}
                onChangeText={(text) => setMenuEditForm(prev => ({ ...prev, price: text }))}
                style={{
                  borderWidth: 2,
                  borderColor: DESIGN_COLORS.border,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 15,
                  color: DESIGN_COLORS.textPrimary,
                  backgroundColor: DESIGN_COLORS.cardBackground,
                  fontSize: 16
                }}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor={DESIGN_COLORS.textPlaceholder}
              />

              <Text style={{ fontSize: 16, marginBottom: 8, color: DESIGN_COLORS.textPrimary }}>Category:</Text>
              <TextInput
                value={menuEditForm.category}
                onChangeText={(text) => setMenuEditForm(prev => ({ ...prev, category: text }))}
                style={{
                  borderWidth: 2,
                  borderColor: DESIGN_COLORS.border,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 15,
                  color: DESIGN_COLORS.textPrimary,
                  backgroundColor: DESIGN_COLORS.cardBackground,
                  fontSize: 16
                }}
                placeholder="e.g., Appetizers, Main Course, Desserts"
                placeholderTextColor={DESIGN_COLORS.textPlaceholder}
              />

              <Text style={{ fontSize: 16, marginBottom: 8, color: DESIGN_COLORS.textPrimary }}>Description:</Text>
              <TextInput
                value={menuEditForm.description}
                onChangeText={(text) => setMenuEditForm(prev => ({ ...prev, description: text }))}
                style={{
                  borderWidth: 2,
                  borderColor: DESIGN_COLORS.border,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 15,
                  color: DESIGN_COLORS.textPrimary,
                  backgroundColor: DESIGN_COLORS.cardBackground,
                  minHeight: 80,
                  textAlignVertical: 'top',
                  fontSize: 16
                }}
                placeholder="Optional description"
                multiline
                numberOfLines={3}
                placeholderTextColor={DESIGN_COLORS.textPlaceholder}
              />

              <Text style={{ fontSize: 16, marginBottom: 8, color: DESIGN_COLORS.textPrimary }}>Menu Item Image:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                      if (status !== 'granted') {
                        Alert.alert('Permission needed', 'Please grant permission to access your photos');
                        return;
                      }

                      const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ['images'],
                        allowsEditing: true,
                        aspect: [1, 1],
                        quality: 0.8,
                      });

                      if (!result.canceled && result.assets && result.assets.length > 0) {
                        const imageUri = result.assets[0].uri;
                        setImageUploading(true);

                        try {
                          const { uploadImageToRestaurantBucket } = await import('../src/services/imageService');
                          const tempMenuItemId = `menu_${Date.now()}`;
                          const uploadedImageUrl = await uploadImageToRestaurantBucket(imageUri, tempMenuItemId);
                          
                          setMenuEditForm(prev => ({
                            ...prev,
                            image: uploadedImageUrl
                          }));

                          Alert.alert('Success', 'Image uploaded successfully!');

                        } catch (uploadError: any) {
                          Alert.alert('Error', `Failed to upload image: ${uploadError?.message || 'Unknown error'}`);
                        } finally {
                          setImageUploading(false);
                        }
                      }
                    } catch (error) {
                      Alert.alert('Error', 'Failed to select image');
                    }
                  }}
                  disabled={imageUploading}
                  style={{
                    backgroundColor: imageUploading ? DESIGN_COLORS.border : DESIGN_COLORS.cardBackground,
                    paddingHorizontal: 15,
                    paddingVertical: 10,
                    borderRadius: 8,
                    marginRight: 10,
                    borderWidth: 2,
                    borderColor: DESIGN_COLORS.border,
                    elevation: 1,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.06,
                    shadowRadius: 2,
                  }}
                >
                  {imageUploading ? (
                    <ActivityIndicator size="small" color={DESIGN_COLORS.textPrimary} />
                  ) : (
                    <Text style={{ color: DESIGN_COLORS.textPrimary, fontSize: 12, fontWeight: 'bold' }}>
                      📷 Select Image
                    </Text>
                  )}
                </TouchableOpacity>
                {menuEditForm.image ? (
                  <Image
                    source={{ uri: menuEditForm.image }}
                    style={{ width: 50, height: 50, borderRadius: 8 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ color: DESIGN_COLORS.textSecondary, fontSize: 12 }}>No image selected</Text>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <TouchableOpacity
                  onPress={() => setMenuEditForm(prev => ({ ...prev, isAvailable: !prev.isAvailable }))}
                  style={{
                    width: 24,
                    height: 24,
                    borderWidth: 2,
                    borderColor: DESIGN_COLORS.textPrimary,
                    borderRadius: 4,
                    marginRight: 10,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: menuEditForm.isAvailable ? DESIGN_COLORS.textPrimary : 'transparent'
                  }}
                >
                  {menuEditForm.isAvailable && <Text style={{ color: DESIGN_COLORS.cardBackground, fontSize: 16 }}>✓</Text>}
                </TouchableOpacity>
                <Text style={{ color: DESIGN_COLORS.textPrimary, fontSize: 16 }}>Available</Text>
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowMenuEditModal(false);
                  setEditingMenuItem(null);
                }}
                style={{ backgroundColor: DESIGN_COLORS.border, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, flex: 1, marginRight: 10 }}
              >
                <Text style={{ color: DESIGN_COLORS.textPrimary, textAlign: 'center', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveMenuItem}
                style={{ backgroundColor: DESIGN_COLORS.cardBackground, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, flex: 1, marginLeft: 10, borderWidth: 2, borderColor: DESIGN_COLORS.border, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 }}
              >
                <Text style={{ color: DESIGN_COLORS.textPrimary, textAlign: 'center', fontWeight: 'bold' }}>
                  {editingMenuItem ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 10, padding: 20, width: '90%', maxWidth: 400, maxHeight: '90%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: theme.text }}>
              Add Restaurant
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Name:</Text>
              <TextInput
                value={addForm.name}
                onChangeText={(text) => setAddForm(prev => ({ ...prev, name: text }))}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 5,
                  padding: 10,
                  marginBottom: 15,
                  color: theme.text,
                  backgroundColor: theme.background
                }}
                placeholder="Restaurant name"
                placeholderTextColor={theme.textSecondary}
              />

              <TouchableOpacity
                onPress={handleGetLocationForAdd}
                disabled={locationLoading}
                style={{ backgroundColor: locationLoading ? theme.border : '#28a745', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 5, alignSelf: 'flex-start', marginBottom: 10 }}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color={theme.text} />
                ) : (
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>📍 Get Location</Text>
                )}
              </TouchableOpacity>

              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Latitude:</Text>
              <TextInput
                value={addForm.latitude}
                editable={false}
                selectTextOnFocus={false}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 5,
                  padding: 10,
                  marginBottom: 15,
                  color: theme.text,
                  backgroundColor: theme.background
                }}
                placeholder="e.g. 11.7061"
                keyboardType="numeric"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Longitude:</Text>
              <TextInput
                value={addForm.longitude}
                editable={false}
                selectTextOnFocus={false}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 5,
                  padding: 10,
                  color: theme.text,
                  backgroundColor: theme.background,
                  marginBottom: 15
                }}
                placeholder="e.g. 122.3649"
                keyboardType="numeric"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Category:</Text>
              <View style={{ marginBottom: 15 }}>
                {restaurantCategories.map((category) => (
                  <TouchableOpacity
                    key={category.value}
                    onPress={() => setAddForm(prev => ({ ...prev, category: category.value }))}
                    style={{
                      padding: 10,
                      backgroundColor: addForm.category === category.value ? theme.primary : theme.surface,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 5,
                      marginBottom: 5
                    }}
                  >
                    <Text style={{ color: addForm.category === category.value ? theme.background : theme.text }}>
                      {category.emoji} {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>


              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Price Range (₱):</Text>
              <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                {['₱','₱₱','₱₱₱','₱₱₱₱'].map((pr) => (
                  <TouchableOpacity
                    key={pr}
                    onPress={() => setAddForm(prev => ({ ...prev, priceRange: pr }))}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      marginRight: 8,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 6,
                      backgroundColor: addForm.priceRange === pr ? theme.primary : theme.surface
                    }}
                  >
                    <Text style={{ color: addForm.priceRange === pr ? theme.background : theme.text }}>{pr}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Description:</Text>
              <TextInput
                value={addForm.description}
                onChangeText={(text) => setAddForm(prev => ({ ...prev, description: text }))}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 5,
                  padding: 10,
                  marginBottom: 15,
                  color: theme.text,
                  backgroundColor: theme.background,
                  minHeight: 80,
                  textAlignVertical: 'top'
                }}
                placeholder="Optional restaurant description"
                multiline
                numberOfLines={3}
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Phone:</Text>
              <TextInput
                value={addForm.phone}
                onChangeText={(text) => setAddForm(prev => ({ ...prev, phone: text }))}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 5,
                  padding: 10,
                  marginBottom: 15,
                  color: theme.text,
                  backgroundColor: theme.background
                }}
                placeholder="Optional phone number"
                keyboardType="phone-pad"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Hours:</Text>
              <TextInput
                value={addForm.hours}
                onChangeText={(text) => setAddForm(prev => ({ ...prev, hours: text }))}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 5,
                  padding: 10,
                  marginBottom: 15,
                  color: theme.text,
                  backgroundColor: theme.background
                }}
                placeholder="Optional business hours (e.g. Mon-Fri 9AM-10PM)"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Website:</Text>
              <TextInput
                value={addForm.website}
                onChangeText={(text) => setAddForm(prev => ({ ...prev, website: text }))}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 5,
                  padding: 10,
                  marginBottom: 15,
                  color: theme.text,
                  backgroundColor: theme.background
                }}
                placeholder="Optional website URL"
                keyboardType="url"
                autoCapitalize="none"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Restaurant Image:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <TouchableOpacity
                  onPress={async () => {
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
                        console.log('📷 Admin(Add): Selected image URI:', imageUri);
                        setImageUploading(true);

                        try {
                          const { uploadImageToRestaurantBucket } = await import('../src/services/imageService');
                          const tempRestaurantId = `temp_${Date.now()}`;
                          console.log('📷 Admin(Add): Starting upload with temp ID:', tempRestaurantId);

                          const uploadedImageUrl = await uploadImageToRestaurantBucket(imageUri, tempRestaurantId);
                          console.log('📷 Admin(Add): Upload successful, URL:', uploadedImageUrl);

                          setAddForm(prev => ({
                            ...prev,
                            image: uploadedImageUrl
                          }));

                          Alert.alert('Success', 'Image uploaded successfully!');

                        } catch (uploadError: any) {
                          console.error('📷 Admin(Add): Image upload error:', uploadError);
                          console.error('📷 Admin(Add): Error details:', {
                            message: uploadError.message,
                            code: uploadError.code,
                            details: uploadError.details,
                            hint: uploadError.hint
                          });

                          let errorMessage = 'Failed to upload image';
                          if (uploadError.message?.includes('Failed to process image for upload')) {
                            errorMessage = 'Failed to process the selected image. Please try a different image.';
                          } else if (uploadError.message?.includes('Failed to upload image')) {
                            errorMessage = 'Failed to upload image to storage. Please check your internet connection.';
                          } else if (uploadError.message?.includes('storage')) {
                            errorMessage = 'Storage permission error. Please check your Supabase configuration.';
                          } else if (uploadError.message) {
                            errorMessage = `Image upload failed: ${uploadError.message}`;
                          }

                          Alert.alert('Image Upload Error', errorMessage + '\n\nThe restaurant will be created without an image. Please try again.');
                        } finally {
                          setImageUploading(false);
                        }
                      }
                    } catch (error) {
                      console.error('Image picker error:', error);
                      Alert.alert('Error', 'Failed to select image');
                    }
                  }}
                  disabled={imageUploading}
                  style={{
                    backgroundColor: imageUploading ? theme.border :
                                       theme.primary,
                    paddingHorizontal: 15,
                    paddingVertical: 10,
                    borderRadius: 5,
                    marginRight: 10
                  }}
                >
                  {imageUploading ? (
                    <ActivityIndicator size="small" color={theme.text} />
                  ) : (
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                      📷 Select Image
                    </Text>
                  )}
                </TouchableOpacity>
                {addForm.image ? (
                  <Image
                    source={{ uri: addForm.image }}
                    style={{ width: 50, height: 50, borderRadius: 5 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>No image selected</Text>
                )}
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setAddForm({
                    name: '',
                    latitude: '',
                    longitude: '',
                    image: '',
                    description: '',
                    category: 'casual',
                    priceRange: '₱₱',
                    phone: '',
                    hours: '',
                    website: ''
                  });
                }}
                style={{ backgroundColor: theme.border, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5, flex: 1, marginRight: 10 }}
              >
                <Text style={{ color: theme.text, textAlign: 'center', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveAdd}
                disabled={addLoading}
                style={{ backgroundColor: theme.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5, flex: 1, marginLeft: 10 }}
              >
                {addLoading ? (
                  <ActivityIndicator size="small" color={theme.background} />
                ) : (
                  <Text style={{ color: theme.background, textAlign: 'center', fontWeight: 'bold' }}>Create Restaurant</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 10, padding: 20, width: '90%', maxWidth: 400, maxHeight: '90%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: theme.text }}>
              Edit Restaurant
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Name:</Text>
              <TextInput
                value={editForm.name}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 5,
                  padding: 10,
                  marginBottom: 15,
                  color: theme.text,
                  backgroundColor: theme.background
                }}
                placeholder="Restaurant name"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Latitude:</Text>
              <TextInput
                value={editForm.latitude}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, latitude: text }))}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 5,
                  padding: 10,
                  marginBottom: 15,
                  color: theme.text,
                  backgroundColor: theme.background
                }}
                placeholder="e.g. 11.7061"
                keyboardType="numeric"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Longitude:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <TextInput
                  value={editForm.longitude}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, longitude: text }))}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 5,
                    padding: 10,
                    color: theme.text,
                    backgroundColor: theme.background
                  }}
                  placeholder="e.g. 122.3649"
                  keyboardType="numeric"
                  placeholderTextColor={theme.textSecondary}
                />
                <TouchableOpacity
                  onPress={handleGetCurrentLocation}
                  disabled={locationLoading}
                  style={{
                    marginLeft: 10,
                    backgroundColor: locationLoading ? theme.border : '#28a745',
                    paddingHorizontal: 15,
                    paddingVertical: 10,
                    borderRadius: 5
                  }}
                >
                  {locationLoading ? (
                    <ActivityIndicator size="small" color={theme.text} />
                  ) : (
                    <Text style={{
                      color: !locationAvailable ? theme.textSecondary : 'white',
                      fontSize: 12,
                      fontWeight: 'bold'
                    }}>
                      {!locationAvailable ? '📍 Location Unavailable' : '📍 Get Location'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Category:</Text>
              <View style={{ marginBottom: 15 }}>
                {restaurantCategories.map((category) => (
                  <TouchableOpacity
                    key={category.value}
                    onPress={() => setEditForm(prev => ({ ...prev, category: category.value }))}
                    style={{
                      padding: 10,
                      backgroundColor: editForm.category === category.value ? theme.primary : theme.surface,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 5,
                      marginBottom: 5
                    }}
                  >
                    <Text style={{ color: editForm.category === category.value ? theme.background : theme.text }}>
                      {category.emoji} {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Price Range (₱):</Text>
              <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                {['₱','₱₱','₱₱₱','₱₱₱₱'].map((pr) => (
                  <TouchableOpacity
                    key={pr}
                    onPress={() => setEditForm(prev => ({ ...prev, priceRange: pr }))}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      marginRight: 8,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 6,
                      backgroundColor: editForm.priceRange === pr ? theme.primary : theme.surface
                    }}
                  >
                    <Text style={{ color: editForm.priceRange === pr ? theme.background : theme.text }}>{pr}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Editorial Rating (0–5):</Text>
              <TextInput
                value={editForm.editorialRating}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, editorialRating: text }))}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 5,
                  padding: 10,
                  marginBottom: 15,
                  color: theme.text,
                  backgroundColor: theme.background
                }}
                placeholder="e.g., 4.5"
                keyboardType="decimal-pad"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Description:</Text>
              <TextInput
                value={editForm.description}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, description: text }))}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 5,
                  padding: 10,
                  marginBottom: 15,
                  color: theme.text,
                  backgroundColor: theme.background,
                  minHeight: 80,
                  textAlignVertical: 'top'
                }}
                placeholder="Optional restaurant description"
                multiline
                numberOfLines={3}
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Phone:</Text>
              <TextInput
                value={editForm.phone}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, phone: text }))}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 5,
                  padding: 10,
                  marginBottom: 15,
                  color: theme.text,
                  backgroundColor: theme.background
                }}
                placeholder="Optional phone number"
                keyboardType="phone-pad"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Hours:</Text>
              <TextInput
                value={editForm.hours}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, hours: text }))}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 5,
                  padding: 10,
                  marginBottom: 15,
                  color: theme.text,
                  backgroundColor: theme.background
                }}
                placeholder="Optional business hours (e.g. Mon-Fri 9AM-10PM)"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Website:</Text>
              <TextInput
                value={editForm.website}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, website: text }))}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 5,
                  padding: 10,
                  marginBottom: 15,
                  color: theme.text,
                  backgroundColor: theme.background
                }}
                placeholder="Optional website URL"
                keyboardType="url"
                autoCapitalize="none"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Restaurant Image:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <TouchableOpacity
                  onPress={pickImage}
                  disabled={imageUploading}
                  style={{
                    backgroundColor: imageUploading ? theme.border : theme.primary,
                    paddingHorizontal: 15,
                    paddingVertical: 10,
                    borderRadius: 5,
                    marginRight: 10
                  }}
                >
                  {imageUploading ? (
                    <ActivityIndicator size="small" color={theme.text} />
                  ) : (
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                      📷 Select Image
                    </Text>
                  )}
                </TouchableOpacity>
                {editForm.image ? (
                  <Image
                    source={{ uri: editForm.image }}
                    style={{ width: 50, height: 50, borderRadius: 5 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>No image selected</Text>
                )}
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowEditModal(false);
                  setEditingRestaurant(null);
                }}
                style={{ backgroundColor: theme.border, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5, flex: 1, marginRight: 10 }}
              >
                <Text style={{ color: theme.text, textAlign: 'center', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveEdit}
                style={{ backgroundColor: theme.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5, flex: 1, marginLeft: 10 }}
              >
                <Text style={{ color: theme.background, textAlign: 'center', fontWeight: 'bold' }}>Update Restaurant</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRejectionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRejectionModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 10, padding: 20, width: '90%', maxWidth: 400 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: theme.text }}>
              Reject Restaurant Submission
            </Text>

            <Text style={{ fontSize: 16, marginBottom: 15, color: theme.text }}>
              Please provide a reason for rejection:
            </Text>

            <View style={{ marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => setRejectionReason("Incomplete information provided")}
                style={{ padding: 10, backgroundColor: rejectionReason === "Incomplete information provided" ? theme.primary : theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 5, marginBottom: 5 }}
              >
                <Text style={{ color: rejectionReason === "Incomplete information provided" ? theme.background : theme.text }}>📝 Incomplete information</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setRejectionReason("Invalid location coordinates")}
                style={{ padding: 10, backgroundColor: rejectionReason === "Invalid location coordinates" ? theme.primary : theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 5, marginBottom: 5 }}
              >
                <Text style={{ color: rejectionReason === "Invalid location coordinates" ? theme.background : theme.text }}>📍 Invalid location</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setRejectionReason("Business already exists")}
                style={{ padding: 10, backgroundColor: rejectionReason === "Business already exists" ? theme.primary : theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 5, marginBottom: 5 }}
              >
                <Text style={{ color: rejectionReason === "Business already exists" ? theme.background : theme.text }}>🏢 Duplicate business</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setRejectionReason("Violates platform policies")}
                style={{ padding: 10, backgroundColor: rejectionReason === "Violates platform policies" ? theme.primary : theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 5, marginBottom: 15 }}
              >
                <Text style={{ color: rejectionReason === "Violates platform policies" ? theme.background : theme.text }}>⚖️ Policy violation</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 16, marginBottom: 8, color: theme.text }}>Custom Reason:</Text>
            <TextInput
              value={rejectionReason}
              onChangeText={setRejectionReason}
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 5,
                padding: 10,
                marginBottom: 20,
                color: theme.text,
                backgroundColor: theme.background,
                minHeight: 80,
                textAlignVertical: 'top'
              }}
              placeholder="Or enter custom rejection reason..."
              multiline
              numberOfLines={3}
              placeholderTextColor={theme.textSecondary}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                onPress={() => {
                  setShowRejectionModal(false);
                  setRejectingBusinessId(null);
                  setRejectionReason('');
                }}
                style={{ backgroundColor: theme.border, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5, flex: 1, marginRight: 10 }}
              >
                <Text style={{ color: theme.text, textAlign: 'center', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleRejectBusiness}
                style={{ backgroundColor: '#dc3545', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5, flex: 1, marginLeft: 10 }}
                disabled={!rejectionReason.trim()}
              >
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                  {rejectionReason.trim() ? 'Reject Submission' : 'Enter Reason'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* TODO: User management */}
    </View>
  );
}

const styles = StyleSheet.create({
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconText: {
    fontSize: 20,
  },
});

export default AdminPanelScreen;
