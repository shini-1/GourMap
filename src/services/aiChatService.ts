/**
 * AI Chat Service
 *
 * Provides a conversational food assistant for GourMap.
 * Currently uses a smart mock backend — swap `callAI()` for a real provider when ready.
 *
 * To connect a real backend, replace the body of `AIChatService.chat()` with:
 *   - OpenAI:   POST https://api.openai.com/v1/chat/completions
 *   - Gemini:   POST https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
 *   - Ollama:   POST http://YOUR_SERVER:11434/api/chat
 *   - Claude:   POST https://api.anthropic.com/v1/messages
 */

import { Restaurant } from '../types';
import { resolveCategoryConfig, CATEGORY_CONFIG, guessCategoryFromName } from '../config/categoryConfig';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  restaurants?: Restaurant[];
}

export interface ChatSession {
  messages: ChatMessage[];
  context: {
    restaurants: Restaurant[];
    lastQuery?: string;
  };
}

// ── Category synonym map ──────────────────────────────────────────────────────
// Maps user-spoken words → category keys in CATEGORY_CONFIG
// This is the single source of truth for intent → category resolution.

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  // Filipino
  filipino:      ['filipino', 'pinoy', 'lutong bahay', 'silog', 'adobo', 'sinigang', 'lechon', 'kare kare', 'bulalo', 'nilaga', 'tinola', 'pinakbet', 'bicol express', 'local food', 'local', 'pinoy food'],
  // Grill / BBQ
  grill:         ['grill', 'grilled', 'inihaw', 'ihaw', 'lechon manok', 'roasted'],
  bbq:           ['bbq', 'barbecue', 'barbeque', 'bar-b-q'],
  // Seafood
  seafood:       ['seafood', 'fish', 'shrimp', 'crab', 'lobster', 'squid', 'pusit', 'hipon', 'alimango', 'talaba', 'oyster', 'clam'],
  // Chicken
  chicken:       ['chicken', 'manok', 'fried chicken', 'roast chicken', 'jollibee', 'chooks'],
  // Fast food
  fast_food:     ['fast food', 'fastfood', 'burger', 'fries', 'mcdonald', 'mcdo', 'kfc', 'wendy', 'jollibee', 'chowking', 'quick service'],
  // Noodles
  noodles:       ['noodle', 'noodles', 'pancit', 'mami', 'lomi', 'batchoy', 'pasta'],
  ramen:         ['ramen', 'tonkotsu', 'miso ramen', 'shoyu ramen'],
  // Sushi / Japanese
  sushi:         ['sushi', 'sashimi', 'maki', 'nigiri', 'temaki'],
  japanese:      ['japanese', 'japan', 'tokyo', 'osaka', 'teriyaki', 'tempura', 'udon', 'yakitori'],
  // Korean
  korean:        ['korean', 'korea', 'kbbq', 'samgyup', 'samgyupsal', 'bibimbap', 'tteokbokki', 'kimchi'],
  // Chinese
  chinese:       ['chinese', 'china', 'dimsum', 'dim sum', 'wok', 'chowking', 'lauriat', 'congee', 'arroz caldo'],
  // Cafe / Coffee
  cafe:          ['cafe', 'coffee', 'kape', 'espresso', 'latte', 'cappuccino', 'starbucks', 'coffee shop'],
  coffee:        ['coffee shop', 'coffeehouse'],
  // Bakery
  bakery:        ['bakery', 'bread', 'pastry', 'pandesal', 'ensaymada', 'cake shop', 'panaderia'],
  // Dessert
  dessert:       ['dessert', 'ice cream', 'gelato', 'halo halo', 'halo-halo', 'sweet', 'sweets', 'cake', 'pastries'],
  // Italian / Pizza
  italian:       ['italian', 'pizza', 'pizzeria', 'pasta', 'lasagna', 'risotto'],
  // Buffet
  buffet:        ['buffet', 'eat all you can', 'unlimited', 'all you can eat', 'unli'],
  // Breakfast
  breakfast:     ['breakfast', 'almusal', 'brunch', 'silog', 'tapsilog', 'longsilog', 'tocilog', 'eggs', 'pancake'],
  // Snacks
  snacks:        ['snacks', 'merienda', 'pulutan', 'street food', 'isaw', 'kwek kwek', 'fishball'],
  // Vegetarian
  vegetarian:    ['vegetarian', 'vegan', 'veggie', 'plant based', 'plant-based', 'no meat'],
  // Indian
  indian:        ['indian', 'curry', 'biryani', 'naan', 'masala'],
  // Thai
  thai:          ['thai', 'thailand', 'pad thai', 'tom yum', 'green curry'],
  // Mediterranean
  mediterranean: ['mediterranean', 'greek', 'hummus', 'falafel', 'shawarma', 'kebab'],
  // Turkish
  turkish:       ['turkish', 'turkey', 'doner', 'kebab', 'shawarma'],
  // Fine dining
  fine_dining:   ['fine dining', 'fine-dining', 'upscale', 'elegant', 'fancy', 'high end', 'high-end'],
  // Steakhouse
  steakhouse:    ['steak', 'steakhouse', 'beef', 'ribeye', 'sirloin'],
};

