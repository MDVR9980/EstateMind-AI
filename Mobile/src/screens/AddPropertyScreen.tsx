import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Toast from 'react-native-toast-message';

const BASE_URL = "http://10.56.173.18:8000";

export default function AddPropertyScreen({ navigation }: any) {
  const [isLoading, setIsLoading] = useState(false);
  
  // استیت‌های فرم
  const [title, setTitle] = useState('');
  const [dealType, setDealType] = useState('sale'); // sale, rent, partnership
  const [propType, setPropType] = useState('apartment'); // apartment, villa, land
  const [neighborhood, setNeighborhood] = useState('');
  const [builtArea, setBuiltArea] = useState('');
  const [priceTotal, setPriceTotal] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');

  const formatPriceInput = (value: string) => {
    const numericValue = value.replace(/,/g, '').replace(/[^0-9]/g, '');
    if (!numericValue) return '';
    return parseInt(numericValue).toLocaleString('en-US');
  };

  const handleSave = async () => {
    if (!title || !neighborhood || !builtArea || !priceTotal) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'لطفاً فیلدهای ضروری را پر کنید.' });
      return;
    }

    setIsLoading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const payload = {
        title,
        property_type: propType,
        deal_type: dealType,
        city: 'مشهد', // پیش‌فرض
        neighborhood,
        built_area: parseFloat(builtArea),
        rooms: 0,
        price_total: parseFloat(priceTotal.replace(/,/g, '')),
        owner_phone: ownerPhone,
        document_type: "SINGLE", // پیش‌فرض
        is_exclusive: false,
        image_urls: []
      };

      const response = await axios.post(`${BASE_URL}/api/properties/save`, payload, {
        headers: { Cookie: `access_token=Bearer ${token}` }
      });

      if (response.data.status === 'success') {
        Toast.show({ type: 'success', text1: 'موفقیت', text2: 'فایل با موفقیت در بانک املاک ثبت شد.' });
        navigation.navigate('Properties'); // بازگشت به لیست املاک
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکلی در ذخیره فایل پیش آمد.' });
    } finally {
      setIsLoading(false);
    }
  };

  // کامپوننت دکمه‌های رادیویی کاستوم
  const RadioButton = ({ label, value, current, onChange }: any) => (
    <TouchableOpacity 
      style={[styles.radioBtn, current === value && styles.radioBtnActive]} 
      onPress={() => onChange(value)}
    >
      <Text style={[styles.radioText, current === value && styles.radioTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ثبت دستی فایل</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>عنوان آگهی <Text style={styles.required}>*</Text></Text>
            <TextInput style={styles.input} placeholder="مثال: آپارتمان ۱۲۰ متری نوساز سجاد" placeholderTextColor="#64748b" value={title} onChangeText={setTitle} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>نوع معامله</Text>
            <View style={styles.radioGroup}>
              <RadioButton label="فروش" value="sale" current={dealType} onChange={setDealType} />
              <RadioButton label="رهن و اجاره" value="rent" current={dealType} onChange={setDealType} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>نوع ملک</Text>
            <View style={styles.radioGroup}>
              <RadioButton label="آپارتمان" value="apartment" current={propType} onChange={setPropType} />
              <RadioButton label="ویلایی" value="villa" current={propType} onChange={setPropType} />
              <RadioButton label="کلنگی/زمین" value="land" current={propType} onChange={setPropType} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>محله <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.input} placeholder="مثال: سجاد" placeholderTextColor="#64748b" value={neighborhood} onChangeText={setNeighborhood} />
            </View>
            <View style={{ width: 15 }} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>متراژ <Text style={styles.required}>*</Text></Text>
              <TextInput style={[styles.input, { fontFamily: 'System' }]} placeholder="120" placeholderTextColor="#64748b" keyboardType="numeric" value={builtArea} onChangeText={setBuiltArea} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>قیمت کل (تومان) <Text style={styles.required}>*</Text></Text>
            <TextInput 
              style={[styles.input, { fontFamily: 'System', fontSize: 18, fontWeight: 'bold', color: '#10b981' }]} 
              placeholder="5,000,000,000" 
              placeholderTextColor="#64748b" 
              keyboardType="numeric" 
              value={priceTotal} 
              onChangeText={(text) => setPriceTotal(formatPriceInput(text))} 
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>موبایل مالک (محرمانه)</Text>
            <TextInput style={[styles.input, { fontFamily: 'System' }]} placeholder="0912..." placeholderTextColor="#64748b" keyboardType="phone-pad" value={ownerPhone} onChangeText={setOwnerPhone} />
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                <Text style={styles.submitText}>ثبت نهایی فایل</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, backgroundColor: '#1e293b', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  inputGroup: { marginBottom: 20 },
  label: { color: '#cbd5e1', marginBottom: 8, fontSize: 14, fontWeight: 'bold', textAlign: 'right' },
  required: { color: '#ef4444' },
  input: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 16, color: '#f8fafc', textAlign: 'right' },
  row: { flexDirection: 'row-reverse' },
  radioGroup: { flexDirection: 'row-reverse', gap: 10 },
  radioBtn: { flex: 1, backgroundColor: '#1e293b', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  radioBtnActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981' },
  radioText: { color: '#64748b', fontSize: 13, fontWeight: 'bold' },
  radioTextActive: { color: '#10b981' },
  submitBtn: { flexDirection: 'row-reverse', backgroundColor: '#10b981', padding: 16, borderRadius: 16, marginTop: 10, alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});