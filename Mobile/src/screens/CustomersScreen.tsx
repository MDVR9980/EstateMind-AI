// src/screens/CustomersScreen.tsx
import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import api from '../services/api';

// ایمپورت ابزارهای فرمت عدد
import { numberToPersianWords, formatPrice, formatInputToNumber } from '../utils/numberFormat';

export default function CustomersScreen({ navigation }: any) {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Call Analyzer State
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [activeClient, setActiveClient] = useState<any>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [callResult, setCallResult] = useState<any>(null);

  // Requirement Modal for AI Matching
  const [reqModalVisible, setReqModalVisible] = useState(false);
  const [reqHoods, setReqHoods] = useState('');
  const [reqMaxBudget, setReqMaxBudget] = useState('');

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

  // ==========================================
  // کمپین‌های قطره‌ای و دسته‌بندی
  // ==========================================
  const handleChangeCategory = async (clientId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('تغییر وضعیت لید', 'اگر مشتری را روی حالت "پیگیری آینده (سرد)" بگذارید، ربات CRM به صورت خودکار پیامک‌های پیگیری (Drip Campaign) برای او ارسال می‌کند.', [
      { text: 'مشتری عادی (سبز)', onPress: () => updateCategoryApi(clientId, 'normal') },
      { text: 'مشتری VIP 👑 (بنفش)', onPress: () => updateCategoryApi(clientId, 'vip') },
      { text: 'متقاضی داغ 🔥 (قرمز)', onPress: () => updateCategoryApi(clientId, 'hot_lead') },
      { text: 'پیگیری آینده ❄️ (ورود به کمپین)', onPress: () => updateCategoryApi(clientId, 'cold') },
      { text: 'انصراف', style: 'cancel' }
    ]);
  };

  const updateCategoryApi = async (clientId: number, category: string) => {
    try {
      await api.put('/api/clients/update-category', { client_id: clientId, category });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'بروزرسانی شد', text2: category === 'cold' ? 'مشتری وارد کمپین بازاریابی قطره‌ای شد.' : 'وضعیت مشتری تغییر کرد.' });
      fetchClients();
    } catch (e) { Toast.show({ type: 'error', text1: 'خطا' }); }
  };

  // ==========================================
  // تحلیلگر هوشمند تماس (Call Analyzer)
  // ==========================================
  async function startRecording() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      // 🌟 فیکس باگ: خالی کردن حافظه میکروفون قبل از شروع مجدد
      if (recording) {
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }
      
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return;
      
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(newRecording);
    } catch (err) {
      console.log('Recording error:', err);
    }
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
      // تضمین ارسال درست فایل در iOS و Android
      const fileUri = Platform.OS === 'ios' && !uri.startsWith('file://') ? `file://${uri}` : uri;
      let formData = new FormData();
      formData.append('audio', { uri: fileUri, name: 'call.m4a', type: 'audio/m4a' } as any);
      
      const response = await api.post(`/api/clients/${activeClient.id}/analyze-call`, formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      
      if (response.data.status === 'success') {
        setCallResult(response.data.analysis);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({ type: 'success', text1: 'تحلیل انجام شد', text2: 'خلاصه مکالمه در پرونده مشتری ذخیره شد.' });
      }
    } catch (error) { 
      Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکلی در اتصال به هوش مصنوعی پیش آمد.' }); 
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  // ==========================================
  // ثبت فرم نیازها برای مچینگ خودکار (Radar)
  // ==========================================
  const submitRequirement = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!reqHoods) { Toast.show({ type: 'error', text1: 'خطا', text2: 'ثبت محله الزامی است.' }); return; }
    try {
      const payload = { 
        client_id: activeClient.id, 
        deal_type: 'sale', 
        property_type: 'apartment', 
        preferred_neighborhoods: reqHoods, 
        min_budget: 0, 
        max_budget: formatInputToNumber(reqMaxBudget) 
      };
      await api.post('/api/clients/add-requirement', payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'تارگت تنظیم شد 🎯', text2: 'ربات هر زمان فایل مشابهی شکار کند شما را خبر می‌کند.' });
      setReqModalVisible(false); 
      setReqHoods(''); 
      setReqMaxBudget('');
    } catch (e) { Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکل در ثبت رادار.' }); }
  };

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

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.reqBtn} onPress={() => { setActiveClient(item); setReqModalVisible(true); }}>
            <Ionicons name="radar-outline" size={18} color="#a855f7" />
            <Text style={styles.btnText}>تارگت (مچینگ)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.reqBtn, { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' }]} onPress={() => { setActiveClient(item); setCallResult(null); setCallModalVisible(true); }}>
            <Ionicons name="mic-outline" size={18} color="#3b82f6" />
            <Text style={[styles.btnText, { color: '#3b82f6' }]}>تحلیل تماس (AI)</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const filteredClients = clients.filter(c => c.name.includes(searchQuery) || c.phone.includes(searchQuery));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-forward" size={24} color="#f8fafc" /></TouchableOpacity>
        <Text style={styles.headerTitle}>دفترچه مشتریان هوشمند</Text>
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

      {/* مودال تحلیلگر تماس */}
      <Modal animationType="slide" transparent={true} visible={callModalVisible} onRequestClose={() => setCallModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#3b82f6' }]}>تحلیلگر مکالمه 📞</Text>
              <TouchableOpacity onPress={() => { setCallModalVisible(false); setCallResult(null); setRecording(null); }}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginBottom: 30, lineHeight: 22, fontFamily: 'Vazir-Regular' }}>
              مکالمه خود با <Text style={{fontWeight: 'bold', color: '#fff'}}>{activeClient?.name}</Text> را ضبط کنید تا هوش مصنوعی آن را خلاصه کرده و احساسات مشتری را بسنجد.
            </Text>
            
            <View style={{ alignItems: 'center', marginBottom: 30 }}>
              {isAnalyzing ? (
                <View style={{ alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={{ color: '#3b82f6', marginTop: 15, fontFamily: 'Vazir-Bold' }}>در حال پردازش صدا و احساسات...</Text>
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
                <Text style={{ color: '#f8fafc', fontSize: 13, lineHeight: 22, textAlign: 'right', marginBottom: 15, fontFamily: 'Vazir-Regular' }}>{callResult.summary}</Text>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#1E293B', paddingTop: 10 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'Vazir-Regular' }}>حالت احساسی (Sentiment):</Text>
                  <Text style={{ color: callResult.sentiment === 'positive' ? '#10b981' : callResult.sentiment === 'negative' ? '#ef4444' : '#f59e0b', fontFamily: 'Vazir-Bold' }}>
                    {callResult.sentiment === 'positive' ? 'راغب و مثبت 😊' : callResult.sentiment === 'negative' ? 'ناراضی / سرد 😠' : 'معمولی 😐'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* مودال فرم نیاز (برای مچینگ خودکار) */}
      <Modal animationType="fade" transparent={true} visible={reqModalVisible} onRequestClose={() => setReqModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#a855f7' }]}>تارگت‌یابی هوشمند 🎯</Text>
              <TouchableOpacity onPress={() => setReqModalVisible(false)}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
            </View>
            <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'right', marginBottom: 20, fontFamily: 'Vazir-Regular', lineHeight: 20 }}>با تنظیم این بخش، هر زمان فایل مناسبی در سیستم ثبت شود (حتی توسط ربات دیوار)، سیستم به شما آلارم می‌دهد.</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>محله‌های درخواستی (با ویرگول جدا کنید) *</Text>
              <TextInput style={styles.input} placeholder="مثال: سجاد، هاشمیه" placeholderTextColor="#64748b" value={reqHoods} onChangeText={setReqHoods} />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>حداکثر بودجه</Text>
              <TextInput 
                style={[styles.input, { fontFamily: 'System', color: '#a855f7', borderColor: 'rgba(168, 85, 247, 0.5)' }]} 
                placeholder="مثال: 10,000,000,000" 
                placeholderTextColor="#64748b" 
                keyboardType="numeric" 
                value={reqMaxBudget} 
                onChangeText={(text) => setReqMaxBudget(formatPrice(formatInputToNumber(text)))} 
              />
              {reqMaxBudget ? <Text style={styles.persianNumberText}>{numberToPersianWords(formatInputToNumber(reqMaxBudget))}</Text> : null}
            </View>

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#a855f7' }]} onPress={submitRequirement}>
              <Text style={styles.submitText}>فعال‌سازی ردیاب مشتری</Text>
            </TouchableOpacity>
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
  
  actionsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 10 },
  reqBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(168, 85, 247, 0.1)', borderWidth: 1, borderColor: '#a855f7', padding: 12, borderRadius: 14, gap: 8 },
  btnText: { color: '#a855f7', fontFamily: 'Vazir-Bold', fontSize: 12 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(11, 15, 25, 0.9)', justifyContent: 'flex-end' },
  modalView: { backgroundColor: '#1E293B', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '90%', borderWidth: 1, borderColor: '#334155' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontFamily: 'Vazir-Bold' },
  
  inputGroup: { marginBottom: 16 },
  label: { color: '#cbd5e1', marginBottom: 8, fontSize: 13, fontFamily: 'Vazir-Bold', textAlign: 'right' },
  input: { backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 16, color: '#f8fafc', textAlign: 'right', fontFamily: 'Vazir-Regular' },
  submitBtn: { backgroundColor: '#10b981', padding: 18, borderRadius: 16, marginTop: 10, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontFamily: 'Vazir-Bold' },
  micButton: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', shadowColor: '#3b82f6', shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },

  persianNumberText: { color: '#c084fc', fontSize: 12, fontFamily: 'Vazir-Bold', textAlign: 'right', marginTop: 8, paddingRight: 5 }
});