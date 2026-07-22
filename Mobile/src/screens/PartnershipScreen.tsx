import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import api from '../services/api';

export default function PartnershipScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'lands' | 'builders'>('lands');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchData(activeTab);
    }, [activeTab])
  );

  const fetchData = async (tab: string) => {
    setLoading(true);
    try {
      if (tab === 'lands') {
        const res = await api.get(`/api/properties/app-list`);
        setData(res.data.properties.filter((p: any) => p.deal_type === 'مشارکت در ساخت' || p.property_type === 'زمین و کلنگی'));
      } else {
        const res = await api.get(`/api/clients/app-list`);
        setData(res.data.clients.filter((c: any) => c.deal_type_requested === 'مشارکت در ساخت' || c.deal_type_requested === 'PARTNERSHIP'));
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'دریافت اطلاعات با مشکل مواجه شد.' });
    } finally { setLoading(false); }
  };

  const handleMatch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('تطابق هوشمند 🧠', 'هوش مصنوعی در حال بررسی توان مالی سازندگان با ارزش این ملک کلنگی است. (این بخش به زودی فعال می‌شود)', [
      { text: 'بستن' }
    ]);
  };

  const formatPrice = (price: number) => {
    if (!price || price === 0) return 'توافقی';
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' تومان';
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
            <Text style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'Vazir-Regular' }}>توان پرداخت بلاعوض:</Text>
            <Text style={{ color: '#10b981', fontFamily: 'System', fontWeight: 'bold' }}>{formatPrice(item.budget_limit)}</Text>
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
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'lands' && styles.tabBtnActive]} onPress={() => { Haptics.selectionAsync(); setActiveTab('lands'); }}>
          <Text style={[styles.tabText, activeTab === 'lands' && styles.tabTextActive]}>زمین‌ها و کلنگی (مالکین)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'builders' && styles.tabBtnActiveBuilder]} onPress={() => { Haptics.selectionAsync(); setActiveTab('builders'); }}>
          <Text style={[styles.tabText, activeTab === 'builders' && styles.tabTextActive]}>سازندگان (سرمایه‌گذاران)</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b" /></View>
      ) : data.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="construct-outline" size={60} color="#334155" />
          <Text style={{ color: '#94a3b8', marginTop: 10, fontFamily: 'Vazir-Regular' }}>اطلاعاتی در این بخش یافت نشد.</Text>
        </View>
      ) : (
        <FlatList data={data} keyExtractor={(item) => item.id.toString()} renderItem={renderItem} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, backgroundColor: '#1E293B', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  headerTitle: { fontSize: 18, fontFamily: 'Vazir-Bold', color: '#f59e0b' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  tabContainer: { flexDirection: 'row-reverse', marginHorizontal: 20, backgroundColor: '#1E293B', borderRadius: 16, padding: 4, marginBottom: 15, borderWidth: 1, borderColor: '#334155' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabBtnActive: { backgroundColor: '#3b82f6' },
  tabBtnActiveBuilder: { backgroundColor: '#10b981' },
  tabText: { color: '#64748b', fontFamily: 'Vazir-Bold', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  
  card: { backgroundColor: '#1E293B', padding: 16, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#3b82f6', elevation: 3 },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { color: '#f8fafc', fontFamily: 'Vazir-Bold', fontSize: 15, textAlign: 'right' },
  matchBtn: { flexDirection: 'row-reverse', backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center', gap: 5 },
  matchBtnText: { color: '#fff', fontSize: 11, fontFamily: 'Vazir-Bold' },
  
  detailsRow: { flexDirection: 'row-reverse', gap: 15 },
  detailText: { color: '#94a3b8', fontSize: 12, fontFamily: 'Vazir-Regular' },
  
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(16, 185, 129, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#10b981' },
  avatarText: { color: '#10b981', fontFamily: 'Vazir-Bold', fontSize: 16 },
  phoneText: { color: '#94a3b8', fontSize: 11, fontFamily: 'System', textAlign: 'right', marginTop: 2 },
  
  budgetBox: { backgroundColor: '#0B0F19', padding: 12, borderRadius: 12, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#334155' }
});