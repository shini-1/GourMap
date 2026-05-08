/**
 * AI Chat Service
 *
 * Provides a conversational food assistant for GourMap.
 * Currently uses a mock backend — swap `callAI()` for a real provider when ready.
 *
 * To connect a real backend, replace the `callAI` function with:
 *   - OpenAI:   POST https://api.openai.com/v1/chat/completions
 *   - Gemini:   POST https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
 *   - Ollama:   POST http://YOUR_SERVER:11434/api/chat
 *   - Claude:   POST https://api.anthropic.com/v1/messages
 */

import { Restaurant } from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  restaurants?: Restaurant[]; // Optional restaurant results attached to a message
}

export interface ChatSession {
  messages: ChatMessage[];
  context: {
    restaurants: Restaurant[];
    lastQuery?: string;
  };
}

// ── Mock AI responses ─────────────────────────────────────────────────────────

/**
 * Simple intent parser — extracts filters from natural language.
 * Replace this with a real LLM call when ready.
 */
function parseIntent(query: string): {
  category?: string;
  priceRange?: string;
  minRating?: number;
  keywords: string[];
} {
  const q = query.toLowerCase();

  // Category detection
  const categoryMap: Record<string, string[]> = {
    sushi:       ['sushi'],
    ramen:       ['ramen', 'noodle'],
    italian:     ['italian', 'pizza', 'pasta'],
    cafe:        ['cafe', 'coffee', 'kape'],
    fast_food:   ['fast food', 'burger', 'fries', 'mcdonald', 'jollibee'],
    seafood:     ['seafood', 'fish', 'shrimp', 'crab', 'lobster'],
    bbq:         ['bbq', 'barbecue', 'grill', 'inihaw'],
    dessert:     ['dessert', 'ice cream', 'cake', 'sweet'],
    buffet:      ['buffet', 'eat all you can', 'unlimited'],
    filipino:    ['filipino', 'pinoy', 'lutong bahay', 'silog', 'adobo', 'sinigang'],
    chinese:     ['chinese', 'dimsum', 'dim sum', 'pancit'],
    korean:      ['korean', 'kbbq', 'samgyup'],
  };

  let category: string | undefined;
  for (const [cat, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(k => q.includes(k))) {
      category = cat;
      break;
    }
  }

  // Price range detection
  let priceRange: string | undefined;
  if (q.includes('cheap') || q.includes('budget') || q.includes('affordable') || q.includes('mura')) {
    priceRange = '₱';
  } else if (q.includes('expensive') || q.includes('fine dining') || q.includes('mahal')) {
    priceRange = '₱₱₱₱';
  } else if (q.includes('mid') || q.includes('moderate')) {
    priceRange = '₱₱';
  }

  // Rating detection
  let minRating: number | undefined;
  if (q.includes('best') || q.includes('top rated') || q.includes('highly rated')) {
    minRating = 4.0;
  } else if (q.includes('good') || q.includes('decent')) {
    minRating = 3.5;
  }

  // Extract general keywords
  const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'i', 'want', 'find', 'me', 'some', 'any', 'good', 'best', 'near', 'nearby', 'place', 'places', 'restaurant', 'restaurants', 'food', 'eat', 'eating', 'for', 'to', 'in', 'at', 'of', 'and', 'or', 'with', 'that', 'have', 'has', 'can', 'please', 'show', 'give', 'suggest', 'recommend']);
  const keywords = q
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  return { category, priceRange, minRating, keywords };
}

/**
 * Filter restaurants based on parsed intent.
 */
