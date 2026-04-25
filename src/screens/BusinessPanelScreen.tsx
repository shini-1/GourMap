import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Header from '../components/Header';

function BusinessPanelScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();

  // Automatically navigate to business dashboard when this screen loads
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (navigation && typeof navigation.navigate === 'function') {
          navigation.navigate('BusinessDashboard');
        } else {
          console.error('Navigation object not available in BusinessPanelScreen');
        }
      } catch (error) {
        console.error('Error navigating to BusinessDashboard:', error);
      }
    }, 1000); // Small delay for smooth transition

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header />
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>GourMap for Business</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Redirecting to dashboard...
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  },
});

export default BusinessPanelScreen;
