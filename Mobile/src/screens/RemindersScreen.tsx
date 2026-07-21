import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import moment from 'moment-jalaali';
import api from '../services/api';

moment.loadPersian({ usePersianDigits: true, dialect: 'persian-modern' });

export default function RemindersScreen({ navigation }: any) {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [desc, setDesc] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchReminders();
    }, [])
  );

  const fetchReminders = async () => {
    try {
      const response = await api.get(`/api/reminders/app-list`);
      setReminders(response.data.reminders);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'دریافت یادآورها با مشکل مواجه شد.' });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Optimistic UI Update
    setReminders(prev => prev.map(r => r.id === id ? { ...r, is_completed: true } : r));

    try {
      await api.put(`/api/reminders/${id}/complete`);
      Toast.show({ type: 'success', text1: 'انجام شد', text2: 'تسک به تاریخچه منتقل شد.' });
    } catch (error) {
      fetchReminders(); // Revert on error
      Toast.show({ type: 'error', text1: 'خطا', text2: 'ارتباط با سرور قطع است.' });
    }
  };

  const handleAddReminder = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!title || !date) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'عنوان و تاریخ الزامی است.' });
      return;
    }
    try {
      await api.post(`/api/reminders/add`, {
        title, remind_date: date, description: desc, client_id: 0
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'ثبت شد', text2: 'یادآور در تقویم قرار گرفت.' });
      setModalVisible(false);
      setTitle(''); setDate(''); setDesc('');
      fetchReminders();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکل در ذخیره یادآور. فرمت تاریخ باید YYYY-MM-DDTHH:MM باشد.' });
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    // تبدیل تاریخ میلادی سرور به فرمت شمسی (مثل: یکشنبه ۲۱ تیر - ۱۴:۳۰)
    const formattedDate = moment(item.remind_date).format('dddd jD jMMMM - HH:mm');

    return (
      <View style={[styles.card, item.is_completed && styles.cardCompleted]}>
        <View style={styles.cardInfo}>
          <Text style={[styles.title, item.is_completed && styles.textCompleted]}>{item.title}</Text>
          <Text style={[styles.date, item.is_completed && {color: '#64748b'}]}>
            <Ionicons name="time-outline" size={12} /> {formattedDate}
          </Text>
          {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
        </View>
        
        {!item.is_completed ? (
          <TouchableOpacity style={styles.checkBtn} onPress={() => handleComplete(item.id)}>
            <Ionicons name="checkmark" size={24} color="#f59e0b" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="checkmark-circle" size={28} color="#10b981" style={{ opacity: 0.8 }} />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); navigation.goBack(); }} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تقویم و تسک‌ها</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b" /></View>
      ) : reminders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={60} color="#334155" />
          <Text style={{ color: '#64748b', marginTop: 10, fontFamily: 'Vazir-Regular' }}>تسکی برای امروز ندارید.</Text>
        </View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setModalVisible(true); }}>
        <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.fabGradient}>
          <Ionicons name="add" size={32} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>یادآور جدید ⏰</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
            </View>

            <TextInput style={styles.input} placeholder="عنوان (مثال: تماس با مالک)" placeholderTextColor="#64748b" value={title} onChangeText={setTitle} />
            <TextInput style={[styles.input, { fontFamily: 'System', textAlign: 'left' }]} placeholder="مثال تاریخ سرور: 2026-07-20T14:30" placeholderTextColor="#64748b" value={date} onChangeText={setDate} />
            <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} placeholder="توضیحات (اختیاری)" placeholderTextColor="#64748b" value={desc} onChangeText={setDesc} multiline />

            <TouchableOpacity style={styles.submitBtn} onPress={handleAddReminder}>
              <Text style={styles.submitBtnText}>ثبت در تقویم</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  card: { flexDirection: 'row-reverse', backgroundColor: '#1E293B', padding: 18, borderRadius: 20, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#334155', borderRightWidth: 4, borderRightColor: '#f59e0b', elevation: 3 },
  cardCompleted: { opacity: 0.6, borderRightColor: '#10b981' },
  cardInfo: { flex: 1, alignItems: 'flex-end', paddingLeft: 15 },
  title: { color: '#f8fafc', fontFamily: 'Vazir-Bold', fontSize: 15, marginBottom: 6, textAlign: 'right' },
  textCompleted: { textDecorationLine: 'line-through', color: '#94a3b8' },
  date: { color: '#f59e0b', fontSize: 12, fontFamily: 'Vazir-Regular', marginBottom: 6 },
  desc: { color: '#cbd5e1', fontSize: 12, textAlign: 'right', fontFamily: 'Vazir-Regular', lineHeight: 20 },
  
  checkBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 1, borderColor: '#f59e0b', justifyContent: 'center', alignItems: 'center' },
  
  fab: { position: 'absolute', bottom: 30, left: 24, elevation: 10, shadowColor: '#f59e0b', shadowOpacity: 0.4, shadowRadius: 15 },
  fabGradient: { width: 65, height: 65, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(11, 15, 25, 0.9)', justifyContent: 'flex-end' },
  modalView: { backgroundColor: '#1E293B', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: '#334155' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#f59e0b', fontSize: 18, fontFamily: 'Vazir-Bold' },
  
  input: { backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 16, color: '#f8fafc', textAlign: 'right', marginBottom: 15, fontFamily: 'Vazir-Regular' },
  submitBtn: { backgroundColor: '#f59e0b', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#fff', fontFamily: 'Vazir-Bold', fontSize: 16 }
});