function filterRestaurants(
  restaurants: Restaurant[],
  intent: ReturnType<typeof parseIntent>
): Restaurant[] {
  return restaurants.filter(r => {
    // Category match
    if (intent.category) {
      const rCat = (r.category || '').toLowerCase();
      const rName = (r.name || '').toLowerCase();
      if (!rCat.includes(intent.category) && !rName.includes(intent.category)) {
        // Also check keyword overlap
        const catKeywords = intent.keywords;
        const hasKeywordMatch = catKeywords.some(k => rCat.includes(k) || rName.includes(k));
        if (!hasKeywordMatch) return false;
      }
    }

    // Price range match
    if (intent.priceRange) {
      const rPrice = r.priceRange || '';
      if (intent.priceRange === '₱' && rPrice.length > 2) return false;
      if (intent.priceRange === '₱₱₱₱' && rPrice.length < 3) return false;
    }

    // Rating match
    if (intent.minRating !== undefined) {
      const rRating = typeof r.rating === 'number' ? r.rating : 0;
      if (rRating < intent.minRating) return false;
    }

    // Keyword match (if no category was detected, use keywords for name search)
    if (!intent.category && intent.keywords.length > 0) {
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

/**
 * Generate a natural language response for the results.
 * This is the function to replace with a real LLM call.
 */
function generateMockResponse(
  query: string,
  intent: ReturnType<typeof parseIntent>,
  results: Restaurant[]
): string {
  const q = query.toLowerCase();

  // Greeting detection
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|kumusta|musta)/.test(q)) {
    return "Hello! 👋 I'm your GourMap food assistant. Ask me anything like:\n\n• \"Find me cheap sushi nearby\"\n• \"Best rated restaurants for a date night\"\n• \"Recommend a good buffet\"\n• \"What Filipino restaurants are available?\"\n\nWhat are you craving today?";
  }

  // Help detection
  if (q.includes('help') || q.includes('what can you do') || q.includes('how do you work')) {
    return "I can help you find the perfect restaurant! 🍽️\n\nTry asking me:\n• **By cuisine**: \"I want sushi\" or \"Find me Italian food\"\n• **By budget**: \"Cheap eats\" or \"Affordable restaurants\"\n• **By rating**: \"Best rated places\" or \"Top restaurants\"\n• **By mood**: \"Good for a date\" or \"Family-friendly\"\n• **Combined**: \"Best cheap Filipino food nearby\"\n\nWhat sounds good to you?";
  }

  // No results
  if (results.length === 0) {
    const suggestions = ['Try a different category', 'Remove the price filter', 'Search by restaurant name instead'];
    return `I couldn't find restaurants matching "${query}" in our database. 😕\n\nSuggestions:\n${suggestions.map(s => `• ${s}`).join('\n')}`;
  }

  // Build response based on what was found
  const count = results.length;
  const topRated = [...results].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3);

  let response = '';

  if (intent.category) {
    const catLabel = intent.category.replace('_', ' ');
    response = `Found ${count} ${catLabel} restaurant${count !== 1 ? 's' : ''} for you! 🎉\n\n`;
  } else if (intent.minRating) {
    response = `Here are ${count} highly-rated restaurant${count !== 1 ? 's' : ''} I found! ⭐\n\n`;
  } else if (intent.priceRange === '₱') {
    response = `Great news — found ${count} budget-friendly option${count !== 1 ? 's' : ''}! 💰\n\n`;
  } else {
    response = `I found ${count} restaurant${count !== 1 ? 's' : ''} that match your search! 🍽️\n\n`;
  }

  if (topRated.length > 0 && topRated[0].rating && topRated[0].rating > 0) {
    response += `Top pick: **${topRated[0].name}**`;
    if (topRated[0].rating) response += ` (${topRated[0].rating.toFixed(1)}⭐)`;
    response += '\n\n';
  }

  response += count > 3
    ? `Showing the top results below. Tap any card to see details.`
    : `Here are all the matches — tap any card to see details.`;

  return response;
}

// ── Public API ────────────────────────────────────────────────────────────────

class AIChatService {
  /**
   * Process a user message and return an AI response.
   *
   * @param userMessage  The user's natural language query
   * @param restaurants  The full list of restaurants to search through
   * @param history      Previous messages for context (unused in mock, used by real LLMs)
   */
  async chat(
    userMessage: string,
    restaurants: Restaurant[],
    history: ChatMessage[] = []
  ): Promise<{ text: string; restaurants: Restaurant[] }> {
    // Simulate network latency for realistic UX
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));

    const intent = parseIntent(userMessage);
    const results = filterRestaurants(restaurants, intent);

    // Sort results: rated first, then by rating descending
    const sorted = [...results].sort((a, b) => {
      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      return rb - ra;
    });

    const text = generateMockResponse(userMessage, intent, sorted);

    return {
      text,
      restaurants: sorted.slice(0, 5), // Return top 5 matches
    };
  }

  /**
   * Create a new empty chat session.
   */
  createSession(restaurants: Restaurant[]): ChatSession {
    return {
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: "Hi! 👋 I'm your GourMap food assistant. Tell me what you're craving and I'll find the perfect restaurant for you!\n\nTry: \"Find me cheap sushi\" or \"Best rated restaurants nearby\"",
          timestamp: new Date(),
        },
      ],
      context: { restaurants },
    };
  }

  /**
   * Generate a unique message ID.
   */
  generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }
}

export const aiChatService = new AIChatService();
