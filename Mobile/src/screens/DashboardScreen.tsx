import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { jwtDecode } from 'jwt-decode';
import Toast from 'react-native-toast-message';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import moment from 'moment-jalaali';
import api, { BASE_URL } from '../services/api';

const { width } = Dimensions.get('window');

// تنظیم تقویم شمسی به فارسی
moment.loadPersian({ usePersianDigits: true, dialect: 'persian-modern' });

export default function DashboardScreen({ navigation }: any) {
  const [userData, setUserData] = useState({ full_name: 'همکار عزیز', role: '...', avatar_letter: 'A' });
  const [stats, setStats] = useState({ properties: 0, clients: 0, ai_matches: 0 });
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // رفرنس برای Bottom Sheet
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['45%'], []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  useEffect(() => {
    let ws: WebSocket | null = null;
    const connectWebSocket = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (token) {
          const decoded: any = jwtDecode(token);
          const userId = decoded.user_id || decoded.id || 1; 
          ws = new WebSocket(`${BASE_URL.replace('http', 'ws')}/ws/${userId}`);
          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data) {
                // 🌟 حل مشکل کرش کردن در صورت undefined بودن title
                Toast.show({
                  type: data.type === 'success' ? 'success' : 'info',
                  text1: data?.title || 'پیام سیستم 🔔',
                  text2: data?.message || '',
                  position: 'top',
                });
              }
            } catch (err) {
              console.log("WebSocket parse error", err);
            }
          };
        }
      } catch (e) {}
    };
    connectWebSocket();
    return () => { if (ws) ws.close(); };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/api/users/dashboard-stats');
      if (response.data.status === 'success') {
        setUserData(response.data.user);
        setStats(response.data.stats);
      }
    } catch (error) {} finally { setLoading(false); }
  };

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("خروج از حساب", "آیا مطمئن هستید که می‌خواهید خارج شوید؟", [
      { text: "انصراف", style: "cancel" },
      { text: "خروج", style: "destructive", onPress: async () => {
          await SecureStore.deleteItemAsync('userToken');
          navigation.replace('Login');
        }
      }
    ]);
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.7} />
    ), []
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 4 Header Icons */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
            <Ionicons name="notifications-outline" size={24} color="#f8fafc" />
            <View style={styles.badge} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Tickets')}>
            <Ionicons name="chatbubbles-outline" size={24} color="#f8fafc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setIsDarkMode(!isDarkMode);
          }}>
            <Ionicons name={isDarkMode ? "moon-outline" : "sunny-outline"} size={24} color={isDarkMode ? "#a855f7" : "#f59e0b"} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          bottomSheetRef.current?.expand();
        }} style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{userData.avatar_letter}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <Text style={styles.dateText}>{moment().format('jD jMMMM jYYYY')}</Text>
          <Text style={styles.greeting}>روز بخیر، {userData.full_name} 👋</Text>
        </View>

        {/* Hero Card - BluBank Style */}
        <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.heroCard}>
          <MaterialCommunityIcons name="robot-outline" size={120} color="rgba(16, 185, 129, 0.05)" style={styles.heroBgIcon} />
          <Text style={styles.heroTitle}>عملکرد هوشمند شما</Text>
          {loading ? ( <ActivityIndicator color="#10b981" /> ) : (
            <View style={styles.statsRow}>
              <View style={styles.statBox}><Text style={[styles.statValue, {color: '#3b82f6'}]}>{stats.properties}</Text><Text style={styles.statLabel}>فایل‌های من</Text></View>
              <View style={styles.divider} />
              <View style={styles.statBox}><Text style={[styles.statValue, {color: '#f59e0b'}]}>{stats.clients}</Text><Text style={styles.statLabel}>قیف فروش</Text></View>
              <View style={styles.divider} />
              <View style={styles.statBox}><Text style={[styles.statValue, {color: '#10b981'}]}>{stats.ai_matches}</Text><Text style={styles.statLabel}>مچینگ AI</Text></View>
            </View>
          )}
        </LinearGradient>

        <Text style={styles.sectionTitle}>دسترسی سریع</Text>
        <View style={styles.grid}>
          {/* Menu Items */}
          {[
            { id: 1, title: 'بانک املاک', sub: 'مدیریت فایل‌ها', icon: 'business-outline', color: '#3b82f6', route: 'Properties' },
            { id: 2, title: 'ثبت صوتی', sub: 'دستیار هوشمند', icon: 'mic-outline', color: '#10b981', route: 'VoiceAdd' },
            { id: 3, title: 'قیف فروش', sub: 'Kanban Board', icon: 'funnel-outline', color: '#f59e0b', route: 'Funnel' }, 
            { id: 4, title: 'امور مالی', sub: 'کمیسیون‌ها', icon: 'wallet-outline', color: '#a855f7', route: 'Financials' },
            { id: 5, title: 'مشتریان', sub: 'ارزیابی تماس', icon: 'people-outline', color: '#14b8a6', route: 'Customers' },
            { id: 6, title: 'مدیریت کل', sub: 'ویژه مدیران', icon: 'shield-checkmark-outline', color: '#ef4444', route: 'SuperAdmin' }, 
            { id: 7, title: 'پرزنت نمایشگاهی', sub: 'Showcase', icon: 'easel-outline', color: '#ec4899', route: 'Reels' },
            { id: 8, title: 'مشارکت', sub: 'کلنگی و سازنده', icon: 'hand-right-outline', color: '#0ea5e9', route: 'Partnership' },
          ].map((item) => (
            <TouchableOpacity key={item.id} style={styles.gridItem} onPress={() => navigation.navigate(item.route)}>
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}15`, borderColor: `${item.color}50` }]}>
                <Ionicons name={item.icon as any} size={28} color={item.color} />
              </View>
              <Text style={styles.gridText}>{item.title}</Text>
              <Text style={styles.gridSubText}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Floating Chatbot */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Chatbot')}>
        <LinearGradient colors={['#10b981', '#059669']} style={styles.fabGradient}>
          <MaterialCommunityIcons name="robot-excited-outline" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Bottom Sheet for Profile/Settings */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: '#1e293b' }}
        handleIndicatorStyle={{ backgroundColor: '#64748b' }}
      >
        <View style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <View style={[styles.avatarContainer, { width: 60, height: 60, borderRadius: 30 }]}>
              <Text style={[styles.avatarText, { fontSize: 24 }]}>{userData.avatar_letter}</Text>
            </View>
            <View style={{ marginRight: 15 }}>
              <Text style={styles.sheetName}>{userData.full_name}</Text>
              <Text style={styles.sheetRole}>{userData.role}</Text>
            </View>
          </View>
          
          <View style={styles.sheetMenu}>
            <TouchableOpacity style={styles.sheetBtn} onPress={() => { bottomSheetRef.current?.close(); navigation.navigate('Settings'); }}>
              <Ionicons name="settings-outline" size={22} color="#3b82f6" />
              <Text style={styles.sheetBtnText}>تنظیمات حساب کاربری</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetBtn} onPress={() => { bottomSheetRef.current?.close(); navigation.navigate('MyCard'); }}>
              <Ionicons name="id-card-outline" size={22} color="#10b981" />
              <Text style={styles.sheetBtnText}>کارت ویزیت دیجیتال</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetBtn} onPress={() => { bottomSheetRef.current?.close(); navigation.navigate('Reminders'); }}>
              <Ionicons name="calendar-outline" size={22} color="#f59e0b" />
              <Text style={styles.sheetBtnText}>تقویم و یادآورها</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sheetBtn, { borderBottomWidth: 0 }]} onPress={() => { bottomSheetRef.current?.close(); handleLogout(); }}>
              <Ionicons name="log-out-outline" size={22} color="#ef4444" />
              <Text style={[styles.sheetBtnText, { color: '#ef4444' }]}>خروج از حساب</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' }, 
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 15, paddingBottom: 10 },
  headerLeft: { flexDirection: 'row', gap: 15 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  badge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, backgroundColor: '#ef4444', borderRadius: 4 },
  avatarContainer: { width: 45, height: 45, borderRadius: 16, backgroundColor: '#1E293B', borderWidth: 2, borderColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  welcomeSection: { marginBottom: 20, alignItems: 'flex-end' },
  dateText: { color: '#64748b', fontSize: 12, fontFamily: 'System', marginBottom: 5 },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
  heroCard: { borderRadius: 24, padding: 24, marginBottom: 30, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
  heroBgIcon: { position: 'absolute', left: -20, bottom: -20 },
  heroTitle: { color: '#94a3b8', fontSize: 13, marginBottom: 20, textAlign: 'right', fontWeight: 'bold' },
  statsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0B0F19', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#1E293B' },
  statBox: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 30, backgroundColor: '#334155' },
  statValue: { fontSize: 24, fontWeight: 'bold', fontFamily: 'System', marginBottom: 4 },
  statLabel: { fontSize: 10, color: '#94a3b8', fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', textAlign: 'right', marginBottom: 15 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', backgroundColor: '#1E293B', padding: 20, borderRadius: 24, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#334155' },
  iconContainer: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 1 },
  gridText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  gridSubText: { color: '#64748b', fontSize: 10 },
  fab: { position: 'absolute', bottom: 30, left: 24, elevation: 10, shadowColor: '#10b981', shadowOpacity: 0.4, shadowRadius: 15 },
  fabGradient: { width: 65, height: 65, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  
  sheetContent: { padding: 24, flex: 1 },
  sheetHeader: { flexDirection: 'row-reverse', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 20, marginBottom: 20 },
  sheetName: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'right' },
  sheetRole: { color: '#10b981', fontSize: 13, textAlign: 'right', marginTop: 4 },
  sheetMenu: { backgroundColor: '#0B0F19', borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  sheetBtn: { flexDirection: 'row-reverse', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B', gap: 15 },
  sheetBtnText: { color: '#f8fafc', fontSize: 14, fontWeight: 'bold' }
});