// ── Intent parser ─────────────────────────────────────────────────────────────

interface ParsedIntent {
  categories: string[];   // All matching category keys (can be multiple)
  priceRange?: string;
  minRating?: number;
  keywords: string[];
  isGreeting: boolean;
  isHelp: boolean;
  isListAll: boolean;
}

function parseIntent(query: string): ParsedIntent {
  const q = query.toLowerCase().trim();

  // Greeting
  const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|kumusta|musta|sup|yo)\b/.test(q);

  // Help
  const isHelp = q.includes('help') || q.includes('what can you do') || q.includes('how do you work') || q.includes('what do you do');

  // List all
  const isListAll = /^(show|list|give|display|all|what).*(restaurant|place|food|eat)/.test(q) && !q.includes('category') && !q.includes('type');

  // Category detection — check all synonyms
  const matchedCategories: string[] = [];
  for (const [catKey, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    if (synonyms.some(s => q.includes(s))) {
      if (!matchedCategories.includes(catKey)) {
        matchedCategories.push(catKey);
      }
    }
  }

  // Price range
  let priceRange: string | undefined;
  if (/cheap|budget|affordable|mura|inexpensive|low.?cost/.test(q)) {
    priceRange = '₱';
  } else if (/expensive|fine dining|mahal|luxury|high.?end/.test(q)) {
    priceRange = '₱₱₱₱';
  } else if (/mid.?range|moderate|average price/.test(q)) {
    priceRange = '₱₱';
  }

  // Rating
  let minRating: number | undefined;
  if (/best|top.?rated|highly.?rated|highest.?rated|most.?popular/.test(q)) {
    minRating = 4.0;
  } else if (/good|decent|well.?rated/.test(q)) {
    minRating = 3.5;
  }

  // General keywords (for name/description search fallback)
  const stopWords = new Set([
    'a','an','the','is','are','i','want','find','me','some','any','good','best',
    'near','nearby','place','places','restaurant','restaurants','food','eat',
    'eating','for','to','in','at','of','and','or','with','that','have','has',
    'can','please','show','give','suggest','recommend','what','where','which',
    'how','do','does','get','looking','like','love','enjoy','try','trying',
    'around','here','there','this','that','these','those','my','your','our',
  ]);
  const keywords = q
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  return { categories: matchedCategories, priceRange, minRating, keywords, isGreeting, isHelp, isListAll };
}

// ── Restaurant filter ─────────────────────────────────────────────────────────

function getRestaurantEffectiveCategories(r: Restaurant): string[] {
  // Get the resolved category key from the config
  const resolved = resolveCategoryConfig(r.category, r.name);
  const keys = new Set<string>([resolved.name]);

  // Also include the raw DB category value
  if (r.category) keys.add(r.category.toLowerCase().trim());

  // Also run name-based guessing to catch restaurants whose DB category is "casual"
  // but whose name clearly indicates a specific cuisine
  const nameGuess = guessCategoryFromName(r.name || '');
  keys.add(nameGuess.name);

  return Array.from(keys);
}

function restaurantMatchesCategory(r: Restaurant, targetCategories: string[]): boolean {
  if (targetCategories.length === 0) return true;

  const effectiveCats = getRestaurantEffectiveCategories(r);
  const rName = (r.name || '').toLowerCase();
  const rDesc = (r.description || '').toLowerCase();

  // Direct category key match
  if (targetCategories.some(tc => effectiveCats.includes(tc))) return true;

  // Check if any synonym of the target category appears in the restaurant name/description
  for (const tc of targetCategories) {
    const synonyms = CATEGORY_SYNONYMS[tc] || [];
    if (synonyms.some(s => rName.includes(s) || rDesc.includes(s))) return true;
  }

  return false;
}

