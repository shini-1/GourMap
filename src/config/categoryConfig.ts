/**
 * Category Configuration
 * Centralized mapping of restaurant categories to visual properties.
 *
 * Design principles:
 * - No duplicate concepts (grill covers bbq, bakery covers dessert, etc.)
 * - Filipino-first: local terms are first-class keywords
 * - Every category has a distinct emoji and color for map markers
 */

export interface CategoryConfig {
  name: string;
  label: string;
  emoji: string;
  color: string;
  /** All string aliases that should resolve to this category */
  aliases: string[];
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  // ── Filipino ────────────────────────────────────────────────────────────────
  filipino: {
    name: 'filipino',
    label: 'Filipino',
    emoji: '🍚',
    color: '#E67E22',
    aliases: [
      'filipino', 'pinoy', 'lutong bahay', 'lutong-bahay', 'silog', 'tapsilog',
      'longsilog', 'tocilog', 'bangsilog', 'adobo', 'sinigang', 'kare kare',
      'kare-kare', 'bulalo', 'nilaga', 'tinola', 'pinakbet', 'bicol express',
      'lechon', 'crispy pata', 'dinuguan', 'caldereta', 'mechado', 'afritada',
      'local food', 'local', 'pinoy food', 'lutong pilipino', 'lokal', 'bindunggo', 'pares',
      'baga', 'chicken skin'
    ],
  },

  // ── Grill / BBQ / Inihaw ────────────────────────────────────────────────────
  grill: {
    name: 'grill',
    label: 'Grill & BBQ',
    emoji: '🔥',
    color: '#C0392B',
    aliases: [
      'grill', 'grilled', 'bbq', 'barbecue', 'barbeque', 'bar-b-q',
      'inihaw', 'ihaw', 'ihaw-ihaw', 'lechon manok', 'roasted', 'charcoal',
      'smokehouse', 'smoke', 'inasal', 'chicken inasal',
    ],
  },

  // ── Seafood ─────────────────────────────────────────────────────────────────
  seafood: {
    name: 'seafood',
    label: 'Seafood',
    emoji: '🦞',
    color: '#2980B9',
    aliases: [
      'seafood', 'fish', 'shrimp', 'crab', 'lobster', 'squid', 'pusit',
      'hipon', 'alimango', 'alimasag', 'talaba', 'oyster', 'clam', 'tahong',
      'halaan', 'bangus', 'tilapia', 'tuna', 'salmon', 'isda', 'kinilaw',
      'kilawin', 'sugpo', 'taeaba'
    ],
  },

  // ── Chicken ─────────────────────────────────────────────────────────────────
  chicken: {
    name: 'chicken',
    label: 'Chicken',
    emoji: '🍗',
    color: '#F39C12',
    aliases: [
      'chicken', 'manok', 'fried chicken', 'roast chicken', 'chooks',
      'chickenjoy', 'crispy chicken', 'chicken wings', 'wings',
    ],
  },

  // ── Fast Food ───────────────────────────────────────────────────────────────
  fast_food: {
    name: 'fast_food',
    label: 'Fast Food',
    emoji: '🍔',
    color: '#FF8C00',
    aliases: [
      'fast food', 'fastfood', 'burger', 'fries', 'mcdonald', 'mcdo',
      'kfc', 'wendy', 'jollibee', 'chowking', 'quick service', 'drive thru',
      'drive-thru', 'takeout', 'take out',
    ],
  },

  // ── Noodles ─────────────────────────────────────────────────────────────────
  noodles: {
    name: 'noodles',
    label: 'Noodles',
    emoji: '🍜',
    color: '#E67E22',
    aliases: [
      'noodle', 'noodles', 'pancit', 'mami', 'lomi', 'batchoy', 'la paz batchoy',
      'sotanghon', 'bihon', 'canton', 'palabok', 'misua',
    ],
  },

  // ── Ramen ───────────────────────────────────────────────────────────────────
  ramen: {
    name: 'ramen',
    label: 'Ramen',
    emoji: '🍥',
    color: '#8E44AD',
    aliases: ['ramen', 'tonkotsu', 'miso ramen', 'shoyu ramen', 'tsukemen'],
  },

  // ── Sushi / Japanese ────────────────────────────────────────────────────────
  japanese: {
    name: 'japanese',
    label: 'Japanese',
    emoji: '🍣',
    color: '#9B59B6',
    aliases: [
      'japanese', 'japan', 'tokyo', 'osaka', 'sushi', 'sashimi', 'maki',
      'nigiri', 'temaki', 'teriyaki', 'tempura', 'udon', 'yakitori',
      'donburi', 'katsu', 'tonkatsu',
    ],
  },

  // ── Korean ──────────────────────────────────────────────────────────────────
  korean: {
    name: 'korean',
    label: 'Korean',
    emoji: '🥘',
    color: '#C0392B',
    aliases: [
      'korean', 'korea', 'kbbq', 'samgyup', 'samgyupsal', 'bibimbap',
      'tteokbokki', 'kimchi', 'bulgogi', 'japchae', 'sundubu',
    ],
  },

