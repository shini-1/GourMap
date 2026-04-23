import React, { useRef, useState, useEffect, useCallback } from 'react';
import { WebView } from 'react-native-webview';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNetwork } from '../src/contexts/NetworkContext';
import Constants from 'expo-constants';
import { Category } from '../types';
import { getAllCategories } from '../src/services/categoryService';
import { OfflineService } from '../src/services/offlineService';
import { Alert } from 'react-native';
import * as Location from 'expo-location';

interface Restaurant {
  id: string;
  name: string;
  location: { latitude: number; longitude: number };
  category?: string;
}

interface MapBoxWebViewProps {
  restaurants: Restaurant[];
  isTyping?: boolean;
}

// Extend window interface for mapbox
declare global {
  interface Window {
    map: any;
    categoriesData: any[];
    restaurantsData: any[];
  }
}

// WebView component with Mapbox for production builds
function MapBoxWebViewComponent({ restaurants, categories, isOnline, isTyping = false }: { restaurants: Restaurant[], categories: Category[], isOnline: boolean, isTyping?: boolean }) {
  const webViewRef = useRef<WebView>(null);
  const [webViewKey, setWebViewKey] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('');
  const [webViewReady, setWebViewReady] = useState(false);

  console.log('🗺️ MapBoxWebViewComponent: Rendering with', restaurants.length, 'restaurants and', categories.length, 'categories');

  // Store previous restaurant IDs to compare changes
  const prevRestaurantIdsRef = useRef<string[]>([]);

  // Only force WebView reload for major data changes (empty to populated, or data source changes)
  // Not for search filtering which should update markers dynamically
  useEffect(() => {
    const shouldReload = restaurants.length === 0 || (restaurants.length > 0 && webViewKey === 0);
    if (shouldReload) {
      console.log('🗺️ MapBoxWebViewComponent: Major data change, forcing WebView reload');
      setWebViewKey(prev => prev + 1);
      setWebViewReady(false); // Reset ready state for new WebView
      prevRestaurantIdsRef.current = restaurants.map(r => r.id);
    } else if (restaurants.length > 0 && webViewReady) {
      // For search/filtering changes, only update if restaurant IDs actually changed
      // and user is not actively typing
      const currentIds = restaurants.map(r => r.id).sort();
      const prevIds = prevRestaurantIdsRef.current.sort();
      const idsChanged = JSON.stringify(currentIds) !== JSON.stringify(prevIds);

      if (idsChanged && !isTyping) {
        console.log('🗺️ MapBoxWebViewComponent: Restaurant IDs changed and not typing, updating markers dynamically');
        updateMapMarkers(restaurants);
        prevRestaurantIdsRef.current = [...currentIds];
      } else if (idsChanged && isTyping) {
        console.log('🗺️ MapBoxWebViewComponent: Restaurant IDs changed but user is typing, skipping update');
      } else {
        console.log('🗺️ MapBoxWebViewComponent: Restaurant list unchanged, skipping marker update');
      }
    }
  }, [restaurants, webViewReady, isTyping]);

  // Function to dynamically update map markers without reloading WebView
  const updateMapMarkers = useCallback((restaurantData: Restaurant[]) => {
    if (!webViewRef.current || !webViewReady) {
      console.log('🗺️ WebView not ready for marker updates');
      return;
    }

    const updateScript = `
      try {
        if (typeof window.map !== 'undefined' && typeof window.updateMarkers === 'function') {
          console.log('🗺️ Dynamically updating markers with', ${restaurantData.length}, 'restaurants');
          window.updateMarkers(${JSON.stringify(restaurantData)});
        } else {
          console.log('🗺️ Map or updateMarkers function not available yet');
        }
      } catch (error) {
        console.error('🗺️ Error injecting marker update script:', error);
      }
    `;

    try {
      webViewRef.current.injectJavaScript(updateScript);
    } catch (injectError) {
      console.error('🗺️ Error injecting JavaScript:', injectError);
    }
  }, [webViewReady]);

  const mapboxToken = Constants.expoConfig?.extra?.mapboxAccessToken || 'YOUR_MAPBOX_TOKEN';

  // Function to request location permissions and get current location
  const getCurrentLocation = async () => {
    try {
      console.log('🗺️ [DEBUG] Starting getCurrentLocation function');
      setLocationLoading(true);
      setLocationStatus('Requesting location permissions...');

      // Request location permissions
      console.log('🗺️ [DEBUG] Requesting foreground location permissions...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('🗺️ [DEBUG] Permission status:', status);

      if (status !== 'granted') {
        console.log('🗺️ [DEBUG] Permission denied, showing alert');
        setLocationLoading(false);
        setLocationStatus('');
        Alert.alert(
          'Location Permission Denied',
          'Location permission is required to show your current location on the map. Please enable location services in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      setLocationStatus('Getting your location...');
      console.log('🗺️ [DEBUG] Permission granted, getting current location...');

      // Function to process location once obtained
      const processLocation = async (latitude: number, longitude: number, isCached = false) => {
        console.log('🗺️ [DEBUG] Processing location:', { latitude, longitude, isCached });

        setCurrentLocation({ latitude, longitude });
        setLocationStatus(isCached ? 'Using cached location...' : 'Location found! Centering map...');

        // Inject location data into WebView
        const injectLocation = (locationData: { latitude: number, longitude: number }) => {
          if (webViewRef.current && webViewReady) {
            console.log('🗺️ [DEBUG] Injecting location data into WebView...');
            const locationString = JSON.stringify(locationData);
            webViewRef.current.injectJavaScript(`
              console.log('🗺️ [WebView] Received location data:', ${locationString});
              if (window.showUserLocation) {
                console.log('🗺️ [WebView] Calling showUserLocation function');
                window.showUserLocation(${locationString});
              } else {
                console.log('🗺️ [WebView] showUserLocation function not found');
              }
            `);
            return true;
          } else {
            console.log('🗺️ [DEBUG] WebView not ready for injection');
            return false;
          }
        };

        // Try to inject immediately, or retry after WebView is ready
        if (!injectLocation({ latitude, longitude })) {
          // Wait for WebView to be ready and retry
          const retryInterval = setInterval(() => {
            if (injectLocation({ latitude, longitude })) {
              clearInterval(retryInterval);
            }
          }, 500);

          // Stop retrying after 10 seconds
          setTimeout(() => {
            clearInterval(retryInterval);
            console.log('🗺️ [DEBUG] Stopped retrying location injection');
          }, 10000);
        }

        // Clear status after a short delay
        setTimeout(() => {
          setLocationLoading(false);
          setLocationStatus('');
        }, 3000);
      };

      // First try with balanced accuracy and shorter timeout
      console.log('🗺️ [DEBUG] Attempting location with Balanced accuracy...');
      try {
        const locationPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            console.log('🗺️ [DEBUG] Balanced accuracy request timed out, trying Low accuracy...');
            reject(new Error('Balanced accuracy timeout'));
          }, 8000); // 8 second timeout for first attempt
        });

        const location = await Promise.race([locationPromise, timeoutPromise]) as Location.LocationObject;
        console.log('🗺️ [DEBUG] Location obtained with Balanced accuracy:', location.coords);

        // Success with balanced accuracy, continue with processing
        const { latitude, longitude } = location.coords;
        await processLocation(latitude, longitude);

      } catch (balancedError) {
        console.log('🗺️ [DEBUG] Balanced accuracy failed, trying Lowest accuracy...');

        // Fallback to lowest accuracy with longer timeout
        try {
          const locationPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Lowest,
          });

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              console.log('🗺️ [DEBUG] Lowest accuracy request timed out');
              reject(new Error('Lowest accuracy timeout'));
            }, 12000); // 12 second timeout for fallback
          });

          const location = await Promise.race([locationPromise, timeoutPromise]) as Location.LocationObject;
          console.log('🗺️ [DEBUG] Location obtained with Lowest accuracy:', location.coords);

          const { latitude, longitude } = location.coords;
          await processLocation(latitude, longitude);

        } catch (lowestError) {
          console.log('🗺️ [DEBUG] All location attempts failed');

          // Final fallback: try to get last known location
          try {
            console.log('🗺️ [DEBUG] Attempting to get last known location...');
            const lastLocation = await Location.getLastKnownPositionAsync();
            if (lastLocation) {
              console.log('🗺️ [DEBUG] Using last known location:', lastLocation.coords);
              const { latitude, longitude } = lastLocation.coords;
              await processLocation(latitude, longitude, true); // true indicates this is cached location
            } else {
              throw new Error('No last known location available');
            }
          } catch (lastKnownError) {
            console.log('🗺️ [DEBUG] Last known location also failed');
            throw new Error('All location methods failed');
          }
        }
      }

    } catch (error: any) {
      console.error('🗺️ [DEBUG] Error in getCurrentLocation:', error);
      console.error('🗺️ [DEBUG] Error message:', error.message);
      console.error('🗺️ [DEBUG] Error code:', error.code);

      setLocationLoading(false);
      setLocationStatus('');

      let errorMessage = 'Unable to get your location. ';
      if (error.code === 'E_LOCATION_SERVICES_DISABLED') {
        errorMessage += 'Please enable location services on your device.';
      } else if (error.code === 'E_NO_PERMISSIONS') {
        errorMessage += 'Location permission was denied.';
      } else if (error.message?.includes('timed out')) {
        errorMessage += 'Location request timed out. Please try again.';
      } else if (error.message?.includes('All location methods failed')) {
        errorMessage += 'All location methods failed. Please check your device settings and network connection.';
      } else {
        errorMessage += 'Please try again or check your internet connection.';
      }

      console.log('🗺️ [DEBUG] Showing error alert with message:', errorMessage);
      Alert.alert('Location Error', errorMessage);
    }
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>GourMap Map</title>
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
      <script src='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'></script>
      <link href='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css' rel='stylesheet' />
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          background: #e6f3ff;
        }
        #map {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          height: 100%;
          background: #cce7ff;
        }
        #status {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(255,255,255,0.9);
          padding: 10px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 1000;
          max-width: 300px;
        }
        #locationButton {
          position: absolute;
          top: 70px;
          right: 10px;
          width: 48px;
          height: 48px;
          background: rgba(255,255,255,0.9);
          border: none;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          font-size: 20px;
        }
        #locationButton:hover {
          background: rgba(255,255,255,1);
        }
        #locationButton:active {
          background: rgba(200,200,200,0.9);
        }
        .marker {
          background-color: #ff0000;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          border: 3px solid #fff;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div id="status">Loading map...</div>
      <div id="map"></div>
      <button id="locationButton" title="Find my location">📍</button>

      <script>
        console.log('🗺️ Map script starting...');

        function updateStatus(message) {
          const statusEl = document.getElementById('status');
          if (statusEl) {
            statusEl.innerHTML = message;
            console.log('🗺️ STATUS:', message);
          }
        }

        updateStatus('Initializing Mapbox...');

        // Wait for Mapbox to load
        let checkCount = 0;
        const maxChecks = 50; // 5 seconds max

        function checkMapboxReady() {
          checkCount++;
          if (typeof mapboxgl !== 'undefined') {
            console.log('🗺️ Mapbox GL JS loaded successfully');
            updateStatus('✅ Mapbox ready, creating map...');
            initializeMap();
          } else if (checkCount < maxChecks) {
            setTimeout(checkMapboxReady, 100);
          } else {
            console.error('🗺️ Mapbox GL JS failed to load');
            updateStatus('❌ Mapbox failed to load');
          }
        }

        checkMapboxReady();

        function initializeMap() {
          try {
            updateStatus('Setting up Mapbox...');

            // Use Mapbox token from config
            mapboxgl.accessToken = '${mapboxToken}';

            // Process data first
            const categories = ${JSON.stringify(categories)};
            const restaurants = ${JSON.stringify(restaurants)};
            const isOnline = ${isOnline};

            console.log('🗺️ Processing data - online:', isOnline, 'categories:', categories.length, 'restaurants:', restaurants.length);

            updateStatus('Creating map...');

            // Use different map style based on online status
            let mapStyle;
            if (!isOnline) {
              // Offline mode: Use OpenStreetMap tiles with caching
              mapStyle = {
                version: 8,
                sources: {
                  'osm-tiles': {
                    type: 'raster',
                    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '© OpenStreetMap contributors',
                    maxzoom: 19
                  }
                },
                layers: [
                  {
                    id: 'background',
                    type: 'background',
                    paint: {
                      'background-color': '#e8e4d9'
                    }
                  },
                  {
                    id: 'osm-tiles-layer',
                    type: 'raster',
                    source: 'osm-tiles',
                    minzoom: 0,
                    maxzoom: 22,
                    paint: {
                      'raster-opacity': 1
                    }
                  }
                ],
                glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
                sprite: ""
              };
              console.log('🗺️ Using offline OpenStreetMap tiles with caching');
            } else {
              // Online style with MapBox tiles
              mapStyle = 'mapbox://styles/mapbox/streets-v11';
              console.log('🗺️ Using online MapBox streets style');
            }

            // Create map
            const map = new mapboxgl.Map({
              container: 'map',
              style: mapStyle,
              center: [122.3667, 11.7167],
              zoom: 12
            });

            updateStatus('Map created, adding markers...');

            map.on('load', function() {
              console.log('🗺️ Map loaded successfully');

              // Show offline indicator if needed
              if (!isOnline) {
                updateStatus('📱 Offline mode - OpenStreetMap tiles and markers loaded');
              }

              // Add navigation control
              map.addControl(new mapboxgl.NavigationControl(), 'top-right');

              // Initialize user location marker
              let userLocationMarker = null;

              // Function to show user location (called from React Native)
              window.showUserLocation = function(locationData) {
                try {
                  const { latitude, longitude } = locationData;
                  console.log('🗺️ Showing user location:', latitude, longitude);

                  // Remove existing user location marker
                  if (userLocationMarker) {
                    userLocationMarker.remove();
                  }

                  // Create user location marker element
                  const userLocationEl = document.createElement('div');
                  userLocationEl.innerHTML = '📍';
                  userLocationEl.style.fontSize = '24px';
                  userLocationEl.style.color = '#4285f4';
                  userLocationEl.style.textShadow = '0 2px 4px rgba(0,0,0,0.3)';
                  userLocationEl.style.cursor = 'pointer';

                  // Add user location marker
                  userLocationMarker = new mapboxgl.Marker(userLocationEl)
                    .setLngLat([longitude, latitude])
                    .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
                      '<div style="font-size: 14px; line-height: 1.4;"><strong>📍 Your Location</strong><br>' +
                      '<small>Lat: ' + latitude.toFixed(6) + '<br>Lng: ' + longitude.toFixed(6) + '</small></div>'
                    ))
                    .addTo(map);

                  // Center map on user location with some zoom
                  map.flyTo({
                    center: [longitude, latitude],
                    zoom: 15,
                    duration: 2000
                  });

                  updateStatus('✅ Location found! Centered on your position');
                  console.log('🗺️ User location marker added at:', latitude, longitude);
                } catch (error) {
                  console.error('🗺️ Error showing user location:', error);
                  updateStatus('❌ Error displaying location');
                }
              };

              // Function to request location from React Native
              window.requestLocation = function() {
                updateStatus('📍 Getting your location...');
                // This will trigger the React Native location request
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_LOCATION' }));
                }
              };

              // Add event listener to location button
              const locationButton = document.getElementById('locationButton');
              if (locationButton) {
                locationButton.addEventListener('click', window.requestLocation);
                console.log('🗺️ Location button event listener added');
              }

              // Category configuration data
              const CATEGORY_CONFIG = ${JSON.stringify(Object.fromEntries(
                Object.entries({
                  italian: { name: 'italian', emoji: '🍕', color: '#E74C3C' },
                  cafe: { name: 'cafe', emoji: '☕', color: '#8B4513' },
                  fast_food: { name: 'fast_food', emoji: '🍔', color: '#FF8C00' },
                  asian: { name: 'asian', emoji: '🥢', color: '#E67E22' },
                  japanese: { name: 'japanese', emoji: '🍱', color: '#9B59B6' },
                  ramen: { name: 'ramen', emoji: '🍜', color: '#F39C12' },
                  thai: { name: 'thai', emoji: '🍜', color: '#27AE60' },
                  bakery: { name: 'bakery', emoji: '🥖', color: '#F39C12' },
                  grill: { name: 'grill', emoji: '🥩', color: '#E74C3C' },
                  seafood: { name: 'seafood', emoji: '🦞', color: '#3498DB' },
                  mexican: { name: 'mexican', emoji: '🌮', color: '#E67E22' },
                  buffet: { name: 'buffet', emoji: '🍽️', color: '#F1C40F' },
                  fine_dining: { name: 'fine_dining', emoji: '🍾', color: '#8E44AD' },
                  fast_casual: { name: 'fast_casual', emoji: '🏃', color: '#16A085' },
                  family: { name: 'family', emoji: '👨‍👩‍👧‍👦', color: '#F39C12' },
                  diner: { name: 'diner', emoji: '🍳', color: '#95A5A6' },
                  casual: { name: 'casual', emoji: '🍽️', color: '#4A90E2' },
                })
              ))};
              
              const DEFAULT_CATEGORY = { name: 'casual', emoji: '🍽️', color: '#4A90E2' };
              
              function getCategoryForRestaurant(restaurantCategory, restaurantName) {
                // Try database category first
                if (restaurantCategory) {
                  const normalized = restaurantCategory.toLowerCase().trim();
                  if (CATEGORY_CONFIG[normalized]) {
                    return CATEGORY_CONFIG[normalized];
                  }
                }
                
                // Fall back to name-based guessing
                const nameLower = restaurantName.toLowerCase();
                
                // Check for specific keywords
                if (nameLower.includes('ramen')) return CATEGORY_CONFIG.ramen || DEFAULT_CATEGORY;
                if (nameLower.includes('pizza') || nameLower.includes('pizzeria')) return CATEGORY_CONFIG.italian || DEFAULT_CATEGORY;
                if (nameLower.includes('burger') || nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('wendy')) return CATEGORY_CONFIG.fast_food || DEFAULT_CATEGORY;
                if (nameLower.includes('cafe') || nameLower.includes('coffee') || nameLower.includes('starbucks')) return CATEGORY_CONFIG.cafe || DEFAULT_CATEGORY;
                if (nameLower.includes('sushi') || nameLower.includes('japanese') || nameLower.includes('tokyo')) return CATEGORY_CONFIG.japanese || DEFAULT_CATEGORY;
                if (nameLower.includes('thai')) return CATEGORY_CONFIG.thai || DEFAULT_CATEGORY;
                if (nameLower.includes('chinese') || nameLower.includes('china') || nameLower.includes('wok')) return CATEGORY_CONFIG.asian || DEFAULT_CATEGORY;
                if (nameLower.includes('bakery') || nameLower.includes('bread') || nameLower.includes('pastry')) return CATEGORY_CONFIG.bakery || DEFAULT_CATEGORY;
                if (nameLower.includes('steak') || nameLower.includes('grill') || nameLower.includes('barbecue')) return CATEGORY_CONFIG.grill || DEFAULT_CATEGORY;
                if (nameLower.includes('seafood') || nameLower.includes('fish') || nameLower.includes('lobster') || nameLower.includes('shrimp')) return CATEGORY_CONFIG.seafood || DEFAULT_CATEGORY;
                if (nameLower.includes('mexican') || nameLower.includes('taco') || nameLower.includes('burrito')) return CATEGORY_CONFIG.mexican || DEFAULT_CATEGORY;
                if (nameLower.includes('buffet') || nameLower.includes('all you can eat')) return CATEGORY_CONFIG.buffet || DEFAULT_CATEGORY;
                if (nameLower.includes('fine') || nameLower.includes('elegant') || nameLower.includes('upscale')) return CATEGORY_CONFIG.fine_dining || DEFAULT_CATEGORY;
                if (nameLower.includes('fast') || nameLower.includes('quick')) return CATEGORY_CONFIG.fast_casual || DEFAULT_CATEGORY;
                if (nameLower.includes('family') || nameLower.includes('kids')) return CATEGORY_CONFIG.family || DEFAULT_CATEGORY;
                if (nameLower.includes('diner')) return CATEGORY_CONFIG.diner || DEFAULT_CATEGORY;
                
                return DEFAULT_CATEGORY;
              }

              // Function to dynamically update markers (called from React Native for search/filtering)
              window.updateMarkers = function(newRestaurants) {
                try {
                  console.log('🗺️ Updating markers with', newRestaurants.length, 'restaurants');

                  // Clear existing markers
                  if (window.currentMarkers && window.currentMarkers.length > 0) {
                    window.currentMarkers.forEach(marker => marker.remove());
                    window.currentMarkers = [];
                  }

                  // Reset markers array
                  window.currentMarkers = [];

                  // Add new markers
                  newRestaurants.forEach(function(restaurant) {
                    const { location, name, category: restaurantCategory } = restaurant;
                    
                    // Validate location data
                    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
                      console.warn('🗺️ Skipping restaurant with invalid location:', name, location);
                      return;
                    }
                    
                    // Use new category resolution logic
                    const categoryConfig = getCategoryForRestaurant(restaurantCategory, name);

                    const markerEl = document.createElement('div');
                    markerEl.className = 'marker';
                    markerEl.style.backgroundColor = categoryConfig.color;
                    markerEl.innerHTML = categoryConfig.emoji;
                    markerEl.title = name;

                    const popup = new mapboxgl.Popup({
                      offset: 25,
                      closeButton: true,
                      closeOnClick: false
                    }).setHTML('<div style="font-size: 14px; line-height: 1.4;"><strong>' + name + '</strong><br>' +
                      '<span style="color:' + categoryConfig.color + '; font-weight: bold;">' + categoryConfig.emoji + ' ' + categoryConfig.name.replace('_', ' ').toUpperCase() + '</span>' +
                      '<br><small>📍 ' + (typeof location.latitude === 'number' ? location.latitude.toFixed(4) : '0.0000') + ', ' + (typeof location.longitude === 'number' ? location.longitude.toFixed(4) : '0.0000') + '</small></div>');

                    const marker = new mapboxgl.Marker(markerEl)
                      .setLngLat([location.longitude, location.latitude])
                      .setPopup(popup)
                      .addTo(map);
                      
                    window.currentMarkers.push(marker);
                  });

                  // Fit bounds to new markers if any exist
                  if (window.currentMarkers.length > 0) {
                    const bounds = new mapboxgl.LngLatBounds();
                    newRestaurants.forEach(function(restaurant) {
                      if (restaurant.location && typeof restaurant.location.latitude === 'number' && typeof restaurant.location.longitude === 'number') {
                        bounds.extend([restaurant.location.longitude, restaurant.location.latitude]);
                      }
                    });
                    
                    map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
                    updateStatus('✅ Map updated with ' + window.currentMarkers.length + ' markers');
                  } else {
                    updateStatus('ℹ️ No restaurants match current filters');
                  }

                  console.log('🗺️ Markers updated successfully:', window.currentMarkers.length, 'markers');
                } catch (error) {
                  console.error('🗺️ Error updating markers:', error);
                  updateStatus('❌ Error updating map markers');
                }
              };

              // Initialize global markers array
              window.currentMarkers = [];

              // Slow load feature - load markers in batches of 50 (increased from 20)
              const BATCH_SIZE = 50;
              const BATCH_DELAY = 300; // Reduced delay for faster loading
              let loadedCount = 0;
              
              function loadMarkerBatch(startIndex) {
                try {
                  const endIndex = Math.min(startIndex + BATCH_SIZE, restaurants.length);
                  console.log('🗺️ Loading batch:', startIndex, 'to', endIndex, 'of', restaurants.length);

                  for (let i = startIndex; i < endIndex; i++) {
                    const restaurant = restaurants[i];
                    const { location, name, category: restaurantCategory } = restaurant;

                    // Validate location data
                    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
                      console.warn('🗺️ Skipping restaurant with invalid location:', name, location);
                      continue;
                    }

                    // Use new category resolution logic
                    const categoryConfig = getCategoryForRestaurant(restaurantCategory, name);

                    try {
                      const markerEl = document.createElement('div');
                      markerEl.className = 'marker';
                      markerEl.style.backgroundColor = categoryConfig.color;
                      markerEl.innerHTML = categoryConfig.emoji;
                      markerEl.title = name;

                      const popup = new mapboxgl.Popup({
                        offset: 25,
                        closeButton: true,
                        closeOnClick: false
                      }).setHTML('<div style="font-size: 14px; line-height: 1.4;"><strong>' + name + '</strong><br>' +
                        '<span style="color:' + categoryConfig.color + '; font-weight: bold;">' + categoryConfig.emoji + ' ' + categoryConfig.name.replace('_', ' ').toUpperCase() + '</span>' +
                        '<br><small>📍 ' + (typeof location.latitude === 'number' ? location.latitude.toFixed(4) : '0.0000') + ', ' + (typeof location.longitude === 'number' ? location.longitude.toFixed(4) : '0.0000') + '</small></div>');

                      const marker = new mapboxgl.Marker(markerEl)
                        .setLngLat([location.longitude, location.latitude])
                        .setPopup(popup)
                        .addTo(map);

                      window.currentMarkers.push(marker);
                    } catch (markerError) {
                      console.error('🗺️ Error creating marker for restaurant:', name, markerError);
                      continue; // Continue with next restaurant
                    }
                  }

                  loadedCount = endIndex;
                  updateStatus('✅ Map loading... ' + loadedCount + '/' + restaurants.length + ' markers');

                  // Load next batch if there are more restaurants
                  if (endIndex < restaurants.length) {
                    setTimeout(function() {
                      loadMarkerBatch(endIndex);
                    }, BATCH_DELAY);
                  } else {
                    console.log('🗺️ All ' + restaurants.length + ' markers loaded, fitting bounds...');
                    updateStatus('✅ Map ready with ' + loadedCount + ' markers');
                  }
                } catch (batchError) {
                  console.error('🗺️ Error in loadMarkerBatch:', batchError);
                  updateStatus('❌ Error loading markers');
                }
              }
              
              // Start loading markers in batches
              if (restaurants.length > 0) {
                loadMarkerBatch(0);
                
                // Fit bounds to all restaurants AFTER all markers are loaded
                const bounds = new mapboxgl.LngLatBounds();
                let validLocations = 0;
                
                restaurants.forEach(restaurant => {
                  if (restaurant.location && typeof restaurant.location.latitude === 'number' && typeof restaurant.location.longitude === 'number') {
                    bounds.extend([restaurant.location.longitude, restaurant.location.latitude]);
                    validLocations++;
                  }
                });
                
                console.log('🗺️ Calculated bounds for', validLocations, 'valid restaurant locations');
                
                // Wait for all markers to load before fitting bounds
                const totalBatches = Math.ceil(restaurants.length / BATCH_SIZE);
                const totalDelay = (totalBatches * BATCH_DELAY) + 1000; // Extra 1 second buffer
                
                // Safety timeout - force bounds fitting after 10 seconds max
                const safetyTimeout = Math.min(totalDelay + 2000, 10000); // Max 10 seconds
                
                setTimeout(() => {
                  if (validLocations > 0) {
                    try {
                      map.fitBounds(bounds, { padding: 50 });
                      console.log('🗺️ Map fitted to bounds after all markers loaded');
                      updateStatus(isOnline ? '✅ Map ready with ' + loadedCount + ' markers' : '📱 Offline - OpenStreetMap with ' + loadedCount + ' markers ready');
                    } catch (error) {
                      console.error('🗺️ Error fitting bounds:', error);
                      updateStatus('❌ Error fitting map bounds');
                    }
                  } else {
                    console.warn('🗺️ No valid locations found for bounds fitting');
                    updateStatus('⚠️ No valid restaurant locations');
                  }
                }, totalDelay);
                
                // Safety timeout as fallback
                setTimeout(() => {
                  console.log('🗺️ Safety timeout triggered - forcing bounds fit');
                  if (validLocations > 0 && window.currentMarkers && window.currentMarkers.length > 0) {
                    try {
                      map.fitBounds(bounds, { padding: 50 });
                      updateStatus(isOnline ? '✅ Map ready with ' + window.currentMarkers.length + ' markers (safety timeout)' : '📱 Offline - OpenStreetMap with ' + window.currentMarkers.length + ' markers ready (safety timeout)');
                    } catch (error) {
                      console.error('🗺️ Safety timeout bounds fit failed:', error);
                    }
                  }
                }, safetyTimeout);
              } else {
                updateStatus('✅ Map ready with 0 markers');
              }

              console.log('🗺️ Map initialization completed, loading', restaurants.length, 'markers in batches of', BATCH_SIZE);
            });

            map.on('error', function(e) {
              updateStatus('❌ Map error: ' + e.error.message);
              console.error('🗺️ Map error:', e);
            });

          } catch (error) {
            updateStatus('❌ Error: ' + error.message);
            console.error('🗺️ Error creating map:', error);
          }
        }
      </script>
    </body>
    </html>
  `;

  // Handle messages from WebView
  const handleWebViewMessage = (event: any) => {
    try {
      console.log('🗺️ [DEBUG] Received WebView message:', event.nativeEvent.data);
      const data = JSON.parse(event.nativeEvent.data);
      console.log('🗺️ [DEBUG] Parsed message data:', data);

      if (data.type === 'REQUEST_LOCATION') {
        console.log('🗺️ [DEBUG] Received REQUEST_LOCATION from WebView, calling getCurrentLocation');
        getCurrentLocation();
      } else {
        console.log('🗺️ [DEBUG] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('🗺️ [DEBUG] Error parsing WebView message:', error);
      console.error('🗺️ [DEBUG] Raw message data:', event.nativeEvent.data);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        key={webViewKey} // Force reload when restaurants change
        ref={webViewRef}
        source={{ html }}
        style={{ flex: 1 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        mixedContentMode="always"
        allowUniversalAccessFromFileURLs={true}
        allowFileAccessFromFileURLs={true}
        allowFileAccess={true}
        scalesPageToFit={true}
        onMessage={handleWebViewMessage}
        onLoadStart={(event) => {
          console.log('🗺️ WebView onLoadStart:', event.nativeEvent.url);
        }}
        onLoadEnd={(event) => {
          console.log('🗺️ WebView onLoadEnd:', event.nativeEvent.url);
          setWebViewReady(true);
          // Inject the data after the page loads
          setTimeout(() => {
            webViewRef.current?.injectJavaScript(`
              console.log('🗺️ WebView ready for data injection');
              true;
            `);
          }, 1000);
        }}
        onError={(error) => {
          console.error('🗺️ WebView onError:', error);
        }}
      />

      {/* Location Status Overlay */}
      {locationLoading && (
        <View style={styles.locationStatusOverlay}>
          <View style={styles.locationStatusContainer}>
            <Text style={styles.locationStatusEmoji}>📍</Text>
            <Text style={styles.locationStatusText}>{locationStatus}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// Native fallback component for Expo Go
function NativeMapFallback({ restaurants, isOnline }: { restaurants: Restaurant[], isOnline: boolean }) {
  const categorizedRestaurants = restaurants.map((restaurant) => {
    const name = restaurant.name.toLowerCase();
    let category = 'casual';
    let color = '#4a90e2';
    let emoji = '🍽️';

    if (name.includes('pizza') || name.includes('pizzeria')) {
      category = 'italian';
      color = '#e74c3c';
      emoji = '🍕';
    } else if (name.includes('burger') || name.includes('mcdonald') || name.includes('kfc')) {
      category = 'fast_food';
      color = '#ff8c00';
      emoji = '🍔';
    } else if (name.includes('cafe') || name.includes('coffee') || name.includes('starbucks')) {
      category = 'cafe';
      color = '#8b4513';
      emoji = '☕';
    } else if (name.includes('sushi') || name.includes('ramen') || name.includes('thai')) {
      category = 'asian';
      color = '#32cd32';
      emoji = '🍱';
    }

    return { ...restaurant, category, color, emoji };
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🍽️ Restaurant Map</Text>
        <Text style={styles.subtitle}>
          {isOnline ? '🟢 Online - Interactive map available in production build' : '🔴 Offline - Showing restaurant list'}
        </Text>
        <Text style={styles.note}>
          WebView JavaScript is restricted in Expo Go. Full map functionality available in development/production builds.
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {categorizedRestaurants.map((restaurant, index) => (
          <TouchableOpacity
            key={restaurant.id}
            style={[styles.restaurantCard, { borderLeftColor: restaurant.color }]}
            onPress={() => {
              console.log('🗺️ Restaurant selected:', restaurant.name, restaurant.location);
            }}
          >
            <View style={styles.restaurantHeader}>
              <Text style={styles.restaurantEmoji}>{restaurant.emoji}</Text>
              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName} numberOfLines={1}>
                  {restaurant.name}
                </Text>
                <Text style={styles.restaurantCategory}>
                  {restaurant.category.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.locationInfo}>
              <Text style={styles.coordinates}>
                📍 {typeof restaurant.location.latitude === 'number' && !isNaN(restaurant.location.latitude) ? restaurant.location.latitude.toFixed(4) : '0.0000'}, {typeof restaurant.location.longitude === 'number' && !isNaN(restaurant.location.longitude) ? restaurant.location.longitude.toFixed(4) : '0.0000'}
              </Text>
              <Text style={styles.distance}>
                🗺️ View on map (opens in browser)
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {categorizedRestaurants.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No restaurants found</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>📊 Total: {categorizedRestaurants.length} restaurants</Text>
        <Text style={styles.footerNote}>
          Build a development APK for full interactive map features
        </Text>
      </View>
    </View>
  );
}

// Main component that conditionally renders based on environment
function MapBoxWebView({ restaurants, isTyping = false }: MapBoxWebViewProps) {
  const { isOnline } = useNetwork();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(false);

  // Detect if we're in Expo Go or a production build
  const isExpoGo = Constants.appOwnership === 'expo';
  const isProduction = !isExpoGo && Constants.releaseChannel !== 'default';

  // Fetch categories on mount with offline support
  useEffect(() => {
    const fetchCategories = async () => {
      console.log('🗺️ React Native: Starting to fetch categories with offline support');
      try {
        // Try to get data with offline fallback
        const data = await OfflineService.getDataWithOfflineFallback();
        setCategories(data.categories);
        console.log('🗺️ React Native: Categories loaded successfully:', data.categories.length, data.isOffline ? '(offline)' : '(online)');
      } catch (error) {
        console.error('🗺️ React Native: Failed to load categories:', error);
        // Use minimal fallback categories
        setCategories([
          { id: '1', name: 'italian', icon_url: '', color: '#e74c3c', emoji: '🍕' },
          { id: '2', name: 'cafe', icon_url: '', color: '#8b4513', emoji: '☕' },
          { id: '3', name: 'fast_food', icon_url: '', color: '#ff8c00', emoji: '🍔' },
          { id: '4', name: 'casual', icon_url: '', color: '#4a90e2', emoji: '🍽️' }
        ]);
        console.log('🗺️ React Native: Using minimal fallback categories');
      } finally {
        setCategoriesLoading(false);
        console.log('🗺️ React Native: Categories loading set to false');
      }
    };

    fetchCategories();
  }, []);

  // Load all restaurants for the map when online and in production
  useEffect(() => {
    const fetchAllRestaurants = async () => {
      if (!isOnline || isExpoGo || categoriesLoading) return;

      console.log('🗺️ MapBoxWebView: Loading all restaurants for map...');
      setRestaurantsLoading(true);

      try {
        // Import restaurant service dynamically to avoid circular dependencies
        const { restaurantService } = await import('../src/services/restaurantService');

        if (!restaurantService || typeof restaurantService.getAllRestaurants !== 'function') {
          console.warn('🗺️ Restaurant service not available, falling back to props data');
          setAllRestaurants(restaurants || []);
          return;
        }

        // Load all restaurants from Supabase (not paginated)
        const allData = await restaurantService.getAllRestaurants();
        console.log('🗺️ MapBoxWebView: Loaded', allData.length, 'restaurants from database');

        setAllRestaurants(allData);
      } catch (error) {
        console.error('🗺️ Failed to load all restaurants for map:', error);
        // Fallback to props data
        setAllRestaurants(restaurants || []);
      } finally {
        setRestaurantsLoading(false);
      }
    };

    fetchAllRestaurants();
  }, [isOnline, isExpoGo, categoriesLoading, restaurants]);

  console.log('🗺️ MapBoxWebView: Component rendered with', restaurants?.length || 0, 'props restaurants,', allRestaurants.length, 'loaded restaurants, online:', isOnline);

  // Determine which restaurants to use for the map
  const mapRestaurants = allRestaurants.length > 0 ? allRestaurants : restaurants;

  console.log('🗺️ MapBoxWebView: Using', mapRestaurants.length, 'restaurants for map (all:', allRestaurants.length, 'props:', restaurants?.length || 0, ')');

  if (restaurantsLoading && allRestaurants.length === 0) {
    console.log('🗺️ MapBoxWebView: Loading all restaurants for map...');
    return (
      <View style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={{ marginTop: 16, color: '#666' }}>Loading all restaurants for map...</Text>
        </View>
      </View>
    );
  }

  if (!mapRestaurants || mapRestaurants.length === 0) {
    console.warn('🗺️ MapBoxWebView: No restaurants data available!');
    return (
      <View style={styles.offlineBanner}>
        <Text style={styles.offlineText}>📍 No restaurants to display on map</Text>
      </View>
    );
  }

  // Conditional rendering based on online status and environment
  if (!isOnline) {
    console.log('📱 OFFLINE: Checking for cached data...');
    // When offline, check if we have data to show
    if (mapRestaurants && mapRestaurants.length > 0) {
      console.log('📱 OFFLINE: Using cached data for full map experience');
      return <MapBoxWebViewComponent restaurants={mapRestaurants} categories={categories} isOnline={isOnline} isTyping={isTyping} />;
    } else {
      console.log('📱 OFFLINE: No cached data, showing fallback');
      return <NativeMapFallback restaurants={mapRestaurants} isOnline={isOnline} />;
    }
  }

  if (isExpoGo) {
    console.log('🧪 EXPO GO: Showing native fallback map');
    return <NativeMapFallback restaurants={mapRestaurants} isOnline={isOnline} />;
  }

  // Online and production build - use full MapBox
  console.log('🌐 ONLINE: Rendering full MapBoxWebViewComponent with', mapRestaurants.length, 'restaurants');
  return <MapBoxWebViewComponent restaurants={mapRestaurants} categories={categories} isOnline={isOnline} isTyping={isTyping} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  note: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  restaurantCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  restaurantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  restaurantEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  restaurantCategory: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  locationInfo: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  coordinates: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  distance: {
    fontSize: 12,
    color: '#2196f3',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  offlineBanner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 20,
  },
  offlineText: {
    fontSize: 16,
    color: '#c62828',
    textAlign: 'center',
  },
  locationStatusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  locationStatusContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 200,
  },
  locationStatusEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  locationStatusText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default MapBoxWebView;
