import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

export default function TicketsScreen({ navigation }: any) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newModalVisible, setNewModalVisible] = useState(false);
  const [colleagues, setColleagues] = useState<any[]>([]);
  const [receiverId, setReceiverId] = useState<number>(0);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('عادی');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchTickets();
    }, [])
  );

  const fetchTickets = async () => {
    try {
      const response = await api.get('/api/tickets/app-list');
      setTickets(response.data.tickets);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'دریافت لیست تیکت‌ها با مشکل مواجه شد.' });
    } finally {
      setLoading(false);
    }
  };

  const openNewTicketModal = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNewModalVisible(true);
    try {
      const res = await api.get('/api/tickets/colleagues');
      setColleagues(res.data);
      if(res.data.length > 0) setReceiverId(res.data[0].id);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'لیست همکاران دریافت نشد.' });
    }
  };

  const submitTicket = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (!receiverId || !subject || !message) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'فیلدهای الزامی را پر کنید.' });
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/api/tickets/add', { receiver_id: receiverId, subject, message, priority });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'ثبت شد', text2: 'تیکت با موفقیت ارسال شد.' });
      setNewModalVisible(false); setSubject(''); setMessage('');
      fetchTickets();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکل در ارسال تیکت.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitReply = async () => {
    if (!replyText) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsReplying(true);
    try {
      let formData = new FormData();
      formData.append("message", replyText);
      await api.post(`/api/tickets/${activeTicket.id}/reply`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'ارسال شد', text2: 'پاسخ شما روی این تیکت ثبت شد.' });
      setReplyModalVisible(false); setReplyText('');
      fetchTickets();
    } catch(e) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'ارسال پاسخ با مشکل مواجه شد.' });
    } finally {
      setIsReplying(false);
    }
  };

  const handleChangeStatus = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('تغییر وضعیت تیکت', 'وضعیت جدید را انتخاب کنید:', [
      { text: 'در حال بررسی', onPress: () => updateStatusApi('در حال بررسی') },
      { text: 'حل شده (بسته)', onPress: () => updateStatusApi('حل شده') },
      { text: 'انصراف', style: 'cancel' }
    ]);
  };

  const updateStatusApi = async (newStatus: string) => {
    try {
      await api.put(`/api/tickets/${activeTicket.id}/status`, { status: newStatus });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'آپدیت شد', text2: `تیکت با وضعیت "${newStatus}" ثبت شد.` });
      setReplyModalVisible(false);
      fetchTickets();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکل در تغییر وضعیت.' });
    }
  };

  const renderTicket = ({ item }: { item: any }) => {
    let statusColor = '#64748b'; 
    if (item.status === 'باز') statusColor = '#3b82f6';
    else if (item.status === 'در انتظار پاسخ' || item.status === 'در حال بررسی') statusColor = '#f59e0b';
    else if (item.status === 'پاسخ داده شده' || item.status === 'حل شده') statusColor = '#10b981';
    
    return (
      <TouchableOpacity 
        style={[styles.card, { borderRightWidth: 3, borderRightColor: statusColor }]} 
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTicket(item); setReplyModalVisible(true); }}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.subject}>{item.subject}</Text>
          <View style={[styles.badge, { backgroundColor: `${statusColor}15`, borderColor: statusColor }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.code}>{item.ticket_code}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); navigation.goBack(); }} style={styles.backBtn}><Ionicons name="arrow-forward" size={24} color="#f8fafc" /></TouchableOpacity>
        <Text style={styles.headerTitle}>پشتیبانی و تیکت‌ها</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? ( <View style={styles.center}><ActivityIndicator size="large" color="#ec4899" /></View> ) : tickets.length === 0 ? (
        <View style={styles.center}><Ionicons name="chatbubbles-outline" size={60} color="#334155" /><Text style={styles.emptyText}>تیکتی برای شما ثبت نشده است.</Text></View>
      ) : (
        <FlatList data={tickets} keyExtractor={(item) => item.id.toString()} renderItem={renderTicket} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} />
      )}

      <TouchableOpacity style={styles.fab} onPress={openNewTicketModal}>
        <LinearGradient colors={['#ec4899', '#be185d']} style={styles.fabGradient}>
          <Ionicons name="add" size={32} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* New Ticket Modal */}
      <Modal animationType="slide" transparent={true} visible={newModalVisible}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>مکاتبه سازمانی جدید ✉️</Text>
              <TouchableOpacity onPress={() => setNewModalVisible(false)}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>گیرنده پیام *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row-reverse' }}>
                  {colleagues.map(c => (
                    <TouchableOpacity key={c.id} style={[styles.colleagueChip, receiverId === c.id && styles.colleagueChipActive]} onPress={() => { Haptics.selectionAsync(); setReceiverId(c.id); }}>
                      <Text style={[styles.colleagueText, receiverId === c.id && styles.colleagueTextActive]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>اولویت</Text>
                <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 }}>
                  <TouchableOpacity style={[styles.radioBtn, priority === 'پایین' && styles.radioBtnActive]} onPress={() => { Haptics.selectionAsync(); setPriority('پایین'); }}><Text style={[styles.radioText, priority === 'پایین' && styles.radioTextActive]}>پایین</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.radioBtn, priority === 'عادی' && styles.radioBtnActive]} onPress={() => { Haptics.selectionAsync(); setPriority('عادی'); }}><Text style={[styles.radioText, priority === 'عادی' && styles.radioTextActive]}>عادی</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.radioBtn, priority === 'بالا' && styles.radioBtnActive]} onPress={() => { Haptics.selectionAsync(); setPriority('بالا'); }}><Text style={[styles.radioText, priority === 'بالا' && styles.radioTextActive]}>بالا</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.radioBtn, priority === 'فوری' && { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.2)' }]} onPress={() => { Haptics.selectionAsync(); setPriority('فوری'); }}><Text style={[styles.radioText, priority === 'فوری' && { color: '#ef4444' }]}>فوری 🚨</Text></TouchableOpacity>
                </View>
              </View>
              <View style={styles.inputGroup}><Text style={styles.label}>موضوع *</Text><TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholder="مثال: درخواست مرخصی" placeholderTextColor="#64748b" /></View>
              <View style={styles.inputGroup}><Text style={styles.label}>پیام *</Text><TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} value={message} onChangeText={setMessage} multiline placeholder="متن پیام..." placeholderTextColor="#64748b" /></View>
              <TouchableOpacity style={styles.submitBtn} onPress={submitTicket} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>ارسال تیکت</Text>}</TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* مودال چت و تغییر وضعیت (Reply Modal) */}
      <Modal animationType="slide" transparent={true} visible={replyModalVisible}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalView, { height: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { fontSize: 16 }]} numberOfLines={1}>{activeTicket?.subject}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center' }}>
                <TouchableOpacity onPress={handleChangeStatus}>
                  <Ionicons name="build-outline" size={24} color="#10b981" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setReplyModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.chatArea}>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={24} color="#3b82f6" />
                <Text style={styles.infoText}>برای مشاهده تاریخچه کامل پیام‌ها از نسخه وب استفاده کنید. در اینجا می‌توانید پاسخ سریع و جدید خود را ارسال کنید.</Text>
              </View>
            </View>

            <View style={styles.replyBox}>
              <TextInput 
                style={styles.replyInput} 
                placeholder="پاسخ خود را بنویسید..." 
                placeholderTextColor="#64748b" 
                value={replyText} 
                onChangeText={setReplyText} 
                multiline 
              />
              <TouchableOpacity style={styles.sendBtn} onPress={submitReply} disabled={isReplying}>
                {isReplying ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={20} color="#fff" style={{ marginLeft: 4 }} />}
              </TouchableOpacity>
            </View>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#64748b', marginTop: 10, fontFamily: 'Vazir-Regular' },
  
  card: { backgroundColor: '#1E293B', padding: 18, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#334155', elevation: 3 },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  subject: { color: '#f8fafc', fontFamily: 'Vazir-Bold', fontSize: 15, flex: 1, textAlign: 'right' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 10, fontFamily: 'Vazir-Bold' },
  code: { color: '#94a3b8', fontSize: 12, textAlign: 'right', fontFamily: 'System' },
  
  fab: { position: 'absolute', bottom: 30, left: 24, elevation: 10, shadowColor: '#ec4899', shadowOpacity: 0.4, shadowRadius: 15 },
  fabGradient: { width: 65, height: 65, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(11, 15, 25, 0.9)', justifyContent: 'flex-end' },
  modalView: { backgroundColor: '#1E293B', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '90%', borderWidth: 1, borderColor: '#334155' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#ec4899', fontSize: 18, fontFamily: 'Vazir-Bold', textAlign: 'right' },
  
  inputGroup: { marginBottom: 16 },
  label: { color: '#cbd5e1', marginBottom: 8, fontSize: 13, fontFamily: 'Vazir-Bold', textAlign: 'right' },
  input: { backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 16, color: '#f8fafc', textAlign: 'right', fontFamily: 'Vazir-Regular' },
  
  radioBtn: { flex: 1, backgroundColor: '#0B0F19', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  radioBtnActive: { backgroundColor: 'rgba(236, 72, 153, 0.1)', borderColor: '#ec4899' },
  radioText: { color: '#64748b', fontSize: 13, fontFamily: 'Vazir-Bold' },
  radioTextActive: { color: '#ec4899' },
  
  colleagueChip: { backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#334155', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 16, marginLeft: 10 },
  colleagueChipActive: { backgroundColor: 'rgba(236, 72, 153, 0.1)', borderColor: '#ec4899' },
  colleagueText: { color: '#94a3b8', fontSize: 13, fontFamily: 'Vazir-Bold' },
  colleagueTextActive: { color: '#ec4899' },
  
  submitBtn: { backgroundColor: '#ec4899', padding: 18, borderRadius: 16, marginTop: 10, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontFamily: 'Vazir-Bold' },

  chatArea: { flex: 1, justifyContent: 'center' },
  infoBox: { flexDirection: 'row-reverse', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 1, borderColor: '#3b82f6', padding: 15, borderRadius: 16, alignItems: 'center', gap: 10 },
  infoText: { flex: 1, color: '#93c5fd', fontSize: 13, textAlign: 'right', lineHeight: 22, fontFamily: 'Vazir-Regular' },
  
  replyBox: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#0B0F19', borderRadius: 20, padding: 5, borderWidth: 1, borderColor: '#334155', marginTop: 15 },
  replyInput: { flex: 1, color: '#fff', paddingHorizontal: 15, maxHeight: 100, textAlign: 'right', paddingVertical: 12, fontFamily: 'Vazir-Regular' },
  sendBtn: { width: 50, height: 50, backgroundColor: '#ec4899', borderRadius: 16, justifyContent: 'center', alignItems: 'center' }
});