  // ── Chinese ─────────────────────────────────────────────────────────────────
  chinese: {
    name: 'chinese',
    label: 'Chinese',
    emoji: '🥡',
    color: '#E74C3C',
    aliases: [
      'chinese', 'china', 'dimsum', 'dim sum', 'wok', 'chowking',
      'lauriat', 'congee', 'arroz caldo', 'siopao', 'siomai', 'hakaw',
      'pork asado', 'fried rice', 'chop suey',
    ],
  },

  // ── Cafe / Coffee ───────────────────────────────────────────────────────────
  cafe: {
    name: 'cafe',
    label: 'Cafe',
    emoji: '☕',
    color: '#6F4E37',
    aliases: [
      'cafe', 'coffee', 'kape', 'espresso', 'latte', 'cappuccino',
      'starbucks', 'coffee shop', 'coffeehouse', 'barista', 'brew',
      'frappe', 'milk tea', 'boba', 'tea',
    ],
  },

  // ── Bakery / Pastry ─────────────────────────────────────────────────────────
  bakery: {
    name: 'bakery',
    label: 'Bakery',
    emoji: '🥖',
    color: '#D35400',
    aliases: [
      'bakery', 'bread', 'pastry', 'pandesal', 'ensaymada', 'cake shop',
      'panaderia', 'tinapay', 'monay', 'putok', 'spanish bread',
      'croissant', 'muffin', 'donut', 'doughnut',
    ],
  },

  // ── Dessert / Sweets ────────────────────────────────────────────────────────
  dessert: {
    name: 'dessert',
    label: 'Dessert',
    emoji: '🍰',
    color: '#E91E63',
    aliases: [
      'dessert', 'ice cream', 'gelato', 'halo halo', 'halo-halo',
      'sweet', 'sweets', 'cake', 'pastries', 'leche flan', 'buko pandan',
      'mais con yelo', 'sago', 'gulaman', 'taho', 'palitaw', 'kakanin',
      'bibingka', 'puto', 'kutsinta',
    ],
  },

  // ── Italian / Pizza ─────────────────────────────────────────────────────────
  italian: {
    name: 'italian',
    label: 'Italian',
    emoji: '🍕',
    color: '#E74C3C',
    aliases: ['italian', 'pizza', 'pizzeria', 'pasta', 'lasagna', 'risotto', 'carbonara'],
  },

  // ── Buffet ──────────────────────────────────────────────────────────────────
  buffet: {
    name: 'buffet',
    label: 'Buffet',
    emoji: '🍽️',
    color: '#F1C40F',
    aliases: [
      'buffet', 'eat all you can', 'unlimited', 'all you can eat',
      'unli', 'unli rice', 'boodle fight', 'boodle',
    ],
  },

  // ── Breakfast / Silog ───────────────────────────────────────────────────────
  breakfast: {
    name: 'breakfast',
    label: 'Breakfast',
    emoji: '🍳',
    color: '#F39C12',
    aliases: [
      'breakfast', 'almusal', 'brunch', 'eggs', 'pancake', 'waffle',
      'toast', 'morning', 'early bird',
    ],
  },

  // ── Snacks / Street Food ────────────────────────────────────────────────────
  snacks: {
    name: 'snacks',
    label: 'Snacks',
    emoji: '🍢',
    color: '#27AE60',
    aliases: [
      'snacks', 'merienda', 'pulutan', 'street food', 'isaw', 'kwek kwek',
      'fishball', 'kikiam', 'betamax', 'balut', 'taho', 'dirty kitchen',
      'carinderia', 'carenderia', 'turo-turo',
    ],
  },

  // ── Steakhouse ──────────────────────────────────────────────────────────────
  steakhouse: {
    name: 'steakhouse',
    label: 'Steakhouse',
    emoji: '🥩',
    color: '#8B0000',
    aliases: ['steak', 'steakhouse', 'beef', 'ribeye', 'sirloin', 'tenderloin', 'wagyu'],
  },

  // ── Fine Dining ─────────────────────────────────────────────────────────────
  fine_dining: {
    name: 'fine_dining',
    label: 'Fine Dining',
    emoji: '🍾',
    color: '#8E44AD',
    aliases: [
      'fine dining', 'fine-dining', 'upscale', 'elegant', 'fancy',
      'high end', 'high-end', 'formal', 'gourmet',
    ],
  },

  // ── Indian ──────────────────────────────────────────────────────────────────
  indian: {
    name: 'indian',
    label: 'Indian',
    emoji: '🍛',
    color: '#E67E22',
    aliases: ['indian', 'curry', 'biryani', 'naan', 'masala', 'tikka', 'tandoor'],
  },

