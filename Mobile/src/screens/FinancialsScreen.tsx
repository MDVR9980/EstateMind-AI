// src/screens/FinancialsScreen.tsx
import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import moment from 'moment-jalaali';
import api, { BASE_URL } from '../services/api';

// ایمپورت استیت سراسری و ابزارهای فرمت عدد
import { useAuthStore } from '../store/useAuthStore';
import { numberToPersianWords, formatPrice, formatInputToNumber } from '../utils/numberFormat';

moment.loadPersian({ usePersianDigits: true, dialect: 'persian-modern' });

export default function FinancialsScreen({ navigation }: any) {
  const { user } = useAuthStore(); // گرفتن اطلاعات کاربر برای سطح دسترسی
  const [stats, setStats] = useState({ total_revenue: 0, agent_share: 0, office_share: 0 });
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [dealModalVisible, setDealModalVisible] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [dealType, setDealType] = useState('فروش');
  const [dealPrice, setDealPrice] = useState('');
  const [commission, setCommission] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchFinancials();
    }, [])
  );

  const fetchFinancials = async () => {
    try {
      const response = await api.get('/api/deals/app-financials');
      if (response.data.status === 'success') {
        setStats(response.data.stats);
        setDeals(response.data.recent_deals);
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'دریافت گزارشات مالی با خطا مواجه شد.' });
    } finally { setLoading(false); }
  };

  const fetchFormOptions = async () => {
    try {
      const [clientRes, propRes] = await Promise.all([
        api.get('/api/clients/app-list'),
        api.get('/api/properties/app-list')
      ]);
      setClients(clientRes.data.clients || []);
      setProperties(propRes.data.properties || []);
    } catch (error) {}
  };

  const openDealModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchFormOptions();
    setDealModalVisible(true);
  };

  const calculateCommission = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('محاسبه حقوق و کمیسیون', 'آیا کمیسیون مشاوران بر اساس قراردادهای این ماه محاسبه شود؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'محاسبه کن', onPress: async () => {
          try {
            const currentMonth = new Date().toISOString().slice(0, 7);
            await api.post('/api/deals/calculate-monthly', { year_month: currentMonth });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Toast.show({ type: 'success', text1: 'انجام شد', text2: 'سهم مشاورین برای این ماه بروزرسانی شد.' });
          } catch (e) { 
            Toast.show({ type: 'error', text1: 'عدم دسترسی', text2: 'فقط مدیر شعبه دسترسی دارد.' }); 
          }
      }}
    ]);
  };

  const submitDeal = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!selectedClient || !dealPrice || !commission) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'مشتری، مبلغ معامله و کمیسیون الزامی است.' }); return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        client_id: selectedClient.id,
        property_id: selectedProperty ? selectedProperty.id : 0,
        deal_type: dealType,
        deal_price: formatInputToNumber(dealPrice),
        commission_amount: formatInputToNumber(commission)
      };
      await api.post('/api/deals/add', payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'ثبت شد!', text2: 'قرارداد با موفقیت در سیستم مالی ثبت شد.' });
      setDealModalVisible(false);
      setSelectedClient(null); setSelectedProperty(null); setDealPrice(''); setCommission('');
      fetchFinancials();
    } catch (e) { 
      Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکلی در ثبت قرارداد پیش آمد.' }); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleDownloadPDF = (dealId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`${BASE_URL}/api/deals/${dealId}/contract-pdf`).catch(() => {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'باز کردن فایل PDF با مشکل مواجه شد.' });
    });
  };

  const renderTransaction = ({ item }: { item: any }) => {
    const shamsiDate = moment(item.date, 'YYYY-MM-DD').format('jD jMMMM jYYYY');
    const isSale = item.type.includes('فروش');

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transRight}>
          <View style={[styles.transIconBox, { backgroundColor: isSale ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)' }]}>
            <MaterialCommunityIcons name={isSale ? "home-export-outline" : "key-outline"} size={24} color={isSale ? "#10b981" : "#3b82f6"} />
          </View>
          <View style={styles.transInfo}>
            <Text style={styles.transTitle}>قرارداد {item.type}</Text>
            <Text style={styles.transDate}>{shamsiDate}</Text>
          </View>
        </View>

        <View style={styles.transLeft}>
          <Text style={styles.transAmount}>+ {formatPrice(item.commission)}</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={() => handleDownloadPDF(item.id)}>
            <Ionicons name="download-outline" size={18} color="#a855f7" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // فقط مدیر شعبه و سوپر ادمین حق محاسبه حقوق را دارند
  const isManager = user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>گزارشات مالی و عملکرد</Text>
        
        {/* مخفی کردن دکمه محاسبه حقوق برای مشاوران ساده */}
        {isManager ? (
          <TouchableOpacity onPress={calculateCommission} style={styles.calcBtn}>
            <Ionicons name="calculator-outline" size={22} color="#f59e0b" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {loading ? ( <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10b981" /></View> ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.paddingH}>
            <LinearGradient colors={['#1E293B', '#0f172a']} style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <Text style={styles.heroLabel}>مجموع درآمدزایی شعبه (کمیسیون)</Text>
                <Ionicons name="wallet" size={24} color="rgba(16, 185, 129, 0.5)" />
              </View>
              <Text style={styles.heroValue}>{formatPrice(stats.total_revenue)} <Text style={styles.heroCurrency}>تومان</Text></Text>
              
              <View style={styles.splitRow}>
                <View style={styles.splitBox}>
                  <Text style={styles.splitLabel}>سهم شما (مشاور)</Text>
                  <Text style={[styles.splitValue, { color: '#10b981' }]}>{formatPrice(stats.agent_share)}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.splitBox}>
                  <Text style={styles.splitLabel}>سهم آژانس (دفتر)</Text>
                  <Text style={[styles.splitValue, { color: '#3b82f6' }]}>{formatPrice(stats.office_share)}</Text>
                </View>
              </View>
            </LinearGradient>

            <Text style={styles.sectionTitle}>تراکنش‌ها و قراردادهای اخیر</Text>
          </View>

          {deals.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="receipt-outline" size={60} color="#334155" />
              <Text style={styles.emptyText}>تراکنشی برای نمایش وجود ندارد.</Text>
            </View>
          ) : (
            <FlatList data={deals} keyExtractor={(item) => item.id.toString()} renderItem={renderTransaction} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} />
          )}
        </View>
      )}

      {/* FAB - Add Deal */}
      <TouchableOpacity style={styles.fab} onPress={openDealModal}>
        <LinearGradient colors={['#10b981', '#059669']} style={styles.fabGradient}>
          <MaterialCommunityIcons name="handshake-outline" size={32} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Modal - Add Deal */}
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
                <TouchableOpacity style={styles.dropdownBtn} onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert('انتخاب مشتری', 'مشتری مورد نظر را انتخاب کنید:', clients.map(c => ({ text: c.name, onPress: () => setSelectedClient(c) })).concat([{text: 'انصراف', style: 'cancel'}] as any));
                }}>
                  <Text style={[styles.dropdownText, !selectedClient && {color: '#64748b'}]}>{selectedClient ? selectedClient.name : '-- انتخاب از قیف فروش --'}</Text>
                  <Ionicons name="chevron-down" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>فایل ملک مرتبط (اختیاری)</Text>
                <TouchableOpacity style={styles.dropdownBtn} onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert('انتخاب فایل', 'ملک مورد نظر را انتخاب کنید:', properties.map(p => ({ text: p.title, onPress: () => setSelectedProperty(p) })).concat([{text: 'انصراف', style: 'cancel'}] as any));
                }}>
                  <Text style={[styles.dropdownText, !selectedProperty && {color: '#64748b'}]}>{selectedProperty ? selectedProperty.title : '-- انتخاب فایل از بانک --'}</Text>
                  <Ionicons name="chevron-down" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>نوع قرارداد</Text>
                <View style={styles.radioRow}>
                  <TouchableOpacity style={[styles.radioBtn, dealType === 'فروش' && styles.radioBtnActive]} onPress={() => { Haptics.selectionAsync(); setDealType('فروش'); }}><Text style={[styles.radioText, dealType === 'فروش' && styles.radioTextActive]}>خرید و فروش</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.radioBtn, dealType === 'رهن و اجاره' && styles.radioBtnActive]} onPress={() => { Haptics.selectionAsync(); setDealType('رهن و اجاره'); }}><Text style={[styles.radioText, dealType === 'رهن و اجاره' && styles.radioTextActive]}>رهن و اجاره</Text></TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>مبلغ کل معامله (تومان) *</Text>
                <TextInput 
                  style={styles.input} 
                  keyboardType="numeric" 
                  value={dealPrice} 
                  onChangeText={(text) => setDealPrice(formatPrice(formatInputToNumber(text)))} 
                  placeholder="مثال: 5,000,000,000" 
                  placeholderTextColor="#64748b" 
                />
                {/* اضافه شدن تبدیل عدد به حروف */}
                {dealPrice ? <Text style={styles.persianNumberText}>{numberToPersianWords(formatInputToNumber(dealPrice))}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>کمیسیون کل دریافتی (تومان) *</Text>
                <TextInput 
                  style={[styles.input, { color: '#10b981', borderColor: '#10b981', fontSize: 18 }]} 
                  keyboardType="numeric" 
                  value={commission} 
                  onChangeText={(text) => setCommission(formatPrice(formatInputToNumber(text)))} 
                  placeholder="مجموع دریافتی از طرفین" 
                  placeholderTextColor="#64748b" 
                />
                {/* اضافه شدن تبدیل عدد به حروف */}
                {commission ? <Text style={[styles.persianNumberText, {color: '#10b981'}]}>{numberToPersianWords(formatInputToNumber(commission))}</Text> : null}
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={submitDeal} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>ثبت نهایی تراکنش</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, backgroundColor: '#1E293B', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  headerTitle: { fontSize: 18, fontFamily: 'Vazir-Bold', color: '#f8fafc' },
  calcBtn: { width: 40, height: 40, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f59e0b' },
  paddingH: { paddingHorizontal: 20 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  heroCard: { padding: 24, borderRadius: 28, marginBottom: 25, borderWidth: 1, borderColor: '#334155', elevation: 8 },
  heroHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  heroLabel: { color: '#cbd5e1', fontSize: 13, fontFamily: 'Vazir-Bold' },
  heroValue: { color: '#f8fafc', fontSize: 32, fontFamily: 'System', fontWeight: 'bold', textAlign: 'right', marginBottom: 20 },
  heroCurrency: { fontSize: 14, fontFamily: 'Vazir-Regular', color: '#94a3b8' },
  
  splitRow: { flexDirection: 'row-reverse', backgroundColor: '#0B0F19', borderRadius: 20, padding: 15, borderWidth: 1, borderColor: '#334155' },
  splitBox: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: '100%', backgroundColor: '#334155' },
  splitLabel: { color: '#64748b', fontSize: 11, fontFamily: 'Vazir-Bold', marginBottom: 5 },
  splitValue: { fontSize: 16, fontWeight: 'bold', fontFamily: 'System' },
  
  sectionTitle: { fontSize: 16, fontFamily: 'Vazir-Bold', color: '#f8fafc', textAlign: 'right', marginBottom: 15 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyText: { color: '#64748b', marginTop: 10, fontSize: 14, fontFamily: 'Vazir-Regular' },
  
  transactionCard: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  transRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  transIconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  transInfo: { justifyContent: 'center' },
  transTitle: { color: '#f8fafc', fontSize: 15, fontFamily: 'Vazir-Bold', textAlign: 'right', marginBottom: 4 },
  transDate: { color: '#94a3b8', fontSize: 11, fontFamily: 'Vazir-Regular', textAlign: 'right' },
  transLeft: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  transAmount: { color: '#10b981', fontSize: 16, fontWeight: 'bold', fontFamily: 'System', marginBottom: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(168, 85, 247, 0.1)', justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end' },
  
  fab: { position: 'absolute', bottom: 30, left: 20, elevation: 10, shadowColor: '#10b981', shadowOpacity: 0.4, shadowRadius: 15 },
  fabGradient: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(11, 15, 25, 0.9)', justifyContent: 'flex-end' },
  modalView: { backgroundColor: '#1E293B', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '90%', borderWidth: 1, borderColor: '#334155' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#10b981', fontSize: 18, fontFamily: 'Vazir-Bold' },
  inputGroup: { marginBottom: 16 },
  label: { color: '#cbd5e1', marginBottom: 8, fontSize: 13, fontFamily: 'Vazir-Bold', textAlign: 'right' },
  input: { backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 16, color: '#f8fafc', textAlign: 'right', fontFamily: 'System', fontSize: 16 },
  dropdownBtn: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 16 },
  dropdownText: { color: '#f8fafc', fontSize: 14, fontFamily: 'Vazir-Regular' },
  radioRow: { flexDirection: 'row-reverse', gap: 10 },
  radioBtn: { flex: 1, backgroundColor: '#0B0F19', paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  radioBtnActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981' },
  radioText: { color: '#64748b', fontSize: 13, fontFamily: 'Vazir-Bold' },
  radioTextActive: { color: '#10b981' },
  submitBtn: { backgroundColor: '#10b981', padding: 18, borderRadius: 16, marginTop: 15, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontFamily: 'Vazir-Bold' },
  
  persianNumberText: { color: '#3b82f6', fontSize: 12, fontFamily: 'Vazir-Bold', textAlign: 'right', marginTop: 8, paddingRight: 5 },
});