/**
 * Category Configuration
 * Centralized mapping of restaurant categories to visual properties
 * Used for map markers, category filters, and restaurant cards
 */

export interface CategoryConfig {
  name: string;
  label: string;
  emoji: string;
  color: string;
  icon?: string; // Optional icon name for future icon library integration
}

/**
 * Complete category configuration mapping
 * Colors are chosen to match the design mockup and provide good contrast on maps
 */
export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  // Italian & Pizza
  italian: {
    name: 'italian',
    label: 'Italian',
    emoji: '🍕',
    color: '#E74C3C', // Red
  },
  
  // Coffee & Cafes
  cafe: {
    name: 'cafe',
    label: 'Cafe',
    emoji: '☕',
    color: '#8B4513', // Brown
  },
  coffee: {
    name: 'coffee',
    label: 'Coffee Shop',
    emoji: '☕',
    color: '#6F4E37', // Coffee brown
  },
  
  // Fast Food
  fast_food: {
    name: 'fast_food',
    label: 'Fast Food',
    emoji: '🍔',
    color: '#FF8C00', // Orange
  },
  
  // Asian Cuisine
  asian: {
    name: 'asian',
    label: 'Asian',
    emoji: '🥢',
    color: '#E67E22', // Orange-red
  },
  chinese: {
    name: 'chinese',
    label: 'Chinese',
    emoji: '🥡',
    color: '#E74C3C', // Red
  },
  
  // Japanese
  japanese: {
    name: 'japanese',
    label: 'Japanese',
    emoji: '🍱',
    color: '#9B59B6', // Purple
  },
  sushi: {
    name: 'sushi',
    label: 'Sushi',
    emoji: '🍣',
    color: '#8E44AD', // Dark purple
  },
  ramen: {
    name: 'ramen',
    label: 'Ramen',
    emoji: '🍜',
    color: '#F39C12', // Golden yellow
  },
  
  // Thai & Vietnamese
  thai: {
    name: 'thai',
    label: 'Thai',
    emoji: '🍜',
    color: '#27AE60', // Green
  },
  vietnamese: {
    name: 'vietnamese',
    label: 'Vietnamese',
    emoji: '🥘',
    color: '#16A085', // Teal
  },
  
  // Bakery & Desserts
  bakery: {
    name: 'bakery',
    label: 'Bakery',
    emoji: '🥖',
    color: '#F39C12', // Golden
  },
  dessert: {
    name: 'dessert',
    label: 'Dessert',
    emoji: '🍰',
    color: '#E91E63', // Pink
  },
  
  // Grill & BBQ
  grill: {
    name: 'grill',
    label: 'Grill',
    emoji: '🥩',
    color: '#E74C3C', // Red
  },
  bbq: {
    name: 'bbq',
    label: 'BBQ',
    emoji: '🍖',
    color: '#C0392B', // Dark red
  },
  steakhouse: {
    name: 'steakhouse',
    label: 'Steakhouse',
    emoji: '🥩',
    color: '#8B0000', // Dark red
  },
  
  // Seafood
  seafood: {
    name: 'seafood',
    label: 'Seafood',
    emoji: '🦞',
    color: '#3498DB', // Blue
  },
  
  // Mexican
  mexican: {
    name: 'mexican',
    label: 'Mexican',
    emoji: '🌮',
    color: '#E67E22', // Orange
  },
  
  // Buffet
  buffet: {
    name: 'buffet',
    label: 'Buffet',
    emoji: '🍽️',
    color: '#F1C40F', // Yellow
  },
  
  // Fine Dining
  fine_dining: {
    name: 'fine_dining',
    label: 'Fine Dining',
    emoji: '🍾',
    color: '#8E44AD', // Purple
  },
  
  // Fast Casual
  fast_casual: {
    name: 'fast_casual',
    label: 'Fast Casual',
    emoji: '🏃',
    color: '#16A085', // Teal
  },
  
  // Family
  family: {
    name: 'family',
    label: 'Family',
    emoji: '👨‍👩‍👧‍👦',
    color: '#F39C12', // Orange
  },
  
  // Diner
  diner: {
    name: 'diner',
    label: 'Diner',
    emoji: '🍳',
    color: '#95A5A6', // Gray
  },
  
  // Bar & Pub
  bar: {
    name: 'bar',
    label: 'Bar',
    emoji: '🍺',
    color: '#F39C12', // Amber
  },
  pub: {
    name: 'pub',
    label: 'Pub',
    emoji: '🍻',
    color: '#D35400', // Dark orange
  },
  
  // Indian
  indian: {
    name: 'indian',
    label: 'Indian',
    emoji: '🍛',
    color: '#E67E22', // Orange
  },
  
  // Korean
  korean: {
    name: 'korean',
    label: 'Korean',
    emoji: '🍲',
    color: '#C0392B', // Red
  },
  
  // Turkish
  turkish: {
    name: 'turkish',
    label: 'Turkish',
    emoji: '🥙',
    color: '#E74C3C', // Red
  },
  
  // Mediterranean
  mediterranean: {
    name: 'mediterranean',
    label: 'Mediterranean',
    emoji: '🫒',
    color: '#27AE60', // Green
  },
  
  // American
  american: {
    name: 'american',
    label: 'American',
    emoji: '🍔',
    color: '#3498DB', // Blue
  },
  
  // Casual (Default)
  casual: {
    name: 'casual',
    label: 'Casual',
    emoji: '🍽️',
    color: '#4A90E2', // Blue
  },

  // Filipino
  filipino: {
    name: 'filipino',
    label: 'Filipino',
    emoji: '🍚',
    color: '#E67E22', // Orange
  },

  // Chicken
  chicken: {
    name: 'chicken',
    label: 'Chicken',
    emoji: '🍗',
    color: '#F39C12', // Golden
  },

  // Noodles
  noodles: {
    name: 'noodles',
    label: 'Noodles',
    emoji: '🍜',
    color: '#E67E22', // Orange
  },

  // Vegetarian
  vegetarian: {
    name: 'vegetarian',
    label: 'Vegetarian',
    emoji: '🥗',
    color: '#27AE60', // Green
  },

  // Breakfast
  breakfast: {
    name: 'breakfast',
    label: 'Breakfast',
    emoji: '🍳',
    color: '#F39C12', // Golden
  },

  // Snacks
  snacks: {
    name: 'snacks',
    label: 'Snacks',
    emoji: '🍟',
    color: '#E67E22', // Orange
  },
};

