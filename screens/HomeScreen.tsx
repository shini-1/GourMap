import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import MapBoxWebView from '../components/MapBoxWebView';
import CacheStatusIndicator from '../components/CacheStatusIndicator';
import RatingSyncIndicator from '../components/RatingSyncIndicator';
import EnhancedRestaurantCard from '../components/EnhancedRestaurantCard';
import RatingSortSelector, { SortOption } from '../components/RatingSortSelector';
import { reverseGeocode } from '../src/services/geocodingService';
import { resolveCategoryConfig, getAllCategoryOptions } from '../src/config/categoryConfig';
import { restaurantService } from '../src/services/restaurantService';
import { DatabaseService } from '../src/services/database';
import { RestaurantRow } from '../src/types/database';
import { crashLogger } from '../src/services/crashLogger';
import { cacheStatusService } from '../src/services/cacheStatusService';
import { ratingSyncService } from '../src/services/ratingSyncService';
import { ratingCalculationService, RestaurantRatingData } from '../src/services/ratingCalculationService';
import { useNetwork } from '../src/contexts/NetworkContext';
import { syncService } from '../src/services/syncService';
import { localDatabase } from '../src/services/localDatabase';
import { Restaurant } from '../types';

// Enhanced error boundary component with detailed debugging
class HomeScreenErrorBoundary extends React.Component<
  { children: React.ReactNode; navigation: any },
  { hasError: boolean; error?: Error; errorInfo?: React.ErrorInfo; errorStack?: string; errorMessage?: string }
