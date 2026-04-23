import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNetworkStatus, useIsOnline } from '../services/networkService';
import { syncService } from '../services/syncService';

interface OfflineMessageProps {
  style?: any;
  compact?: boolean;
}

export const OfflineMessage: React.FC<OfflineMessageProps> = ({
  style,
  compact = false
}) => {
  const isOnline = useIsOnline();
  const networkStatus = useNetworkStatus();

  // Only show for users who can use offline mode (food explorers)
  // In a real app, you'd check the user role here
  const canUseOffline = true; // For now, assume food explorer

  if (isOnline || !canUseOffline) {
    return null;
  }

  const handleManualSync = async () => {
    try {
      await syncService.forceSyncNow();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <Text style={styles.compactText}>
          📱 You're offline. Some features may be limited.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.icon}>📱</Text>
        <Text style={styles.title}>You're Offline</Text>
      </View>

      <Text style={styles.description}>
        You can still browse restaurants and view menus, but some features may be limited.
        Your ratings will be saved and synced when you're back online.
      </Text>

      <TouchableOpacity style={styles.syncButton} onPress={handleManualSync}>
        <Text style={styles.syncButtonText}>Sync Now</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  compactContainer: {
    backgroundColor: '#FFF3E0',
    padding: 8,
    marginHorizontal: 16,
    borderRadius: 4,
  },
  compactText: {
    fontSize: 12,
    color: '#E65100',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
  },
  description: {
    fontSize: 14,
    color: '#BF360C',
    lineHeight: 20,
    marginBottom: 12,
  },
  syncButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  syncButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default OfflineMessage;