/**
 * Default category for restaurants without a specified category
 */
export const DEFAULT_CATEGORY: CategoryConfig = CATEGORY_CONFIG.casual;

/**
 * Get category configuration by name
 * Returns default category if not found
 */
export function getCategoryConfig(categoryName?: string): CategoryConfig {
  if (!categoryName) {
    return DEFAULT_CATEGORY;
  }
  
  const normalized = categoryName.toLowerCase().trim();
  return CATEGORY_CONFIG[normalized] || DEFAULT_CATEGORY;
}

/**
 * Get all available categories for filtering
 * Includes 'all' option at the beginning
 */
export function getAllCategoryOptions(): Array<{ value: string; label: string; emoji: string }> {
  return [
    { value: 'all', label: 'All Types', emoji: '🍽️' },
    ...Object.values(CATEGORY_CONFIG).map(cat => ({
      value: cat.name,
      label: cat.label,
      emoji: cat.emoji,
    })),
  ];
}

/**
 * Parse category from restaurant name (fallback heuristic)
 * Used when restaurant doesn't have explicit category field
 */
export function guessCategoryFromName(restaurantName: string): CategoryConfig {
  const nameLower = restaurantName.toLowerCase();
  
  // Check for specific keywords in order of specificity
  const checks: Array<[string[], string]> = [
    // Specific cuisines first
    [['ramen'], 'ramen'],
    [['sushi'], 'sushi'],
    [['pizza', 'pizzeria'], 'italian'],
    [['burger', 'mcdonald', 'kfc', 'wendy'], 'fast_food'],
    [['cafe', 'coffee', 'starbucks'], 'cafe'],
    [['bakery', 'bread', 'pastry'], 'bakery'],
    [['steak', 'steakhouse'], 'steakhouse'],
    [['grill', 'barbecue', 'bbq'], 'grill'],
    [['seafood', 'fish', 'lobster', 'shrimp'], 'seafood'],
    [['mexican', 'taco', 'burrito'], 'mexican'],
    [['thai'], 'thai'],
    [['vietnamese', 'pho'], 'vietnamese'],
    [['chinese', 'china', 'wok'], 'chinese'],
    [['japanese', 'tokyo', 'osaka'], 'japanese'],
    [['korean'], 'korean'],
    [['turkish', 'kebab', 'doner', 'shawarma'], 'turkish'],
    [['indian', 'curry'], 'indian'],
    [['mediterranean'], 'mediterranean'],
    [['buffet', 'all you can eat'], 'buffet'],
    [['fine', 'elegant', 'upscale'], 'fine_dining'],
    [['fast', 'quick'], 'fast_casual'],
    [['family', 'kids'], 'family'],
    [['diner'], 'diner'],
    [['bar', 'pub'], 'bar'],
    [['dessert', 'ice cream', 'gelato'], 'dessert'],
  ];
  
  for (const [keywords, category] of checks) {
    if (keywords.some(keyword => nameLower.includes(keyword))) {
      return getCategoryConfig(category);
    }
  }
  
  return DEFAULT_CATEGORY;
}

/**
 * Merge database category with name-based guess
 * Prioritizes database category if valid, falls back to name parsing
 */
export function resolveCategoryConfig(
  restaurantCategory?: string,
  restaurantName?: string
): CategoryConfig {
  // Try database category first
  if (restaurantCategory) {
    const config = getCategoryConfig(restaurantCategory);
    if (config !== DEFAULT_CATEGORY) {
      return config;
    }
  }
  
  // Fall back to name-based guessing
  if (restaurantName) {
    return guessCategoryFromName(restaurantName);
  }
  
  return DEFAULT_CATEGORY;
}
