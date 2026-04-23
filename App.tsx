import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './theme/ThemeContext';
import { AuthProvider } from './components/AuthContext';
import RoleSelectionScreen from './screens/RoleSelectionScreen';
import HomeScreen from './screens/HomeScreen';
import BusinessPanelScreen from './screens/BusinessPanelScreen';
import AdminPanelScreen from './screens/AdminPanelScreen';
import CreateAdminScreen from './screens/CreateAdminScreen';
import RestaurantDetailScreen from './screens/RestaurantDetailScreen';
import CreateRestaurantScreen from './screens/CreateRestaurantScreen';
import BusinessDashboardScreen from './screens/BusinessDashboardScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import MenuListScreen from './screens/MenuListScreen';
import AddMenuItemScreen from './screens/AddMenuItemScreen';
import EditMenuItemsScreen from './screens/EditMenuItemsScreen';
import PostPromoScreen from './screens/PostPromoScreen';

type Screen = 'RoleSelection' | 'Home' | 'BusinessPanel' | 'AdminPanel' | 'CreateAdmin' | 'RestaurantDetail' | 'BusinessDashboard' | 'EditProfile' | 'MenuList' | 'AddMenuItem' | 'EditMenuItems' | 'PostPromo' | 'CreateRestaurant';

interface NavigationParams {
  restaurantId?: string;
  restaurant?: any;
  [key: string]: any;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('RoleSelection');
  const [screenParams, setScreenParams] = useState<NavigationParams>({});
  const [navigationHistory, setNavigationHistory] = useState<Screen[]>(['RoleSelection']);

  const navigate = (screen: Screen, params?: NavigationParams) => {
    setCurrentScreen(screen);
    if (params) {
      setScreenParams(params);
    } else {
      setScreenParams({});
    }
    // Add to navigation history
    setNavigationHistory(prev => [...prev, screen]);
  };

  const goBack = () => {
    // If we have more than one screen in history, go back one screen
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory];
      newHistory.pop(); // Remove current screen
      const previousScreen = newHistory[newHistory.length - 1];
      
      setCurrentScreen(previousScreen);
      setNavigationHistory(newHistory);
      setScreenParams({}); // Clear params when going back
    } else {
      // If we're at the root, go to RoleSelection
      setCurrentScreen('RoleSelection');
      setNavigationHistory(['RoleSelection']);
      setScreenParams({});
    }
  };

  const navigation = {
    navigate,
    goBack,
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'RoleSelection':
        return <RoleSelectionScreen navigation={navigation} />;
      case 'Home':
        return <HomeScreen navigation={navigation} />;
      case 'BusinessPanel':
        return <BusinessPanelScreen navigation={navigation} />;
      case 'AdminPanel':
        return <AdminPanelScreen navigation={navigation} />;
      case 'CreateAdmin':
        return <CreateAdminScreen navigation={navigation} />;
      case 'RestaurantDetail':
        return <RestaurantDetailScreen navigation={navigation} route={{ params: screenParams }} />;
      case 'CreateRestaurant':
        return <CreateRestaurantScreen navigation={navigation} />;
      case 'BusinessDashboard':
        return <BusinessDashboardScreen navigation={navigation} />;
      case 'EditProfile':
        return <EditProfileScreen navigation={navigation} />;
      case 'MenuList':
        return <MenuListScreen navigation={navigation} />;
      case 'AddMenuItem':
        return <AddMenuItemScreen navigation={navigation} />;
      case 'EditMenuItems':
        return <EditMenuItemsScreen navigation={navigation} />;
      case 'PostPromo':
        return <PostPromoScreen navigation={navigation} />;
      default:
        return <HomeScreen navigation={navigation} />;
    }
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          {renderScreen()}
          <StatusBar style="auto" />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
