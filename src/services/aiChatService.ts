/**
 * AI Chat Service — GourMap Food Assistant
 *
 * Features:
 * - Filipino/Taglish language detection and localized responses
 * - Category alias matching (e.g. "inihaw" → grill, "silog" → breakfast)
 * - Fuzzy intent parsing with price/rating filters
 * - Personalized recommendations using saved preferences
 *
 * To connect a real AI backend, replace the body of `AIChatService.chat()` with:
 *   - OpenAI:   POST https://api.openai.com/v1/chat/completions
 *   - Gemini:   POST https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
 *   - Ollama:   POST http://YOUR_SERVER:11434/api/chat
 *   - Claude:   POST https://api.anthropic.com/v1/messages
 */

import { Restaurant } from '../types';
import { CATEGORY_CONFIG, resolveCategoryConfig, guessCategoryFromName } from '../config/categoryConfig';

// ── Interfaces ────────────────────────────────────────────────────────────────

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

export interface PersonalizationContext {
  preferredCategories?: string[];
  favoriteRestaurantIds?: string[];
  displayName?: string;
}

// ── Category synonym map ──────────────────────────────────────────────────────
// Auto-generated from CATEGORY_CONFIG.aliases — single source of truth.

const CATEGORY_SYNONYMS: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
    map[key] = (config as any).aliases || [];
  }
  return map;
})();

// ── Filipino language detection ───────────────────────────────────────────────

const FILIPINO_MARKERS = new Set([
  'ako', 'ikaw', 'siya', 'kami', 'tayo', 'kayo', 'sila',
  'ang', 'ng', 'sa', 'na', 'at', 'ay', 'mga', 'po', 'opo',
  'yung', 'yun', 'ito', 'iyan', 'dito', 'doon', 'naman',
  'kasi', 'pero', 'kung', 'para', 'lang', 'din', 'rin',
  'gusto', 'pwede', 'saan', 'ano', 'sino', 'bakit', 'paano',
  'meron', 'wala', 'mayroon', 'hindi', 'oo', 'hinde',
  'kumain', 'kain', 'masarap', 'maganda', 'mura', 'mahal',
  'malapit', 'malayo', 'daw', 'raw', 'ba', 'ha', 'eh',
  'lahat', 'ibang', 'iba', 'bago', 'luma', 'malapit',
  'kumusta', 'musta', 'kamusta', 'hoy', 'uy', 'oi',
]);

function detectFilipino(query: string): boolean {
  const words = query.toLowerCase().split(/\s+/);
  return words.some(w => FILIPINO_MARKERS.has(w));
}

// ── Intent parser ─────────────────────────────────────────────────────────────

interface ParsedIntent {
  categories: string[];
  priceRange?: string;
  minRating?: number;
  keywords: string[];
  isGreeting: boolean;
  isHelp: boolean;
  isListAll: boolean;
  isFilipino: boolean;
}

function parseIntent(query: string): ParsedIntent {
  const q = query.toLowerCase().trim();
  const isFilipino = detectFilipino(q);

  const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|kumusta|musta|kamusta|sup|yo|hoy|uy|oi)\b/.test(q);
  const isHelp = q.includes('help') || q.includes('what can you do') || q.includes('how do you work') || q.includes('what do you do') || q.includes('paano') || q.includes('ano ang kaya');
  const isListAll = /^(show|list|give|display|all|what|lahat|ipakita).*(restaurant|place|food|eat|kain|pagkain)/.test(q) && !q.includes('category') && !q.includes('type');

  // Category detection — check all aliases
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
  if (/cheap|budget|affordable|mura|inexpensive|low.?cost|tipid|sulit/.test(q)) {
    priceRange = '₱';
  } else if (/expensive|fine dining|mahal|luxury|high.?end|sosyal|posh/.test(q)) {
    priceRange = '₱₱₱₱';
  } else if (/mid.?range|moderate|average price|katamtaman/.test(q)) {
    priceRange = '₱₱';
  }

  // Rating
  let minRating: number | undefined;
  if (/best|top.?rated|highly.?rated|highest.?rated|most.?popular|pinakamahusay|pinakamasarap|sikat/.test(q)) {
    minRating = 4.0;
  } else if (/good|decent|well.?rated|masarap|maganda|okay/.test(q)) {
    minRating = 3.5;
  }

  // General keywords (fallback name search)
  const stopWords = new Set([
    'a','an','the','is','are','i','want','find','me','some','any','good','best',
    'near','nearby','place','places','restaurant','restaurants','food','eat',
    'eating','for','to','in','at','of','and','or','with','that','have','has',
    'can','please','show','give','suggest','recommend','what','where','which',
    'how','do','does','get','looking','like','love','enjoy','try','trying',
    'around','here','there','this','that','these','those','my','your','our',
    // Filipino stop words
    'ang','ng','sa','na','at','ay','mga','po','opo','yung','yun','ito','iyan',
    'dito','doon','naman','kasi','pero','kung','para','lang','din','rin','ba',
    'ha','eh','daw','raw','ako','ikaw','siya','kami','tayo','kayo','sila',
    'gusto','pwede','saan','ano','sino','bakit','paano','meron','wala',
  ]);
  const keywords = q
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  return { categories: matchedCategories, priceRange, minRating, keywords, isGreeting, isHelp, isListAll, isFilipino };
}

