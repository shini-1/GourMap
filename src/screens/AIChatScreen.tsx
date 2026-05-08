import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { aiChatService, ChatMessage, ChatSession } from '../services/aiChatService';
import { restaurantService } from '../services/restaurantService';
import { Restaurant } from '../types';
import { resolveCategoryConfig } from '../config/categoryConfig';

const PLACEHOLDER_IMAGE = require('../../assets/icon.png');

const COLORS = {
  background:    '#E6F3FF',
  card:          '#FFFFFF',
  border:        '#000000',
  textPrimary:   '#000000',
  textSecondary: '#666666',
  textMuted:     '#999999',
  userBubble:    '#000000',
  userText:      '#FFFFFF',
  aiBubble:      '#FFFFFF',
  aiText:        '#000000',
  inputBg:       '#FFFFFF',
  sendBtn:       '#000000',
  sendBtnText:   '#FFFFFF',
  accent:        '#4A90E2',
};

// ── Restaurant result card (inline in chat) ───────────────────────────────────

function InlineChatRestaurantCard({
  restaurant,
  onPress,
}: {
  restaurant: Restaurant;
  onPress: () => void;
}) {
  const categoryConfig = resolveCategoryConfig(restaurant.category, restaurant.name);
  const rating = typeof restaurant.rating === 'number' ? restaurant.rating : 0;
  const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
  const imageSource = restaurant.image?.trim()
    ? { uri: restaurant.image.trim() }
    : PLACEHOLDER_IMAGE;

  return (
    <TouchableOpacity style={styles.resultCard} onPress={onPress} activeOpacity={0.8}>
      <Image
        source={imageSource}
        style={styles.resultImage}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View style={styles.resultContent}>
        <Text style={styles.resultName} numberOfLines={1}>{restaurant.name}</Text>
        <Text style={styles.resultCategory}>
          {categoryConfig.emoji} {categoryConfig.label}
        </Text>
        <View style={styles.resultRatingRow}>
          <Text style={styles.resultStars}>{stars}</Text>
          <Text style={styles.resultRatingText}>
            {rating > 0 ? rating.toFixed(1) : 'No ratings'}
          </Text>
          {restaurant.priceRange ? (
            <Text style={styles.resultPrice}>{restaurant.priceRange}</Text>
          ) : null}
        </View>
      </View>
      <Text style={styles.resultArrow}>›</Text>
    </TouchableOpacity>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  onRestaurantPress,
}: {
  message: ChatMessage;
  onRestaurantPress: (r: Restaurant) => void;
}) {
  const isUser = message.role === 'user';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isUser ? 20 : -20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowAI,
        { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
      ]}
    >
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Text style={styles.aiAvatarText}>🤖</Text>
        </View>
      )}

      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        {/* Parse bold markdown (**text**) for simple formatting */}
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
          {message.content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <Text key={i} style={{ fontWeight: '700' }}>
                {part.slice(2, -2)}
              </Text>
            ) : (
              <Text key={i}>{part}</Text>
            )
          )}
        </Text>

        {/* Inline restaurant results */}
        {message.restaurants && message.restaurants.length > 0 && (
          <View style={styles.resultsList}>
            {message.restaurants.map(r => (
              <InlineChatRestaurantCard
                key={r.id}
                restaurant={r}
                onPress={() => onRestaurantPress(r)}
              />
            ))}
          </View>
        )}

        <Text style={[styles.timestamp, isUser ? styles.timestampUser : styles.timestampAI]}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </Animated.View>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      ).start();

    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  return (
    <View style={[styles.messageRow, styles.messageRowAI]}>
      <View style={styles.aiAvatar}>
        <Text style={styles.aiAvatarText}>🤖</Text>
      </View>
      <View style={[styles.bubble, styles.bubbleAI, styles.typingBubble]}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.typingDot, { transform: [{ translateY: dot }] }]}
          />
        ))}
      </View>
    </View>
  );
}

// ── Quick suggestion chips ────────────────────────────────────────────────────

const SUGGESTIONS = [
  '🍣 Find sushi nearby',
  '💰 Cheap eats',
  '⭐ Best rated',
  '🍖 BBQ & Grill',
  '☕ Coffee shops',
  '🍜 Filipino food',
];

