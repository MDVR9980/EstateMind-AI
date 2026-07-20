import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import api from '../services/api';

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
      console.log("Error fetching reminders", error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await api.put(`/api/reminders/${id}/complete`);
      Toast.show({ type: 'success', text1: 'انجام شد', text2: 'یادآور به تاریخچه منتقل شد.' });
      fetchReminders();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'ارتباط با سرور قطع است.' });
    }
  };

  const handleAddReminder = async () => {
    if (!title || !date) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'عنوان و تاریخ الزامی است.' });
      return;
    }
    try {
      await api.post(`/api/reminders/add`, {
        title, remind_date: date, description: desc, client_id: 0
      });
      Toast.show({ type: 'success', text1: 'ثبت شد', text2: 'یادآور در تقویم قرار گرفت.' });
      setModalVisible(false);
      setTitle(''); setDate(''); setDesc('');
      fetchReminders();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکل در ذخیره یادآور.' });
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, item.is_completed && styles.cardCompleted]}>
      <View style={styles.cardInfo}>
        <Text style={[styles.title, item.is_completed && styles.textCompleted]}>{item.title}</Text>
        <Text style={styles.date}>{item.remind_date.replace('T', ' ')}</Text>
        {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
      </View>
      
      {!item.is_completed ? (
        <TouchableOpacity style={styles.checkBtn} onPress={() => handleComplete(item.id)}>
          <Ionicons name="checkmark" size={24} color="#10b981" />
        </TouchableOpacity>
      ) : (
        <Ionicons name="checkmark-circle" size={28} color="#10b981" style={{ opacity: 0.5 }} />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تقویم و یادآورها</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b" /></View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>یادآور جدید ⏰</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
            </View>

            <TextInput style={styles.input} placeholder="عنوان (مثال: تماس با مالک)" placeholderTextColor="#64748b" value={title} onChangeText={setTitle} />
            <TextInput style={[styles.input, { fontFamily: 'System' }]} placeholder="تاریخ (مثال: 2026-07-20T14:30)" placeholderTextColor="#64748b" value={date} onChangeText={setDate} />
            <TextInput style={styles.input} placeholder="توضیحات (اختیاری)" placeholderTextColor="#64748b" value={desc} onChangeText={setDesc} multiline />

            <TouchableOpacity style={styles.submitBtn} onPress={handleAddReminder}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>ثبت در تقویم</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, backgroundColor: '#1e293b', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { flexDirection: 'row-reverse', backgroundColor: '#1e293b', padding: 16, borderRadius: 20, marginBottom: 12, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  cardCompleted: { opacity: 0.6, borderLeftColor: '#10b981' },
  cardInfo: { flex: 1, alignItems: 'flex-end', paddingLeft: 15 },
  title: { color: '#f8fafc', fontWeight: 'bold', fontSize: 15, marginBottom: 4, textAlign: 'right' },
  textCompleted: { textDecorationLine: 'line-through', color: '#94a3b8' },
  date: { color: '#f59e0b', fontSize: 11, fontFamily: 'System', marginBottom: 4 },
  desc: { color: '#cbd5e1', fontSize: 12, textAlign: 'right' },
  checkBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#f59e0b', justifyContent: 'center', alignItems: 'center', elevation: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'flex-end' },
  modalView: { backgroundColor: '#1e293b', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#f59e0b', fontSize: 18, fontWeight: 'bold' },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 16, color: '#f8fafc', textAlign: 'right', marginBottom: 15 },
  submitBtn: { backgroundColor: '#f59e0b', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 }
});