import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Toast from 'react-native-toast-message';

const BASE_URL = "http://10.56.173.18:8000";

export default function TicketsScreen({ navigation }: any) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // استیت‌های مودال تیکت جدید (مثل قبل)
  const [newModalVisible, setNewModalVisible] = useState(false);
  const [colleagues, setColleagues] = useState<any[]>([]);
  const [receiverId, setReceiverId] = useState<number>(0);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('عادی');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // استیت‌های مودال پاسخ به تیکت
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  useEffect(() => { fetchTickets(); }, []);

  const fetchTickets = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await axios.get(`${BASE_URL}/api/tickets/app-list`, { headers: { Cookie: `access_token=Bearer ${token}` } });
      setTickets(response.data.tickets);
    } catch (error) { console.log("Error fetching tickets"); } finally { setLoading(false); }
  };

  const openNewTicketModal = async () => {
    setNewModalVisible(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const res = await axios.get(`${BASE_URL}/api/tickets/colleagues`, { headers: { Cookie: `access_token=Bearer ${token}` } });
      setColleagues(res.data);
      if(res.data.length > 0) setReceiverId(res.data[0].id);
    } catch (e) { Toast.show({ type: 'error', text1: 'خطا', text2: 'لیست همکاران دریافت نشد.' }); }
  };

  const submitTicket = async () => {
    if (!receiverId || !subject || !message) { Toast.show({ type: 'error', text1: 'خطا', text2: 'فیلدهای الزامی را پر کنید.' }); return; }
    setIsSubmitting(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      await axios.post(`${BASE_URL}/api/tickets/add`, { receiver_id: receiverId, subject, message, priority }, { headers: { Cookie: `access_token=Bearer ${token}` } });
      Toast.show({ type: 'success', text1: 'ثبت شد', text2: 'تیکت ارسال شد.' });
      setNewModalVisible(false); setSubject(''); setMessage('');
      fetchTickets();
    } catch (error) { Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکل در ارسال تیکت.' }); } finally { setIsSubmitting(false); }
  };

  const submitReply = async () => {
    if (!replyText) return;
    setIsReplying(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      let formData = new FormData();
      formData.append("message", replyText);
      
      await axios.post(`${BASE_URL}/api/tickets/${activeTicket.id}/reply`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Cookie: `access_token=Bearer ${token}` }
      });
      Toast.show({ type: 'success', text1: 'ارسال شد', text2: 'پاسخ شما روی این تیکت ثبت شد.' });
      setReplyModalVisible(false); setReplyText('');
      fetchTickets(); // برای آپدیت شدن وضعیت به "پاسخ داده شده"
    } catch(e) { Toast.show({ type: 'error', text1: 'خطا', text2: 'ارسال پاسخ با مشکل مواجه شد.' }); } finally { setIsReplying(false); }
  };

  const renderTicket = ({ item }: { item: any }) => {
    let statusColor = '#64748b'; 
    if (item.status === 'باز') statusColor = '#3b82f6';
    else if (item.status === 'در انتظار پاسخ') statusColor = '#f59e0b';
    else if (item.status === 'پاسخ داده شده' || item.status === 'حل شده') statusColor = '#10b981';
    
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => { setActiveTicket(item); setReplyModalVisible(true); }}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.subject}>{item.subject}</Text>
          <View style={[styles.badge, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}>
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-forward" size={24} color="#f8fafc" /></TouchableOpacity>
        <Text style={styles.headerTitle}>پشتیبانی و تیکت‌ها</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? ( <View style={styles.center}><ActivityIndicator size="large" color="#10b981" /></View> ) : tickets.length === 0 ? (
        <View style={styles.center}><Ionicons name="chatbubbles-outline" size={60} color="#334155" /><Text style={styles.emptyText}>تیکتی برای شما ثبت نشده است.</Text></View>
      ) : (
        <FlatList data={tickets} keyExtractor={(item) => item.id.toString()} renderItem={renderTicket} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} />
      )}

      <TouchableOpacity style={styles.fab} onPress={openNewTicketModal}><Ionicons name="add" size={30} color="#fff" /></TouchableOpacity>

      <Modal animationType="slide" transparent={true} visible={newModalVisible} onRequestClose={() => setNewModalVisible(false)}>
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
                    <TouchableOpacity key={c.id} style={[styles.colleagueChip, receiverId === c.id && styles.colleagueChipActive]} onPress={() => setReceiverId(c.id)}>
                      <Text style={[styles.colleagueText, receiverId === c.id && styles.colleagueTextActive]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>اولویت</Text>
                <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 }}>
                  <TouchableOpacity style={[styles.radioBtn, priority === 'پایین' && styles.radioBtnActive]} onPress={() => setPriority('پایین')}><Text style={[styles.radioText, priority === 'پایین' && styles.radioTextActive]}>پایین</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.radioBtn, priority === 'عادی' && styles.radioBtnActive]} onPress={() => setPriority('عادی')}><Text style={[styles.radioText, priority === 'عادی' && styles.radioTextActive]}>عادی</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.radioBtn, priority === 'بالا' && styles.radioBtnActive]} onPress={() => setPriority('بالا')}><Text style={[styles.radioText, priority === 'بالا' && styles.radioTextActive]}>بالا</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.radioBtn, priority === 'فوری' && { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.2)' }]} onPress={() => setPriority('فوری')}><Text style={[styles.radioText, priority === 'فوری' && { color: '#ef4444' }]}>فوری 🚨</Text></TouchableOpacity>
                </View>
              </View>
              <View style={styles.inputGroup}><Text style={styles.label}>موضوع *</Text><TextInput style={styles.input} value={subject} onChangeText={setSubject} /></View>
              <View style={styles.inputGroup}><Text style={styles.label}>پیام *</Text><TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={message} onChangeText={setMessage} multiline /></View>
              <TouchableOpacity style={styles.submitBtn} onPress={submitTicket} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>ارسال</Text>}</TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={replyModalVisible} onRequestClose={() => setReplyModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalView, { height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: 16 }]}>{activeTicket?.subject}</Text>
              <TouchableOpacity onPress={() => setReplyModalVisible(false)}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
            </View>
            
            <View style={styles.chatArea}>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
                <Text style={styles.infoText}>برای مشاهده تاریخچه پیام‌ها از نسخه وب استفاده کنید. در اینجا می‌توانید پاسخ جدید خود را ارسال کنید.</Text>
              </View>
            </View>

            <View style={styles.replyBox}>
              <TextInput style={styles.replyInput} placeholder="پاسخ خود را بنویسید..." placeholderTextColor="#64748b" value={replyText} onChangeText={setReplyText} multiline />
              <TouchableOpacity style={styles.sendBtn} onPress={submitReply} disabled={isReplying}>
                {isReplying ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // استایل‌های قبلی...
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, backgroundColor: '#1e293b', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#64748b', marginTop: 10 },
  card: { backgroundColor: '#1e293b', padding: 15, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subject: { color: '#f8fafc', fontWeight: 'bold', fontSize: 14, flex: 1, textAlign: 'right' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  code: { color: '#94a3b8', fontSize: 11, textAlign: 'right', fontFamily: 'System' },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#ec4899', justifyContent: 'center', alignItems: 'center', elevation: 10 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'flex-end' },
  modalView: { backgroundColor: '#1e293b', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#ec4899', fontSize: 18, fontWeight: 'bold' },
  inputGroup: { marginBottom: 16 },
  label: { color: '#cbd5e1', marginBottom: 8, fontSize: 13, fontWeight: 'bold', textAlign: 'right' },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 16, color: '#f8fafc', textAlign: 'right' },
  radioBtn: { flex: 1, backgroundColor: '#0f172a', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  radioBtnActive: { backgroundColor: 'rgba(236, 72, 153, 0.2)', borderColor: '#ec4899' },
  radioText: { color: '#64748b', fontSize: 13, fontWeight: 'bold' },
  radioTextActive: { color: '#ec4899' },
  colleagueChip: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, marginLeft: 10 },
  colleagueChipActive: { backgroundColor: 'rgba(236, 72, 153, 0.2)', borderColor: '#ec4899' },
  colleagueText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  colleagueTextActive: { color: '#ec4899' },
  submitBtn: { backgroundColor: '#ec4899', padding: 16, borderRadius: 16, marginTop: 10, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // استایل‌های چت داخل تیکت
  chatArea: { flex: 1, justifyContent: 'center' },
  infoBox: { flexDirection: 'row-reverse', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 1, borderColor: '#3b82f6', padding: 15, borderRadius: 16, alignItems: 'center', gap: 10 },
  infoText: { flex: 1, color: '#93c5fd', fontSize: 12, textAlign: 'right', lineHeight: 20 },
  replyBox: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 20, padding: 5, borderWidth: 1, borderColor: '#334155', marginTop: 15 },
  replyInput: { flex: 1, color: '#fff', paddingHorizontal: 15, maxHeight: 100, textAlign: 'right', paddingVertical: 10 },
  sendBtn: { width: 45, height: 45, backgroundColor: '#ec4899', borderRadius: 15, justifyContent: 'center', alignItems: 'center' }
});