function filterRestaurants(restaurants: Restaurant[], intent: ParsedIntent): Restaurant[] {
  // If listing all, just apply price/rating filters
  if (intent.isListAll && intent.categories.length === 0) {
    return restaurants.filter(r => {
      if (intent.priceRange === '₱' && (r.priceRange || '').length > 2) return false;
      if (intent.priceRange === '₱₱₱₱' && (r.priceRange || '').length < 3) return false;
      if (intent.minRating !== undefined && (r.rating || 0) < intent.minRating) return false;
      return true;
    });
  }

  return restaurants.filter(r => {
    // Category filter
    if (intent.categories.length > 0) {
      if (!restaurantMatchesCategory(r, intent.categories)) return false;
    }

    // Price range filter
    if (intent.priceRange) {
      const rPrice = r.priceRange || '';
      if (intent.priceRange === '₱' && rPrice.length > 2) return false;
      if (intent.priceRange === '₱₱₱₱' && rPrice.length < 3) return false;
    }

    // Rating filter
    if (intent.minRating !== undefined) {
      if ((r.rating || 0) < intent.minRating) return false;
    }

    // Keyword fallback — only when no category was detected
    if (intent.categories.length === 0 && intent.keywords.length > 0) {
      const rName = (r.name || '').toLowerCase();
      const rDesc = (r.description || '').toLowerCase();
      const rCat  = (r.category || '').toLowerCase();
      const hasMatch = intent.keywords.some(k =>
        rName.includes(k) || rDesc.includes(k) || rCat.includes(k)
      );
      if (!hasMatch) return false;
    }

    return true;
  });
}

// ── Response generator ────────────────────────────────────────────────────────

function getCategoryLabel(catKey: string): string {
  return CATEGORY_CONFIG[catKey]?.label || catKey.replace(/_/g, ' ');
}

function getCategoryEmoji(catKey: string): string {
  return CATEGORY_CONFIG[catKey]?.emoji || '🍽️';
}

