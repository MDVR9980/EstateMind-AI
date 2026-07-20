import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const BASE_URL = "http://10.56.173.18:8000";

export default function VoiceAddScreen({ navigation }: any) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null); // دیتای استخراج شده توسط AI

  // شروع ضبط صدا
  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('خطا', 'لطفاً دسترسی میکروفون را مجاز کنید.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  // پایان ضبط و ارسال به هوش مصنوعی
  async function stopRecording() {
    if (!recording) return;
    setRecording(null);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (uri) sendAudioToServer(uri);
  }

  // ارسال فایل به سرور FastAPI
  const sendAudioToServer = async (uri: string) => {
    setIsProcessing(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      
      let formData = new FormData();
      formData.append('audio', {
        uri: uri,
        name: 'voice_record.m4a',
        type: 'audio/m4a',
      } as any);

      const response = await axios.post(`${BASE_URL}/api/properties/voice-parse`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Cookie: `access_token=Bearer ${token}`,
        },
      });

      if (response.data.status === 'success') {
        setParsedData(response.data.data);
        Alert.alert('موفقیت', 'هوش مصنوعی ویس شما را با موفقیت تبدیل به فرم کرد!');
      }
    } catch (error) {
      Alert.alert('خطا', 'مشکلی در تحلیل صدا پیش آمد.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ثبت نهایی در دیتابیس
  const saveToDatabase = async () => {
    setIsProcessing(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await axios.post(`${BASE_URL}/api/properties/save`, parsedData, {
        headers: { Cookie: `access_token=Bearer ${token}` }
      });
      
      if (response.data.status === 'success') {
        Alert.alert('ثبت شد!', 'فایل شما در سیستم قرار گرفت.');
        navigation.navigate('Properties');
      }
    } catch (error) {
      Alert.alert('خطا', 'مشکل در ذخیره اطلاعات');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>دستیار صوتی (Voice to CRM)</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.infoText}>
          دکمه زیر را نگه دارید و مشخصات ملک را به صورت عامیانه بیان کنید. هوش مصنوعی آن را تبدیل به فرم می‌کند.
        </Text>

        <View style={styles.micContainer}>
          {isProcessing ? (
            <View style={styles.processingBox}>
              <ActivityIndicator size="large" color="#a855f7" />
              <Text style={styles.processingText}>در حال پردازش هوش مصنوعی...</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.micButton, recording ? styles.micRecording : null]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
            >
              <Ionicons name="mic" size={60} color="#fff" />
            </TouchableOpacity>
          )}
          <Text style={styles.micStatus}>
            {recording ? "در حال ضبط... (رها کنید تا ارسال شود)" : "برای صحبت کردن نگه دارید"}
          </Text>
        </View>

        {parsedData && !isProcessing && (
          <ScrollView style={styles.resultBox}>
            <Text style={styles.resultTitle}>✨ اطلاعات استخراج شده:</Text>
            <View style={styles.resultRow}><Text style={styles.resultLabel}>عنوان:</Text><Text style={styles.resultValue}>{parsedData.title}</Text></View>
            <View style={styles.resultRow}><Text style={styles.resultLabel}>محله:</Text><Text style={styles.resultValue}>{parsedData.neighborhood || parsedData.real_neighborhood}</Text></View>
            <View style={styles.resultRow}><Text style={styles.resultLabel}>متراژ:</Text><Text style={styles.resultValue}>{parsedData.built_area} متر</Text></View>
            <View style={styles.resultRow}><Text style={styles.resultLabel}>قیمت:</Text><Text style={styles.resultValue}>{parsedData.price_total} تومان</Text></View>
            
            <Text style={styles.aiProsLabel}>نقاط قوت (AI):</Text>
            <Text style={styles.aiProsText}>{parsedData.ai_pros}</Text>

            <TouchableOpacity style={styles.saveBtn} onPress={saveToDatabase}>
              <Text style={styles.saveBtnText}>ثبت نهایی در بانک املاک</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, backgroundColor: '#1e293b', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
  content: { flex: 1, padding: 20, alignItems: 'center' },
  infoText: { color: '#94a3b8', textAlign: 'center', lineHeight: 22, marginBottom: 40, fontSize: 13 },
  micContainer: { alignItems: 'center', marginBottom: 30 },
  micButton: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#8b5cf6', shadowOpacity: 0.5, shadowRadius: 20 },
  micRecording: { backgroundColor: '#ef4444', transform: [{ scale: 1.1 }] },
  micStatus: { color: '#cbd5e1', marginTop: 20, fontSize: 12 },
  processingBox: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center' },
  processingText: { color: '#a855f7', marginTop: 15, fontSize: 12, fontWeight: 'bold' },
  resultBox: { width: '100%', backgroundColor: '#1e293b', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155' },
  resultTitle: { color: '#a855f7', fontWeight: 'bold', marginBottom: 15, textAlign: 'right' },
  resultRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#334155', paddingVertical: 8 },
  resultLabel: { color: '#94a3b8', fontSize: 12 },
  resultValue: { color: '#f8fafc', fontWeight: 'bold', fontSize: 12 },
  aiProsLabel: { color: '#10b981', fontSize: 12, fontWeight: 'bold', marginTop: 15, textAlign: 'right' },
  aiProsText: { color: '#cbd5e1', fontSize: 11, textAlign: 'right', marginTop: 5, lineHeight: 20 },
  saveBtn: { backgroundColor: '#10b981', padding: 15, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' }
});