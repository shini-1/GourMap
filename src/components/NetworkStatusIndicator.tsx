import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '../services/networkService';

interface NetworkStatusIndicatorProps {
  showText?: boolean;
  style?: any;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  showText = true,
  style
}) => {
  const networkStatus = useNetworkStatus();

  const getStatusConfig = () => {
    switch (networkStatus) {
      case 'online':
        return {
          color: '#4CAF50',
          text: 'Online',
          icon: '●'
        };
      case 'offline':
        return {
          color: '#F44336',
          text: 'Offline',
          icon: '●'
        };
      default:
        return {
          color: '#FF9800',
          text: 'Checking...',
          icon: '○'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.icon, { color: config.color }]}>
        {config.icon}
      </Text>
      {showText && (
        <Text style={[styles.text, { color: config.color }]}>
          {config.text}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  icon: {
    fontSize: 12,
    marginRight: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default NetworkStatusIndicator;
