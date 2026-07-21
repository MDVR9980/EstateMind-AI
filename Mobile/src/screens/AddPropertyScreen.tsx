import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function AddPropertyScreen({ navigation }: any) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '', deal_type: 'sale', property_type: 'apartment', neighborhood: '',
    built_area: '', rooms: '', price_total: '', owner_phone: '', owner_name: '',
    has_elevator: false, has_parking: false, has_store_room: false, description: '',
    images: [] as string[]
  });

  const nextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(prev => Math.min(prev + 1, 4));
  };
  
  const prevStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(prev => Math.max(prev - 1, 1));
  };

  const pickImages = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setFormData(prev => ({ ...prev, images: [...prev.images, ...result.assets.map(a => a.uri)] }));
    }
  };

  const removeImage = (index: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const submitProperty = async () => {
    if (!formData.title || !formData.neighborhood || !formData.price_total) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({ type: 'error', text1: 'خطا', text2: 'فیلدهای عنوان، محله و قیمت الزامی است.' });
      return;
    }
    
    setIsLoading(true);
    try {
      // آپلود فایل ها ابتدا (در نسخه واقعی باید منطق آپلود یکپارچه پیاده شود)
      // اینجا فقط نام فایل‌ها را رد می‌کنیم، آپلود دقیق را باید با formData انجام دهید
      const payload = {
        ...formData,
        built_area: parseFloat(formData.built_area || '0'),
        price_total: parseFloat(formData.price_total.replace(/,/g, '') || '0'),
        rooms: parseInt(formData.rooms || '0'),
        document_type: "SINGLE",
        is_exclusive: true,
      };

      const res = await api.post(`/api/properties/save`, payload);
      
      if (res.data.status === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({ type: 'success', text1: 'موفقیت', text2: 'فایل شما با موفقیت در سیستم ثبت شد.' });
        navigation.navigate('Properties');
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'خطا در ثبت', text2: 'مشکلی در ارتباط با سرور رخ داد.' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPriceInput = (value: string) => {
    const numericValue = value.replace(/,/g, '').replace(/[^0-9]/g, '');
    if (!numericValue) return '';
    return parseInt(numericValue).toLocaleString('en-US');
  };

  const renderStepIndicator = () => (
    <View style={styles.stepContainer}>
      {[1, 2, 3, 4].map((s) => (
        <View key={s} style={styles.stepWrapper}>
          <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
            {step > s ? <Ionicons name="checkmark" size={16} color="#fff" /> : <Text style={styles.stepText}>{s}</Text>}
          </View>
        </View>
      ))}
      <View style={styles.stepLineBg}>
        <View style={[styles.stepLineActive, { width: `${((step - 1) / 3) * 100}%` }]} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); navigation.goBack(); }} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ثبت جادویی ملک</Text>
        <View style={{ width: 40 }} />
      </View>

      {renderStepIndicator()}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.sectionTitle}>مرحله ۱: اطلاعات پایه</Text>
              
              <Text style={styles.label}>عنوان آگهی *</Text>
              <TextInput style={styles.input} placeholder="مثال: آپارتمان ۱۲۰ متری تک‌واحدی" placeholderTextColor="#64748b" value={formData.title} onChangeText={(t) => setFormData({...formData, title: t})} />
              
              <Text style={styles.label}>محله *</Text>
              <TextInput style={styles.input} placeholder="مثال: سجاد، هاشمیه" placeholderTextColor="#64748b" value={formData.neighborhood} onChangeText={(t) => setFormData({...formData, neighborhood: t})} />

              <Text style={styles.label}>نوع معامله</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity style={[styles.radioBtn, formData.deal_type === 'sale' && styles.radioBtnActive]} onPress={() => setFormData({...formData, deal_type: 'sale'})}>
                  <Text style={[styles.radioText, formData.deal_type === 'sale' && styles.radioTextActive]}>فروش</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.radioBtn, formData.deal_type === 'rent' && styles.radioBtnActive]} onPress={() => setFormData({...formData, deal_type: 'rent'})}>
                  <Text style={[styles.radioText, formData.deal_type === 'rent' && styles.radioTextActive]}>رهن و اجاره</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>نوع ملک</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity style={[styles.radioBtn, formData.property_type === 'apartment' && styles.radioBtnActive]} onPress={() => setFormData({...formData, property_type: 'apartment'})}>
                  <Text style={[styles.radioText, formData.property_type === 'apartment' && styles.radioTextActive]}>آپارتمان</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.radioBtn, formData.property_type === 'villa' && styles.radioBtnActive]} onPress={() => setFormData({...formData, property_type: 'villa'})}>
                  <Text style={[styles.radioText, formData.property_type === 'villa' && styles.radioTextActive]}>ویلایی</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.sectionTitle}>مرحله ۲: امکانات و ویژگی‌ها</Text>
              
              <View style={styles.row}>
                <View style={{flex: 1, marginLeft: 10}}>
                  <Text style={styles.label}>متراژ بنا *</Text>
                  <TextInput style={[styles.input, {fontFamily: 'System'}]} placeholder="120" keyboardType="numeric" placeholderTextColor="#64748b" value={formData.built_area} onChangeText={(t) => setFormData({...formData, built_area: t})} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.label}>تعداد خواب</Text>
                  <TextInput style={[styles.input, {fontFamily: 'System'}]} placeholder="2" keyboardType="numeric" placeholderTextColor="#64748b" value={formData.rooms} onChangeText={(t) => setFormData({...formData, rooms: t})} />
                </View>
              </View>
              
              <View style={styles.switchContainer}>
                <View style={styles.switchRow}>
                  <Text style={styles.switchText}>آسانسور دارد؟</Text>
                  <TouchableOpacity style={[styles.toggleBtn, formData.has_elevator && styles.toggleActive]} onPress={() => setFormData({...formData, has_elevator: !formData.has_elevator})}>
                    <View style={[styles.toggleCircle, formData.has_elevator && styles.toggleCircleActive]} />
                  </TouchableOpacity>
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchText}>پارکینگ اختصاصی؟</Text>
                  <TouchableOpacity style={[styles.toggleBtn, formData.has_parking && styles.toggleActive]} onPress={() => setFormData({...formData, has_parking: !formData.has_parking})}>
                    <View style={[styles.toggleCircle, formData.has_parking && styles.toggleCircleActive]} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.switchText}>انباری دارد؟</Text>
                  <TouchableOpacity style={[styles.toggleBtn, formData.has_store_room && styles.toggleActive]} onPress={() => setFormData({...formData, has_store_room: !formData.has_store_room})}>
                    <View style={[styles.toggleCircle, formData.has_store_room && styles.toggleCircleActive]} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.sectionTitle}>مرحله ۳: اطلاعات مالی و مالک</Text>
              
              <Text style={styles.label}>قیمت کل (تومان) *</Text>
              <TextInput 
                style={[styles.input, { color: '#10b981', fontSize: 20, fontWeight: 'bold', fontFamily: 'System', borderColor: '#10b981' }]} 
                placeholder="5,000,000,000" 
                keyboardType="numeric" 
                placeholderTextColor="#64748b" 
                value={formData.price_total} 
                onChangeText={(t) => setFormData({...formData, price_total: formatPriceInput(t)})} 
              />
              
              <Text style={styles.label}>نام مالک</Text>
              <TextInput style={styles.input} placeholder="مثال: آقای محمدی" placeholderTextColor="#64748b" value={formData.owner_name} onChangeText={(t) => setFormData({...formData, owner_name: t})} />

              <Text style={styles.label}>شماره موبایل مالک (محرمانه)</Text>
              <TextInput style={[styles.input, {fontFamily: 'System'}]} placeholder="0912..." keyboardType="phone-pad" placeholderTextColor="#64748b" value={formData.owner_phone} onChangeText={(t) => setFormData({...formData, owner_phone: t})} />
            </View>
          )}

          {step === 4 && (
            <View style={styles.stepContent}>
              <Text style={styles.sectionTitle}>مرحله ۴: توضیحات و گالری</Text>
              
              <Text style={styles.label}>توضیحات تکمیلی (اختیاری)</Text>
              <TextInput 
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
                placeholder="توضیحاتی که برای پرزنت نیاز دارید را بنویسید..." 
                placeholderTextColor="#64748b" 
                multiline 
                value={formData.description} 
                onChangeText={(t) => setFormData({...formData, description: t})} 
              />

              <Text style={styles.label}>گالری تصاویر و ویدیوها</Text>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickImages}>
                <Ionicons name="images-outline" size={36} color="#3b82f6" />
                <Text style={styles.uploadBtnText}>انتخاب از گالری گوشی</Text>
              </TouchableOpacity>
              
              <View style={styles.imageGrid}>
                {formData.images.map((uri, idx) => (
                  <View key={idx} style={styles.imageWrapper}>
                    <Image source={{ uri }} style={styles.thumbnail} />
                    <TouchableOpacity style={styles.removeImgBtn} onPress={() => removeImage(idx)}>
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

        </ScrollView>

        <View style={styles.footerBtns}>
          {step > 1 && (
            <TouchableOpacity style={styles.navBtnPrev} onPress={prevStep}>
              <Text style={styles.navBtnTextPrev}>مرحله قبل</Text>
            </TouchableOpacity>
          )}
          {step < 4 ? (
            <TouchableOpacity style={styles.navBtnNext} onPress={nextStep}>
              <Text style={styles.navBtnTextNext}>بعدی</Text>
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.submitBtn} onPress={submitProperty} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={styles.submitBtnText}>ثبت نهایی فایل</Text>
                  <Ionicons name="checkmark-done" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, backgroundColor: '#1E293B', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  
  stepContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: 40, marginVertical: 20, position: 'relative' },
  stepLineBg: { position: 'absolute', top: 14, left: 40, right: 40, height: 2, backgroundColor: '#334155', zIndex: -1 },
  stepLineActive: { height: '100%', backgroundColor: '#3b82f6' },
  stepWrapper: { backgroundColor: '#0B0F19', padding: 2 }, // To mask the line behind dots
  stepDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#334155' },
  stepDotActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6', shadowColor: '#3b82f6', shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },
  stepText: { color: '#64748b', fontWeight: 'bold', fontSize: 12 },
  
  scrollContent: { padding: 20, paddingBottom: 40 },
  stepContent: { backgroundColor: '#1E293B', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#334155' },
  sectionTitle: { color: '#3b82f6', fontSize: 16, fontWeight: 'bold', marginBottom: 25, textAlign: 'right' },
  
  label: { color: '#cbd5e1', fontSize: 12, fontWeight: 'bold', textAlign: 'right', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 16, color: '#f8fafc', textAlign: 'right' },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  
  radioGroup: { flexDirection: 'row-reverse', gap: 10, marginBottom: 5 },
  radioBtn: { flex: 1, backgroundColor: '#0B0F19', paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  radioBtnActive: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' },
  radioText: { color: '#64748b', fontSize: 13, fontWeight: 'bold' },
  radioTextActive: { color: '#3b82f6' },

  switchContainer: { backgroundColor: '#0B0F19', borderRadius: 16, borderWidth: 1, borderColor: '#334155', marginTop: 10 },
  switchRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  switchText: { color: '#f8fafc', fontSize: 13 },
  toggleBtn: { width: 50, height: 28, backgroundColor: '#334155', borderRadius: 14, justifyContent: 'center', paddingHorizontal: 2 },
  toggleActive: { backgroundColor: '#10b981' },
  toggleCircle: { width: 24, height: 24, backgroundColor: '#fff', borderRadius: 12 },
  toggleCircleActive: { transform: [{ translateX: -22 }] }, // RTL adjustment
  
  uploadBtn: { backgroundColor: 'rgba(59, 130, 246, 0.05)', borderWidth: 1, borderColor: '#3b82f6', borderStyle: 'dashed', borderRadius: 20, padding: 30, alignItems: 'center', marginBottom: 20, marginTop: 10 },
  uploadBtnText: { color: '#3b82f6', marginTop: 10, fontWeight: 'bold', fontSize: 13 },
  imageGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  imageWrapper: { width: (width - 90) / 3, height: (width - 90) / 3, borderRadius: 12, position: 'relative' },
  thumbnail: { width: '100%', height: '100%', borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  removeImgBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 12 },

  footerBtns: { flexDirection: 'row-reverse', gap: 15, padding: 20, backgroundColor: '#0B0F19', borderTopWidth: 1, borderTopColor: '#1E293B' },
  navBtnPrev: { backgroundColor: '#1E293B', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  navBtnTextPrev: { color: '#94a3b8', fontWeight: 'bold', fontSize: 14 },
  navBtnNext: { flex: 1, flexDirection: 'row-reverse', backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  navBtnTextNext: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  submitBtn: { flex: 1, flexDirection: 'row-reverse', backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 }
});