import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';

import { navigationRef } from './src/navigation/NavigationService';

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

// مخفی کردن اسپلش اسکرین بعد از لود شدن
SplashScreen.preventAutoHideAsync();

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#10b981', backgroundColor: '#1E293B', borderRadius: 16, height: 'auto', paddingVertical: 10, borderWidth: 1, borderColor: '#334155' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 14, fontWeight: 'bold', color: '#f8fafc', textAlign: 'right' }}
      text2Style={{ fontSize: 12, color: '#94a3b8', textAlign: 'right', marginTop: 4 }}
      renderLeadingIcon={() => <View style={{justifyContent: 'center', paddingLeft: 15}}><Ionicons name="checkmark-circle" size={28} color="#10b981" /></View>}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#ef4444', backgroundColor: '#1E293B', borderRadius: 16, height: 'auto', paddingVertical: 10, borderWidth: 1, borderColor: '#334155' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 14, fontWeight: 'bold', color: '#f8fafc', textAlign: 'right' }}
      text2Style={{ fontSize: 12, color: '#94a3b8', textAlign: 'right', marginTop: 4 }}
      renderLeadingIcon={() => <View style={{justifyContent: 'center', paddingLeft: 15}}><Ionicons name="alert-circle" size={28} color="#ef4444" /></View>}
    />
  ),
  info: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#3b82f6', backgroundColor: '#1E293B', borderRadius: 16, height: 'auto', paddingVertical: 10, borderWidth: 1, borderColor: '#334155' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 14, fontWeight: 'bold', color: '#f8fafc', textAlign: 'right' }}
      text2Style={{ fontSize: 12, color: '#94a3b8', textAlign: 'right', marginTop: 4 }}
      renderLeadingIcon={() => <View style={{justifyContent: 'center', paddingLeft: 15}}><Ionicons name="information-circle" size={28} color="#3b82f6" /></View>}
    />
  )
};

export default function App() {
  useEffect(() => {
    // از آنجایی که فعلاً فونت کاستوم را حذف کردیم، بلافاصله اسپلش را مخفی می‌کنیم
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }} initialRouteName="Login">
            <Stack.Screen name="Login" component={LoginScreen} />
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
          </Stack.Navigator>
        </NavigationContainer>
        
        <Toast config={toastConfig} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}