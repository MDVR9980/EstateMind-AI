import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

export default function CustomersScreen({ navigation }: any) {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [callModalVisible, setCallModalVisible] = useState(false);
  const [activeClient, setActiveClient] = useState<any>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [callResult, setCallResult] = useState<any>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDealType, setNewDealType] = useState('sale');
  const [newBudget, setNewBudget] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [reqModalVisible, setReqModalVisible] = useState(false);
  const [activeClientId, setActiveClientId] = useState(0);
  const [reqHoods, setReqHoods] = useState('');
  const [reqMinBudget, setReqMinBudget] = useState('');
  const [reqBudget, setReqBudget] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchClients();
    }, [])
  );

  const fetchClients = async () => {
    try {
      const response = await api.get('/api/clients/app-list');
      setClients(response.data.clients);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'ارتباط با سرور برقرار نشد.' });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (!price || price === 0) return 'بودجه نامشخص';
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' تومان';
  };

  const handleAddClient = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!newName || !newPhone) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({ type: 'error', text1: 'خطا', text2: 'نام و موبایل مشتری الزامی است.' }); return;
    }
    setIsSubmitting(true);
    try {
      const payload = { name: newName, phone: newPhone, deal_type_requested: newDealType, budget_limit: newBudget ? parseFloat(newBudget.replace(/,/g, '')) : 0 };
      await api.post('/api/clients/add', payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'ثبت شد', text2: 'مشتری وارد قیف فروش شد.' });
      setModalVisible(false); setNewName(''); setNewPhone(''); setNewBudget('');
      fetchClients();
    } catch (error) { Toast.show({ type: 'error', text1: 'خطا', text2: 'خطا در ثبت مشتری.' }); } finally { setIsSubmitting(false); }
  };

  const handleChangeCategory = async (clientId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('تغییر وضعیت لید', 'دسته بندی این مشتری را انتخاب کنید:', [
      { text: 'مشتری عادی (سبز)', onPress: () => updateCategoryApi(clientId, 'normal') },
      { text: 'مشتری VIP 👑 (بنفش)', onPress: () => updateCategoryApi(clientId, 'vip') },
      { text: 'متقاضی داغ 🔥 (قرمز)', onPress: () => updateCategoryApi(clientId, 'hot_lead') },
      { text: 'پیگیری آینده ❄️ (آبی)', onPress: () => updateCategoryApi(clientId, 'cold') },
      { text: 'انصراف', style: 'cancel' }
    ]);
  };

  const updateCategoryApi = async (clientId: number, category: string) => {
    try {
      await api.put('/api/clients/update-category', { client_id: clientId, category });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'بروزرسانی شد', text2: 'وضعیت مشتری تغییر کرد.' });
      fetchClients();
    } catch (e) { Toast.show({ type: 'error', text1: 'خطا' }); }
  };

  async function startRecording() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
    } catch (err) {}
  }

  async function stopRecording() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!recording) return;
    setRecording(null);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (uri) analyzeCallAudio(uri);
  }

  const analyzeCallAudio = async (uri: string) => {
    setIsAnalyzing(true);
    try {
      let formData = new FormData();
      formData.append('audio', { uri: uri, name: 'call.m4a', type: 'audio/m4a' } as any);
      const response = await api.post(`/api/clients/${activeClient.id}/analyze-call`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (response.data.status === 'success') {
        setCallResult(response.data.analysis);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({ type: 'success', text1: 'تحلیل انجام شد', text2: 'خلاصه مکالمه در پرونده مشتری ذخیره شد.' });
      }
    } catch (error) { Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکلی در تحلیل صدا پیش آمد.' }); } finally { setIsAnalyzing(false); }
  };
  
  const submitRequirement = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!reqHoods) { Toast.show({ type: 'error', text1: 'خطا', text2: 'ثبت محله الزامی است.' }); return; }
    try {
      const payload = { client_id: activeClientId, deal_type: 'sale', property_type: 'apartment', preferred_neighborhoods: reqHoods, min_budget: reqMinBudget ? parseFloat(reqMinBudget.replace(/,/g, '')) : 0, max_budget: reqBudget ? parseFloat(reqBudget.replace(/,/g, '')) : 0 };
      await api.post('/api/clients/add-requirement', payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'پرزنتیشن ثبت شد 🎯', text2: 'اکنون می‌توانید فایل‌ها را برای این مشتری ببینید.' });
      setReqModalVisible(false); setReqHoods(''); setReqBudget(''); setReqMinBudget('');
    } catch (e) { Toast.show({ type: 'error', text1: 'خطا' }); }
  };

  const filteredClients = clients.filter(c => c.name.includes(searchQuery) || c.phone.includes(searchQuery));

  const renderClientCard = ({ item }: { item: any }) => {
    let catColor = '#10b981'; let catIcon = 'person-outline';
    if (item.client_category === 'vip') { catColor = '#a855f7'; catIcon = 'star-outline'; } 
    else if (item.client_category === 'hot_lead') { catColor = '#ef4444'; catIcon = 'flame-outline'; } 
    else if (item.client_category === 'cold') { catColor = '#3b82f6'; catIcon = 'snow-outline'; } 

    return (
      <View style={[styles.card, { borderRightWidth: 4, borderRightColor: catColor }]}>
        <View style={styles.cardHeader}>
          <View style={styles.clientInfo}>
            <View style={[styles.avatar, { borderColor: catColor, backgroundColor: `${catColor}15` }]}>
              <Text style={[styles.avatarText, { color: catColor }]}>{item.name.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.clientName}>{item.name}</Text>
              <Text style={styles.clientPhone}>{item.phone}</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.categoryBadge, { backgroundColor: `${catColor}15`, borderColor: catColor }]} onPress={() => handleChangeCategory(item.id)}>
            <Ionicons name={catIcon as any} size={16} color={catColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>مرحله قیف</Text>
            <Text style={styles.detailValue}>{item.funnel_stage}</Text>
          </View>
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>سقف بودجه</Text>
            <Text style={[styles.detailValue, { color: '#10b981', fontFamily: 'System' }]}>{formatPrice(item.budget_limit)}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.reqBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveClientId(item.id); setReqModalVisible(true); }}>
            <Ionicons name="easel-outline" size={18} color="#a855f7" />
            <Text style={styles.btnText}>پرزنتیشن</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.reqBtn, { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveClient(item); setCallResult(null); setCallModalVisible(true); }}>
            <Ionicons name="mic-outline" size={18} color="#3b82f6" />
            <Text style={[styles.btnText, { color: '#3b82f6' }]}>تحلیل تماس</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); navigation.goBack(); }} style={styles.backBtn}><Ionicons name="arrow-forward" size={24} color="#f8fafc" /></TouchableOpacity>
        <Text style={styles.headerTitle}>دفترچه مشتریان</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput style={styles.searchInput} placeholder="جستجوی نام یا موبایل..." placeholderTextColor="#64748b" value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      {loading ? ( <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10b981" /></View> ) : filteredClients.length === 0 ? (
        <View style={styles.centerContainer}><Ionicons name="people-outline" size={60} color="#334155" /><Text style={styles.emptyText}>مشتری یافت نشد!</Text></View>
      ) : ( 
        <FlatList data={filteredClients} keyExtractor={(item) => item.id.toString()} renderItem={renderClientCard} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} /> 
      )}

      {/* دکمه شناور اضافه کردن مشتری */}
      <TouchableOpacity style={styles.fab} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setModalVisible(true); }}>
        <LinearGradient colors={['#10b981', '#059669']} style={styles.fabGradient}>
          <Ionicons name="person-add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* مودال ثبت مشتری */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ثبت مشتری جدید 👤</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}><Text style={styles.label}>نام و نام خانوادگی *</Text><TextInput style={styles.input} placeholder="مثال: سارا محمدی" placeholderTextColor="#64748b" value={newName} onChangeText={setNewName} /></View>
              <View style={styles.inputGroup}><Text style={styles.label}>شماره موبایل *</Text><TextInput style={[styles.input, { fontFamily: 'System' }]} placeholder="0912..." placeholderTextColor="#64748b" keyboardType="phone-pad" value={newPhone} onChangeText={setNewPhone} /></View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>نوع درخواست</Text>
                <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
                  <TouchableOpacity style={[styles.radioBtn, newDealType === 'sale' && styles.radioBtnActive]} onPress={() => { Haptics.selectionAsync(); setNewDealType('sale'); }}><Text style={[styles.radioText, newDealType === 'sale' && styles.radioTextActive]}>خرید</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.radioBtn, newDealType === 'rent' && styles.radioBtnActive]} onPress={() => { Haptics.selectionAsync(); setNewDealType('rent'); }}><Text style={[styles.radioText, newDealType === 'rent' && styles.radioTextActive]}>اجاره</Text></TouchableOpacity>
                </View>
              </View>
              <View style={styles.inputGroup}><Text style={styles.label}>سقف بودجه (تومان)</Text><TextInput style={[styles.input, { fontFamily: 'System', color: '#10b981', borderColor: '#10b981' }]} placeholder="5,000,000,000" placeholderTextColor="#64748b" keyboardType="numeric" value={newBudget} onChangeText={(text) => setNewBudget(text.replace(/,/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ","))} /></View>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddClient} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>ذخیره در قیف فروش</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* مودال پرزنتیشن */}
      <Modal animationType="fade" transparent={true} visible={reqModalVisible} onRequestClose={() => setReqModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: '#a855f7' }]}>تنظیمات پرزنتیشن 🎯</Text><TouchableOpacity onPress={() => setReqModalVisible(false)}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity></View>
            <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'right', marginBottom: 20, fontFamily: 'Vazir-Regular' }}>با تنظیم مناطق و بودجه، هوش مصنوعی فایل‌های مناسب را پیدا می‌کند.</Text>
            
            <View style={styles.inputGroup}><Text style={styles.label}>محله‌های درخواستی (با ویرگول جدا کنید) *</Text><TextInput style={styles.input} placeholder="مثال: سجاد، هاشمیه" placeholderTextColor="#64748b" value={reqHoods} onChangeText={setReqHoods} /></View>
            <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
              <View style={[styles.inputGroup, { flex: 1 }]}><Text style={styles.label}>حداقل بودجه</Text><TextInput style={[styles.input, { fontFamily: 'System' }]} placeholder="مثال: 5,000,000,000" placeholderTextColor="#64748b" keyboardType="numeric" value={reqMinBudget} onChangeText={(text) => setReqMinBudget(text.replace(/,/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ","))} /></View>
              <View style={[styles.inputGroup, { flex: 1 }]}><Text style={styles.label}>حداکثر بودجه</Text><TextInput style={[styles.input, { fontFamily: 'System' }]} placeholder="مثال: 10,000,000,000" placeholderTextColor="#64748b" keyboardType="numeric" value={reqBudget} onChangeText={(text) => setReqBudget(text.replace(/,/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ","))} /></View>
            </View>

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#a855f7' }]} onPress={submitRequirement}>
              <Text style={styles.submitText}>شروع جستجوی هوشمند</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* مودال تحلیلگر تماس */}
      <Modal animationType="slide" transparent={true} visible={callModalVisible} onRequestClose={() => setCallModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: '#3b82f6' }]}>تحلیلگر تماس 📞</Text><TouchableOpacity onPress={() => setCallModalVisible(false)}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity></View>
            <Text style={{ color: '#94a3b8', fontSize: 13, fontFamily: 'Vazir-Regular', textAlign: 'center', marginBottom: 30, lineHeight: 22 }}>مکالمه خود با <Text style={{fontFamily: 'Vazir-Bold', color: '#fff'}}>{activeClient?.name}</Text> را ضبط کنید تا هوش مصنوعی آن را خلاصه کرده و احساسات مشتری را بسنجد.</Text>
            
            <View style={{ alignItems: 'center', marginBottom: 30 }}>
              {isAnalyzing ? (
                <View style={{ alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={{ color: '#3b82f6', marginTop: 15, fontFamily: 'Vazir-Bold' }}>در حال پردازش صدا...</Text>
                </View>
              ) : (
                <TouchableOpacity style={[styles.micButton, recording ? { backgroundColor: '#ef4444', transform: [{ scale: 1.1 }] } : null]} onPressIn={startRecording} onPressOut={stopRecording}>
                  <Ionicons name="mic" size={50} color="#fff" />
                </TouchableOpacity>
              )}
              <Text style={{ color: '#cbd5e1', marginTop: 15, fontSize: 12, fontFamily: 'Vazir-Regular' }}>{recording ? "در حال ضبط... رها کنید تا تحلیل شود" : "دکمه را نگه دارید و صحبت کنید"}</Text>
            </View>

            {callResult && (
              <View style={{ backgroundColor: '#0B0F19', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#334155' }}>
                <Text style={{ color: '#3b82f6', fontFamily: 'Vazir-Bold', marginBottom: 10, textAlign: 'right' }}>📝 خلاصه مکالمه:</Text>
                <Text style={{ color: '#f8fafc', fontSize: 13, lineHeight: 22, textAlign: 'right', fontFamily: 'Vazir-Regular', marginBottom: 15 }}>{callResult.summary}</Text>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#1E293B', paddingTop: 10 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'Vazir-Regular' }}>حالت مشتری (Sentiment):</Text>
                  <Text style={{ color: callResult.sentiment === 'positive' ? '#10b981' : callResult.sentiment === 'negative' ? '#ef4444' : '#f59e0b', fontFamily: 'Vazir-Bold' }}>
                    {callResult.sentiment === 'positive' ? 'راغب و مثبت 😊' : callResult.sentiment === 'negative' ? 'ناراضی / سرد 😠' : 'معمولی 😐'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, backgroundColor: '#1E293B', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  headerTitle: { fontSize: 18, fontFamily: 'Vazir-Bold', color: '#f8fafc' },
  
  searchContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#1E293B', marginHorizontal: 20, borderRadius: 16, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#334155' },
  searchIcon: { marginLeft: 10 },
  searchInput: { flex: 1, color: '#f8fafc', paddingVertical: 12, textAlign: 'right', fontFamily: 'Vazir-Regular' },
  
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#64748b', marginTop: 10, fontSize: 14, fontFamily: 'Vazir-Regular' },
  
  card: { backgroundColor: '#1E293B', borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155', elevation: 5 },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#0B0F19', paddingBottom: 12 },
  clientInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: 'Vazir-Bold', fontSize: 16 },
  clientName: { color: '#f8fafc', fontFamily: 'Vazir-Bold', fontSize: 15, textAlign: 'right' },
  clientPhone: { color: '#94a3b8', fontSize: 11, textAlign: 'right', marginTop: 2, fontFamily: 'System' },
  categoryBadge: { padding: 8, borderRadius: 12, borderWidth: 1 },
  
  detailsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 16 },
  detailBox: { flex: 1, alignItems: 'center', backgroundColor: '#0B0F19', padding: 12, borderRadius: 16, marginHorizontal: 4, borderWidth: 1, borderColor: '#334155' },
  detailLabel: { color: '#64748b', fontSize: 10, marginBottom: 4, fontFamily: 'Vazir-Regular' },
  detailValue: { color: '#f8fafc', fontFamily: 'Vazir-Bold', fontSize: 12 },
  
  actionsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 10 },
  reqBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(168, 85, 247, 0.1)', borderWidth: 1, borderColor: '#a855f7', padding: 12, borderRadius: 14, gap: 8 },
  btnText: { color: '#a855f7', fontFamily: 'Vazir-Bold', fontSize: 12 },
  
  fab: { position: 'absolute', bottom: 30, left: 24, elevation: 10, shadowColor: '#10b981', shadowOpacity: 0.4, shadowRadius: 15 },
  fabGradient: { width: 65, height: 65, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(11, 15, 25, 0.9)', justifyContent: 'flex-end' },
  modalView: { backgroundColor: '#1E293B', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '90%', borderWidth: 1, borderColor: '#334155' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontFamily: 'Vazir-Bold' },
  
  inputGroup: { marginBottom: 16 },
  label: { color: '#cbd5e1', marginBottom: 8, fontSize: 13, fontFamily: 'Vazir-Bold', textAlign: 'right' },
  input: { backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 16, color: '#f8fafc', textAlign: 'right', fontFamily: 'Vazir-Regular' },
  
  radioBtn: { flex: 1, backgroundColor: '#0B0F19', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  radioBtnActive: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' },
  radioText: { color: '#64748b', fontSize: 13, fontFamily: 'Vazir-Bold' },
  radioTextActive: { color: '#3b82f6' },
  
  submitBtn: { backgroundColor: '#10b981', padding: 18, borderRadius: 16, marginTop: 10, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontFamily: 'Vazir-Bold' },
  
  micButton: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', shadowColor: '#3b82f6', shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 }
});