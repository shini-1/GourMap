import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';

// Screens
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import HomeScreen from '../screens/HomeScreen';
import BusinessPanelScreen from '../screens/BusinessPanelScreen';
import AdminPanelScreen from '../screens/AdminPanelScreen';
import CreateAdminScreen from '../screens/CreateAdminScreen';
import RestaurantDetailScreen from '../screens/RestaurantDetailScreen';
import CreateRestaurantScreen from '../screens/CreateRestaurantScreen';
import BusinessDashboardScreen from '../screens/BusinessDashboardScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import MenuListScreen from '../screens/MenuListScreen';
import AddMenuItemScreen from '../screens/AddMenuItemScreen';
import EditMenuItemsScreen from '../screens/EditMenuItemsScreen';
import PostPromoScreen from '../screens/PostPromoScreen';
import LoginScreenNew from '../screens/LoginScreenNew';
import RegisterScreenNew from '../screens/RegisterScreenNew';

const Stack = createStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="RoleSelection"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="BusinessPanel" component={BusinessPanelScreen} />
      <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
      <Stack.Screen name="CreateAdmin" component={CreateAdminScreen} />
      <Stack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} />
      <Stack.Screen name="CreateRestaurant" component={CreateRestaurantScreen} />
      <Stack.Screen name="BusinessDashboard" component={BusinessDashboardScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="MenuList" component={MenuListScreen} />
      <Stack.Screen name="AddMenuItem" component={AddMenuItemScreen} />
      <Stack.Screen name="EditMenuItems" component={EditMenuItemsScreen} />
      <Stack.Screen name="PostPromo" component={PostPromoScreen} />
      <Stack.Screen name="Login" component={LoginScreenNew} />
      <Stack.Screen name="Register" component={RegisterScreenNew} />
    </Stack.Navigator>
  );
};

export default RootNavigator;
