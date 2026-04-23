import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface MapControlsProps {
  onInfoPress?: () => void;
  markerCount?: number;
}

function MapControls({
  onInfoPress,
  markerCount = 0,
}: MapControlsProps) {
  return (
    <TouchableOpacity
      style={styles.infoButton}
      onPress={onInfoPress}
      activeOpacity={0.7}
    >
      <Text style={styles.infoButtonText}>i</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  infoButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 32,
    height: 32,
    backgroundColor: '#000000',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  infoButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default MapControls;