// ── Restaurant filter ─────────────────────────────────────────────────────────

function getRestaurantEffectiveCategories(r: Restaurant): string[] {
  const resolved = resolveCategoryConfig(r.category, r.name);
  const keys = new Set<string>([resolved.name]);
  if (r.category) keys.add(r.category.toLowerCase().trim());
  const nameGuess = guessCategoryFromName(r.name || '');
  keys.add(nameGuess.name);
  return Array.from(keys);
}

function restaurantMatchesCategory(r: Restaurant, targetCategories: string[]): boolean {
  if (targetCategories.length === 0) return true;
  const effectiveCats = getRestaurantEffectiveCategories(r);
  const rName = (r.name || '').toLowerCase();
  const rDesc = (r.description || '').toLowerCase();

  if (targetCategories.some(tc => effectiveCats.includes(tc))) return true;

  for (const tc of targetCategories) {
    const synonyms = CATEGORY_SYNONYMS[tc] || [];
    if (synonyms.some(s => rName.includes(s) || rDesc.includes(s))) return true;
  }
  return false;
}

function filterRestaurants(restaurants: Restaurant[], intent: ParsedIntent): Restaurant[] {
  if (intent.isListAll && intent.categories.length === 0) {
    return restaurants.filter(r => {
      if (intent.priceRange === '₱' && (r.priceRange || '').length > 2) return false;
      if (intent.priceRange === '₱₱₱₱' && (r.priceRange || '').length < 3) return false;
      if (intent.minRating !== undefined && (r.rating || 0) < intent.minRating) return false;
      return true;
    });
  }

  return restaurants.filter(r => {
    if (intent.categories.length > 0 && !restaurantMatchesCategory(r, intent.categories)) return false;

    if (intent.priceRange) {
      const rPrice = r.priceRange || '';
      if (intent.priceRange === '₱' && rPrice.length > 2) return false;
      if (intent.priceRange === '₱₱₱₱' && rPrice.length < 3) return false;
    }

    if (intent.minRating !== undefined && (r.rating || 0) < intent.minRating) return false;

    if (intent.categories.length === 0 && intent.keywords.length > 0) {
      const rName = (r.name || '').toLowerCase();
      const rDesc = (r.description || '').toLowerCase();
      const rCat  = (r.category || '').toLowerCase();
      if (!intent.keywords.some(k => rName.includes(k) || rDesc.includes(k) || rCat.includes(k))) return false;
    }

    return true;
  });
}

// ── Response generator ────────────────────────────────────────────────────────

function getCategoryLabel(catKey: string): string {
  return CATEGORY_CONFIG[catKey]?.label || catKey.replace(/_/g, ' ');
}

function getCategoryEmoji(catKey: string): string {
  return (CATEGORY_CONFIG[catKey] as any)?.emoji || '🍽️';
}