> {
  constructor(props: { children: React.ReactNode; navigation: any }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Enhanced debugging for Text component errors
    const isTextError = error.message?.includes('Text strings must be rendered within a <Text>') || 
                       error.message?.includes('Text component');
    
    // Extract component stack to find exact location
    const componentStackLines = errorInfo.componentStack?.split('\n').filter(line => line.trim()) || [];
    const topComponent = componentStackLines[0] || 'Unknown';
    
    // Try to extract the problematic value from error message
    let problematicValue = 'Unknown';
    const valueMatch = error.message?.match(/Text strings must be rendered.*?([\w\s]+)/);
    if (valueMatch) {
      problematicValue = valueMatch[1];
    }
    
    console.error('\n\n========================================');
    console.error('❌ HOMESCREEN ERROR BOUNDARY - DETAILED ERROR LOG');
    console.error('========================================');
    console.error('Error Type:', isTextError ? 'TEXT_COMPONENT_ERROR' : 'GENERAL_ERROR');
    console.error('Timestamp:', new Date().toISOString());
    console.error('\n--- ERROR MESSAGE (FULL) ---');
    console.error(error.message);
    console.error('\n--- ERROR NAME ---');
    console.error(error.name);
    console.error('\n--- PROBLEMATIC VALUE ---');
    console.error('Value that caused error:', problematicValue);
    console.error('\n--- ERROR STACK (FULL) ---');
    console.error(error.stack);
    console.error('\n--- COMPONENT STACK (ALL COMPONENTS) ---');
    componentStackLines.forEach((line, index) => {
      console.error(`  ${index + 1}. ${line.trim()}`);
    });
    console.error('\n--- TOP COMPONENT WHERE ERROR OCCURRED ---');
    console.error(topComponent);
    console.error('\n--- FULL COMPONENT STACK STRING ---');
    console.error(errorInfo.componentStack);
    
    // Detailed logging for Text component errors
    if (isTextError) {
      console.error('\n--- TEXT ERROR ANALYSIS ---');
      console.error('This error occurs when non-string values are rendered as children of <Text> components.');
      console.error('\nPossible causes in this stack:');
      console.error('  1. Numbers rendered without .toString() or .toFixed()');
      console.error('  2. Undefined/null values rendered without fallback');
      console.error('  3. Objects or arrays rendered directly');
      console.error('  4. Boolean values rendered without conversion');
      console.error('  5. Optional chaining (?.) returning undefined');
      console.error('  6. Template literals with non-string interpolations');
      console.error('\nComponent hierarchy where error occurred:');
      componentStackLines.slice(0, 5).forEach((line, index) => {
        console.error(`  Level ${index + 1}: ${line.trim()}`);
      });
      console.error('\n--- SEARCH FOR THESE PATTERNS IN YOUR CODE ---');
      console.error('Look for in', topComponent, ':');
      console.error('  - {someNumber} without .toString()');
      console.error('  - {someValue?.property} without fallback');
      console.error('  - {condition && value} where value might be non-string');
      console.error('  - Template literals: `${value}` where value is not string');
    }
    console.error('========================================\n\n');

    if (crashLogger && typeof crashLogger.logError === 'function') {
      crashLogger.logError(error, {
        component: 'HomeScreen',
        screen: 'HomeScreen',
        additionalContext: {
          errorBoundary: true,
          errorInfo,
          isTextError,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 24, marginBottom: 16 }}>⚠️</Text>
          <Text style={{ fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 8 }}>
            Unable to load screen
          </Text>
          <Text style={{ fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 20 }}>
            A critical error occurred. Please restart the app.
          </Text>
          {this.state.errorMessage && (
            <View style={{ backgroundColor: '#FFE5E5', padding: 12, borderRadius: 8, marginBottom: 16, maxWidth: '90%' }}>
              <Text style={{ fontSize: 12, color: '#D32F2F', fontWeight: 'bold', marginBottom: 4 }}>Error Details:</Text>
              <Text style={{ fontSize: 11, color: '#D32F2F' }}>{this.state.errorMessage}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => this.props.navigation.goBack()}
            style={{ backgroundColor: '#4A90E2', padding: 12, borderRadius: 8 }}
          >
            <Text style={{ color: 'white', fontSize: 16 }}>Go Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              try {
                if (crashLogger && typeof crashLogger.getLogs === 'function') {
                  const logs = await crashLogger.getLogs();
                  const recentLogs = Array.isArray(logs) ? logs.slice(0, 3) : [];
                  console.log('📋 Recent crash logs:', recentLogs);
                }
                
                if (crashLogger && typeof crashLogger.getErrorSummary === 'function') {
                  const errorSummary = crashLogger.getErrorSummary();
                  Alert.alert('Debug Info', `Recent errors: ${errorSummary || 'No errors recorded'}`);
                } else {
                  Alert.alert('Debug Info', 'Error summary not available');
                }
              } catch (err) {
                console.error('❌ Error getting crash logs:', err);
                Alert.alert('Debug Info', 'Unable to retrieve error logs');
              }
            }}
            style={{ marginTop: 12, padding: 12 }}
          >
            <Text style={{ color: '#666', fontSize: 14 }}>Show Error Logs</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

interface CategorizedRestaurant extends Restaurant {
  category: string; // Override to make category required
}

// Runtime value validator for Text components
const validateTextValue = (value: any, context: string): string => {
  const timestamp = new Date().toISOString();
  
  if (value === null || value === undefined) {
    console.warn(`⚠️ [${timestamp}] NULL/UNDEFINED in Text component at ${context}:`, value);
    return '';
  }
  
  if (typeof value === 'number') {
    console.warn(`⚠️ [${timestamp}] NUMBER in Text component at ${context}:`, value, '(type:', typeof value, ')');
    console.warn(`   → Converting to string: "${value.toString()}"`);
    return value.toString();
  }
  
  if (typeof value === 'boolean') {
    console.warn(`⚠️ [${timestamp}] BOOLEAN in Text component at ${context}:`, value);
    console.warn(`   → Converting to string: "${value.toString()}"`);
    return value.toString();
  }
  
  if (typeof value === 'object') {
    console.error(`❌ [${timestamp}] OBJECT in Text component at ${context}:`, value);
    console.error(`   → This will cause an error! Object keys:`, Object.keys(value || {}));
    console.error(`   → Stack trace:`, new Error().stack);
    return '[Object]';
  }
  
  if (Array.isArray(value)) {
    console.error(`❌ [${timestamp}] ARRAY in Text component at ${context}:`, value);
    console.error(`   → This will cause an error! Array length:`, value.length);
    console.error(`   → Stack trace:`, new Error().stack);
    return '[Array]';
  }
  
  if (typeof value !== 'string') {
    console.error(`❌ [${timestamp}] UNKNOWN TYPE in Text component at ${context}:`, value, '(type:', typeof value, ')');
    console.error(`   → Stack trace:`, new Error().stack);
    return String(value);
  }
  
  return value;
};

// Design colors matching the mockup exactly
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

// Styles moved before component to fix variable declaration issues
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50, // Account for status bar
    backgroundColor: DESIGN_COLORS.background,
  },
  // New Top Navigation Bar styles matching target design
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: DESIGN_COLORS.background,
    gap: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  closeButtonIcon: {
    fontSize: 28,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
  },
  searchInputContainer: {
    flex: 1,
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    height: 40,
    justifyContent: 'center',
  },
  searchInput: {
    fontSize: 13,
    color: DESIGN_COLORS.textPrimary, // Black text
    backgroundColor: 'transparent', // Ensure no background color inheritance
    flex: 1, // Take full width of container
    fontWeight: '500', // Match category dropdown weight
    paddingVertical: 0, // Ensure proper vertical alignment
  },
  categoryDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    height: 40,
    minWidth: 120,
  },
  categoryDropdownEmoji: {
    fontSize: 13,
    marginRight: 4,
  },
  categoryDropdownText: {
    fontSize: 13,
    color: DESIGN_COLORS.textPrimary,
    fontWeight: '500',
  },
  categoryDropdownArrow: {
    fontSize: 10,
    color: DESIGN_COLORS.textPrimary,
    marginLeft: 4,
  },
  modalCloseButton: {
    marginTop: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dropdownIcon: {
    fontSize: 10,
    color: DESIGN_COLORS.textPrimary,
    marginLeft: 2,
  },
  mapContainer: {
    flex: 1,
    marginTop: 10,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    overflow: 'hidden',
    backgroundColor: DESIGN_COLORS.cardBackground,
  },
  cardsContainer: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 6,
    backgroundColor: DESIGN_COLORS.background,
  },
  card: {
    backgroundColor: DESIGN_COLORS.cardBackground,
    padding: 10,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_COLORS.textPrimary,
    marginBottom: 1,
    flex: 1,
  },
  heartIcon: {
    fontSize: 16,
    color: '#E0E0E0',
    marginLeft: 6,
  },
  cardLocation: {
    fontSize: 10,
    color: DESIGN_COLORS.textSecondary,
    marginBottom: 1,
    lineHeight: 13,
  },
  cardCategory: {
    fontSize: 10,
    color: DESIGN_COLORS.textSecondary,
    marginBottom: 3,
  },
  cardRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  cardStars: {
    fontSize: 11,
    color: '#FFD700',
    letterSpacing: 0.2,
  },
  cardRating: {
    fontSize: 10,
    color: DESIGN_COLORS.textSecondary,
    marginLeft: 3,
  },
  cardPrice: {
    fontSize: 10,
    color: DESIGN_COLORS.textPrimary,
    marginLeft: 5,
    fontWeight: '600',
  },
  favoriteButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 4,
    zIndex: 10,
  },
  favoriteIcon: {
    fontSize: 28,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 300,
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginVertical: 2,
  },
  categoryText: {
    flex: 1,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DESIGN_COLORS.cardBackground,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    color: DESIGN_COLORS.textPrimary,
  },
  footer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DESIGN_COLORS.background,
  },
  footerSpinner: {
    marginBottom: 8,
  },
  loadMoreButton: {
    backgroundColor: DESIGN_COLORS.buttonBackground,
    borderWidth: 1,
    borderColor: DESIGN_COLORS.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreButtonText: {
    color: DESIGN_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  processingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  restaurantImage: {
    width: 85,
    height: 85,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  cardTextContent: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    zIndex: 90,
  },
  backText: {
    fontSize: 35,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
  },
  searchContainer: {
    position: 'absolute',
    top: 27,
    left: 80,
    right: 20,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 90,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingRight: 40,
    backgroundColor: DESIGN_COLORS.cardBackground,
    color: DESIGN_COLORS.textPrimary,
    borderColor: DESIGN_COLORS.border,
  },
  searchIcon: {
    position: 'absolute',
    right: 16,
    fontSize: 18,
  },
  categoryButton: {
    height: 40,
    paddingHorizontal: 12,
    backgroundColor: DESIGN_COLORS.buttonBackground,
    borderWidth: 1,
    borderColor: DESIGN_COLORS.border,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 100,
  },
  categoryButtonEmoji: {
    fontSize: 16,
  },
  categoryButtonLabel: {
    fontSize: 13,
    color: DESIGN_COLORS.textPrimary,
    fontWeight: '500',
  },
});

// Default GourMap placeholder image when no restaurant image is available
const getPlaceholderImage = (): string => {
  // Use GourMap logo/branding as default placeholder
  return 'https://raw.githubusercontent.com/shini-1/GourMapExpo/main/assets/icon.png';
};

