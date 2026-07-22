// App.tsx
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';

import { navigationRef } from './src/navigation/NavigationService';
import { useAuthStore } from './src/store/useAuthStore';

// Screens
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
import FunnelScreen from './src/screens/FunnelScreen';
import SuperAdminScreen from './src/screens/SuperAdminScreen';

const Stack = createNativeStackNavigator();
SplashScreen.preventAutoHideAsync();

export default function App() {
  const { token, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth().then(() => {
      SplashScreen.hideAsync();
    });
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            {token == null ? (
              // Auth Stack (کاربر لاگین نیست)
              <Stack.Screen name="Login" component={LoginScreen} />
            ) : (
              // App Stack (کاربر لاگین است)
              <Stack.Group>
                <Stack.Screen name="Dashboard" component={DashboardScreen} />
                <Stack.Screen name="Properties" component={PropertiesScreen} />
                <Stack.Screen name="AddProperty" component={AddPropertyScreen} />
                <Stack.Screen name="VoiceAdd" component={VoiceAddScreen} />
                <Stack.Screen name="Customers" component={CustomersScreen} />
                <Stack.Screen name="Funnel" component={FunnelScreen} />
                <Stack.Screen name="Financials" component={FinancialsScreen} />
                <Stack.Screen name="Reels" component={ReelsScreen} />
                <Stack.Screen name="Partnership" component={PartnershipScreen} />
                <Stack.Screen name="MyCard" component={MyCardScreen} />
                <Stack.Screen name="Tickets" component={TicketsScreen} />
                <Stack.Screen name="Reminders" component={RemindersScreen} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
                <Stack.Screen name="Chatbot" component={ChatbotScreen} />
                <Stack.Screen name="SuperAdmin" component={SuperAdminScreen} />
              </Stack.Group>
            )}
          </Stack.Navigator>
        </NavigationContainer>
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#0B0F19', justifyContent: 'center', alignItems: 'center' }
});