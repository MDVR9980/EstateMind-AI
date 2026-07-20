import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = "http://10.56.173.18:8000";

export default function MyCardScreen({ navigation }: any) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync('userToken').then(res => setToken(res));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>کارت ویزیت دیجیتال</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.desc}>
          این بارکد را به مشتری نشان دهید تا اطلاعات و لیست فایل‌های شما مستقیماً به موبایل او منتقل شود.
        </Text>

        <View style={styles.qrCard}>
          {token ? (
            <Image 
              source={{ 
                uri: `${BASE_URL}/api/nfc/agent-qr`,
                headers: { Cookie: `access_token=Bearer ${token}` }
              }} 
              style={styles.qrImage}
            />
          ) : (
            <ActivityIndicator size="large" color="#10b981" />
          )}
        </View>

        <TouchableOpacity style={styles.nfcBtn}>
          <Ionicons name="radio-outline" size={24} color="#fff" />
          <Text style={styles.nfcBtnText}>آماده‌سازی برای تگ NFC</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, backgroundColor: '#1e293b', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  desc: { color: '#94a3b8', textAlign: 'center', fontSize: 13, lineHeight: 22, marginBottom: 40 },
  qrCard: { backgroundColor: '#fff', padding: 20, borderRadius: 32, elevation: 10, shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 20, marginBottom: 40 },
  qrImage: { width: 250, height: 250, resizeMode: 'contain' },
  nfcBtn: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#3b82f6', paddingVertical: 16, paddingHorizontal: 30, borderRadius: 16, gap: 10 },
  nfcBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});