function generateResponse(intent: ParsedIntent, results: Restaurant[], query: string): string {
  const fil = intent.isFilipino;

  // Greeting
  if (intent.isGreeting) {
    if (fil) {
      return "Kumusta! 👋 Ako ang inyong GourMap food assistant.\n\nPwede kang magtanong tulad ng:\n• \"Saan may masarap na inihaw?\"\n• \"Pinakamahusay na restaurant dito\"\n• \"Mura lang, Filipino food\"\n• \"May buffet ba dito?\"\n\nAno ang gusto mong kainin ngayon?";
    }
    return "Hello! 👋 I'm your GourMap food assistant.\n\nAsk me anything like:\n• \"Find me cheap inihaw\"\n• \"Best rated restaurants\"\n• \"Filipino food nearby\"\n• \"Recommend a good buffet\"\n\nWhat are you craving today?";
  }

  // Help
  if (intent.isHelp) {
    if (fil) {
      return "Pwede kitang tulungan mahanap ang perpektong restaurant! 🍽️\n\nSubukan mo:\n• **Ayon sa pagkain**: \"Gusto ko ng inihaw\" o \"Filipino food\"\n• **Ayon sa presyo**: \"Mura lang\" o \"Budget friendly\"\n• **Ayon sa rating**: \"Pinakamahusay\" o \"Top rated\"\n• **Pinagsama**: \"Pinakamura na Filipino food\"\n• **Local terms**: \"Inihaw\", \"Silog\", \"Merienda\", \"Kape\"\n\nAno ang gusto mo?";
    }
    return "I can help you find the perfect restaurant! 🍽️\n\nTry asking me:\n• **By cuisine**: \"I want inihaw\" or \"Filipino food\"\n• **By budget**: \"Cheap eats\" or \"Mura lang\"\n• **By rating**: \"Best rated\" or \"Pinakamasarap\"\n• **Combined**: \"Best cheap Filipino food\"\n• **Local terms**: \"Inihaw\", \"Silog\", \"Merienda\", \"Kape\"\n\nWhat sounds good?";
  }

  // No results — suggest related categories
  if (results.length === 0) {
    const catLabels = intent.categories.map(c => getCategoryLabel(c)).join(' / ');
    const related = Object.values(CATEGORY_CONFIG)
      .filter(c => c.name !== 'casual' && !intent.categories.includes(c.name))
      .slice(0, 3)
      .map(c => `${(c as any).emoji} ${c.label}`)
      .join(', ');

    if (fil) {
      let msg = `Pasensya na, wala akong nakitang restaurant`;
      if (catLabels) msg += ` para sa **${catLabels}**`;
      msg += `. 😕\n\n`;
      msg += `Mga mungkahi:\n• Subukan ang ibang kategorya`;
      if (related) msg += ` (${related})`;
      msg += `\n• Alisin ang price o rating filter\n• I-type ang "lahat ng restaurant"`;
      return msg;
    }

    let msg = `I couldn't find restaurants`;
    if (catLabels) msg += ` for **${catLabels}**`;
    msg += `. 😕\n\n`;
    msg += `Suggestions:\n• Try a related category`;
    if (related) msg += ` (${related})`;
    msg += `\n• Remove the price or rating filter\n• Ask me to "show all restaurants"`;
    return msg;
  }

  const count = results.length;
  const topRated = [...results].sort((a, b) => (b.rating || 0) - (a.rating || 0));

  let response = '';
  if (intent.categories.length > 0) {
    const labels = intent.categories.map(c => `${getCategoryEmoji(c)} ${getCategoryLabel(c)}`).join(' & ');
    response = fil
      ? `Nakahanap ako ng **${count}** ${labels} restaurant${count !== 1 ? 's' : ''}! 🎉\n\n`
      : `Found **${count}** ${labels} restaurant${count !== 1 ? 's' : ''}! 🎉\n\n`;
  } else if (intent.minRating) {
    response = fil
      ? `Narito ang **${count}** pinaka-highly rated na restaurant${count !== 1 ? 's' : ''}! ⭐\n\n`
      : `Here are **${count}** highly-rated restaurant${count !== 1 ? 's' : ''}! ⭐\n\n`;
  } else if (intent.priceRange === '₱') {
    response = fil
      ? `Nakahanap ako ng **${count}** murang pagkain! 💰\n\n`
      : `Found **${count}** budget-friendly option${count !== 1 ? 's' : ''}! 💰\n\n`;
  } else if (intent.isListAll) {
    response = fil
      ? `Narito ang **${count}** restaurant na available! 🍽️\n\n`
      : `Here are **${count}** restaurants available! 🍽️\n\n`;
  } else {
    response = fil
      ? `Nakahanap ako ng **${count}** restaurant para sa iyo! 🍽️\n\n`
      : `Found **${count}** restaurant${count !== 1 ? 's' : ''} for you! 🍽️\n\n`;
  }

  if (topRated[0]?.rating && topRated[0].rating > 0) {
    const pickLabel = fil ? '⭐ Pinakamahusay' : '⭐ Top pick';
    response += `${pickLabel}: **${topRated[0].name}** (${topRated[0].rating.toFixed(1)})\n\n`;
  }

  response += count > 5
    ? (fil ? `Ipinapakita ang top 5 results. I-tap ang kahit anong card para sa detalye.` : `Showing the top 5 results. Tap any card to see details.`)
    : (fil ? `I-tap ang kahit anong card para sa detalye.` : `Tap any card below to see details.`);

  return response;
}

