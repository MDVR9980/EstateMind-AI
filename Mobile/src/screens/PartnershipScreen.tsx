import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Toast from 'react-native-toast-message';

const BASE_URL = "http://10.56.173.18:8000";

export default function PartnershipScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'lands' | 'builders'>('lands');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const fetchData = async (tab: string) => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      // برای سادگی، شما در بک‌اند می‌توانید یک API یکپارچه برای این بخش بسازید، 
      // فعلا از همان APIهای کلاینت و املاک با فیلتر استفاده می‌کنیم
      if (tab === 'lands') {
        const res = await axios.get(`${BASE_URL}/api/properties/app-list`, { headers: { Cookie: `access_token=Bearer ${token}` } });
        setData(res.data.properties.filter((p: any) => p.deal_type === 'مشارکت در ساخت' || p.property_type === 'زمین و کلنگی'));
      } else {
        const res = await axios.get(`${BASE_URL}/api/clients/app-list`, { headers: { Cookie: `access_token=Bearer ${token}` } });
        setData(res.data.clients.filter((c: any) => c.deal_type_requested === 'مشارکت در ساخت' || c.deal_type_requested === 'PARTNERSHIP'));
      }
    } catch (error) {
      console.log("Error fetching partnership data");
    } finally {
      setLoading(false);
    }
  };

  const handleMatch = () => {
    Alert.alert('تطابق هوشمند 🧠', 'هوش مصنوعی در حال بررسی توان مالی سازندگان با ارزش این ملک کلنگی است...', [
      { text: 'بستن' }
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    if (activeTab === 'lands') {
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <TouchableOpacity style={styles.matchBtn} onPress={handleMatch}>
              <MaterialCommunityIcons name="magic-staff" size={16} color="#fff" />
              <Text style={styles.matchBtnText}>یافتن سازنده</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.detailText}><Ionicons name="location" color="#94a3b8" /> {item.neighborhood}</Text>
            <Text style={styles.detailText}><Ionicons name="resize" color="#94a3b8" /> {item.built_area} متر</Text>
          </View>
        </View>
      );
    } else {
      return (
        <View style={[styles.card, { borderColor: '#10b981' }]}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.name.charAt(0)}</Text></View>
              <View>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.phoneText}>{item.phone}</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.matchBtn, { backgroundColor: '#10b981' }]} onPress={handleMatch}>
              <Ionicons name="search" size={16} color="#fff" />
              <Text style={styles.matchBtnText}>پیشنهاد زمین</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.budgetBox}>
            <Text style={{ color: '#94a3b8', fontSize: 11 }}>توان پرداخت بلاعوض:</Text>
            <Text style={{ color: '#10b981', fontWeight: 'bold', fontFamily: 'System' }}>
              {item.budget_limit > 0 ? (item.budget_limit).toLocaleString() + ' تومان' : 'نامحدود'}
            </Text>
          </View>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>دپارتمان مشارکت در ساخت</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'lands' && styles.tabBtnActive]} onPress={() => setActiveTab('lands')}>
          <Text style={[styles.tabText, activeTab === 'lands' && styles.tabTextActive]}>زمین‌ها و کلنگی (مالک)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'builders' && styles.tabBtnActiveBuilder]} onPress={() => setActiveTab('builders')}>
          <Text style={[styles.tabText, activeTab === 'builders' && styles.tabTextActive]}>سازندگان (سرمایه‌گذار)</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b" /></View>
      ) : data.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="construct-outline" size={60} color="#334155" />
          <Text style={{ color: '#94a3b8', marginTop: 10 }}>اطلاعاتی یافت نشد.</Text>
        </View>
      ) : (
        <FlatList data={data} keyExtractor={(item) => item.id.toString()} renderItem={renderItem} contentContainerStyle={{ padding: 20 }} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, backgroundColor: '#1e293b', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#f59e0b' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabContainer: { flexDirection: 'row-reverse', marginHorizontal: 20, backgroundColor: '#1e293b', borderRadius: 16, padding: 4, marginBottom: 15 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabBtnActive: { backgroundColor: '#3b82f6' },
  tabBtnActiveBuilder: { backgroundColor: '#10b981' },
  tabText: { color: '#64748b', fontWeight: 'bold', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#3b82f6' },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { color: '#f8fafc', fontWeight: 'bold', fontSize: 15 },
  matchBtn: { flexDirection: 'row-reverse', backgroundColor: '#3b82f6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: 'center', gap: 4 },
  matchBtnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  detailsRow: { flexDirection: 'row-reverse', gap: 15 },
  detailText: { color: '#94a3b8', fontSize: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(16, 185, 129, 0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#10b981', fontWeight: 'bold' },
  phoneText: { color: '#94a3b8', fontSize: 10, fontFamily: 'System' },
  budgetBox: { backgroundColor: '#0f172a', padding: 10, borderRadius: 12, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }
});