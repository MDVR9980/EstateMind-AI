import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Switch, Dimensions, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
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
      setAgencies(res.data && res.data.length > 0 ? res.data : []);
    } catch (e) { setAgencies([]); } 
    finally { setLoading(false); }
  };

  const toggleLicense = async (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAgencies(prev => prev.map(a => a.id === id ? { ...a, subscription_active: !a.subscription_active } : a));
    try {
      await api.put(`/api/super-admin/agencies/${id}/toggle`);
      Toast.show({ type: 'success', text1: 'بروزرسانی شد', text2: 'وضعیت لایسنس آژانس تغییر کرد.' });
    } catch (e) {
      fetchAgencies(); 
      Toast.show({ type: 'error', text1: 'خطا', text2: 'تغییر لایسنس اعمال نشد.' });
    }
  };

  const submitNewAgency = async () => {
    if (!newAgency.agency_name || !newAgency.admin_username || !newAgency.admin_password) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'فیلدهای نام آژانس، نام کاربری و رمز مدیر الزامی است.' }); return;
    }
    try {
      await api.post('/api/super-admin/agencies/add', newAgency);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'ثبت شد!', text2: 'آژانس جدید با موفقیت راه‌اندازی شد.' });
      setModalVisible(false);
      setNewAgency({ agency_name: '', owner_name: '', phone: '', city: 'تهران', admin_username: '', admin_password: '' });
      fetchAgencies(); 
    } catch (e) { Toast.show({ type: 'error', text1: 'خطا', text2: 'در ساخت آژانس مشکلی پیش آمد.' }); }
  };

  const handleDeleteAgency = (id: number, name: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('حذف دائم آژانس', `آیا از حذف کامل ${name} و تمام اطلاعات آن مطمئن هستید؟`, [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف شود', style: 'destructive', onPress: async () => {
        setAgencies(prev => prev.filter(a => a.id !== id));
        try {
          await api.delete(`/api/super-admin/agencies/${id}`);
          Toast.show({ type: 'success', text1: 'حذف شد', text2: 'آژانس به طور کامل از دیتابیس پاک شد.' });
        } catch (e) { fetchAgencies(); Toast.show({ type: 'error', text1: 'خطا در حذف' }); }
      }}
    ]);
  };

  const renderAgency = ({ item }: any) => (
    <View style={[styles.agencyCard, !item.subscription_active && { borderColor: 'rgba(239, 68, 68, 0.5)', opacity: 0.8 }]}>
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
        <Text style={styles.infoText}><Ionicons name="person-outline" size={14} /> {item.owner_name}</Text>
        <Text style={[styles.infoText, {fontFamily: 'System'}]}><Ionicons name="call-outline" size={14} /> {item.phone}</Text>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => Toast.show({ type: 'info', text1: 'ویرایش', text2: 'ویرایش از پنل وب امکان‌پذیر است.' })}>
          <Ionicons name="pencil" size={16} color="#3b82f6" />
          <Text style={{color: '#3b82f6', fontSize: 13, fontFamily: 'Vazir-Bold'}}>ویرایش</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteAgency(item.id, item.name)}>
          <Ionicons name="trash" size={16} color="#ef4444" />
          <Text style={{color: '#ef4444', fontSize: 13, fontFamily: 'Vazir-Bold'}}>حذف دائم</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>مدیریت آژانس‌ها (SaaS)</Text>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setModalVisible(true); }} style={styles.addBtn}>
          <Ionicons name="business" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? ( <View style={styles.center}><ActivityIndicator size="large" color="#ef4444" /></View> ) : (
        <FlatList
          data={agencies}
          keyExtractor={item => item.id.toString()}
          renderItem={renderAgency}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 50 }}><Ionicons name="business-outline" size={60} color="#334155" /><Text style={{ color: '#64748b', fontFamily: 'Vazir-Regular', marginTop: 10 }}>آژانسی ثبت نشده است.</Text></View>}
          ListHeaderComponent={
            <View style={{ marginBottom: 30 }}>
              <Text style={styles.sectionTitle}>گزارش فروش لایسنس (میلیون تومان)</Text>
              <View style={styles.chartBox}>
                <LineChart
                  data={{ labels: ["فروردین", "اردیب.", "خرداد", "تیر", "مرداد", "شهریور"], datasets: [{ data: [15, 28, 34, 45, 60, 85] }] }}
                  width={width - 40} height={250} yAxisLabel="" yAxisSuffix="m"
                  chartConfig={{
                    backgroundColor: "#1E293B", backgroundGradientFrom: "#1E293B", backgroundGradientTo: "#0B0F19",
                    decimalPlaces: 0, color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                    style: { borderRadius: 16 }, propsForDots: { r: "5", strokeWidth: "2", stroke: "#ef4444" },
                    propsForLabels: { fontFamily: 'System', fontSize: 11 }
                  }}
                  bezier style={{ borderRadius: 16, marginTop: 10 }}
                />
              </View>
              <Text style={[styles.sectionTitle, { marginTop: 30 }]}>لیست آژانس‌های فعال</Text>
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
              <TextInput style={[styles.input, {fontFamily: 'System', textAlign: 'right'}]} placeholder="0912..." keyboardType="phone-pad" placeholderTextColor="#64748b" value={newAgency.phone} onChangeText={(t) => setNewAgency({...newAgency, phone: t})} />

              <View style={styles.divider} />
              <Text style={styles.sectionSubtitle}>اطلاعات ورود مدیر سیستم (Admin)</Text>

              <Text style={styles.label}>نام کاربری (موبایل مدیر) *</Text>
              <TextInput style={[styles.input, {fontFamily: 'System', textAlign: 'right'}]} placeholder="admin_modern" placeholderTextColor="#64748b" value={newAgency.admin_username} onChangeText={(t) => setNewAgency({...newAgency, admin_username: t})} autoCapitalize="none" />

              <Text style={styles.label}>رمز عبور اولیه *</Text>
              <TextInput style={[styles.input, {fontFamily: 'System', textAlign: 'right'}]} placeholder="123456" placeholderTextColor="#64748b" value={newAgency.admin_password} onChangeText={(t) => setNewAgency({...newAgency, admin_password: t})} secureTextEntry />

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
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, backgroundColor: '#1E293B', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  addBtn: { width: 40, height: 40, backgroundColor: '#ef4444', borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#ef4444', shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
  headerTitle: { fontSize: 18, fontFamily: 'Vazir-Bold', color: '#ef4444' }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  sectionTitle: { color: '#f8fafc', fontFamily: 'Vazir-Bold', fontSize: 16, textAlign: 'right', marginBottom: 5, paddingTop: 5 },
  chartBox: { borderRadius: 16, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', paddingBottom: 10, alignItems: 'center' },
  
  agencyCard: { backgroundColor: '#1E293B', padding: 20, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#334155', elevation: 4 },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  agencyName: { color: '#f8fafc', fontFamily: 'Vazir-Bold', fontSize: 16 },
  badge: { backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.5)', justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#ef4444', fontSize: 10, fontFamily: 'Vazir-Bold' },
  
  infoRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 5 },
  infoText: { color: '#94a3b8', fontSize: 13, fontFamily: 'Vazir-Regular' },
  
  actions: { flexDirection: 'row-reverse', gap: 15, marginTop: 15, borderTopWidth: 1, borderTopColor: '#0B0F19', paddingTop: 15 },
  actionBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: '#0B0F19', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(11, 15, 25, 0.9)', justifyContent: 'flex-end' },
  modalView: { backgroundColor: '#1E293B', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '90%', borderWidth: 1, borderColor: '#334155' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#ef4444', fontSize: 18, fontFamily: 'Vazir-Bold' },
  
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 20 },
  sectionSubtitle: { color: '#3b82f6', fontSize: 14, fontFamily: 'Vazir-Bold', textAlign: 'right', marginBottom: 15 },
  
  label: { color: '#cbd5e1', fontSize: 13, fontFamily: 'Vazir-Bold', textAlign: 'right', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 16, color: '#f8fafc', textAlign: 'right', fontFamily: 'Vazir-Regular' },
  
  submitBtn: { flexDirection: 'row-reverse', backgroundColor: '#ef4444', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 25 },
  submitBtnText: { color: '#fff', fontFamily: 'Vazir-Bold', fontSize: 16 }
});