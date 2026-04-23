import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import AuthModal from '../screens/AuthModal';
import BusinessPanelScreen from '../screens/BusinessPanelScreen';
import AdminPanelScreen from '../screens/AdminPanelScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';

const Stack = createStackNavigator();

function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Home">
      {/* <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} /> */}
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="BusinessPanel" component={BusinessPanelScreen} />
      <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
    </Stack.Navigator>
  );
}

export default AppNavigator;
