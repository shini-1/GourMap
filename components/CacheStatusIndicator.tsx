import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { cacheStatusService, CacheStatus } from '../src/services/cacheStatusService';

interface CacheStatusIndicatorProps {
  onPress?: () => void;
  showDetails?: boolean;
}

const CacheStatusIndicator: React.FC<CacheStatusIndicatorProps> = ({ 
  onPress, 
  showDetails = false 
}) => {
  const { theme } = useTheme();
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({
    isDownloading: false,
    downloadProgress: 0,
    totalItems: 0,
    downloadedItems: 0,
    cacheSize: 0,
    lastUpdated: new Date().toISOString(),
    isComplete: false
  });
  const [animatedProgress] = useState(new Animated.Value(0));

  useEffect(() => {
    // Subscribe to cache status changes
    const unsubscribe = cacheStatusService.subscribe(setCacheStatus);
    
    // Load initial status
    cacheStatusService.loadCacheStatus();
    
    return unsubscribe;
  }, []);

  // Animate progress bar
  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: cacheStatus.downloadProgress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [cacheStatus.downloadProgress]);

  const getStatusColor = (): string => {
    if (cacheStatus.error) return '#FF6B6B';
    if (cacheStatus.isDownloading) return '#4ECDC4';
    if (cacheStatus.isComplete) return '#51CF66';
    return '#868E96';
  };

  const getStatusText = (): string => {
    if (cacheStatus.error) return 'Cache Error';
    if (cacheStatus.isDownloading) {
      const progress = typeof cacheStatus.downloadProgress === 'number' ? Math.round(cacheStatus.downloadProgress) : 0;
      return `Downloading... ${progress}%`;
    }
    if (cacheStatus.isComplete) return 'Offline Ready';
    return 'No Cache';
  };

  const getStatusIcon = (): string => {
    if (cacheStatus.error) return '⚠️';
    if (cacheStatus.isDownloading) return '⬇️';
    if (cacheStatus.isComplete) return '✅';
    return '☁️';
  };

  const formatCacheSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress ? { onPress } : {};

  return (
    <Container {...containerProps} style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.statusRow}>
        <View style={styles.iconTextRow}>
          <Text style={styles.icon}>{getStatusIcon()}</Text>
          <View style={styles.textContainer}>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
            {showDetails && (
              <Text style={[styles.detailsText, { color: theme.textSecondary }]}>
                {(cacheStatus.downloadedItems || 0)} / {(cacheStatus.totalItems || 0)} items
                {cacheStatus.cacheSize > 0 ? ` • ${formatCacheSize(cacheStatus.cacheSize)}` : ''}
              </Text>
            )}
          </View>
        </View>
        
        {cacheStatus.isDownloading && (
          <View style={styles.progressContainer}>
            <Text style={[styles.progressText, { color: theme.textSecondary }]}>
              {typeof cacheStatus.downloadProgress === 'number' && !isNaN(cacheStatus.downloadProgress) ? Math.round(cacheStatus.downloadProgress) : 0}%
            </Text>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      {cacheStatus.isDownloading && (
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarBackground, { backgroundColor: theme.border }]}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: getStatusColor(),
                  width: animatedProgress.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Error Message */}
      {cacheStatus.error && (
        <Text style={[styles.errorText, { color: '#FF6B6B' }]}>
          {cacheStatus.error}
        </Text>
      )}

      {/* Offline Ready Badge */}
      {cacheStatus.isComplete && !cacheStatus.isDownloading && (
        <View style={[styles.offlineBadge, { backgroundColor: '#51CF66' }]}>
          <Text style={styles.offlineBadgeText}>Offline Mode Available</Text>
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
  icon: {
    fontSize: 16,
    marginRight: 8,
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
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBackground: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  offlineBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  offlineBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default CacheStatusIndicator;