function generateResponse(intent: ParsedIntent, results: Restaurant[], query: string): string {
  // Greeting
  if (intent.isGreeting) {
    return "Hello! 👋 I'm your GourMap food assistant.\n\nAsk me anything like:\n• \"Find me cheap sushi\"\n• \"Best rated restaurants\"\n• \"Filipino food nearby\"\n• \"Recommend a good buffet\"\n\nWhat are you craving today?";
  }

  // Help
  if (intent.isHelp) {
    return "I can help you find the perfect restaurant! 🍽️\n\nTry asking me:\n• **By cuisine**: \"I want sushi\" or \"Filipino food\"\n• **By budget**: \"Cheap eats\" or \"Affordable places\"\n• **By rating**: \"Best rated\" or \"Top restaurants\"\n• **Combined**: \"Best cheap Filipino food\"\n• **Local terms**: \"Inihaw\", \"Silog\", \"Merienda\"\n\nWhat sounds good?";
  }

  // No results
  if (results.length === 0) {
    const catLabels = intent.categories.map(c => getCategoryLabel(c)).join(' / ');
    let msg = `I couldn't find restaurants`;
    if (catLabels) msg += ` for **${catLabels}**`;
    msg += ` matching your search. 😕\n\n`;
    msg += `Suggestions:\n• Try a broader term (e.g. "grill" instead of "inihaw")\n• Remove the price or rating filter\n• Ask me to "show all restaurants"`;
    return msg;
  }

  const count = results.length;
  const topRated = [...results].sort((a, b) => (b.rating || 0) - (a.rating || 0));

  // Build header
  let response = '';
  if (intent.categories.length > 0) {
    const labels = intent.categories.map(c => `${getCategoryEmoji(c)} ${getCategoryLabel(c)}`).join(' & ');
    response = `Found **${count}** ${labels} restaurant${count !== 1 ? 's' : ''}! 🎉\n\n`;
  } else if (intent.minRating) {
    response = `Here are **${count}** highly-rated restaurant${count !== 1 ? 's' : ''}! ⭐\n\n`;
  } else if (intent.priceRange === '₱') {
    response = `Found **${count}** budget-friendly option${count !== 1 ? 's' : ''}! 💰\n\n`;
  } else if (intent.isListAll) {
    response = `Here are **${count}** restaurants available! 🍽️\n\n`;
  } else {
    response = `Found **${count}** restaurant${count !== 1 ? 's' : ''} for you! 🍽️\n\n`;
  }

  // Top pick callout
  if (topRated[0]?.rating && topRated[0].rating > 0) {
    response += `⭐ Top pick: **${topRated[0].name}** (${topRated[0].rating.toFixed(1)})\n\n`;
  }

  response += count > 5
    ? `Showing the top 5 results below. Tap any card to see details.`
    : `Tap any card below to see details.`;

  return response;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface PersonalizationContext {
  preferredCategories?: string[];  // from onboarding
  favoriteRestaurantIds?: string[]; // saved restaurants
  displayName?: string;
}

class AIChatService {
  async chat(
    userMessage: string,
    restaurants: Restaurant[],
    history: ChatMessage[] = [],
    personalization?: PersonalizationContext
  ): Promise<{ text: string; restaurants: Restaurant[] }> {
    // Simulate a short thinking delay
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 300));

    const intent = parseIntent(userMessage);

    // For greetings/help, return immediately without searching
    if (intent.isGreeting || intent.isHelp) {
      const greeting = personalization?.displayName
        ? `Hi ${personalization.displayName}! 👋`
        : "Hello! 👋";
      const base = generateResponse(intent, [], userMessage);
      const personalizedBase = base.replace("Hello! 👋", greeting);
      return { text: personalizedBase, restaurants: [] };
    }

    // Check if user is asking for personalized recommendations
    const q = userMessage.toLowerCase();
    const isAskingPersonalized = /recommend|suggest|for me|my taste|based on|what.*like|what.*love/.test(q);

    let results = filterRestaurants(restaurants, intent);

    // If no specific category was requested and we have personalization data,
    // boost results that match the user's preferences
    if (
      intent.categories.length === 0 &&
      !intent.isListAll &&
      personalization?.preferredCategories?.length
    ) {
      const preferred = personalization.preferredCategories;

      // Score each restaurant: +2 if matches preferred category, +1 if favorited
      const scored = restaurants.map(r => {
        let score = 0;
        const effectiveCats = getRestaurantEffectiveCategories(r);
        if (preferred.some(p => effectiveCats.includes(p))) score += 2;
        if (personalization.favoriteRestaurantIds?.includes(r.id)) score += 1;
        return { r, score };
      });

      // If asking for personalized recs, filter to only preferred categories
      if (isAskingPersonalized) {
        const preferredResults = scored
          .filter(s => s.score > 0)
          .sort((a, b) => b.score - a.score || (b.r.rating || 0) - (a.r.rating || 0))
          .map(s => s.r);

        if (preferredResults.length > 0) {
          const prefLabels = preferred
            .slice(0, 3)
            .map(k => CATEGORY_CONFIG[k]?.label || k)
            .join(', ');

          const name = personalization.displayName ? `, ${personalization.displayName}` : '';
          const text = `Based on your preferences (${prefLabels}), here are some places you might love${name}! 🎯\n\nTap any card to see details.`;
          return { text, restaurants: preferredResults.slice(0, 5) };
        }
      }

      // Otherwise just apply normal filter
      results = filterRestaurants(restaurants, intent);
    }

    // Sort: rated restaurants first, then by rating descending
    const sorted = [...results].sort((a, b) => {
      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      return rb - ra;
    });

    const text = generateResponse(intent, sorted, userMessage);

    return {
      text,
      restaurants: sorted.slice(0, 5),
    };
  }

  createSession(restaurants: Restaurant[], personalization?: PersonalizationContext): ChatSession {
    const name = personalization?.displayName;
    const hasPrefs = (personalization?.preferredCategories?.length || 0) > 0;

    let welcomeMsg = `Hi${name ? ` ${name}` : ''}! 👋 I'm your GourMap food assistant.\n\n`;

    if (hasPrefs) {
      const prefLabels = (personalization!.preferredCategories || [])
        .slice(0, 3)
        .map(k => CATEGORY_CONFIG[k]?.emoji || '')
        .join(' ');
      welcomeMsg += `I know you love ${prefLabels} — ask me for recommendations anytime!\n\n`;
    }

    welcomeMsg += `Tell me what you're craving and I'll find the perfect spot!\n\nTry: "Recommend something for me", "Filipino food", or "Best rated restaurants"`;

    return {
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: welcomeMsg,
          timestamp: new Date(),
        },
      ],
      context: { restaurants },
    };
  }

  generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }
}

export const aiChatService = new AIChatService();