  // ── Thai ────────────────────────────────────────────────────────────────────
  thai: {
    name: 'thai',
    label: 'Thai',
    emoji: '🌶️',
    color: '#27AE60',
    aliases: ['thai', 'thailand', 'pad thai', 'tom yum', 'green curry', 'thai basil'],
  },

  // ── Mediterranean ───────────────────────────────────────────────────────────
  mediterranean: {
    name: 'mediterranean',
    label: 'Mediterranean',
    emoji: '🫒',
    color: '#16A085',
    aliases: [
      'mediterranean', 'greek', 'hummus', 'falafel', 'shawarma',
      'kebab', 'doner', 'turkish', 'middle eastern',
    ],
  },

  // ── Vegetarian ──────────────────────────────────────────────────────────────
  vegetarian: {
    name: 'vegetarian',
    label: 'Vegetarian',
    emoji: '🥗',
    color: '#2ECC71',
    aliases: [
      'vegetarian', 'vegan', 'veggie', 'plant based', 'plant-based',
      'no meat', 'healthy', 'salad', 'greens',
    ],
  },

  // ── Bar / Drinks ────────────────────────────────────────────────────────────
  bar: {
    name: 'bar',
    label: 'Bar & Drinks',
    emoji: '🍺',
    color: '#D35400',
    aliases: [
      'bar', 'pub', 'drinks', 'beer', 'cocktail', 'inuman', 'videoke',
      'kareoke', 'karaoke', 'nightlife', 'taproom',
    ],
  },

  // ── Casual (default fallback) ───────────────────────────────────────────────
  casual: {
    name: 'casual',
    label: 'Casual Dining',
    emoji: '🍽️',
    color: '#4A90E2',
    aliases: ['casual', 'restaurant', 'diner', 'eatery', 'carinderia', 'family'],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export const DEFAULT_CATEGORY: CategoryConfig = CATEGORY_CONFIG.casual;

/**
 * Build a reverse lookup: alias string → category key.
 * Used for fast O(1) resolution.
 */
const ALIAS_MAP: Map<string, string> = new Map();
for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
  for (const alias of config.aliases) {
    ALIAS_MAP.set(alias.toLowerCase(), key);
  }
  // Also map the key itself
  ALIAS_MAP.set(key.toLowerCase(), key);
}

/**
 * Get category config by exact key or alias.
 * Returns DEFAULT_CATEGORY if nothing matches.
 */
export function getCategoryConfig(categoryName?: string): CategoryConfig {
  if (!categoryName) return DEFAULT_CATEGORY;
  const normalized = categoryName.toLowerCase().trim();
  const key = ALIAS_MAP.get(normalized);
  return key ? CATEGORY_CONFIG[key] : DEFAULT_CATEGORY;
}

/**
 * Guess category from restaurant name using keyword matching.
 * Checks all aliases in priority order (more specific first).
 */
export function guessCategoryFromName(restaurantName: string): CategoryConfig {
  if (!restaurantName) return DEFAULT_CATEGORY;
  const nameLower = restaurantName.toLowerCase();

  // Priority order — more specific categories checked first
  const priorityOrder = [
    'ramen', 'japanese', 'korean', 'chinese', 'italian', 'thai',
    'mediterranean', 'indian', 'steakhouse', 'seafood', 'grill',
    'buffet', 'fast_food', 'chicken', 'noodles', 'filipino',
    'cafe', 'bakery', 'dessert', 'breakfast', 'snacks',
    'fine_dining', 'vegetarian', 'bar', 'casual',
  ];

  for (const key of priorityOrder) {
    const config = CATEGORY_CONFIG[key];
    if (!config) continue;
    if (config.aliases.some(alias => nameLower.includes(alias.toLowerCase()))) {
      return config;
    }
  }

  return DEFAULT_CATEGORY;
}

/**
 * Resolve the best category for a restaurant.
 * Priority: DB value → alias lookup → name-based guess → default.
 */
export function resolveCategoryConfig(
  restaurantCategory?: string,
  restaurantName?: string
): CategoryConfig {
  if (restaurantCategory) {
    const normalized = restaurantCategory.toLowerCase().trim();

    // 1. Exact key match
    if (CATEGORY_CONFIG[normalized]) return CATEGORY_CONFIG[normalized];

    // 2. Alias match
    const aliasKey = ALIAS_MAP.get(normalized);
    if (aliasKey) return CATEGORY_CONFIG[aliasKey];

    // 3. Partial alias match (DB value contains an alias or vice versa)
    for (const [alias, key] of ALIAS_MAP.entries()) {
      if (normalized.includes(alias) || alias.includes(normalized)) {
        return CATEGORY_CONFIG[key];
      }
    }
  }

  // 4. Name-based guess
  if (restaurantName) return guessCategoryFromName(restaurantName);

  return DEFAULT_CATEGORY;
}

/**
 * Get all available categories for the filter dropdown.
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