// ── Public API ────────────────────────────────────────────────────────────────

class AIChatService {
  async chat(
    userMessage: string,
    restaurants: Restaurant[],
    history: ChatMessage[] = [],
    personalization?: PersonalizationContext
  ): Promise<{ text: string; restaurants: Restaurant[] }> {
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 300));

    const intent = parseIntent(userMessage);

    if (intent.isGreeting || intent.isHelp) {
      const greeting = personalization?.displayName
        ? (intent.isFilipino ? `Kumusta ${personalization.displayName}! 👋` : `Hi ${personalization.displayName}! 👋`)
        : undefined;
      const base = generateResponse(intent, [], userMessage);
      const text = greeting ? base.replace(/^(Kumusta|Hello)! 👋/, greeting) : base;
      return { text, restaurants: [] };
    }

    const q = userMessage.toLowerCase();
    const isAskingPersonalized = /recommend|suggest|for me|my taste|based on|what.*like|what.*love|para sa akin|para sa'kin|gusto ko|paborito/.test(q);

    let results = filterRestaurants(restaurants, intent);

    if (
      intent.categories.length === 0 &&
      !intent.isListAll &&
      personalization?.preferredCategories?.length
    ) {
      const preferred = personalization.preferredCategories;

      if (isAskingPersonalized) {
        const scored = restaurants
          .map(r => {
            let score = 0;
            const effectiveCats = getRestaurantEffectiveCategories(r);
            if (preferred.some(p => effectiveCats.includes(p))) score += 2;
            if (personalization.favoriteRestaurantIds?.includes(r.id)) score += 1;
            return { r, score };
          })
          .filter(s => s.score > 0)
          .sort((a, b) => b.score - a.score || (b.r.rating || 0) - (a.r.rating || 0))
          .map(s => s.r);

        if (scored.length > 0) {
          const prefLabels = preferred.slice(0, 3).map(k => CATEGORY_CONFIG[k]?.label || k).join(', ');
          const name = personalization.displayName
            ? (intent.isFilipino ? `, ${personalization.displayName}` : `, ${personalization.displayName}`)
            : '';
          const text = intent.isFilipino
            ? `Batay sa iyong mga paborito (${prefLabels}), narito ang mga lugar na maaaring magustuhan mo${name}! 🎯\n\nI-tap ang kahit anong card para sa detalye.`
            : `Based on your preferences (${prefLabels}), here are some places you might love${name}! 🎯\n\nTap any card to see details.`;
          return { text, restaurants: scored.slice(0, 5) };
        }
      }

      results = filterRestaurants(restaurants, intent);
    }

    const sorted = [...results].sort((a, b) => {
      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      return rb - ra;
    });

    const text = generateResponse(intent, sorted, userMessage);
    return { text, restaurants: sorted.slice(0, 5) };
  }

  createSession(restaurants: Restaurant[], personalization?: PersonalizationContext): ChatSession {
    const name = personalization?.displayName;
    const hasPrefs = (personalization?.preferredCategories?.length || 0) > 0;
    const fil = false; // session creation doesn't know language yet

    let welcomeMsg = `Hi${name ? ` ${name}` : ''}! 👋 I'm your GourMap food assistant.\n\n`;

    if (hasPrefs) {
      const prefEmojis = (personalization!.preferredCategories || [])
        .slice(0, 3)
        .map(k => (CATEGORY_CONFIG[k] as any)?.emoji || '')
        .join(' ');
      welcomeMsg += `I know you love ${prefEmojis} — ask me for recommendations anytime!\n\n`;
    }

    welcomeMsg += `Tell me what you're craving!\n\nTry: "Inihaw", "Mura lang", "Filipino food", or "Best rated restaurants"`;

    return {
      messages: [{
        id: 'welcome',
        role: 'assistant',
        content: welcomeMsg,
        timestamp: new Date(),
      }],
      context: { restaurants },
    };
  }

  generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }
}

export const aiChatService = new AIChatService();
