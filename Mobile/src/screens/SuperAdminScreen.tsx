import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Switch, Dimensions, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function SuperAdminScreen({ navigation }: any) {
  const [agencies, setAgencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // فرم ثبت آژانس جدید
  const [newAgency, setNewAgency] = useState({
    agency_name: '', owner_name: '', phone: '', city: 'تهران', admin_username: '', admin_password: ''
  });

  useEffect(() => {
    fetchAgencies();
  }, []);

  const fetchAgencies = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/super-admin/agencies');
      // اگر دیتا بود اعمال کن، وگرنه دیتای تستی نشان بده
      if(res.data && res.data.length > 0) {
        setAgencies(res.data);
      } else {
        setDummyData();
      }
    } catch (e) {
      setDummyData();
    } finally {
      setLoading(false);
    }
  };

  const setDummyData = () => {
    setAgencies([
      { id: 1, name: 'آژانس مدرن الهیه', owner_name: 'مهندس رضایی', phone: '09120000001', subscription_active: true },
      { id: 2, name: 'املاک سناتور', owner_name: 'علی کریمی', phone: '09120000002', subscription_active: false },
      { id: 3, name: 'مسکن فردا', owner_name: 'آقای حسینی', phone: '09120000003', subscription_active: true }
    ]);
  };

  const toggleLicense = async (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Optimistic Update
    setAgencies(prev => prev.map(a => a.id === id ? { ...a, subscription_active: !a.subscription_active } : a));
    
    try {
      await api.put(`/api/super-admin/agencies/${id}/toggle`);
      Toast.show({ type: 'success', text1: 'بروزرسانی شد', text2: 'وضعیت لایسنس آژانس تغییر کرد.' });
    } catch (e) {
      // Revert on fail
      fetchAgencies();
      Toast.show({ type: 'error', text1: 'خطا', text2: 'تغییر لایسنس اعمال نشد.' });
    }
  };

  const submitNewAgency = async () => {
    if (!newAgency.agency_name || !newAgency.admin_username || !newAgency.admin_password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({ type: 'error', text1: 'خطا', text2: 'فیلدهای نام آژانس، نام کاربری و رمز مدیر الزامی است.' });
      return;
    }
    
    try {
      await api.post('/api/super-admin/agencies/add', newAgency);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'ثبت شد!', text2: 'آژانس جدید با موفقیت راه‌اندازی شد.' });
      setModalVisible(false);
      fetchAgencies();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'در ساخت آژانس مشکلی پیش آمد.' });
    }
  };

  const renderAgency = ({ item }: any) => (
    <View style={[styles.agencyCard, !item.subscription_active && { borderColor: '#ef4444', opacity: 0.8 }]}>
      <View style={styles.cardHeader}>
        <View style={styles.titleBox}>
          <Text style={styles.agencyName}>{item.name}</Text>
          {!item.subscription_active && <View style={styles.badge}><Text style={styles.badgeText}>مسدود</Text></View>}
        </View>
        <Switch 
          trackColor={{ false: '#334155', true: '#10b981' }}
          thumbColor={'#fff'}
          onValueChange={() => toggleLicense(item.id)}
          value={item.subscription_active}
        />
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoText}><Ionicons name="person-outline" /> مدیر: {item.owner_name}</Text>
        <Text style={[styles.infoText, {fontFamily: 'System'}]}><Ionicons name="call-outline" /> {item.phone}</Text>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
          <Ionicons name="pencil" size={16} color="#3b82f6" />
          <Text style={{color: '#3b82f6', fontSize: 12, fontWeight: 'bold'}}>ویرایش</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)}>
          <Ionicons name="trash" size={16} color="#ef4444" />
          <Text style={{color: '#ef4444', fontSize: 12, fontWeight: 'bold'}}>حذف دائم</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); navigation.goBack(); }} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>مرکز فرماندهی SaaS</Text>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setModalVisible(true); }} style={styles.addBtn}>
          <Ionicons name="business" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#ef4444" /></View>
      ) : (
        <FlatList
          data={agencies}
          keyExtractor={item => item.id.toString()}
          renderItem={renderAgency}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ marginBottom: 30 }}>
              <Text style={styles.sectionTitle}>گزارش فروش لایسنس (میلیون تومان)</Text>
              <View style={styles.chartBox}>
                <LineChart
                  data={{
                    labels: ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور"],
                    datasets: [{ data: [15, 28, 34, 45, 60, 85] }]
                  }}
                  width={width - 40}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix="m"
                  chartConfig={{
                    backgroundColor: "#1E293B",
                    backgroundGradientFrom: "#1E293B",
                    backgroundGradientTo: "#0B0F19",
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, // تم قرمز/نئونی برای سوپرادمین
                    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                    style: { borderRadius: 16 },
                    propsForDots: { r: "5", strokeWidth: "2", stroke: "#ef4444" },
                    propsForLabels: { fontFamily: 'System' }
                  }}
                  bezier
                  style={{ marginVertical: 8, borderRadius: 16 }}
                />
              </View>
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>لیست آژانس‌های فعال</Text>
            </View>
          }
        />
      )}

      {/* مودال ساخت آژانس جدید */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>راه‌اندازی آژانس جدید 🏢</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>نام آژانس *</Text>
              <TextInput style={styles.input} placeholder="مثال: مسکن مدرن" placeholderTextColor="#64748b" value={newAgency.agency_name} onChangeText={(t) => setNewAgency({...newAgency, agency_name: t})} />

              <Text style={styles.label}>نام مدیر قرارداد *</Text>
              <TextInput style={styles.input} placeholder="مثال: آقای رضایی" placeholderTextColor="#64748b" value={newAgency.owner_name} onChangeText={(t) => setNewAgency({...newAgency, owner_name: t})} />

              <Text style={styles.label}>موبایل تماس</Text>
              <TextInput style={[styles.input, {fontFamily: 'System'}]} placeholder="0912..." keyboardType="phone-pad" placeholderTextColor="#64748b" value={newAgency.phone} onChangeText={(t) => setNewAgency({...newAgency, phone: t})} />

              <View style={styles.divider} />
              <Text style={styles.sectionSubtitle}>اطلاعات ورود مدیر سیستم (Admin)</Text>

              <Text style={styles.label}>نام کاربری (موبایل مدیر) *</Text>
              <TextInput style={[styles.input, {fontFamily: 'System'}]} placeholder="admin_modern" placeholderTextColor="#64748b" value={newAgency.admin_username} onChangeText={(t) => setNewAgency({...newAgency, admin_username: t})} autoCapitalize="none" />

              <Text style={styles.label}>رمز عبور اولیه *</Text>
              <TextInput style={[styles.input, {fontFamily: 'System'}]} placeholder="123456" placeholderTextColor="#64748b" value={newAgency.admin_password} onChangeText={(t) => setNewAgency({...newAgency, admin_password: t})} secureTextEntry />

              <TouchableOpacity style={styles.submitBtn} onPress={submitNewAgency}>
                <Text style={styles.submitBtnText}>ایجاد و صدور لایسنس</Text>
                <Ionicons name="key" size={20} color="#fff" />
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, backgroundColor: '#1E293B', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  addBtn: { width: 40, height: 40, backgroundColor: '#ef4444', borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#ef4444', shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#ef4444' }, // تم قرمز سوپرادمین
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  sectionTitle: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16, textAlign: 'right', marginBottom: 15 },
  chartBox: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#334155', backgroundColor: '#1E293B' },
  
  agencyCard: { backgroundColor: '#1E293B', padding: 18, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#334155', elevation: 2 },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titleBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  agencyName: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16 },
  badge: { backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#ef4444' },
  badgeText: { color: '#ef4444', fontSize: 10, fontWeight: 'bold' },
  
  infoRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 5 },
  infoText: { color: '#94a3b8', fontSize: 12 },
  
  actions: { flexDirection: 'row-reverse', gap: 15, marginTop: 15, borderTopWidth: 1, borderTopColor: '#0B0F19', paddingTop: 12 },
  actionBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: '#0B0F19', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(11, 15, 25, 0.9)', justifyContent: 'flex-end' },
  modalView: { backgroundColor: '#1E293B', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '90%', borderWidth: 1, borderColor: '#334155' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#ef4444', fontSize: 18, fontWeight: 'bold' },
  
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 20 },
  sectionSubtitle: { color: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAlign: 'right', marginBottom: 15 },
  
  label: { color: '#cbd5e1', fontSize: 12, fontWeight: 'bold', textAlign: 'right', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 16, color: '#f8fafc', textAlign: 'right' },
  
  submitBtn: { flexDirection: 'row-reverse', backgroundColor: '#ef4444', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 25 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});