import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../services/api';

export default function LoginScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'otp' | 'password'>('otp');
  
  // استیت‌های ورود با رمز عبور
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // استیت‌های ورود با پیامک
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);

  const switchTab = (tab: 'otp' | 'password') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    if (tab === 'otp') setIsOtpSent(false);
  };

  const handlePasswordLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!username || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({ type: 'error', text1: 'خطا', text2: 'لطفاً نام کاربری و رمز عبور را وارد کنید.' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, { username, password });
      if (response.data.access_token) {
        await SecureStore.setItemAsync('userToken', response.data.access_token);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({ type: 'success', text1: 'خوش آمدید', text2: response.data.message });
        navigation.replace('Dashboard');
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMsg = error.response?.data?.detail || "خطا در ارتباط با سرور";
      Toast.show({ type: 'error', text1: 'خطای ورود', text2: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!phone) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Toast.show({ type: 'error', text1: 'خطا', text2: 'لطفاً شماره موبایل را وارد کنید.' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/send-otp`, { phone });
      if (response.data.status === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsOtpSent(true);
        Toast.show({ type: 'success', text1: 'کد ارسال شد', text2: 'لطفاً کد پیامک شده را وارد کنید.' });
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMsg = error.response?.data?.detail || "مشکلی در ارسال کد پیش آمد.";
      Toast.show({ type: 'error', text1: 'خطا', text2: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (!otpCode) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({ type: 'error', text1: 'خطا', text2: 'لطفاً کد ۵ رقمی را وارد کنید.' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/verify-otp`, { phone, code: otpCode });
      if (response.data.access_token) {
        await SecureStore.setItemAsync('userToken', response.data.access_token);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({ type: 'success', text1: 'خوش آمدید', text2: 'ورود موفقیت‌آمیز بود.' });
        navigation.replace('Dashboard');
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMsg = error.response?.data?.detail || "کد وارد شده اشتباه است.";
      Toast.show({ type: 'error', text1: 'خطا', text2: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Decorators */}
      <View style={styles.bgCircleTop} />
      <View style={styles.bgCircleBottom} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center' }}>
        <View style={styles.logoContainer}>
          <Ionicons name="shield-checkmark" size={60} color="#10b981" />
          <Text style={styles.title}>EstateMind <Text style={styles.titleHighlight}>AI</Text></Text>
          <Text style={styles.subtitle}>سیستم هوشمند مدیریت املاک</Text>
        </View>

        <View style={styles.card}>
          {/* تب‌بندی */}
          <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'otp' && styles.tabBtnActive]} onPress={() => switchTab('otp')}>
              <Text style={[styles.tabText, activeTab === 'otp' && styles.tabTextActive]}>رمز یکبار مصرف</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'password' && styles.tabBtnActive]} onPress={() => switchTab('password')}>
              <Text style={[styles.tabText, activeTab === 'password' && styles.tabTextActive]}>رمز عبور ثابت</Text>
            </TouchableOpacity>
          </View>

          {/* فرم ورود با پیامک */}
          {activeTab === 'otp' && (
            <View>
              {!isOtpSent ? (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>شماره موبایل</Text>
                    <TextInput style={styles.input} placeholder="مثلا: 09123456789" placeholderTextColor="#64748b" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                  </View>
                  <TouchableOpacity style={styles.button} onPress={handleRequestOtp} disabled={isLoading}>
                    <LinearGradient colors={['#10b981', '#059669']} style={styles.btnGradient}>
                      {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ارسال کد تایید</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>کد ۵ رقمی تایید</Text>
                    <TextInput style={[styles.input, styles.otpInput]} placeholder="- - - - -" placeholderTextColor="#64748b" value={otpCode} onChangeText={setOtpCode} keyboardType="number-pad" maxLength={5} />
                  </View>
                  <TouchableOpacity style={styles.button} onPress={handleVerifyOtp} disabled={isLoading}>
                    <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.btnGradient}>
                      {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>تایید و ورود</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsOtpSent(false)} style={styles.resetBtn}>
                    <Text style={styles.resetBtnText}>اصلاح شماره موبایل</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* فرم ورود با رمز عبور */}
          {activeTab === 'password' && (
            <View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>نام کاربری (موبایل)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput style={styles.inputWithIcon} placeholder="admin" placeholderTextColor="#64748b" value={username} onChangeText={setUsername} autoCapitalize="none" />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>رمز عبور</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput style={styles.inputWithIcon} placeholder="***" placeholderTextColor="#64748b" value={password} onChangeText={setPassword} secureTextEntry />
                </View>
              </View>

              <TouchableOpacity style={styles.button} onPress={handlePasswordLogin} disabled={isLoading}>
                <LinearGradient colors={['#10b981', '#059669']} style={styles.btnGradient}>
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ورود به سیستم</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19', padding: 20 },
  bgCircleTop: { position: 'absolute', top: -100, left: -50, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(16, 185, 129, 0.1)', blurRadius: 50 },
  bgCircleBottom: { position: 'absolute', bottom: -100, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(59, 130, 246, 0.1)', blurRadius: 50 },
  
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontFamily: 'Vazir-Bold', color: '#f8fafc', textAlign: 'center', marginTop: 10 },
  titleHighlight: { color: '#10b981' },
  subtitle: { fontSize: 13, fontFamily: 'Vazir-Regular', color: '#94a3b8', textAlign: 'center', marginTop: 5 },
  
  card: { backgroundColor: '#1E293B', padding: 24, borderRadius: 32, borderWidth: 1, borderColor: '#334155', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
  
  tabContainer: { flexDirection: 'row-reverse', backgroundColor: '#0B0F19', padding: 5, borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: '#334155' },
  tabBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#10b981', shadowColor: '#10b981', shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
  tabText: { color: '#64748b', fontSize: 13, fontFamily: 'Vazir-Bold' },
  tabTextActive: { color: '#fff' },

  inputContainer: { marginBottom: 16 },
  label: { color: '#cbd5e1', marginBottom: 8, fontSize: 13, fontFamily: 'Vazir-Bold', textAlign: 'right' },
  input: { backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 16, color: '#f8fafc', textAlign: 'left', fontFamily: 'System', fontSize: 16 },
  
  inputWrapper: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#334155', borderRadius: 16, paddingHorizontal: 16 },
  inputIcon: { marginLeft: 10 },
  inputWithIcon: { flex: 1, paddingVertical: 16, color: '#f8fafc', textAlign: 'left', fontFamily: 'System', fontSize: 16 },
  
  otpInput: { textAlign: 'center', fontSize: 24, letterSpacing: 10, fontFamily: 'System', fontWeight: 'bold', color: '#10b981', borderColor: '#10b981' },
  
  button: { marginTop: 15, borderRadius: 16, overflow: 'hidden' },
  btnGradient: { padding: 18, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontFamily: 'Vazir-Bold' },
  
  resetBtn: { marginTop: 20, alignItems: 'center' },
  resetBtnText: { color: '#64748b', fontSize: 13, fontFamily: 'Vazir-Regular', textDecorationLine: 'underline' }
});