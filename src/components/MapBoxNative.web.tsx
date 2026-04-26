import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Constants from 'expo-constants';
import { Restaurant } from '../types';

// Set Mapbox Access Token
const mapboxToken = Constants.expoConfig?.extra?.mapboxAccessToken || 'YOUR_MAPBOX_TOKEN';
mapboxgl.accessToken = mapboxToken;

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    if (mapContainer.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [122.3667, 11.7167],
        zoom: 12,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || isTyping) return;

    // Update markers
    // Remove old markers that are no longer in the list
    const currentIds = new Set(restaurants.map(r => r.id));
    Object.keys(markers.current).forEach(id => {
      if (!currentIds.has(id)) {
        markers.current[id].remove();
        delete markers.current[id];
      }
    });

    // Add or update markers
    restaurants.forEach((restaurant) => {
      if (markers.current[restaurant.id]) return;

      const el = document.createElement('div');
      el.className = 'marker';
      el.style.backgroundColor = restaurant.categoryColor || '#FF0000';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.display = 'flex';
      el.style.justifyContent = 'center';
      el.style.alignItems = 'center';
      el.style.fontSize = '20px';
      el.style.cursor = 'pointer';
      el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
      el.innerHTML = restaurant.categoryEmoji || '🍽️';

      const marker = new mapboxgl.Marker(el)
        .setLngLat([restaurant.location.longitude, restaurant.location.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<h3>${restaurant.name}</h3>`))
        .addTo(map.current!);

      markers.current[restaurant.id] = marker;
    });

    // Fit bounds
    if (restaurants.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      restaurants.forEach(r => bounds.extend([r.location.longitude, r.location.latitude]));
      map.current.fitBounds(bounds, { padding: 50, duration: 1000 });
    }
  }, [restaurants, isTyping]);

  return (
    <View style={styles.container}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 12,
  },
});

export default MapBoxNative;
