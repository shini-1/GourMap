import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import Constants from 'expo-constants';
import { Restaurant } from '../types';

// Set Mapbox Access Token
const mapboxToken = Constants.expoConfig?.extra?.mapboxAccessToken || 'YOUR_MAPBOX_TOKEN';
MapboxGL.setAccessToken(mapboxToken);

interface CategorizedRestaurant extends Restaurant {
  categoryLabel?: string;
  categoryEmoji?: string;
  categoryColor?: string;
}

interface MapBoxNativeProps {
  restaurants: CategorizedRestaurant[];
  isTyping?: boolean;
}

const MapBoxNative: React.FC<MapBoxNativeProps> = ({ restaurants, isTyping = false }) => {
  const camera = useRef<MapboxGL.Camera>(null);
  const [userLocation, setUserLocation] = useState<number[] | null>(null);

  useEffect(() => {
    // Zoom to fit all markers when restaurants change
    if (restaurants.length > 0 && !isTyping) {
      const bounds = getBounds(restaurants);
      if (bounds) {
        camera.current?.fitBounds(
          bounds.ne,
          bounds.sw,
          [50, 50, 50, 50], // padding
          1000 // animation duration
        );
      }
    }
  }, [restaurants, isTyping]);

  const getBounds = (items: Restaurant[]) => {
    if (items.length === 0) return null;

    let minLat = items[0].location.latitude;
    let maxLat = items[0].location.latitude;
    let minLng = items[0].location.longitude;
    let maxLng = items[0].location.longitude;

    items.forEach((item) => {
      minLat = Math.min(minLat, item.location.latitude);
      maxLat = Math.max(maxLat, item.location.latitude);
      minLng = Math.min(minLng, item.location.longitude);
      maxLng = Math.max(maxLng, item.location.longitude);
    });

    return {
      ne: [maxLng, maxLat],
      sw: [minLng, minLat],
    };
  };

  const handleLocationPress = () => {
    if (userLocation) {
      camera.current?.setCamera({
        centerCoordinate: userLocation,
        zoomLevel: 15,
        animationDuration: 1000,
      });
    } else {
      Alert.alert('Location not found', 'Make sure location services are enabled.');
    }
  };

  return (
    <View style={styles.container}>
      <MapboxGL.MapView style={styles.map} styleURL={MapboxGL.StyleURL.Street}>
        <MapboxGL.Camera ref={camera} zoomLevel={12} centerCoordinate={[122.3667, 11.7167]} />
        
        <MapboxGL.UserLocation onUpdate={(location) => setUserLocation([location.coords.longitude, location.coords.latitude])} />

        {restaurants.map((restaurant) => (
          <MapboxGL.PointAnnotation
            key={restaurant.id}
            id={restaurant.id}
            coordinate={[restaurant.location.longitude, restaurant.location.latitude]}
            title={restaurant.name}
          >
            <View style={[styles.marker, { backgroundColor: restaurant.categoryColor || '#FF0000' }]}>
              <Text style={styles.markerEmoji}>{restaurant.categoryEmoji || '🍽️'}</Text>
            </View>
            <MapboxGL.Callout title={restaurant.name} />
          </MapboxGL.PointAnnotation>
        ))}
      </MapboxGL.MapView>

      <TouchableOpacity style={styles.locationButton} onPress={handleLocationPress}>
        <Text style={styles.locationButtonText}>📍</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 12,
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  markerEmoji: {
    fontSize: 20,
  },
  locationButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 48,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  locationButtonText: {
    fontSize: 20,
  },
});

export default MapBoxNative;
