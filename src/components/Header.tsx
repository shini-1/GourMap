import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

interface HeaderProps {
  showDarkModeToggle?: boolean;
}

function Header({ showDarkModeToggle = false }: HeaderProps) {
  const { isDark, toggleTheme, theme } = useTheme();

  if (!showDarkModeToggle) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={toggleTheme}
          accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          accessibilityHint="Toggles between light and dark theme"
          style={styles.toggleButton}
        >
          <Text style={[styles.toggleText, { color: theme.text }]}>{isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1000,
  },
  header: {
    padding: 10,
  },
  toggleButton: {
    padding: 5,
  },
  toggleText: {
    fontSize: 24,
  },
});

export default Header;
