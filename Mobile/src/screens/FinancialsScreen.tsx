import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Toast from 'react-native-toast-message';

const BASE_URL = "http://10.56.173.18:8000";

export default function FinancialsScreen({ navigation }: any) {
  const [stats, setStats] = useState({ total_revenue: 0, agent_share: 0, office_share: 0 });
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // استیت‌های مودال ثبت قرارداد
  const [dealModalVisible, setDealModalVisible] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  
  // فرم قرارداد
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [dealType, setDealType] = useState('فروش');
  const [dealPrice, setDealPrice] = useState('');
  const [commission, setCommission] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchFinancials();
  }, []);

  const fetchFinancials = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await axios.get(`${BASE_URL}/api/deals/app-financials`, {
        headers: { Cookie: `access_token=Bearer ${token}` }
      });
      if (response.data.status === 'success') {
        setStats(response.data.stats);
        setDeals(response.data.recent_deals);
      }
    } catch (error) {
      console.log("Error fetching financials", error);
    } finally {
      setLoading(false);
    }
  };

  // گرفتن لیست مشتریان و فایل‌ها برای دراپ‌داون‌های مودال
  const fetchFormOptions = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const [clientRes, propRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/clients/app-list`, { headers: { Cookie: `access_token=Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/properties/app-list`, { headers: { Cookie: `access_token=Bearer ${token}` } })
      ]);
      setClients(clientRes.data.clients || []);
      setProperties(propRes.data.properties || []);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'دریافت لیست مشتریان و املاک با خطا مواجه شد.' });
    }
  };

  const openDealModal = () => {
    fetchFormOptions();
    setDealModalVisible(true);
  };

  const calculateCommission = async () => {
    Alert.alert('محاسبه حقوق', 'آیا کمیسیون و سهم مشاوران برای این ماه محاسبه شود؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'بله، محاسبه کن', onPress: async () => {
          try {
            const token = await SecureStore.getItemAsync('userToken');
            const currentMonth = new Date().toISOString().slice(0, 7); // مثلا 2026-07
            await axios.post(`${BASE_URL}/api/deals/calculate-monthly`, 
              { year_month: currentMonth }, 
              { headers: { Cookie: `access_token=Bearer ${token}` } }
            );
            Toast.show({ type: 'success', text1: 'انجام شد', text2: 'سهم مشاورین برای این ماه بروزرسانی شد.' });
          } catch (e) {
            Toast.show({ type: 'error', text1: 'خطا', text2: 'شما دسترسی مدیریت برای این کار ندارید.' });
          }
      }}
    ]);
  };

  const submitDeal = async () => {
    if (!selectedClient || !dealPrice || !commission) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'پر کردن مشتری، مبلغ معامله و کمیسیون الزامی است.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const payload = {
        client_id: selectedClient.id,
        property_id: selectedProperty ? selectedProperty.id : 0,
        deal_type: dealType,
        deal_price: parseFloat(dealPrice.replace(/,/g, '')),
        commission_amount: parseFloat(commission.replace(/,/g, ''))
      };

      await axios.post(`${BASE_URL}/api/deals/add`, payload, {
        headers: { Cookie: `access_token=Bearer ${token}` }
      });
      
      Toast.show({ type: 'success', text1: 'ثبت شد!', text2: 'قرارداد با موفقیت در سیستم ثبت شد 🚀' });
      setDealModalVisible(false);
      
      // Reset Form
      setSelectedClient(null); setSelectedProperty(null); setDealPrice(''); setCommission('');
      fetchFinancials();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکلی در ثبت قرارداد پیش آمد.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) => price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>امور مالی و کمیسیون</Text>
        <TouchableOpacity onPress={calculateCommission} style={styles.calcBtn}>
          <Ionicons name="calculator" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10b981" /></View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.paddingH}>
            <LinearGradient colors={['#059669', '#10b981']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
              <Ionicons name="wallet-outline" size={80} color="rgba(255,255,255,0.1)" style={styles.heroBgIcon} />
              <Text style={styles.heroLabel}>جمع کل درآمدزایی (کمیسیون)</Text>
              <Text style={styles.heroValue}>{formatPrice(stats.total_revenue)} <Text style={styles.heroCurrency}>تومان</Text></Text>
            </LinearGradient>

            <View style={styles.splitRow}>
              <View style={[styles.splitBox, { borderColor: '#f59e0b' }]}>
                <Text style={styles.splitLabel}>سهم شما (مشاور)</Text>
                <Text style={[styles.splitValue, { color: '#f59e0b' }]}>{formatPrice(stats.agent_share)}</Text>
              </View>
              <View style={styles.gap} />
              <View style={[styles.splitBox, { borderColor: '#3b82f6' }]}>
                <Text style={styles.splitLabel}>سهم آژانس</Text>
                <Text style={[styles.splitValue, { color: '#3b82f6' }]}>{formatPrice(stats.office_share)}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>آخرین قراردادهای ثبت شده</Text>
          </View>

          {deals.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="receipt-outline" size={60} color="#334155" />
              <Text style={styles.emptyText}>هنوز قراردادی ثبت نکرده‌اید.</Text>
            </View>
          ) : (
            <FlatList
              data={deals}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.dealCard}>
                  <View style={styles.dealIconBox}><Ionicons name="document-text-outline" size={24} color="#3b82f6" /></View>
                  <View style={styles.dealInfo}>
                    <Text style={styles.dealType}>قرارداد {item.type}</Text>
                    <Text style={styles.dealDate}>{item.date}</Text>
                  </View>
                  <View style={styles.dealAmounts}>
                    <Text style={styles.dealCommission}>{formatPrice(item.commission)} <Text style={styles.currency}>تومان</Text></Text>
                    <Text style={styles.dealLabel}>کمیسیون دریافت شده</Text>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      )}

      {/* دکمه شناور ثبت معامله */}
      <TouchableOpacity style={styles.fab} onPress={openDealModal}>
        <Ionicons name="hand-right" size={28} color="#fff" />
      </TouchableOpacity>

      {/* مودال ثبت قرارداد */}
      <Modal animationType="slide" transparent={true} visible={dealModalVisible}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ثبت قرارداد جدید 🤝</Text>
              <TouchableOpacity onPress={() => setDealModalVisible(false)}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>مشتری خریدار/مستاجر *</Text>
                {/* در موبایل برای سادگی فعلا از یک دکمه برای انتخاب استفاده می‌کنیم */}
                <TouchableOpacity style={styles.dropdownBtn} onPress={() => {
                  Alert.alert('انتخاب مشتری', 'مشتری مورد نظر را انتخاب کنید:', clients.map(c => ({ text: c.name, onPress: () => setSelectedClient(c) })).slice(0, 5));
                }}>
                  <Text style={styles.dropdownText}>{selectedClient ? selectedClient.name : 'روی این کادر کلیک کنید...'}</Text>
                  <Ionicons name="chevron-down" size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>فایل ملک مرتبط (اختیاری)</Text>
                <TouchableOpacity style={styles.dropdownBtn} onPress={() => {
                  Alert.alert('انتخاب فایل', 'ملک مورد نظر را انتخاب کنید:', properties.map(p => ({ text: p.title, onPress: () => setSelectedProperty(p) })).slice(0, 5));
                }}>
                  <Text style={styles.dropdownText}>{selectedProperty ? selectedProperty.title : 'روی این کادر کلیک کنید...'}</Text>
                  <Ionicons name="chevron-down" size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>نوع قرارداد</Text>
                <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
                  <TouchableOpacity style={[styles.radioBtn, dealType === 'فروش' && styles.radioBtnActive]} onPress={() => setDealType('فروش')}><Text style={[styles.radioText, dealType === 'فروش' && styles.radioTextActive]}>خرید و فروش</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.radioBtn, dealType === 'رهن و اجاره' && styles.radioBtnActive]} onPress={() => setDealType('رهن و اجاره')}><Text style={[styles.radioText, dealType === 'رهن و اجاره' && styles.radioTextActive]}>رهن و اجاره</Text></TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>مبلغ معامله (تومان) *</Text>
                <TextInput style={[styles.input, { fontFamily: 'System' }]} keyboardType="numeric" value={dealPrice} onChangeText={(text) => setDealPrice(formatPrice(parseFloat(text.replace(/,/g, '') || '0')))} placeholder="مثال: 5,000,000,000" placeholderTextColor="#64748b" />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>کمیسیون دریافتی از طرفین (تومان) *</Text>
                <TextInput style={[styles.input, { fontFamily: 'System', color: '#10b981', borderColor: '#10b981' }]} keyboardType="numeric" value={commission} onChangeText={(text) => setCommission(formatPrice(parseFloat(text.replace(/,/g, '') || '0')))} placeholder="سهم مشاور + آژانس" placeholderTextColor="#64748b" />
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={submitDeal} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>ثبت نهایی معامله</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // استایل‌های قبلی
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, backgroundColor: '#1e293b', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  calcBtn: { width: 40, height: 40, backgroundColor: 'rgba(59, 130, 246, 0.2)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  paddingH: { paddingHorizontal: 20 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroCard: { padding: 24, borderRadius: 24, marginBottom: 15, position: 'relative', overflow: 'hidden' },
  heroBgIcon: { position: 'absolute', left: -10, bottom: -10, transform: [{ rotate: '-15deg' }] },
  heroLabel: { color: '#d1fae5', fontSize: 12, marginBottom: 8, textAlign: 'right', fontWeight: 'bold' },
  heroValue: { color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'right', fontFamily: 'System' },
  heroCurrency: { fontSize: 12, fontWeight: 'normal' },
  splitRow: { flexDirection: 'row-reverse', marginBottom: 25 },
  splitBox: { flex: 1, backgroundColor: '#1e293b', padding: 16, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  gap: { width: 15 },
  splitLabel: { color: '#94a3b8', fontSize: 11, marginBottom: 5 },
  splitValue: { fontSize: 16, fontWeight: 'bold', fontFamily: 'System' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', textAlign: 'right', marginBottom: 15 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyText: { color: '#64748b', marginTop: 10, fontSize: 14 },
  dealCard: { flexDirection: 'row-reverse', backgroundColor: '#1e293b', padding: 15, borderRadius: 20, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  dealIconBox: { width: 45, height: 45, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  dealInfo: { flex: 1, alignItems: 'flex-end' },
  dealType: { color: '#f8fafc', fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  dealDate: { color: '#64748b', fontSize: 10, fontFamily: 'System' },
  dealAmounts: { alignItems: 'flex-start' },
  dealCommission: { color: '#10b981', fontSize: 14, fontWeight: 'bold', fontFamily: 'System' },
  currency: { fontSize: 9, color: '#94a3b8' },
  dealLabel: { color: '#64748b', fontSize: 9, marginTop: 2 },
  
  // استایل‌های جدید
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', elevation: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'flex-end' },
  modalView: { backgroundColor: '#1e293b', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#3b82f6', fontSize: 18, fontWeight: 'bold' },
  inputGroup: { marginBottom: 16 },
  label: { color: '#cbd5e1', marginBottom: 8, fontSize: 13, fontWeight: 'bold', textAlign: 'right' },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 16, color: '#f8fafc', textAlign: 'right' },
  dropdownBtn: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 16 },
  dropdownText: { color: '#f8fafc', fontSize: 13 },
  radioBtn: { flex: 1, backgroundColor: '#0f172a', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  radioBtnActive: { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6' },
  radioText: { color: '#64748b', fontSize: 13, fontWeight: 'bold' },
  radioTextActive: { color: '#3b82f6' },
  submitBtn: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 16, marginTop: 10, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});