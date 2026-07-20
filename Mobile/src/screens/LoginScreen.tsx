import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Toast from 'react-native-toast-message';

const BASE_URL = "http://10.56.173.18:8000";

export default function LoginScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'otp' | 'password'>('otp');
  
  // استیت‌های مربوط به ورود با رمز عبور
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // استیت‌های مربوط به ورود با پیامک
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);

  // 1. ورود با نام کاربری و رمز عبور
  const handlePasswordLogin = async () => {
    if (!username || !password) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'لطفاً نام کاربری و رمز عبور را وارد کنید.' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, { username, password });
      if (response.data.access_token) {
        await SecureStore.setItemAsync('userToken', response.data.access_token);
        Toast.show({ type: 'success', text1: 'خوش آمدید', text2: response.data.message });
        navigation.replace('Dashboard');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || "خطا در ارتباط با سرور";
      Toast.show({ type: 'error', text1: 'خطای ورود', text2: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  // 2. درخواست ارسال کد پیامک (OTP)
  const handleRequestOtp = async () => {
    if (!phone) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'لطفاً شماره موبایل را وارد کنید.' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/send-otp`, { phone });
      if (response.data.status === 'success') {
        setIsOtpSent(true);
        Toast.show({ type: 'success', text1: 'کد ارسال شد', text2: 'لطفاً کد پیامک شده را وارد کنید.' });
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || "مشکلی در ارسال کد پیش آمد.";
      Toast.show({ type: 'error', text1: 'خطا', text2: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  // 3. تایید کد پیامک و ورود
  const handleVerifyOtp = async () => {
    if (!otpCode) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'لطفاً کد ۵ رقمی را وارد کنید.' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/verify-otp`, { phone, code: otpCode });
      if (response.data.access_token) {
        await SecureStore.setItemAsync('userToken', response.data.access_token);
        Toast.show({ type: 'success', text1: 'خوش آمدید', text2: 'ورود موفقیت‌آمیز بود.' });
        navigation.replace('Dashboard');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || "کد وارد شده اشتباه است.";
      Toast.show({ type: 'error', text1: 'خطا', text2: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center' }}>
        <View style={styles.card}>
          <Text style={styles.title}>EstateMind <Text style={styles.titleHighlight}>AI</Text></Text>
          <Text style={styles.subtitle}>دستیار هوشمند املاک در جیب شما</Text>

          {/* تب‌بندی */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'otp' && styles.tabBtnActive]} 
              onPress={() => { setActiveTab('otp'); setIsOtpSent(false); }}
            >
              <Text style={[styles.tabText, activeTab === 'otp' && styles.tabTextActive]}>با پیامک (OTP)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'password' && styles.tabBtnActive]} 
              onPress={() => setActiveTab('password')}
            >
              <Text style={[styles.tabText, activeTab === 'password' && styles.tabTextActive]}>با رمز عبور</Text>
            </TouchableOpacity>
          </View>

          {/* فرم ورود با پیامک */}
          {activeTab === 'otp' && (
            <View>
              {!isOtpSent ? (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>شماره موبایل</Text>
                    <TextInput style={styles.input} placeholder="مثلا: 0912..." placeholderTextColor="#64748b" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                  </View>
                  <TouchableOpacity style={styles.button} onPress={handleRequestOtp} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ارسال کد تایید</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>کد ۵ رقمی تایید</Text>
                    <TextInput style={[styles.input, styles.otpInput]} placeholder="- - - - -" placeholderTextColor="#64748b" value={otpCode} onChangeText={setOtpCode} keyboardType="number-pad" maxLength={5} />
                  </View>
                  <TouchableOpacity style={styles.buttonSecondary} onPress={handleVerifyOtp} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>تایید و ورود</Text>}
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
                <TextInput style={styles.input} placeholder="مثلاً: admin" placeholderTextColor="#64748b" value={username} onChangeText={setUsername} autoCapitalize="none" />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>رمز عبور</Text>
                <TextInput style={styles.input} placeholder="***" placeholderTextColor="#64748b" value={password} onChangeText={setPassword} secureTextEntry />
              </View>

              <TouchableOpacity style={styles.button} onPress={handlePasswordLogin} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ورود به سیستم</Text>}
              </TouchableOpacity>
            </View>
          )}

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  card: { backgroundColor: 'rgba(30, 41, 59, 0.8)', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#334155' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  titleHighlight: { color: '#10b981' },
  subtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 30 },
  
  tabContainer: { flexDirection: 'row-reverse', backgroundColor: '#0f172a', padding: 4, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#334155' },
  tabBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#10b981' },
  tabText: { color: '#64748b', fontSize: 14, fontWeight: 'bold' },
  tabTextActive: { color: '#fff' },

  inputContainer: { marginBottom: 16 },
  label: { color: '#cbd5e1', marginBottom: 8, fontSize: 13, fontWeight: 'bold', textAlign: 'right' },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 16, color: '#fff', textAlign: 'left', fontFamily: 'System' },
  otpInput: { textAlign: 'center', fontSize: 24, letterSpacing: 10, fontWeight: 'bold' },
  
  button: { backgroundColor: '#10b981', padding: 16, borderRadius: 16, marginTop: 10, alignItems: 'center' },
  buttonSecondary: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 16, marginTop: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  resetBtn: { marginTop: 15, alignItems: 'center' },
  resetBtnText: { color: '#10b981', fontSize: 12, textDecorationLine: 'underline' }
});