import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNetwork } from '../src/contexts/NetworkContext';
import { OfflineQueueService } from '../src/services/offlineQueueService';

interface OfflineBannerProps {
  onSyncPress?: () => void;
}

export default function OfflineBanner({ onSyncPress }: OfflineBannerProps) {
  const { isOnline } = useNetwork();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadPendingCount();
    
    // Check pending count every 5 seconds
    const interval = setInterval(loadPendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadPendingCount = async () => {
    try {
      const count = await OfflineQueueService.getPendingCount();
      setPendingCount(count);
    } catch (error) {
      console.error('❌ Failed to load pending count:', error);
      setPendingCount(0);
    }
  };

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    try {
      await OfflineQueueService.processQueue();
      await loadPendingCount();
      onSyncPress?.();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      console.log('📡 Back online - auto-syncing queued actions');
      handleSync();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, pendingCount]);

  if (isOnline && pendingCount === 0) {
    return null; // Don't show banner when online and no pending actions
  }

  return (
    <View style={[
      styles.banner,
      { backgroundColor: isOnline ? '#4CAF50' : '#FF9800' }
    ]}>
      <View style={styles.content}>
        {!isOnline && (
          <Text style={styles.icon}>📡</Text>
        )}
        <View style={styles.textContainer}>
          <Text style={styles.text}>
            {!isOnline 
              ? 'Offline Mode - Using cached data'
              : pendingCount > 0
                ? `${pendingCount} action${pendingCount > 1 ? 's' : ''} pending sync`
                : 'Connected'
            }
          </Text>
          {!isOnline && (
            <Text style={styles.subtext}>
              Changes will sync when connection is restored
            </Text>
          )}
        </View>
        
        {isOnline && pendingCount > 0 && (
          <TouchableOpacity 
            style={styles.syncButton}
            onPress={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.syncButtonText}>Sync Now</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  subtext: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  syncButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
