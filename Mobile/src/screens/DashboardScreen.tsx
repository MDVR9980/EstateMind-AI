import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import jwtDecode from 'jwt-decode';
import Toast from 'react-native-toast-message';

// ⚠️ آی‌پی سرور بک‌اند شما
const BASE_URL = "http://10.56.173.18:8000";

export default function DashboardScreen({ navigation }: any) {
  const [userData, setUserData] = useState({ full_name: 'همکار عزیز', role: '...', avatar_letter: 'A' });
  const [stats, setStats] = useState({ properties: 0, clients: 0, ai_matches: 0 });
  const [loading, setLoading] = useState(true);

  // فراخوانی API به محض باز شدن صفحه
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ----------------------------------------------------
  // 🔴 جادوی سوکت: برقراری ارتباط زنده با سرور
  // ----------------------------------------------------
  useEffect(() => {
    let ws: WebSocket | null = null;

    const connectWebSocket = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (token) {
          // در اینجا برای تست یوزر آیدی را ۱ قرار دادیم. 
          // در نسخه پروداکشن، آیدی کاربر از سرور یا توکن خوانده می‌شود.
          const userId = 1; 
          
          // اتصال به وب‌سوکت بک‌اند (FastAPI)
          const wsUrl = `ws://10.56.173.18:8000/ws/${userId}`;
          ws = new WebSocket(wsUrl);

          ws.onopen = () => console.log("🌐 WebSocket Connected Successfully!");
          
          // هر زمان پیامی از سرور (مثلا شکار فایل جدید) بیاید، اینجا دریافت می‌شود
          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            // نمایش پاپ‌آپ زنده و جذاب بالای صفحه
            Toast.show({
              type: data.type === 'success' ? 'success' : 'info',
              text1: data.title || 'پیام سیستم 🔔',
              text2: data.message,
              visibilityTime: 6000,
              position: 'top',
              topOffset: 50,
            });
          };

          ws.onclose = () => console.log("❌ WebSocket Disconnected!");
        }
      } catch (e) {
        console.log("WebSocket Error", e);
      }
    };

    connectWebSocket();

    // پاکسازی سوکت هنگام خروج از صفحه
    return () => {
      if (ws) ws.close(); 
    };
  }, []);
  // ----------------------------------------------------

  const fetchDashboardData = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await axios.get(`${BASE_URL}/api/users/dashboard-stats`, {
        headers: { Cookie: `access_token=Bearer ${token}` }
      });
      
      if (response.data.status === 'success') {
        setUserData(response.data.user);
        setStats(response.data.stats);
      }
    } catch (error) {
      console.log("Error fetching stats");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("خروج از حساب", "آیا مطمئن هستید که می‌خواهید خارج شوید؟", [
      { text: "انصراف", style: "cancel" },
      { 
        text: "خروج", style: "destructive",
        onPress: async () => {
          await SecureStore.deleteItemAsync('userToken');
          navigation.replace('Login');
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
        
        <View style={styles.headerUserInfo}>
          <View>
            <Text style={styles.greeting}>روز بخیر، {userData.full_name} 👋</Text>
            <Text style={styles.subGreeting}>{userData.role} | EstateMind AI</Text>
          </View>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{userData.avatar_letter}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <LinearGradient colors={['#059669', '#10b981']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <MaterialCommunityIcons name="robot-outline" size={100} color="rgba(255,255,255,0.1)" style={styles.heroBgIcon} />
          <Text style={styles.heroTitle}>خلاصه عملکرد شما</Text>
          
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.properties}</Text>
                <Text style={styles.statLabel}>فایل‌های من</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.clients}</Text>
                <Text style={styles.statLabel}>مشتریان در قیف</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.ai_matches}</Text>
                <Text style={styles.statLabel}>مچینگ AI</Text>
              </View>
            </View>
          )}
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>دسترسی سریع</Text>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Properties')}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}><Ionicons name="business-outline" size={32} color="#3b82f6" /></View>
            <Text style={styles.gridText}>بانک املاک</Text><Text style={styles.gridSubText}>مدیریت فایل‌ها</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('VoiceAdd')}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}><Ionicons name="mic-outline" size={32} color="#a855f7" /></View>
            <Text style={styles.gridText}>ثبت صوتی</Text><Text style={styles.gridSubText}>دستیار هوشمند</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Customers')}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}><Ionicons name="people-outline" size={32} color="#f59e0b" /></View>
            <Text style={styles.gridText}>مشتریان</Text><Text style={styles.gridSubText}>پیگیری و قیف</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Financials')}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}><Ionicons name="wallet-outline" size={32} color="#10b981" /></View>
            <Text style={styles.gridText}>امور مالی</Text><Text style={styles.gridSubText}>گزارش کمیسیون</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Reels')}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}><Ionicons name="play-circle-outline" size={32} color="#ef4444" /></View>
            <Text style={styles.gridText}>پرزنت حضوری</Text><Text style={styles.gridSubText}>به سبک Reels</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Partnership')}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(14, 165, 233, 0.1)' }]}><Ionicons name="hand-right-outline" size={32} color="#0ea5e9" /></View>
            <Text style={styles.gridText}>مشارکت</Text><Text style={styles.gridSubText}>زمین و کلنگی</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Tickets')}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}><Ionicons name="chatbubbles-outline" size={32} color="#ec4899" /></View>
            <Text style={styles.gridText}>پشتیبانی</Text><Text style={styles.gridSubText}>تیکت‌های سازمانی</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Reminders')}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <Ionicons name="calendar-outline" size={32} color="#f59e0b" />
            </View>
            <Text style={styles.gridText}>تقویم</Text>
            <Text style={styles.gridSubText}>تسک‌ها و یادآورها</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={20} color="#94a3b8" />
          <Text style={styles.settingsBtnText}>تنظیمات حساب کاربری</Text>
        </TouchableOpacity>

      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Chatbot')}>
        <LinearGradient colors={['#3b82f6', '#8b5cf6']} style={styles.fabGradient}>
          <MaterialCommunityIcons name="robot-excited-outline" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10, backgroundColor: '#0f172a' },
  headerUserInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greeting: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', textAlign: 'right' },
  subGreeting: { fontSize: 12, color: '#10b981', textAlign: 'right', marginTop: 2, fontWeight: 'bold' },
  avatarContainer: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#1e293b', borderWidth: 2, borderColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', width: 45, height: 45, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  heroCard: { borderRadius: 28, padding: 24, marginBottom: 30, position: 'relative', overflow: 'hidden', elevation: 8, shadowColor: '#10b981', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
  heroBgIcon: { position: 'absolute', left: -10, bottom: -20, transform: [{ rotate: '-15deg' }] },
  heroTitle: { color: '#d1fae5', fontSize: 14, marginBottom: 20, textAlign: 'right', fontWeight: 'bold' },
  statsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 20 },
  statBox: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  statLabel: { fontSize: 10, color: '#d1fae5', fontWeight: 'bold' },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', textAlign: 'right' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', backgroundColor: '#1e293b', padding: 20, borderRadius: 28, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  iconContainer: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  gridText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  gridSubText: { color: '#64748b', fontSize: 11 },
  
  settingsBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e293b', paddingVertical: 15, borderRadius: 16, marginTop: 10, borderWidth: 1, borderColor: '#334155', gap: 8 },
  settingsBtnText: { color: '#94a3b8', fontSize: 14, fontWeight: 'bold' },
  
  fab: { position: 'absolute', bottom: 30, left: 24, elevation: 10, shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 12 },
  fabGradient: { width: 65, height: 65, borderRadius: 32.5, justifyContent: 'center', alignItems: 'center' }
});