function isValidHttpUrl(value?: string): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function HomeScreen({ navigation }: { navigation: any }): React.ReactElement {
  console.log('🏠 HomeScreen: Component starting...');
  
  // Render-time debugging system
  const renderDebug = {
    logJSX: (component: string, props: any) => {
      if (props && typeof props === 'object' && Object.keys(props).length > 0) {
        console.log(`🔍 JSX Debug - ${component}:`, { props, hasText: typeof props.children === 'string' });
      }
    },
    logTextContent: (content: any, source: string) => {
      if (typeof content === 'string' && content.length > 0) {
        console.log(`📝 Text Debug - ${source}:`, { content, length: content.length, isWrapped: true });
      } else if (typeof content === 'object') {
        console.warn(`⚠️ Object Debug - ${source}:`, { content, type: typeof content, mightCauseError: true });
      }
    }
  };

  let theme: any;
  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
    
    // Additional safety check - ensure theme has required properties
    if (!theme || typeof theme !== 'object') {
      console.warn('⚠️ Theme is not a valid object, using fallback theme');
      theme = { 
        background: '#ffffff', 
        surface: '#ffffff', 
        text: '#000000', 
        textSecondary: '#666666',
        primary: '#FF00FF',
        secondary: '#F0E68C',
        border: '#E0E0E0',
        inputBackground: '#F9F9F9'
      };
    }
  } catch (themeError) {
    console.warn('⚠️ Theme context not available, using default theme');
    theme = { 
      background: '#ffffff', 
      surface: '#ffffff', 
      text: '#000000', 
      textSecondary: '#666666',
      primary: '#FF00FF',
      secondary: '#F0E68C',
      border: '#E0E0E0',
      inputBackground: '#F9F9F9'
    }; // Fallback theme
  }
  
  const { isOnline } = useNetwork();
  
  // Initialize crash logger with fallback
  const [crashLoggerReady, setCrashLoggerReady] = useState(false);
  
  // Initialize crash logger safely
  useEffect(() => {
    const initLogger = async () => {
      try {
        // Check if crashLogger exists and has initialize method
        if (crashLogger && typeof crashLogger.initialize === 'function') {
          await crashLogger.initialize();
          setCrashLoggerReady(true);
          if (typeof crashLogger.logComponentEvent === 'function') {
            crashLogger.logComponentEvent('HomeScreen', 'mount_start');
          }
        } else {
          console.warn('⚠️ Crash logger not available, skipping initialization');
          setCrashLoggerReady(false);
        }
      } catch (error) {
        console.error('❌ Failed to initialize crash logger:', error);
        setCrashLoggerReady(false);
      }
    };
    initLogger();
  }, []);
    
    const [searchText, setSearchText] = useState('');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [addressCache, setAddressCache] = useState<{[key: string]: string}>({});
    const [geocodingInProgress, setGeocodingInProgress] = useState<Set<string>>(new Set());
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [debouncedSearchText, setDebouncedSearchText] = useState('');
    const [isSearchTyping, setIsSearchTyping] = useState(false); // Track if user is actively typing
    const GEOCODE_CONCURRENCY = 3;
    const geocodeActiveRef = useRef(0);
    const geocodeQueueRef = useRef<string[]>([]);
    const queuedRef = useRef<Set<string>>(new Set());
    const autoLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLoadingRef = useRef(false);
    const refreshingRef = useRef(false);
    const hasMoreRef = useRef(true);
    const previousRestaurantCountRef = useRef(0); // Track previous count
    const SERVER_PAGE_SIZE = 20;
    const [serverPage, setServerPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingPage, setIsLoadingPage] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>('highest');
    const [restaurantRatings, setRestaurantRatings] = useState<Map<string, RestaurantRatingData>>(new Map());
    const [isProcessingRatings, setIsProcessingRatings] = useState(false);

    console.log('🏠 HomeScreen: State initialized successfully');
    if (crashLoggerReady && crashLogger && typeof crashLogger.logComponentEvent === 'function') {
      crashLogger.logComponentEvent('HomeScreen', 'state_initialized');
    }

    // Initialize cache status service
    useEffect(() => {
      const initCache = async () => {
        try {
          await cacheStatusService.loadCacheStatus();
          
          // Check if cache needs refresh (older than 24 hours)
          const status = cacheStatusService.getCurrentStatus();
          const lastUpdate = new Date(status.lastUpdated);
          const now = new Date();
          const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceUpdate > 24 || !status.isComplete) {
            console.log('🔄 Cache is stale or incomplete, starting refresh...');
            await cacheStatusService.startCacheDownload();
          } else {
            console.log('✅ Cache is up to date');
          }
        } catch (error) {
          console.error('❌ Error initializing cache status:', error);
        }
      };
      
      initCache();
    }, []);

    // Initialize rating services
    useEffect(() => {
      const initRatingServices = async () => {
        try {
          console.log('🔄 Initializing rating services...');
          
          // Initialize rating sync service
          await ratingSyncService.initialize();
          
          // Set online status (simplified - could use network status)
          ratingSyncService.setOnlineStatus(true);
          
          console.log('✅ Rating services initialized');
        } catch (error) {
          console.error('❌ Error initializing rating services:', error);
        }
      };
      
      initRatingServices();
    }, []);

    // Initialize sync service for offline data
    useEffect(() => {
      const initSyncService = async () => {
        try {
          console.log('🔄 Initializing sync service for offline support...');
          
          // Trigger initial sync to populate SQLite database
          if (isOnline) {
            await syncService.sync({ forceFullSync: false, syncRestaurants: true });
            console.log('✅ Initial sync completed');
          }
          
        } catch (error) {
          console.error('❌ Error initializing sync service:', error);
        }
      };
      
      initSyncService();
    }, [isOnline]);

    // Process restaurant ratings when restaurants change
    useEffect(() => {
      const processRatings = async () => {
        if (!restaurants || restaurants.length === 0) return;
        
        try {
          setIsProcessingRatings(true);
          console.log('🔄 Processing restaurant ratings...');
          
          const ratingData = await ratingCalculationService.processRestaurantRankings(restaurants);
          
          const ratingsMap = new Map<string, RestaurantRatingData>();
          ratingData.forEach(data => {
            ratingsMap.set(data.restaurantId, data);
          });
          
          setRestaurantRatings(ratingsMap);
          console.log(`✅ Processed ratings for ${ratingData.length} restaurants`);
        } catch (error) {
          console.error('❌ Error processing restaurant ratings:', error);
        } finally {
          setIsProcessingRatings(false);
        }
      };
      
      processRatings();
    }, [restaurants]);

  // Favorites removed for stability

  // Clear address cache to refresh with new geocoding logic
  const clearAddressCache = () => {
    setAddressCache({});
    setGeocodingInProgress(new Set());
    console.log('🗺️ Address cache cleared - addresses will be re-fetched');
  };

  // Get address for restaurant - try name parsing first, then geocoding
  const getRestaurantAddress = async (restaurant: Restaurant): Promise<string> => {
    // Check if restaurant has valid location data
    if (!restaurant.location || typeof restaurant.location.latitude !== 'number' || typeof restaurant.location.longitude !== 'number') {
      console.warn('⚠️ Restaurant missing location data:', restaurant.name, restaurant.location);
      // Try parsing address from name
      const parsedAddress = parseAddressFromName(restaurant.name);
      if (parsedAddress !== restaurant.name && parsedAddress.length > 10) {
        return `📍 ${parsedAddress}`;
      }
      return '📍 Location not available';
    }

    const cacheKey = restaurant.id;

    // Check if already cached
    if (addressCache[cacheKey]) {
      return addressCache[cacheKey];
    }

    // If geocoding is already in progress for this restaurant, return loading
    if (geocodingInProgress.has(cacheKey)) {
      return '📍 Loading address...';
    }

    // Try parsing address from name first
    const parsedAddress = parseAddressFromName(restaurant.name);
    if (parsedAddress !== restaurant.name && parsedAddress.length > 10) {
      // Name parsing gave us a reasonable address, cache and return it
      setAddressCache(prev => ({ ...prev, [cacheKey]: `📍 ${parsedAddress}` }));
      return `📍 ${parsedAddress}`;
    }

    // Fall back to reverse geocoding
    try {
      setGeocodingInProgress(prev => new Set(prev).add(cacheKey));
      
      if (typeof reverseGeocode !== 'function') {
        console.warn('⚠️ reverseGeocode is not available, using coordinates');
        const coordAddress = `${typeof restaurant.location.latitude === 'number' && !isNaN(restaurant.location.latitude) ? restaurant.location.latitude.toFixed(4) : '0.0000'}, ${typeof restaurant.location.longitude === 'number' && !isNaN(restaurant.location.longitude) ? restaurant.location.longitude.toFixed(4) : '0.0000'}`;
        setAddressCache(prev => ({ ...prev, [cacheKey]: `📍 ${coordAddress}` }));
        return `📍 ${coordAddress}`;
      }
      
      const geocodedAddress = await reverseGeocode(
        restaurant.location.latitude,
        restaurant.location.longitude
      );
      setAddressCache(prev => ({ ...prev, [cacheKey]: `📍 ${geocodedAddress}` }));
      return `📍 ${geocodedAddress}`;
    } catch (error) {
      console.warn('Failed to geocode restaurant:', restaurant.name, error);
      // Fallback to coordinates
      const coordAddress = `${typeof restaurant.location.latitude === 'number' && !isNaN(restaurant.location.latitude) ? restaurant.location.latitude.toFixed(4) : '0.0000'}, ${typeof restaurant.location.longitude === 'number' && !isNaN(restaurant.location.longitude) ? restaurant.location.longitude.toFixed(4) : '0.0000'}`;
      setAddressCache(prev => ({ ...prev, [cacheKey]: `📍 ${coordAddress}` }));
      return `📍 ${coordAddress}`;
    } finally {
      setGeocodingInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(cacheKey);
        return newSet;
      });
    }
  };

  // Get restaurant categories from centralized config
  const restaurantCategories = useMemo(() => {
    try {
      if (typeof getAllCategoryOptions === 'function') {
        return getAllCategoryOptions();
      } else {
        console.warn('⚠️ getAllCategoryOptions is not a function, using fallback');
        return [{ value: 'all', label: 'All Types', emoji: '🍽️' }];
      }
    } catch (error) {
      console.error('❌ Error getting category options:', error);
      return [{ value: 'all', label: 'All Types', emoji: '🍽️' }];
    }
  }, []);

  const loadPage = useCallback(async (targetPage: number) => {
    if (isLoadingRef.current) {
      console.log('⏳ Already loading, skipping...');
      return;
    }
    try {
      isLoadingRef.current = true;
      setIsLoadingPage(true);
      console.log(`🏠 HomeScreen: Fetching restaurants page ${targetPage} (size ${SERVER_PAGE_SIZE})`);
      
      if (crashLoggerReady && crashLogger && typeof crashLogger.logComponentEvent === 'function') {
        crashLogger.logComponentEvent('HomeScreen', 'load_page_start', { page: targetPage });
      }

      // Check if we should use offline mode (SQLite database)
      const isOffline = !isOnline;
      
      if (isOffline) {
        console.log('📱 OFFLINE MODE: Using SQLite database for restaurants');
        
        try {
          // Use SQLite database for offline data
          await DatabaseService.getDatabase(); // Ensure database is initialized
          
          const offset = (targetPage - 1) * SERVER_PAGE_SIZE;
          const localRestaurants = await DatabaseService.getRestaurants(SERVER_PAGE_SIZE, offset);
          
          // Transform SQLite data to Restaurant interface
          const restaurants: Restaurant[] = localRestaurants.map(local => ({
            id: local.id,
            name: local.name,
            location: {
              latitude: local.latitude || 40.7128, // Default to NYC if null
              longitude: local.longitude || -74.0060,
            },
            image: local.image_url || '',
            category: local.category,
            rating: local.rating || 0,
            priceRange: local.price_range || '$',
            description: local.description || '',
            phone: '', // Not stored in SQLite yet
            hours: '', // Not stored in SQLite yet
            website: '', // Not stored in SQLite yet
          }));

          // Get total count for pagination
          const stats = await DatabaseService.getDatabaseStats();
          const total = stats.restaurants;

          if (targetPage === 1) {
            setRestaurants(restaurants);
          } else if (restaurants.length > 0) {
            setRestaurants(prev => {
              const existing = new Set((prev || []).map((r: Restaurant) => r.id));
              const merged = [...(prev || []), ...restaurants.filter(r => !existing.has(r.id))];
              console.log(`📊 Set ${merged.length} restaurants (offline from SQLite)`);
              return merged;
            });
          } else if (restaurants.length === 0) {
            console.log(`🏁 No restaurants found in SQLite for page ${targetPage}`);
            setHasMore(false);
          }
          
          const more = (restaurants.length === SERVER_PAGE_SIZE) && (targetPage < Math.ceil(total / SERVER_PAGE_SIZE));
          setHasMore(more);
          console.log(`✅ Loaded ${restaurants.length} restaurants from SQLite, hasMore: ${more} (page ${targetPage})`);
          
        } catch (offlineError) {
          console.error('❌ SQLite offline error:', offlineError);
          // If SQLite fails, try to fall back to cached data or show empty state
          if (targetPage === 1) {
            setRestaurants([]);
            setHasMore(false);
          }
          throw offlineError;
        }
      } else {
        // Online mode: fetch from Supabase
        console.log('🌐 ONLINE MODE: Fetching from Supabase');

        try {
          if (!restaurantService || typeof restaurantService.getRestaurantsPageWithCount !== 'function') {
            throw new Error('Restaurant service not available');
          }
          
          const { items: serverData, total } = await restaurantService.getRestaurantsPageWithCount(targetPage, SERVER_PAGE_SIZE);
          console.log(`📊 Server returned ${serverData.length} restaurants, total: ${total}`);

          // Get locally created but not-yet-synced restaurants to show immediately
          let localUnsyncedRestaurants: Restaurant[] = [];
          try {
            await localDatabase.initialize();
            const unsyncedLocal = await localDatabase.getUnsyncedRestaurants();
            localUnsyncedRestaurants = unsyncedLocal.map(local => ({
              id: local.id,
              name: local.name,
              location: {
                latitude: local.latitude,
                longitude: local.longitude,
              },
              image: local.image || '',
              category: local.category,
              rating: local.rating || 0,
              priceRange: local.price_range || '$',
              description: local.description || '',
              phone: local.phone || '',
              hours: local.hours || '',
              website: local.website || '',
            }));
            console.log(`📱 Found ${localUnsyncedRestaurants.length} locally created restaurants to include`);
          } catch (localError) {
            console.warn('⚠️ Could not fetch local unsynced restaurants:', localError);
          }

          // Merge server data with local unsynced restaurants
          const allData = [...serverData, ...localUnsyncedRestaurants];
          const mergedData = allData.filter((item, index, self) => 
            self.findIndex(r => r.id === item.id) === index
          ); // Remove duplicates by ID

          console.log(`📊 After merging: ${mergedData.length} total restaurants (${serverData.length} from server, ${localUnsyncedRestaurants.length} local)`);

          if (targetPage === 1) {
            setRestaurants(mergedData);
          } else if (mergedData.length > serverData.length) { // We added local restaurants
            setRestaurants(prev => {
              const existing = new Set((prev || []).map((r: Restaurant) => r.id));
              const newFromServer = serverData.filter(r => r && r.id && !existing.has(r.id));
              const merged = [...(prev || []), ...newFromServer, ...localUnsyncedRestaurants];
              console.log(`📊 Set ${merged.length} restaurants (merged server + local)`);
              return merged;
            });
          } else if (serverData && serverData.length > 0) {
            setRestaurants(prev => {
              const existing = new Set((prev || []).map((r: Restaurant) => r.id));
              const merged = [...(prev || []), ...serverData.filter(r => r && r.id && !existing.has(r.id))];
              console.log(`📊 Set ${merged.length} restaurants (from server)`);
              return merged;
            });
          } else if (!serverData || serverData.length === 0) {
            // Server returned no data - no more restaurants available
            console.log(`🏁 Server returned no restaurants for page ${targetPage} - stopping pagination`);
            setHasMore(false);
          }
          
          const more = (serverData?.length === SERVER_PAGE_SIZE) || (serverData && serverData.length > 0 && targetPage < 10); // Be more aggressive about loading up to page 10
          setHasMore(more);
          console.log(`✅ Loaded ${mergedData?.length || 0} restaurants from server + local, hasMore: ${more} (page ${targetPage})`);
          
          // Cache data to SQLite for offline use (only server data)
          if (serverData && serverData.length > 0) {
            try {
              console.log('💾 Caching server data to SQLite for offline use');
              const restaurantsForCache: RestaurantRow[] = serverData.map(restaurant => ({
                id: restaurant.id,
                name: restaurant.name,
                description: restaurant.description || null,
                address: null, // We don't have address in the Restaurant interface
                latitude: restaurant.location.latitude,
                longitude: restaurant.location.longitude,
                category: restaurant.category || 'casual', // Default category if undefined
                price_range: restaurant.priceRange || null,
                rating: restaurant.rating || null,
                image_url: restaurant.image || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                _sync_status: 'synced',
                _last_modified: new Date().toISOString()
              }));
              
              await DatabaseService.saveRestaurants(restaurantsForCache);
              console.log('✅ Cached restaurants to SQLite');
            } catch (cacheError) {
              console.warn('⚠️ Failed to cache restaurants to SQLite:', cacheError);
            }
          }
          
          if (crashLoggerReady && crashLogger && typeof crashLogger.logComponentEvent === 'function') {
            crashLogger.logComponentEvent('HomeScreen', 'load_page_success', { 
              page: targetPage, 
              restaurantsCount: serverData?.length || 0,
              total,
              cachedToSQLite: true
            });
          }
        } catch (serverError) {
          console.error('❌ Server error:', serverError);
          
          if (crashLoggerReady && crashLogger && typeof crashLogger.logError === 'function') {
            await crashLogger.logError(serverError as Error, {
              component: 'HomeScreen',
              screen: 'HomeScreen',
              additionalContext: {
                phase: 'load_page_server_error',
                targetPage,
                serverPage
              }
            });
          }
          
          // Try to fall back to SQLite data if server fails
          console.log('🌐 Server failed, trying SQLite fallback');
          try {
            const offset = (targetPage - 1) * SERVER_PAGE_SIZE;
            const localRestaurants = await DatabaseService.getRestaurants(SERVER_PAGE_SIZE, offset);
            
            const restaurants: Restaurant[] = localRestaurants.map(local => ({
              id: local.id,
              name: local.name,
              location: {
                latitude: local.latitude || 40.7128, // Default to NYC if null
                longitude: local.longitude || -74.0060,
              },
              image: local.image_url || '',
              category: local.category,
              rating: local.rating || 0,
              priceRange: local.price_range || '$',
              description: local.description || '',
              phone: '', // Not stored in SQLite yet
              hours: '', // Not stored in SQLite yet
              website: '', // Not stored in SQLite yet
            }));

            if (targetPage === 1) {
              setRestaurants(restaurants);
            } else if (restaurants.length > 0) {
              setRestaurants(prev => [...(prev || []), ...restaurants]);
            }
            
            console.log(`📱 SQLite fallback: loaded ${restaurants.length} restaurants`);
          } catch (sqliteError) {
            console.error('❌ SQLite fallback also failed:', sqliteError);
            // Set empty state to prevent crashes
            if (targetPage === 1) {
              setRestaurants([]);
              setHasMore(false);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ HomeScreen: Failed to load restaurants page:', error);
      console.error('❌ Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name,
      });
      
      // Log the error for production debugging
      if (crashLoggerReady && crashLogger && typeof crashLogger.logError === 'function') {
        await crashLogger.logError(error as Error, {
          component: 'HomeScreen',
          screen: 'HomeScreen',
          additionalContext: {
            phase: 'load_page_error',
            targetPage,
            serverPage,
            restaurantsLength: restaurants?.length
          }
        });
      }
      
      Alert.alert('Connection Error', 'Unable to load restaurants. Please check your internet connection and try again.');
      // Set empty array to prevent crashes
      if (targetPage === 1) {
        setRestaurants([]);
      }
    } finally {
      setIsLoadingPage(false);
      isLoadingRef.current = false;
      if (crashLoggerReady && crashLogger && typeof crashLogger.logComponentEvent === 'function') {
        crashLogger.logComponentEvent('HomeScreen', 'load_page_end', { page: targetPage });
      }
    }
  }, [crashLoggerReady, serverPage, isOnline]);

  const onRefresh = useCallback(async () => {
    if (isLoadingPage) return;
    try {
      setRefreshing(true);
      setServerPage(1);
      setHasMore(true);
      clearAddressCache();
      geocodeActiveRef.current = 0;
      geocodeQueueRef.current = [];
      queuedRef.current.clear();
      
      // Sync ratings to Supabase before refreshing
      console.log('🔄 Syncing ratings to Supabase...');
      if (ratingSyncService) {
        try {
          // Trigger sync process by setting online status
          ratingSyncService.setOnlineStatus(true);
          console.log('✅ Ratings sync triggered');
        } catch (syncError) {
          console.warn('⚠️ Rating sync failed:', syncError);
        }
      }
      
      await loadPage(1);
    } finally {
      setRefreshing(false);
    }
  }, [loadPage, isLoadingPage]);

  // Load initial data on mount
  useEffect(() => {
    console.log('🏠 HomeScreen: Loading initial data...');

    const loadInitialData = async () => {
      try {
        console.log('🔍 Starting simplified data load...');
        
        if (crashLoggerReady && crashLogger && typeof crashLogger.logComponentEvent === 'function') {
          crashLogger.logComponentEvent('HomeScreen', 'initial_data_load_start');
        }

        setServerPage(1);
        await loadPage(1);
        
        if (crashLoggerReady && crashLogger && typeof crashLogger.logComponentEvent === 'function') {
          crashLogger.logComponentEvent('HomeScreen', 'initial_data_load_success');
        }
      } catch (error) {
        console.error('❌ Failed to load initial data:', error);
        console.error('❌ Initial load error details:', {
          message: (error as Error).message,
          stack: (error as Error).stack,
          name: (error as Error).name,
        });
        
        // Log the error for production debugging
        if (crashLoggerReady && crashLogger && typeof crashLogger.logError === 'function') {
          await crashLogger.logError(error as Error, {
            component: 'HomeScreen',
            screen: 'HomeScreen',
            additionalContext: {
              phase: 'initial_data_load'
            }
          });
        }
        
        // Set empty state to prevent crashes
        setRestaurants([]);
        setHasError(true);
        setIsLoadingPage(false);
        console.log('🛑 Set empty restaurant array to prevent crashes');
      }
    };

    // Add a small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      loadInitialData();
    }, 100);

    return () => clearTimeout(timer);
  }, [loadPage, crashLoggerReady]);

  // DISABLED: This was causing restaurant count to reset from 40 back to 20
  // useEffect(() => {
  //   if (navigation && typeof navigation.addListener === 'function') {
  //     const unsubscribe = navigation.addListener('focus', () => {
  //       console.log('🏠 HomeScreen focused - refreshing restaurants');
  //       // Refresh the first page to get updated ratings
  //       setServerPage(1);
  //       setRestaurants([]);
  //       loadPage(1);
  //     });

  //     return unsubscribe;
  //   } else {
  //     console.warn('⚠️ Navigation addListener not available');
  //     return () => {};
  //   }
  // }, [navigation, loadPage]);

  useEffect(() => {
    isLoadingRef.current = isLoadingPage;
  }, [isLoadingPage]);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  // Simplified auto-load logic - trigger when we have restaurants and more are available
  useEffect(() => {
    if (hasMore && !isLoadingPage && !refreshing && restaurants.length > 0 && restaurants.length % SERVER_PAGE_SIZE === 0) {
      console.log(`🔄 Auto-loading next page. Current: ${restaurants.length} restaurants, hasMore: ${hasMore}, SERVER_PAGE_SIZE: ${SERVER_PAGE_SIZE}`);
      console.log(`🔄 Condition met: restaurants.length % SERVER_PAGE_SIZE === 0 (${restaurants.length} % ${SERVER_PAGE_SIZE} = ${restaurants.length % SERVER_PAGE_SIZE})`);

      const nextPage = Math.floor(restaurants.length / SERVER_PAGE_SIZE) + 1;
      console.log(`📄 Loading page ${nextPage} automatically`);

      loadPage(nextPage).catch(error => {
        console.error('❌ Auto-load failed:', error);
      });
    } else if (restaurants.length > 0 && restaurants.length % SERVER_PAGE_SIZE === 0 && !hasMore) {
      // Check if we should attempt to load more even if hasMore is false
      // This handles cases where the server initially said no more but actually has more
      console.log(`🔍 Checking for more restaurants despite hasMore=false. Current: ${restaurants.length} restaurants`);

      const nextPage = Math.floor(restaurants.length / SERVER_PAGE_SIZE) + 1;
      console.log(`📄 Attempting to load page ${nextPage} to check for more restaurants`);

      loadPage(nextPage).catch(error => {
        console.log('ℹ️ No more restaurants available (expected):', error?.message || error);
      });
    } else if (restaurants.length > 0) {
      console.log(`⏸️ Auto-load skipped: hasMore=${hasMore}, isLoadingPage=${isLoadingPage}, refreshing=${refreshing}, length=${restaurants.length}, mod=${restaurants.length % SERVER_PAGE_SIZE}`);
    }
  }, [restaurants.length, hasMore, isLoadingPage, refreshing, loadPage]);

  useEffect(() => {
    const previousCount = previousRestaurantCountRef.current;
    const currentCount = restaurants.length;

    console.log('🏠 HomeScreen: Restaurants state updated:', currentCount);

    // Track significant changes
    if (previousCount !== currentCount) {
      console.log('🔄 Restaurant count changed:', {
        from: previousCount,
        to: currentCount,
        difference: currentCount - previousCount,
        hasMore,
        isLoadingPage,
        refreshing,
        serverPage
      });

      // Alert on problematic transitions
      if (currentCount < previousCount && previousCount >= 40 && currentCount <= 20) {
        console.error('🚨 CRITICAL: Restaurant count DROPPED significantly!');
        console.error('🚨 Previous:', previousCount, 'Current:', currentCount);
        console.error('🚨 This indicates data was cleared/reset - check for focus effects or state resets');
      }
    }

    previousRestaurantCountRef.current = currentCount;

    // Log restaurant count and validity instead of full objects to prevent rendering issues
    const validLocations = (restaurants || []).filter(r => r?.location?.latitude && r?.location?.longitude).length;
    console.log('📍 HomeScreen: Restaurant locations:', `${validLocations}/${restaurants.length} have valid coordinates`);

    // Track if we went from 40 back to 20
    if (restaurants.length === 20 && hasMore === false) {
      console.warn('⚠️ ALERT: Restaurants count is 20 with hasMore=false - possible data reset!');
      console.warn('⚠️ This suggests pagination stopped working or data was cleared');
    }
  }, [restaurants]);

  // Categorize restaurants using centralized config
  const categorizedRestaurants = useMemo(() => {
    if (!restaurants || restaurants.length === 0) return [];

    return restaurants
      .filter((restaurant) => {
        // Safety check - ensure restaurant has required fields
        if (!restaurant || typeof restaurant !== 'object') {
          console.warn('⚠️ Invalid restaurant object:', restaurant);
          return false;
        }
        if (!restaurant.id || typeof restaurant.id !== 'string') {
          console.warn('⚠️ Restaurant missing valid id:', restaurant);
          return false;
        }
        if (!restaurant.name || typeof restaurant.name !== 'string') {
          console.warn('⚠️ Restaurant missing valid name:', restaurant);
          return false;
        }
        return true;
      })
      .map((restaurant) => {
        try {
          const categoryConfig = typeof resolveCategoryConfig === 'function' 
            ? resolveCategoryConfig(restaurant.category, restaurant.name)
            : { name: restaurant.category || 'other', label: 'Other', emoji: '🍽️' };

          const categorized: CategorizedRestaurant = {
            id: restaurant.id,
            name: restaurant.name,
            location: restaurant.location || { latitude: 0, longitude: 0 },
            image: restaurant.image,
            category: categoryConfig.name, // Override with resolved category
            rating: restaurant.rating,
            priceRange: restaurant.priceRange,
            description: restaurant.description,
            phone: restaurant.phone,
            hours: restaurant.hours,
            website: restaurant.website,
          };

          return categorized;
        } catch (error) {
          console.error('❌ Error categorizing restaurant:', restaurant.name, error);
          // Return a safe fallback
          return {
            id: restaurant.id,
            name: restaurant.name || 'Unknown Restaurant',
            location: { latitude: 0, longitude: 0 },
            image: undefined,
            category: 'casual', // Fallback category
            rating: undefined,
            priceRange: undefined,
            description: undefined,
            phone: undefined,
            hours: undefined,
            website: undefined,
          } as CategorizedRestaurant;
        }
      })
      .filter((restaurant) => restaurant && restaurant.id && restaurant.name); // Final safety filter
  }, [restaurants]);

  const parseAddressFromName = (fullName: string): string => {
    const parts = fullName.split(', ');
    if (parts.length >= 2) {
      // Remove the restaurant name (first part) and return the address
      const addressParts = parts.slice(1);
      return addressParts.join(', ');
    }
    return fullName; // Fallback to full name if parsing fails
  };

  const filteredRestaurants = useMemo(() => {
    if (!categorizedRestaurants || !Array.isArray(categorizedRestaurants)) {
      return [];
    }

    // Early return for empty search
    if (!debouncedSearchText.trim()) {
      return selectedCategory === 'all' 
        ? categorizedRestaurants 
        : categorizedRestaurants.filter(r => r.category === selectedCategory);
    }

    const searchTerm = debouncedSearchText.toLowerCase().trim();

    return categorizedRestaurants.filter((restaurant) => {
      // Safety check - ensure restaurant is valid
      if (!restaurant || typeof restaurant !== 'object') {
        return false;
      }
      if (!restaurant.name || typeof restaurant.name !== 'string') {
        return false;
      }

      // Category filter
      const matchesCategory = selectedCategory === 'all' || restaurant.category === selectedCategory;
      if (!matchesCategory) return false;

      // Text search filter - only if search term exists
      if (searchTerm) {
        const nameMatch = restaurant.name.toLowerCase().includes(searchTerm);
        const categoryMatch = restaurant.category?.toLowerCase().includes(searchTerm);
        const descriptionMatch = restaurant.description?.toLowerCase().includes(searchTerm);
        
        return nameMatch || categoryMatch || descriptionMatch;
      }

      return true;
    });
  }, [categorizedRestaurants, debouncedSearchText, selectedCategory]);

  const visibleRestaurants = useMemo(() => {
    // Safety check - ensure we always return an array
    if (!filteredRestaurants || !Array.isArray(filteredRestaurants)) {
      return [];
    }

    // Separate restaurants into two groups: with ratings and without ratings
    const restaurantsWithRatings = filteredRestaurants.filter(restaurant => 
      restaurant && typeof restaurant.rating === 'number' && restaurant.rating > 0
    );
    const restaurantsWithoutRatings = filteredRestaurants.filter(restaurant => 
      !restaurant || typeof restaurant.rating !== 'number' || restaurant.rating <= 0
    );

    console.log(`📊 Sorting ${restaurantsWithRatings.length} rated restaurants and ${restaurantsWithoutRatings.length} unrated restaurants`);

    // Function to apply sorting to a restaurant array
    const applySorting = (restaurants: CategorizedRestaurant[]): CategorizedRestaurant[] => {
      let sortedRestaurants = [...restaurants];
      
      if (sortBy === 'highest' || sortBy === 'lowest' || sortBy === 'trending' || sortBy === 'mostReviewed') {
        // Use rating calculation service for sorting
        sortedRestaurants = ratingCalculationService.sortRestaurantsByRating(restaurants, sortBy);
      } else if (sortBy === 'newest') {
        // Sort by newest (would need timestamp data - using reverse order for now)
        sortedRestaurants.reverse();
      } else if (sortBy === 'name') {
        // Sort alphabetically
        sortedRestaurants.sort((a, b) => a.name.localeCompare(b.name));
      }

      return sortedRestaurants;
    };

    // Apply sorting to each group separately
    const sortedWithRatings = applySorting(restaurantsWithRatings);
    const sortedWithoutRatings = applySorting(restaurantsWithoutRatings);

    // Combine groups with rated restaurants first
    return [...sortedWithRatings, ...sortedWithoutRatings];
  }, [filteredRestaurants, sortBy]);

  useEffect(() => {
    const h = setTimeout(() => {
      setDebouncedSearchText(searchText);
      setIsSearchTyping(false); // Reset typing state after debounce
    }, 300);
    return () => clearTimeout(h);
  }, [searchText]);

  useEffect(() => {
    geocodeActiveRef.current = 0;
    geocodeQueueRef.current = [];
    queuedRef.current.clear();
  }, [debouncedSearchText, selectedCategory]);

  useEffect(() => {
    const processQueue = () => {
      while (geocodeActiveRef.current < GEOCODE_CONCURRENCY && geocodeQueueRef.current.length > 0) {
        const id = geocodeQueueRef.current.shift() as string;
        if (!id) continue;
        
        const restaurant = visibleRestaurants.find(r => r && r.id === id);
        if (!restaurant) {
          queuedRef.current.delete(id);
          continue;
        }
        
        // Additional safety check for restaurant location
        if (!restaurant.location || typeof restaurant.location.latitude !== 'number' || typeof restaurant.location.longitude !== 'number') {
          console.warn('⚠️ Restaurant missing valid location for geocoding:', restaurant.name);
          queuedRef.current.delete(id);
          continue;
        }
        
        geocodeActiveRef.current += 1;
        getRestaurantAddress(restaurant)
          .catch((error) => {
            console.warn('⚠️ Geocoding failed for restaurant:', restaurant.name, error);
          })
          .finally(() => {
            geocodeActiveRef.current -= 1;
            queuedRef.current.delete(id);
            processQueue();
          });
      }
    };

    const toQueue = visibleRestaurants
      .filter(r => r && r.id && !addressCache[r.id] && !geocodingInProgress.has(r.id) && !queuedRef.current.has(r.id))
      .map(r => r.id);

    if (toQueue.length > 0) {
      toQueue.forEach(id => {
        geocodeQueueRef.current.push(id);
        queuedRef.current.add(id);
      });
      processQueue();
    }
  }, [visibleRestaurants, addressCache, geocodingInProgress]);

  // Using EnhancedRestaurantCard for all restaurant display - single source of truth for card rendering

  const renderListFooter = useCallback(() => {
    if (!hasMore && !isLoadingPage) {
      return <View style={{ height: 16 }} />;
    }

    if (isLoadingPage) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator style={styles.footerSpinner} color="#4A90E2" size="small" />
          <Text style={styles.loadingText}>Loading more restaurants...</Text>
        </View>
      );
    }

    // No manual load more button - continuous loading happens automatically
    return <View style={{ height: 20 }} />;
  }, [hasMore, isLoadingPage]);

  // Error boundary - show error screen if something went wrong
  if (hasError) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ fontSize: 24, marginBottom: 16 }}>\u26a0\ufe0f</Text>
        <Text style={{ fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 8 }}>
          Something went wrong
        </Text>
        <Text style={{ fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 20 }}>
          The app encountered an error. Please try again.
        </Text>
        <TouchableOpacity
          onPress={() => {
            setHasError(false);
            setRestaurants([]);
            setIsLoadingPage(false);
            // Retry loading
            loadPage(1);
          }}
          style={{ backgroundColor: '#4A90E2', padding: 12, borderRadius: 8 }}
        >
          <Text style={{ color: 'white', fontSize: 16 }}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop: 12, padding: 12 }}
        >
          <Text style={{ color: '#666', fontSize: 14 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show loading screen if still loading first page
  if (isLoadingPage && restaurants.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading restaurants...</Text>
      </View>
    );
  }
  
  // Safety check - if no restaurants and not loading, show empty state
  if (!isLoadingPage && restaurants.length === 0) {
    return (
      <View style={styles.container}>
        <Header />
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, color: '#666', textAlign: 'center' }}>
            No restaurants found.
          </Text>
          <Text style={{ fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center' }}>
            Pull down to refresh or check your connection.
          </Text>
          <TouchableOpacity
            onPress={async () => {
              console.log('🔄 Force refresh triggered');
              const isDbReady = DatabaseService.isDatabaseReady();
              console.log('📊 Database ready:', isDbReady);

              const stats = await DatabaseService.getDatabaseStats();
              console.log('📊 Database stats:', stats);

              // Force reload page 1
              await loadPage(1);
            }}
            style={{ marginTop: 16, padding: 12, backgroundColor: '#4A90E2', borderRadius: 8 }}
          >
            <Text style={{ color: 'white', fontSize: 16 }}>🔄 Force Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Final safety check before rendering
  // Prevent rendering if we're in an invalid state
  if (!restaurants || !Array.isArray(restaurants)) {
    console.warn('⚠️ Invalid restaurants state, showing loading');
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading restaurants...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar - X button, Search, Category Filter */}
      <View style={styles.topNavBar}>
        <TouchableOpacity
          onPress={() => {
            if (navigation && typeof navigation.goBack === 'function') {
              navigation.goBack();
            } else {
              console.warn('⚠️ Navigation goBack not available');
            }
          }}
          style={styles.closeButton}
        >
          <Text style={styles.closeButtonIcon}>✕</Text>
        </TouchableOpacity>
        
        <View style={styles.searchInputContainer}>
          <TextInput
            placeholder="Search restaurants..."
            value={searchText}
            onChangeText={(text) => {
              setSearchText(text);
              setIsSearchTyping(true); // Mark as actively typing
            }}
            style={styles.searchInput}
            placeholderTextColor={DESIGN_COLORS.textPlaceholder}
          />
        </View>
        
        <TouchableOpacity
          style={styles.categoryDropdown}
          onPress={() => setShowCategoryModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.categoryDropdownEmoji}>
            {(() => {
              const category = restaurantCategories.find(c => c.value === selectedCategory);
              return category?.emoji || '🍽️';
            })()}
          </Text>
          <Text style={styles.categoryDropdownText}>
            {(() => {
              const category = restaurantCategories.find(c => c.value === selectedCategory);
              return category?.label || 'All Types';
            })()}
          </Text>
          <Text style={styles.categoryDropdownArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme?.surface || DESIGN_COLORS.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: theme?.text || DESIGN_COLORS.textPrimary }]}>Filter by Type</Text>
            <FlatList
              data={restaurantCategories}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedCategory(item.value);
                    setShowCategoryModal(false);
                  }}
                  style={[
                    styles.categoryOption,
                    selectedCategory === item.value && { backgroundColor: (theme?.primary || DESIGN_COLORS.infoBg) + '20' }
                  ]}
                >
                  <Text style={{ fontSize: 18, marginRight: 10 }}>
                    {validateTextValue(item.emoji, `HomeScreen.categoryModal.emoji[${item.value}]`)}
                  </Text>
                  <Text style={[styles.categoryText, { color: theme?.text || DESIGN_COLORS.textPrimary }]}>
                    {validateTextValue(item.label, `HomeScreen.categoryModal.label[${item.value}]`)}
                  </Text>
                  {selectedCategory === item.value && (
                    <Text style={{ color: theme?.primary || DESIGN_COLORS.infoBg, fontSize: 16 }}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 300 }}
            />
            <TouchableOpacity
              onPress={() => setShowCategoryModal(false)}
              style={[styles.modalCloseButton, { backgroundColor: theme?.primary || DESIGN_COLORS.infoBg }]}
            >
              <Text style={[styles.modalCloseButtonText, { color: theme?.background || DESIGN_COLORS.infoText }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        {visibleRestaurants && visibleRestaurants.length > 0 && visibleRestaurants.every(r => r && r.id && r.location) ? (
          <MapBoxWebView restaurants={visibleRestaurants as CategorizedRestaurant[]} isTyping={isSearchTyping} />
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>
              {restaurants.length === 0 ? '🔄 Loading restaurants...' : '🔍 No restaurants match your search'}
            </Text>
          </View>
        )}
      </View>
      
      {/* Restaurant Cards List */}

      <FlatList
        style={styles.cardsContainer}
        data={visibleRestaurants || []}
        keyExtractor={(item, index) => {
          // Safety check - ensure we have a valid key
          if (!item || !item.id) {
            return `fallback-key-${index}`;
          }
          return item.id;
        }}
        renderItem={({ item }) => {
          try {
            // Validate item data before rendering
            if (!item || !item.id) {
              console.error('❌ Invalid restaurant item:', item);
              return null;
            }

            const ratingData = restaurantRatings.get(item.id);
            
            return (
              <EnhancedRestaurantCard
                restaurant={item as CategorizedRestaurant}
                ratingData={ratingData}
                parsedAddress={addressCache[item.id] ? addressCache[item.id].replace('📍 ', '') : undefined}
                onPress={() => {
                  if (item.id && navigation && typeof navigation.navigate === 'function') {
                    navigation.navigate('RestaurantDetail', {
                      restaurantId: item.id,
                      restaurant: item
                    });
                  } else if (!item.id) {
                    console.warn('⚠️ Restaurant missing ID, cannot navigate');
                  } else {
                    console.warn('⚠️ Navigation not available, cannot navigate to restaurant details');
                  }
                }}
                showSyncStatus={true}
                showRanking={true}
                navigation={navigation}
              />
            );
          } catch (error) {
            console.error('❌ Error rendering restaurant card:', {
              restaurantId: item?.id,
              restaurantName: item?.name,
              error: error instanceof Error ? error.message : error,
              stack: error instanceof Error ? error.stack : undefined
            });
            return (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Error loading restaurant</Text>
                <Text style={styles.cardLocation}>
                  {item?.name || 'Unknown restaurant'}
                </Text>
              </View>
            );
          }
        }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={() => {
          // More aggressive continuous loading
          if (isLoadingPage || refreshing) return;

          if (hasMore && restaurants.length > 0) {
            console.log(`🔄 Continuous loading: ${restaurants.length} restaurants loaded, loading more...`);
            setServerPage((sp) => {
              const next = sp + 1;
              loadPage(next);
              return next;
            });
          }
        }}
        onEndReachedThreshold={0.3} // Increased from 0.1 to 0.3 for smoother continuous loading
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={3}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {restaurants.length === 0 ? 'No restaurants loaded yet' : 'No restaurants match your search'}
            </Text>
          </View>
        }
        ListFooterComponent={renderListFooter}
      />
    </View>
  );
  
  // Fallback return - this should never be reached but satisfies TypeScript
  return <View style={styles.container} />;
}

export default function HomeScreenWrapper({ navigation }: { navigation: any }) {
  return (
    <HomeScreenErrorBoundary navigation={navigation}>
      <HomeScreen navigation={navigation} />
    </HomeScreenErrorBoundary>
  );
}
