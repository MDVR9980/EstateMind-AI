import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { navigationRef } from './src/navigation/NavigationService';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PropertiesScreen from './src/screens/PropertiesScreen';
import VoiceAddScreen from './src/screens/VoiceAddScreen';
import CustomersScreen from './src/screens/CustomersScreen';
import FinancialsScreen from './src/screens/FinancialsScreen';
import ReelsScreen from './src/screens/ReelsScreen';
import MyCardScreen from './src/screens/MyCardScreen';
import ChatbotScreen from './src/screens/ChatbotScreen';
import TicketsScreen from './src/screens/TicketsScreen';
import AddPropertyScreen from './src/screens/AddPropertyScreen';
import RemindersScreen from './src/screens/RemindersScreen';
import PartnershipScreen from './src/screens/PartnershipScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      {/* ۲. اضافه کردن پراپ ref به تگ NavigationContainer */}
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Properties" component={PropertiesScreen} />
          <Stack.Screen name="AddProperty" component={AddPropertyScreen} />
          <Stack.Screen name="VoiceAdd" component={VoiceAddScreen} />
          <Stack.Screen name="Customers" component={CustomersScreen} />
          <Stack.Screen name="Financials" component={FinancialsScreen} />
          <Stack.Screen name="Reels" component={ReelsScreen} />
          <Stack.Screen name="Partnership" component={PartnershipScreen} />
          <Stack.Screen name="MyCard" component={MyCardScreen} />
          <Stack.Screen name="Tickets" component={TicketsScreen} />
          <Stack.Screen name="Reminders" component={RemindersScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Chatbot" component={ChatbotScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      
      <Toast />
    </SafeAreaProvider>
  );
}