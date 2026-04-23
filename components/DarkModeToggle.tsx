import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

function DarkModeToggle() {
  const { isDark, toggleTheme, theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={{
        padding: 10,
        backgroundColor: theme.primary,
        borderRadius: 5,
        margin: 10,
      }}
    >
      <Text style={{ color: theme.background }}>
        {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
      </Text>
    </TouchableOpacity>
  );
}

export default DarkModeToggle;
