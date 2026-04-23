import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';
import { DESIGN_COLORS, SHADOW_STYLE, BORDER_RADIUS } from '../src/config/designColors';

interface StatisticCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
}

interface BusinessStatisticsScreenProps {
  navigation: any;
  route?: {
    params?: {
      restaurantId?: string;
    };
  };
}

function BusinessStatisticsScreen({ navigation, route }: BusinessStatisticsScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<StatisticCard[]>([]);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      // TODO: Fetch actual statistics from backend
      const mockStats: StatisticCard[] = [
        {
          title: 'Total Orders',
          value: '1,234',
          subtitle: '+12% this month',
          icon: '📦',
          color: '#007AFF',
        },
        {
          title: 'Revenue',
          value: '₱45,678',
          subtitle: '+8% this month',
          icon: '💰',
          color: '#28a745',
        },
        {
          title: 'Average Rating',
          value: '4.8',
          subtitle: 'Based on 342 reviews',
          icon: '⭐',
          color: '#FFD700',
        },
        {
          title: 'Active Menu Items',
          value: '28',
          subtitle: '5 out of stock',
          icon: '🍽️',
          color: '#FF6B6B',
        },
        {
          title: 'Customer Satisfaction',
          value: '92%',
          subtitle: 'Positive feedback',
          icon: '😊',
          color: '#6C5CE7',
        },
        {
          title: 'Active Promotions',
          value: '3',
          subtitle: '2 ending soon',
          icon: '🎉',
          color: '#A29BFE',
        },
      ];
      setStatistics(mockStats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatisticCard = ({ stat }: { stat: StatisticCard }) => (
    <View style={[styles.statisticCard, { ...SHADOW_STYLE }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{stat.icon}</Text>
        <Text style={styles.cardTitle}>{stat.title}</Text>
      </View>
      <Text style={[styles.cardValue, { color: stat.color }]}>{stat.value}</Text>
      {stat.subtitle && <Text style={styles.cardSubtitle}>{stat.subtitle}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { top: insets.top + 10 }]}
        >
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Business Statistics</Text>
        <Text style={styles.subtitle}>Your restaurant performance overview</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={DESIGN_COLORS.textPrimary} />
            <Text style={styles.loadingText}>Loading statistics...</Text>
          </View>
        ) : (
          <>
            {/* Summary Cards Grid */}
            <View style={styles.cardsGrid}>
              {statistics.map((stat, index) => (
                <StatisticCard key={index} stat={stat} />
              ))}
            </View>

            {/* Performance Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Performance Trends</Text>
              <View style={styles.trendCard}>
                <View style={styles.trendRow}>
                  <Text style={styles.trendLabel}>Today's Orders</Text>
                  <Text style={styles.trendValue}>24</Text>
                </View>
                <View style={styles.trendBar}>
                  <View style={[styles.trendFill, { width: '60%' }]} />
                </View>
              </View>

              <View style={styles.trendCard}>
                <View style={styles.trendRow}>
                  <Text style={styles.trendLabel}>This Week</Text>
                  <Text style={styles.trendValue}>156</Text>
                </View>
                <View style={styles.trendBar}>
                  <View style={[styles.trendFill, { width: '85%' }]} />
                </View>
              </View>

              <View style={styles.trendCard}>
                <View style={styles.trendRow}>
                  <Text style={styles.trendLabel}>This Month</Text>
                  <Text style={styles.trendValue}>1,234</Text>
                </View>
                <View style={styles.trendBar}>
                  <View style={[styles.trendFill, { width: '100%' }]} />
                </View>
              </View>
            </View>

            {/* Top Menu Items */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Menu Items</Text>
              {[
                { name: 'Margherita Pizza', orders: 156, revenue: '₱3,900' },
                { name: 'Caesar Salad', orders: 128, revenue: '₱1,152' },
                { name: 'Grilled Chicken', orders: 98, revenue: '₱1,568' },
              ].map((item, index) => (
                <View key={index} style={styles.menuItemRow}>
                  <View style={styles.menuItemInfo}>
                    <Text style={styles.menuItemName}>{item.name}</Text>
                    <Text style={styles.menuItemOrders}>{item.orders} orders</Text>
                  </View>
                  <Text style={styles.menuItemRevenue}>{item.revenue}</Text>
                </View>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>📊 View Detailed Report</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>📥 Export Data</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN_COLORS.background,
    paddingTop: 50,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    right: 20,
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.circle,
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW_STYLE,
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: DESIGN_COLORS.textPrimary,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: DESIGN_COLORS.textSecondary,
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: DESIGN_COLORS.textSecondary,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statisticCard: {
    width: '48%',
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderRadius: BORDER_RADIUS.medium,
    padding: 16,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_COLORS.textSecondary,
    flex: 1,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: DESIGN_COLORS.textSecondary,
  },
  section: {
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderRadius: BORDER_RADIUS.medium,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    ...SHADOW_STYLE,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
    marginBottom: 12,
  },
  trendCard: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_COLORS.border + '30',
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: DESIGN_COLORS.textPrimary,
  },
  trendValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
  },
  trendBar: {
    height: 8,
    backgroundColor: DESIGN_COLORS.border + '20',
    borderRadius: 4,
    overflow: 'hidden',
  },
  trendFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  menuItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_COLORS.border + '30',
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN_COLORS.textPrimary,
    marginBottom: 4,
  },
  menuItemOrders: {
    fontSize: 12,
    color: DESIGN_COLORS.textSecondary,
  },
  menuItemRevenue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28a745',
  },
  actionButtons: {
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: DESIGN_COLORS.border,
    alignItems: 'center',
    ...SHADOW_STYLE,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: DESIGN_COLORS.textPrimary,
  },
});

export default BusinessStatisticsScreen;