function SuggestionChips({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <View style={styles.chipsContainer}>
      <FlatList
        data={SUGGESTIONS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item}
        contentContainerStyle={styles.chipsList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chip}
            onPress={() => onSelect(item.replace(/^[^\s]+\s/, ''))} // strip emoji prefix
            activeOpacity={0.7}
          >
            <Text style={styles.chipText}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AIChatScreen({ navigation }: { navigation: any }) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // Load restaurants once on mount
  useEffect(() => {
    const load = async () => {
      try {
        const restaurants = await restaurantService.getAllRestaurants();
        setSession(aiChatService.createSession(restaurants));
      } catch (err) {
        console.error('AIChatScreen: failed to load restaurants', err);
        setSession(aiChatService.createSession([]));
      } finally {
        setIsLoadingRestaurants(false);
      }
    };
    load();
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? inputText).trim();
    if (!content || !session || isTyping) return;

    setInputText('');

    const userMsg: ChatMessage = {
      id: aiChatService.generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setSession(prev => prev
      ? { ...prev, messages: [...prev.messages, userMsg] }
      : prev
    );
    setIsTyping(true);
    scrollToBottom();

    try {
      const { text: responseText, restaurants } = await aiChatService.chat(
        content,
        session.context.restaurants,
        session.messages
      );

      const aiMsg: ChatMessage = {
        id: aiChatService.generateId(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
        restaurants: restaurants.length > 0 ? restaurants : undefined,
      };

      setSession(prev => prev
        ? { ...prev, messages: [...prev.messages, aiMsg] }
        : prev
      );
    } catch (err) {
      const errMsg: ChatMessage = {
        id: aiChatService.generateId(),
        role: 'assistant',
        content: "Sorry, I ran into an issue. Please try again! 😅",
        timestamp: new Date(),
      };
      setSession(prev => prev
        ? { ...prev, messages: [...prev.messages, errMsg] }
        : prev
      );
    } finally {
      setIsTyping(false);
      scrollToBottom();
    }
  }, [inputText, session, isTyping, scrollToBottom]);

  const handleRestaurantPress = useCallback((restaurant: Restaurant) => {
    navigation.navigate('RestaurantDetail', {
      restaurantId: restaurant.id,
      restaurant,
    });
  }, [navigation]);

  if (isLoadingRestaurants) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading food assistant...</Text>
      </View>
    );
  }

  const messages = session?.messages ?? [];
  const showSuggestions = messages.length <= 1;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backIcon}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🤖 Food Assistant</Text>
          <Text style={styles.headerSubtitle}>Ask me anything about food</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            onRestaurantPress={handleRestaurantPress}
          />
        )}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={scrollToBottom}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={isTyping ? <TypingIndicator /> : null}
      />

      {/* Quick suggestions (shown only at start) */}
      {showSuggestions && (
        <SuggestionChips onSelect={text => sendMessage(text)} />
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask me about food..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={300}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage()}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isTyping) && styles.sendButtonDisabled]}
          onPress={() => sendMessage()}
          disabled={!inputText.trim() || isTyping}
          activeOpacity={0.8}
        >
          {isTyping ? (
            <ActivityIndicator size="small" color={COLORS.sendBtnText} />
          ) : (
            <Text style={styles.sendIcon}>↑</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textSecondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  headerRight: {
    width: 36,
  },

  // Messages
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAI: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  aiAvatarText: {
    fontSize: 16,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
  },
  bubbleUser: {
    backgroundColor: COLORS.userBubble,
    borderColor: COLORS.userBubble,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: COLORS.aiBubble,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: COLORS.userText,
  },
  bubbleTextAI: {
    color: COLORS.aiText,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  timestampUser: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
  },
  timestampAI: {
    color: COLORS.textMuted,
  },

  // Typing indicator
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 4,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.textMuted,
  },

  // Inline restaurant results
  resultsList: {
    marginTop: 10,
    gap: 8,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
    padding: 8,
  },
  resultImage: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  resultContent: {
    flex: 1,
    marginLeft: 10,
  },
  resultName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  resultCategory: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 3,
  },
  resultRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultStars: {
    fontSize: 10,
    color: '#FFD700',
  },
  resultRatingText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  resultPrice: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  resultArrow: {
    fontSize: 20,
    color: COLORS.textMuted,
    marginLeft: 6,
  },

  // Suggestion chips
  chipsContainer: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  chipsList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: COLORS.card,
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.sendBtn,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  sendIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.sendBtnText,
  },
});
