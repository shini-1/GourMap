import { Restaurant } from '../../types';
import { ratingSyncService } from './ratingSyncService';

interface RatingMetrics {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: { [key: number]: number }; // 1-5 stars
  confidence: number; // 0-1, based on number of ratings
  trend: 'rising' | 'stable' | 'declining';
  lastUpdated: string;
}

interface RestaurantRatingData {
  restaurantId: string;
  metrics: RatingMetrics;
  weightedScore: number; // Overall score considering multiple factors
  rank: number; // Position in sorted list
  isTopRated: boolean; // Is this in the top X%
}

class RatingCalculationService {
  private static instance: RatingCalculationService;
  private ratingCache: Map<string, RatingMetrics> = new Map();
  private restaurantRatings: Map<string, RestaurantRatingData> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly TOP_RATED_PERCENTILE = 0.1; // Top 10%

  static getInstance(): RatingCalculationService {
    if (!RatingCalculationService.instance) {
      RatingCalculationService.instance = new RatingCalculationService();
    }
    return RatingCalculationService.instance;
  }

  // Calculate comprehensive rating metrics for a restaurant
  async calculateRatingMetrics(restaurantId: string): Promise<RatingMetrics> {
    try {
      // Check cache first
      const cached = this.ratingCache.get(restaurantId);
      if (cached && this.isCacheValid(cached.lastUpdated)) {
        return cached;
      }

      const ratings = await ratingSyncService.getRatingsForRestaurant(restaurantId);
      const validRatings = ratings.filter(r => r.syncStatus !== 'error');

      const metrics: RatingMetrics = {
        averageRating: 0,
        totalRatings: validRatings.length,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        confidence: 0,
        trend: 'stable',
        lastUpdated: new Date().toISOString()
      };

      if (validRatings.length === 0) {
        this.ratingCache.set(restaurantId, metrics);
        return metrics;
      }

      // Calculate average rating
      const totalRating = validRatings.reduce((sum, r) => sum + r.rating, 0);
      metrics.averageRating = Math.round((totalRating / validRatings.length) * 10) / 10;

      // Calculate rating distribution
      validRatings.forEach(rating => {
        metrics.ratingDistribution[rating.rating] = (metrics.ratingDistribution[rating.rating] || 0) + 1;
      });

      // Calculate confidence based on number of ratings
      metrics.confidence = this.calculateConfidence(validRatings.length);

      // Calculate trend (simplified - could be enhanced with historical data)
      metrics.trend = this.calculateTrend(validRatings);

      // Cache the results
      this.ratingCache.set(restaurantId, metrics);

      return metrics;
    } catch (error) {
      console.error('❌ Error calculating rating metrics:', error);
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        confidence: 0,
        trend: 'stable',
        lastUpdated: new Date().toISOString()
      };
    }
  }

  // Calculate confidence score based on number of ratings
  private calculateConfidence(ratingCount: number): number {
    // Using a logarithmic scale for confidence
    // 1 rating = 0.2, 10 ratings = 0.5, 50 ratings = 0.8, 100+ ratings = 0.95
    if (ratingCount === 0) return 0;
    if (ratingCount === 1) return 0.2;
    if (ratingCount <= 5) return 0.3;
    if (ratingCount <= 10) return 0.5;
    if (ratingCount <= 25) return 0.7;
    if (ratingCount <= 50) return 0.8;
    if (ratingCount <= 100) return 0.9;
    return 0.95;
  }

  // Calculate rating trend (simplified version)
  private calculateTrend(ratings: any[]): 'rising' | 'stable' | 'declining' {
    if (ratings.length < 3) return 'stable';

    // Sort by timestamp
    const sortedRatings = ratings.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Compare recent ratings with older ones
    const recentCount = Math.min(5, Math.floor(ratings.length / 3));
    const recentRatings = sortedRatings.slice(-recentCount);
    const olderRatings = sortedRatings.slice(0, recentCount);

    const recentAvg = recentRatings.reduce((sum, r) => sum + r.rating, 0) / recentRatings.length;
    const olderAvg = olderRatings.reduce((sum, r) => sum + r.rating, 0) / olderRatings.length;

    const difference = recentAvg - olderAvg;
    
    if (difference > 0.3) return 'rising';
    if (difference < -0.3) return 'declining';
    return 'stable';
  }

  // Calculate weighted score for restaurant ranking
  calculateWeightedScore(metrics: RatingMetrics, restaurant?: Restaurant): number {
    let score = metrics.averageRating * 20; // Base score (0-100)

    // Add confidence bonus
    score += metrics.confidence * 10; // Up to 10 points for confidence

    // Add rating count bonus (diminishing returns)
    const countBonus = Math.log(metrics.totalRatings + 1) * 2;
    score += Math.min(countBonus, 10); // Cap at 10 points

    // Add trend bonus
    if (metrics.trend === 'rising') score += 5;
    else if (metrics.trend === 'declining') score -= 3;

    // Add editorial rating bonus if available
    if (restaurant?.editorialRating) {
      const editorialBonus = restaurant.editorialRating * 2;
      score += Math.min(editorialBonus, 10); // Cap at 10 points
    }

    // Ensure score is within 0-100 range
    return Math.max(0, Math.min(100, score));
  }

  // Process multiple restaurants and calculate rankings
  async processRestaurantRankings(restaurants: Restaurant[]): Promise<RestaurantRatingData[]> {
    try {
      const ratingDataPromises = restaurants.map(async (restaurant) => {
        const metrics = await this.calculateRatingMetrics(restaurant.id);
        const weightedScore = this.calculateWeightedScore(metrics, restaurant);

        return {
          restaurantId: restaurant.id,
          metrics,
          weightedScore,
          rank: 0, // Will be calculated after sorting
          isTopRated: false // Will be calculated after sorting
        } as RestaurantRatingData;
      });

      const allRatingData = await Promise.all(ratingDataPromises);

      // Sort by weighted score (descending)
      allRatingData.sort((a, b) => b.weightedScore - a.weightedScore);

      // Assign ranks and determine top-rated status
      const topRatedThreshold = Math.ceil(restaurants.length * this.TOP_RATED_PERCENTILE);
      
      allRatingData.forEach((data, index) => {
        data.rank = index + 1;
        data.isTopRated = index < topRatedThreshold;
      });

      // Store in cache
      this.restaurantRatings.clear();
      allRatingData.forEach(data => {
        this.restaurantRatings.set(data.restaurantId, data);
      });

      return allRatingData;
    } catch (error) {
      console.error('❌ Error processing restaurant rankings:', error);
      return [];
    }
  }

  // Get rating data for a specific restaurant
  getRatingData(restaurantId: string): RestaurantRatingData | undefined {
    return this.restaurantRatings.get(restaurantId);
  }

  // Sort restaurants by rating (with multiple sorting options)
  sortRestaurantsByRating(
    restaurants: Restaurant[], 
    sortBy: 'highest' | 'lowest' | 'trending' | 'mostReviewed' = 'highest'
  ): Restaurant[] {
    const ratingDataArray = restaurants
      .map(restaurant => this.restaurantRatings.get(restaurant.id))
      .filter(data => data !== undefined) as RestaurantRatingData[];

    let sortedData: RestaurantRatingData[];

    switch (sortBy) {
      case 'highest':
        sortedData = ratingDataArray.sort((a, b) => b.weightedScore - a.weightedScore);
        break;
      case 'lowest':
        sortedData = ratingDataArray.sort((a, b) => a.weightedScore - b.weightedScore);
        break;
      case 'trending':
        sortedData = ratingDataArray
          .filter(data => data.metrics.trend === 'rising')
          .sort((a, b) => b.weightedScore - a.weightedScore)
          .concat(ratingDataArray.filter(data => data.metrics.trend !== 'rising'));
        break;
      case 'mostReviewed':
        sortedData = ratingDataArray.sort((a, b) => b.metrics.totalRatings - a.metrics.totalRatings);
        break;
      default:
        sortedData = ratingDataArray.sort((a, b) => b.weightedScore - a.weightedScore);
    }

    // Map back to restaurants
    const sortedRestaurants: Restaurant[] = [];
    sortedData.forEach(data => {
      const restaurant = restaurants.find(r => r.id === data.restaurantId);
      if (restaurant) {
        sortedRestaurants.push(restaurant);
      }
    });

    return sortedRestaurants;
  }

  // Get top-rated restaurants
  getTopRatedRestaurants(restaurants: Restaurant[], count: number = 5): Restaurant[] {
    const sorted = this.sortRestaurantsByRating(restaurants, 'highest');
    return sorted.slice(0, count);
  }

  // Check if cache is valid
  private isCacheValid(lastUpdated: string): boolean {
    const now = new Date().getTime();
    const updated = new Date(lastUpdated).getTime();
    return (now - updated) < this.CACHE_DURATION;
  }

  // Clear rating cache
  clearCache(): void {
    this.ratingCache.clear();
    this.restaurantRatings.clear();
  }

  // Get rating insights
  getRatingInsights(restaurantId: string): {
    recommendation: string;
    strengths: string[];
    concerns: string[];
  } {
    const ratingData = this.restaurantRatings.get(restaurantId);
    if (!ratingData) {
      return {
        recommendation: 'No rating data available',
        strengths: [],
        concerns: []
      };
    }

    const { metrics } = ratingData;
    const insights = {
      recommendation: '',
      strengths: [] as string[],
      concerns: [] as string[]
    };

    // Generate recommendation
    if (metrics.averageRating >= 4.5) {
      insights.recommendation = 'Excellent choice! Highly recommended by diners.';
    } else if (metrics.averageRating >= 4.0) {
      insights.recommendation = 'Great option! Most diners had positive experiences.';
    } else if (metrics.averageRating >= 3.5) {
      insights.recommendation = 'Good choice with mixed reviews.';
    } else if (metrics.averageRating >= 3.0) {
      insights.recommendation = 'Average option, consider other choices.';
    } else {
      insights.recommendation = 'Below average ratings, consider alternatives.';
    }

    // Identify strengths
    if (metrics.confidence > 0.8) {
      insights.strengths.push('High confidence rating with many reviews');
    }
    if (metrics.trend === 'rising') {
      insights.strengths.push('Improving ratings over time');
    }
    if (metrics.ratingDistribution[5] > metrics.ratingDistribution[1] * 2) {
      insights.strengths.push('More 5-star than 1-star reviews');
    }

    // Identify concerns
    if (metrics.confidence < 0.3) {
      insights.concerns.push('Limited reviews - rating may not be reliable');
    }
    if (metrics.trend === 'declining') {
      insights.concerns.push('Declining ratings over time');
    }
    if (metrics.ratingDistribution[1] > metrics.ratingDistribution[5]) {
      insights.concerns.push('More 1-star than 5-star reviews');
    }

    return insights;
  }

  // Get rating statistics for analytics
  getRatingStatistics(restaurants: Restaurant[]): {
    totalRestaurants: number;
    restaurantsWithRatings: number;
    averageRating: number;
    topRatedCount: number;
    ratingDistribution: { [key: string]: number };
  } {
    const ratingDataArray = restaurants
      .map(restaurant => this.restaurantRatings.get(restaurant.id))
      .filter(data => data !== undefined) as RestaurantRatingData[];

    const restaurantsWithRatings = ratingDataArray.filter(data => data.metrics.totalRatings > 0);
    const totalRating = restaurantsWithRatings.reduce((sum, data) => sum + data.metrics.averageRating, 0);
    const averageRating = restaurantsWithRatings.length > 0 ? totalRating / restaurantsWithRatings.length : 0;
    const topRatedCount = ratingDataArray.filter(data => data.isTopRated).length;

    // Calculate overall rating distribution
    const ratingDistribution: { [key: string]: number } = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    restaurantsWithRatings.forEach(data => {
      Object.entries(data.metrics.ratingDistribution).forEach(([rating, count]) => {
        ratingDistribution[rating] = (ratingDistribution[rating] || 0) + count;
      });
    });

    return {
      totalRestaurants: restaurants.length,
      restaurantsWithRatings: restaurantsWithRatings.length,
      averageRating: Math.round(averageRating * 10) / 10,
      topRatedCount,
      ratingDistribution
    };
  }
}

export const ratingCalculationService = RatingCalculationService.getInstance();
export type { RatingMetrics, RestaurantRatingData };
