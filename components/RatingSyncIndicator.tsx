import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ratingSyncService, RatingSyncStatus } from '../src/services/ratingSyncService';

interface RatingSyncIndicatorProps {
  onPress?: () => void;
  showDetails?: boolean;
  compact?: boolean;
}

const RatingSyncIndicator: React.FC<RatingSyncIndicatorProps> = ({ 
  onPress, 
  showDetails = false,
  compact = false
}) => {
  const { theme } = useTheme();
  const [syncStatus, setSyncStatus] = useState<RatingSyncStatus>({
    status: 'idle',
    queueLength: 0,
    conflictsCount: 0,
    isOnline: true
  });
  const [animatedRotation] = useState(new Animated.Value(0));

  useEffect(() => {
    // Subscribe to rating sync status changes
    const unsubscribe = ratingSyncService.subscribe(setSyncStatus);
    
    // Initialize sync service
    ratingSyncService.initialize();
    
    return unsubscribe;
  }, []);

  // Animate sync icon when syncing
  useEffect(() => {
    if (syncStatus.status === 'syncing') {
      const rotationAnimation = Animated.loop(
        Animated.timing(animatedRotation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      rotationAnimation.start();
      
      return () => rotationAnimation.stop();
    } else {
      animatedRotation.setValue(0);
    }
  }, [syncStatus.status]);

  const getStatusColor = (): string => {
    if (syncStatus.status === 'error') return '#FF6B6B';
    if (syncStatus.status === 'syncing') return '#4ECDC4';
    if (syncStatus.queueLength > 0) return '#FFD93D';
    if (syncStatus.conflictsCount && syncStatus.conflictsCount > 0) return '#FF6B6B';
    return '#51CF66';
  };

  const getStatusText = (): string => {
    if (syncStatus.status === 'error') return 'Sync Error';
    if (syncStatus.status === 'syncing') return 'Syncing...';
    if (syncStatus.queueLength > 0) return `${(syncStatus.queueLength || 0)} Pending`;
    if (syncStatus.conflictsCount && syncStatus.conflictsCount > 0) return `${(syncStatus.conflictsCount || 0)} Conflicts`;
    if (!syncStatus.isOnline) return 'Offline';
    return 'Synced';
  };

  const getStatusIcon = (): string => {
    if (syncStatus.status === 'error') return '⚠️';
    if (syncStatus.status === 'syncing') return '🔄';
    if (syncStatus.queueLength > 0) return '⏳';
    if (syncStatus.conflictsCount && syncStatus.conflictsCount > 0) return '⚠️';
    if (!syncStatus.isOnline) return '📵';
    return '✅';
  };

  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress ? { onPress } : {};

  if (compact) {
    return (
      <Container {...containerProps} style={[styles.compactContainer, { backgroundColor: theme.surface }]}>
        <Animated.View
          style={[
            styles.compactIcon,
            {
              transform: [{
                rotate: animatedRotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                })
              }]
            }
          ]}
        >
          <Text style={styles.compactIconText}>{getStatusIcon()}</Text>
        </Animated.View>
        {syncStatus.queueLength > 0 && (
          <View style={[styles.compactBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.compactBadgeText}>{(syncStatus.queueLength || 0)}</Text>
          </View>
        )}
      </Container>
    );
  }

  return (
    <Container {...containerProps} style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.statusRow}>
        <View style={styles.iconTextRow}>
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{
                  rotate: animatedRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  })
                }]
              }
            ]}
          >
            <Text style={styles.icon}>{getStatusIcon()}</Text>
          </Animated.View>
          <View style={styles.textContainer}>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
            {showDetails && (
              <Text style={[styles.detailsText, { color: theme.textSecondary }]}>
                {(syncStatus.queueLength || 0)} pending • {(syncStatus.conflictsCount || 0)} conflicts
                {!syncStatus.isOnline ? ' • Offline mode' : ''}
              </Text>
            )}
          </View>
        </View>
        
        {syncStatus.status === 'syncing' && (
          <ActivityIndicator size="small" color={getStatusColor()} />
        )}
      </View>

      {/* Sync Progress Bar */}
      {syncStatus.status === 'syncing' && syncStatus.queueLength > 0 && (
        <View style={styles.progressContainer}>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
            Syncing ratings...
          </Text>
        </View>
      )}

      {/* Conflicts Warning */}
      {syncStatus.conflictsCount && syncStatus.conflictsCount > 0 && (
        <View style={[styles.conflictWarning, { backgroundColor: '#FFE5E5' }]}>
          <Text style={styles.conflictText}>
            ⚠️ {(syncStatus.conflictsCount || 0)} rating conflict{syncStatus.conflictsCount > 1 ? 's' : ''} need resolution
          </Text>
        </View>
      )}

      {/* Error Message */}
      {syncStatus.status === 'error' && syncStatus.error && (
        <Text style={[styles.errorText, { color: '#FF6B6B' }]}>
          {syncStatus.error}
        </Text>
      )}

      {/* Offline Indicator */}
      {!syncStatus.isOnline && (
        <View style={[styles.offlineIndicator, { backgroundColor: '#FFF3CD' }]}>
          <Text style={styles.offlineText}>
            📵 Offline - Ratings will sync when connection is restored
          </Text>
        </View>
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  compactContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    position: 'relative',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: 8,
  },
  icon: {
    fontSize: 16,
  },
  compactIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactIconText: {
    fontSize: 16,
  },
  compactBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailsText: {
    fontSize: 12,
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  conflictWarning: {
    marginTop: 8,
    padding: 8,
    borderRadius: 4,
  },
  conflictText: {
    fontSize: 12,
    color: '#8B4513',
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  offlineIndicator: {
    marginTop: 8,
    padding: 8,
    borderRadius: 4,
  },
  offlineText: {
    fontSize: 12,
    color: '#856404',
  },
});

export default RatingSyncIndicator;
