import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import api from '../services/api';

const { width } = Dimensions.get('window');

// تابع تبدیل عدد به حروف فارسی (ویژه املاک)
const numberToPersianWords = (num: number) => {
  if (!num || isNaN(num)) return '';
  let b = Math.floor(num / 1000000000);
  let m = Math.floor((num % 1000000000) / 1000000);
  let k = Math.floor((num % 1000000) / 1000);
  let parts = [];
  if (b > 0) parts.push(`${b} میلیارد`);
  if (m > 0) parts.push(`${m} میلیون`);
  if (k > 0) parts.push(`${k} هزار`);
  return parts.length > 0 ? parts.join(' و ') + ' تومان' : '';
};

export default function AddPropertyScreen({ navigation }: any) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '', deal_type: 'sale', property_type: 'apartment', neighborhood: '', city: 'مشهد', address: '',
    built_area: '', rooms: '', age: '', floor: '',
    has_elevator: false, has_parking: false, has_store_room: false, has_master_room: false,
    price_total: '', price_mortgage: '', price_rent: '', 
    owner_phone: '', owner_name: '', description: '',
    images: [] as string[]
  });

  const nextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 1 && (!formData.title || !formData.neighborhood)) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'عنوان و محله الزامی است.' });
      return;
    }
    setStep(prev => Math.min(prev + 1, 3));
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
    // Validation
    if (formData.deal_type === 'sale' && !formData.price_total) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'مبلغ کل فروش الزامی است.' });
      return;
    }
    
    setIsLoading(true);
    try {
      // فرمت‌دهی نهایی برای ارسال به بک‌اند
      let finalPrice = 0;
      if (formData.deal_type === 'sale') {
        finalPrice = parseFloat(formData.price_total.replace(/,/g, '') || '0');
      } else {
        // در رهن و اجاره معمولاً رهن را در توتال می‌فرستند (یا هر استانداردی که در بک‌اند دارید)
        finalPrice = parseFloat(formData.price_mortgage.replace(/,/g, '') || '0');
      }

      const payload = {
        title: formData.title,
        deal_type: formData.deal_type,
        property_type: formData.property_type,
        city: formData.city,
        neighborhood: formData.neighborhood,
        address: formData.address,
        built_area: parseFloat(formData.built_area || '0'),
        rooms: parseInt(formData.rooms || '0'),
        age: parseInt(formData.age || '0'),
        floor: parseInt(formData.floor || '0'),
        has_elevator: formData.has_elevator,
        has_parking: formData.has_parking,
        has_store_room: formData.has_store_room,
        has_master_room: formData.has_master_room,
        price_total: finalPrice,
        owner_name: formData.owner_name,
        owner_phone: formData.owner_phone,
        description: formData.description,
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
      {[1, 2, 3].map((s) => (
        <View key={s} style={styles.stepWrapper}>
          <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
            {step > s ? <Ionicons name="checkmark" size={16} color="#fff" /> : <Text style={styles.stepText}>{s}</Text>}
          </View>
        </View>
      ))}
      <View style={styles.stepLineBg}>
        <View style={[styles.stepLineActive, { width: `${((step - 1) / 2) * 100}%` }]} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); navigation.goBack(); }} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ثبت فایل جدید</Text>
        <TouchableOpacity onPress={() => navigation.navigate('VoiceAdd')} style={styles.micBtn}>
          <Ionicons name="mic" size={20} color="#a855f7" />
        </TouchableOpacity>
      </View>

      {renderStepIndicator()}
      <Text style={styles.stepTitle}>
        {step === 1 ? '۱. پایه و آدرس' : step === 2 ? '۲. امکانات و مشخصات' : '۳. مالی و مالک'}
      </Text>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* ===================== STEP 1 ===================== */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.label}>عنوان آگهی / فایل (الزامی) *</Text>
              <TextInput style={styles.input} placeholder="مثال: آپارتمان ۱۲۰ متری نوساز سجاد" placeholderTextColor="#64748b" value={formData.title} onChangeText={(t) => setFormData({...formData, title: t})} />
              
              <View style={styles.row}>
                <View style={{flex: 1, marginLeft: 10}}>
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
                <View style={{flex: 1}}>
                  <Text style={styles.label}>نوع معامله</Text>
                  <View style={styles.radioGroup}>
                    <TouchableOpacity style={[styles.radioBtn, formData.deal_type === 'sale' && styles.radioBtnActive]} onPress={() => setFormData({...formData, deal_type: 'sale'})}>
                      <Text style={[styles.radioText, formData.deal_type === 'sale' && styles.radioTextActive]}>فروش</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.radioBtn, formData.deal_type === 'rent' && styles.radioBtnActive]} onPress={() => setFormData({...formData, deal_type: 'rent'})}>
                      <Text style={[styles.radioText, formData.deal_type === 'rent' && styles.radioTextActive]}>اجاره</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={{flex: 1, marginLeft: 10}}>
                  <Text style={styles.label}>شهر</Text>
                  <TextInput style={styles.input} placeholder="مشهد" placeholderTextColor="#64748b" value={formData.city} onChangeText={(t) => setFormData({...formData, city: t})} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.label}>محله / منطقه (الزامی) *</Text>
                  <TextInput style={styles.input} placeholder="مثال: سجاد" placeholderTextColor="#64748b" value={formData.neighborhood} onChangeText={(t) => setFormData({...formData, neighborhood: t})} />
                </View>
              </View>

              <Text style={styles.label}>آدرس دقیق (محرمانه برای دفتر)</Text>
              <TextInput style={styles.input} placeholder="مثال: حاشیه سجاد، پلاک ۱۲، واحد ۳" placeholderTextColor="#64748b" value={formData.address} onChangeText={(t) => setFormData({...formData, address: t})} />
            </View>
          )}

          {/* ===================== STEP 2 ===================== */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <View style={styles.row}>
                <View style={{flex: 1, marginLeft: 10}}>
                  <Text style={styles.label}>متراژ (متر)</Text>
                  <TextInput style={[styles.input, {fontFamily: 'System'}]} placeholder="120" keyboardType="numeric" placeholderTextColor="#64748b" value={formData.built_area} onChangeText={(t) => setFormData({...formData, built_area: t})} />
                </View>
                <View style={{flex: 1, marginLeft: 10}}>
                  <Text style={styles.label}>تعداد خواب</Text>
                  <TextInput style={[styles.input, {fontFamily: 'System'}]} placeholder="3" keyboardType="numeric" placeholderTextColor="#64748b" value={formData.rooms} onChangeText={(t) => setFormData({...formData, rooms: t})} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.label}>سن بنا</Text>
                  <TextInput style={[styles.input, {fontFamily: 'System'}]} placeholder="0" keyboardType="numeric" placeholderTextColor="#64748b" value={formData.age} onChangeText={(t) => setFormData({...formData, age: t})} />
                </View>
              </View>

              <Text style={styles.label}>امکانات رفاهی</Text>
              <View style={styles.featureGrid}>
                <TouchableOpacity style={[styles.featureBtn, formData.has_elevator && styles.featureBtnActive]} onPress={() => setFormData({...formData, has_elevator: !formData.has_elevator})}>
                  <Text style={[styles.featureText, formData.has_elevator && styles.featureTextActive]}>آسانسور</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.featureBtn, formData.has_parking && styles.featureBtnActive]} onPress={() => setFormData({...formData, has_parking: !formData.has_parking})}>
                  <Text style={[styles.featureText, formData.has_parking && styles.featureTextActive]}>پارکینگ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.featureBtn, formData.has_store_room && styles.featureBtnActive]} onPress={() => setFormData({...formData, has_store_room: !formData.has_store_room})}>
                  <Text style={[styles.featureText, formData.has_store_room && styles.featureTextActive]}>انباری</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.featureBtn, formData.has_master_room && styles.featureBtnActive]} onPress={() => setFormData({...formData, has_master_room: !formData.has_master_room})}>
                  <Text style={[styles.featureText, formData.has_master_room && styles.featureTextActive]}>خواب مستر</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>گالری عکس و فیلم (آپلود همزمان)</Text>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickImages}>
                <Ionicons name="cloud-upload-outline" size={32} color="#10b981" />
                <Text style={styles.uploadBtnText}>برای آپلود عکس کلیک کنید</Text>
              </TouchableOpacity>
              
              {formData.images.length > 0 && (
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
              )}
            </View>
          )}

          {/* ===================== STEP 3 ===================== */}
          {step === 3 && (
            <View style={styles.stepContent}>
              
              {formData.deal_type === 'sale' ? (
                <>
                  <Text style={styles.label}>قیمت کل (تومان) *</Text>
                  <TextInput 
                    style={[styles.input, { color: '#10b981', fontSize: 18, fontWeight: 'bold', fontFamily: 'System', borderColor: '#10b981' }]} 
                    placeholder="5,000,000,000" 
                    keyboardType="numeric" 
                    placeholderTextColor="#64748b" 
                    value={formData.price_total} 
                    onChangeText={(t) => setFormData({...formData, price_total: formatPriceInput(t)})} 
                  />
                  {formData.price_total ? <Text style={styles.persianNumberText}>{numberToPersianWords(parseInt(formData.price_total.replace(/,/g, '')))}</Text> : null}
                </>
              ) : (
                <>
                  <Text style={styles.label}>مبلغ رهن (تومان) *</Text>
                  <TextInput 
                    style={[styles.input, { color: '#10b981', fontSize: 18, fontWeight: 'bold', fontFamily: 'System', borderColor: '#10b981' }]} 
                    placeholder="500,000,000" 
                    keyboardType="numeric" 
                    placeholderTextColor="#64748b" 
                    value={formData.price_mortgage} 
                    onChangeText={(t) => setFormData({...formData, price_mortgage: formatPriceInput(t)})} 
                  />
                  {formData.price_mortgage ? <Text style={styles.persianNumberText}>{numberToPersianWords(parseInt(formData.price_mortgage.replace(/,/g, '')))}</Text> : null}

                  <Text style={[styles.label, {marginTop: 10}]}>مبلغ اجاره ماهانه (تومان) *</Text>
                  <TextInput 
                    style={[styles.input, { color: '#3b82f6', fontSize: 18, fontWeight: 'bold', fontFamily: 'System', borderColor: '#3b82f6' }]} 
                    placeholder="15,000,000" 
                    keyboardType="numeric" 
                    placeholderTextColor="#64748b" 
                    value={formData.price_rent} 
                    onChangeText={(t) => setFormData({...formData, price_rent: formatPriceInput(t)})} 
                  />
                  {formData.price_rent ? <Text style={[styles.persianNumberText, {color: '#60a5fa'}]}>{numberToPersianWords(parseInt(formData.price_rent.replace(/,/g, '')))}</Text> : null}
                </>
              )}
              
              <View style={[styles.row, {marginTop: 15}]}>
                <View style={{flex: 1, marginLeft: 10}}>
                  <Text style={styles.label}>نام مالک (محرمانه)</Text>
                  <TextInput style={styles.input} placeholder="مثال: آقای رضایی" placeholderTextColor="#64748b" value={formData.owner_name} onChangeText={(t) => setFormData({...formData, owner_name: t})} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.label}>موبایل مالک (محرمانه)</Text>
                  <TextInput style={[styles.input, {fontFamily: 'System'}]} placeholder="0912..." keyboardType="phone-pad" placeholderTextColor="#64748b" value={formData.owner_phone} onChangeText={(t) => setFormData({...formData, owner_phone: t})} />
                </View>
              </View>

              <Text style={styles.label}>توضیحات تکمیلی</Text>
              <TextInput 
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                placeholder="توضیحاتی که برای پرزنت نیاز دارید را بنویسید..." 
                placeholderTextColor="#64748b" 
                multiline 
                value={formData.description} 
                onChangeText={(t) => setFormData({...formData, description: t})} 
              />
            </View>
          )}

        </ScrollView>

        <View style={styles.footerBtns}>
          {step > 1 && (
            <TouchableOpacity style={styles.navBtnPrev} onPress={prevStep}>
              <Text style={styles.navBtnTextPrev}>مرحله قبل</Text>
            </TouchableOpacity>
          )}
          {step < 3 ? (
            <TouchableOpacity style={styles.navBtnNext} onPress={nextStep}>
              <Text style={styles.navBtnTextNext}>مرحله بعد</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.submitBtn} onPress={submitProperty} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>ثبت نهایی فایل</Text>
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
  micBtn: { width: 40, height: 40, backgroundColor: 'rgba(168, 85, 247, 0.1)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#a855f7' },
  headerTitle: { fontSize: 18, fontFamily: 'Vazir-Bold', color: '#f8fafc' },
  
  stepContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: 60, marginVertical: 20, position: 'relative' },
  stepLineBg: { position: 'absolute', top: 14, left: 60, right: 60, height: 2, backgroundColor: '#334155', zIndex: -1 },
  stepLineActive: { height: '100%', backgroundColor: '#10b981' },
  stepWrapper: { backgroundColor: '#0B0F19', padding: 2 },
  stepDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#334155' },
  stepDotActive: { backgroundColor: '#10b981', borderColor: '#10b981', shadowColor: '#10b981', shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },
  stepText: { color: '#64748b', fontFamily: 'System', fontWeight: 'bold', fontSize: 12 },
  stepTitle: { textAlign: 'center', color: '#10b981', fontFamily: 'Vazir-Bold', fontSize: 14, marginBottom: 10 },
  
  scrollContent: { padding: 20, paddingBottom: 40 },
  stepContent: { backgroundColor: '#1E293B', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#334155' },
  
  label: { color: '#cbd5e1', fontSize: 13, fontFamily: 'Vazir-Bold', textAlign: 'right', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 14, color: '#f8fafc', textAlign: 'right', fontFamily: 'Vazir-Regular' },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  
  radioGroup: { flexDirection: 'row-reverse', gap: 10 },
  radioBtn: { flex: 1, backgroundColor: '#0B0F19', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  radioBtnActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981' },
  radioText: { color: '#64748b', fontSize: 12, fontFamily: 'Vazir-Bold' },
  radioTextActive: { color: '#10b981' },

  featureGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  featureBtn: { backgroundColor: '#0B0F19', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  featureBtnActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981' },
  featureText: { color: '#64748b', fontFamily: 'Vazir-Bold', fontSize: 12 },
  featureTextActive: { color: '#10b981' },

  persianNumberText: { color: '#34d399', fontSize: 12, fontFamily: 'Vazir-Bold', textAlign: 'left', marginTop: 5, paddingLeft: 10 },

  uploadBtn: { backgroundColor: 'rgba(16, 185, 129, 0.05)', borderWidth: 1, borderColor: '#10b981', borderStyle: 'dashed', borderRadius: 20, padding: 25, alignItems: 'center', marginBottom: 15, marginTop: 5 },
  uploadBtnText: { color: '#10b981', marginTop: 10, fontFamily: 'Vazir-Bold', fontSize: 12 },
  imageGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  imageWrapper: { width: (width - 90) / 3, height: (width - 90) / 3, borderRadius: 12, position: 'relative' },
  thumbnail: { width: '100%', height: '100%', borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  removeImgBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 12 },

  footerBtns: { flexDirection: 'row-reverse', gap: 15, padding: 20, backgroundColor: '#0B0F19', borderTopWidth: 1, borderTopColor: '#1E293B' },
  navBtnPrev: { backgroundColor: '#1E293B', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  navBtnTextPrev: { color: '#94a3b8', fontFamily: 'Vazir-Bold', fontSize: 14 },
  navBtnNext: { flex: 1, backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  navBtnTextNext: { color: '#fff', fontFamily: 'Vazir-Bold', fontSize: 15 },
  submitBtn: { flex: 1, flexDirection: 'row-reverse', backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitBtnText: { color: '#fff', fontFamily: 'Vazir-Bold', fontSize: 15 }
});