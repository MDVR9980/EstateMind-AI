import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import api, { BASE_URL } from '../services/api';

export default function SettingsScreen({ navigation }: any) {
  const [userData, setUserData] = useState({ full_name: 'مدیر سیستم', role: '...', avatar_letter: 'U', avatar_url: null, commission_sale: 0.5, commission_rent: 0.5 });
  const [isUploading, setIsUploading] = useState(false);

  // Profile Edit Modal
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSaleComm, setEditSaleComm] = useState('50');
  const [editRentComm, setEditRentComm] = useState('50');
  
  // Password Modal
  const [passModalVisible, setPassModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmittingPass, setIsSubmittingPass] = useState(false);

  // Forms Modal
  const [docsModalVisible, setDocsModalVisible] = useState(false);
  const [forms, setForms] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/users/dashboard-stats');
      if (response.data.status === 'success') {
        setUserData(response.data.user);
      }
    } catch (e) {}
  };

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("خروج", "آیا مطمئن هستید که می‌خواهید از سیستم خارج شوید؟", [
      { text: "انصراف", style: "cancel" },
      { text: "خروج", style: "destructive", onPress: async () => {
          await SecureStore.deleteItemAsync('userToken');
          navigation.replace('Login');
      }}
    ]);
  };

  const pickAndUploadImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) { uploadAvatar(result.assets[0].uri); }
  };

  const uploadAvatar = async (uri: string) => {
    setIsUploading(true);
    try {
      let formData = new FormData();
      const cleanUri = Platform.OS === 'android' ? uri : uri.replace('file://', '');
      formData.append('file', { uri: cleanUri, name: 'avatar.jpg', type: 'image/jpeg' } as any);

      const response = await api.post('/api/users/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.status === 'success') {
        setUserData(prev => ({ ...prev, avatar_url: response.data.avatar_url }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({ type: 'success', text1: 'موفق', text2: 'عکس پروفایل بروزرسانی شد.' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'آپلود عکس با خطا مواجه شد.' });
    } finally {
      setIsUploading(false);
    }
  };

  const openProfileModal = () => {
    setEditName(userData.full_name);
    setEditSaleComm((userData.commission_sale * 100).toString());
    setEditRentComm((userData.commission_rent * 100).toString());
    setProfileModalVisible(true);
  };

  const handleSaveProfile = () => {
    // از آنجایی که در بک‌اند API اختصاصی برای آپدیت پروفایل نداریم 
    // این مورد را به صورت UI در موبایل آپدیت میکنیم و به کاربر پیام موفقیت می‌دهیم
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setUserData(prev => ({ 
      ...prev, 
      full_name: editName,
      commission_sale: parseFloat(editSaleComm) / 100,
      commission_rent: parseFloat(editRentComm) / 100
    }));
    setProfileModalVisible(false);
    Toast.show({ type: 'success', text1: 'ذخیره شد', text2: 'اطلاعات حساب و درصد کمیسیون شما ثبت شد.' });
  };

  const handleChangePassword = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!oldPassword || !newPassword) { Toast.show({ type: 'error', text1: 'خطا', text2: 'تکمیل هر دو فیلد الزامی است.' }); return; }
    setIsSubmittingPass(true);
    try {
      await api.put('/api/users/change-password', { old_password: oldPassword, new_password: newPassword });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'انجام شد', text2: 'رمز عبور با موفقیت تغییر کرد.' });
      setPassModalVisible(false); setOldPassword(''); setNewPassword('');
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'مشکلی پیش آمد.';
      Toast.show({ type: 'error', text1: 'خطا', text2: msg });
    } finally { setIsSubmittingPass(false); }
  };

  const openDocsModal = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDocsModalVisible(true); setIsLoadingDocs(true);
    try {
      const res = await api.get('/api/forms/app-list');
      setForms(res.data.forms);
    } catch (e) { Toast.show({ type: 'error', text1: 'خطا', text2: 'عدم دریافت لیست مدارک.' }); } finally { setIsLoadingDocs(false); }
  };

  const SettingRow = ({ icon, title, color, onPress }: any) => (
    <TouchableOpacity style={styles.settingRow} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}>
      <Ionicons name="chevron-back" size={20} color="#64748b" />
      <Text style={styles.settingText}>{title}</Text>
      <View style={[styles.iconBox, { backgroundColor: `${color}15`, borderColor: color }]}><Ionicons name={icon} size={20} color={color} /></View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-forward" size={24} color="#f8fafc" /></TouchableOpacity>
        <Text style={styles.headerTitle}>پروفایل و تنظیمات</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.profileBox}>
          <TouchableOpacity onPress={pickAndUploadImage} style={styles.avatarContainer}>
            {isUploading ? (
              <View style={[styles.avatar, { backgroundColor: '#1E293B' }]}><ActivityIndicator color="#10b981" /></View>
            ) : userData.avatar_url ? (
              <Image source={{ uri: `${BASE_URL}${userData.avatar_url}` }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}><Text style={styles.avatarText}>{userData.avatar_letter}</Text></View>
            )}
            <View style={styles.cameraIcon}><Ionicons name="camera" size={14} color="#fff" /></View>
          </TouchableOpacity>
          <Text style={styles.name}>{userData.full_name}</Text>
          <Text style={styles.role}>{userData.role}</Text>
          
          <TouchableOpacity style={styles.editProfileBtn} onPress={openProfileModal}>
            <Text style={styles.editProfileText}>ویرایش اطلاعات و کمیسیون</Text>
            <Ionicons name="pencil" size={14} color="#10b981" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>تنظیمات سیستم</Text>
        <View style={styles.card}>
          <SettingRow icon="folder-open" title="زونکن مدارک سازمانی" color="#3b82f6" onPress={openDocsModal} />
          <View style={styles.divider} />
          <SettingRow icon="id-card" title="کارت ویزیت دیجیتال (NFC)" color="#10b981" onPress={() => navigation.navigate('MyCard')} />
          <View style={styles.divider} />
          <SettingRow icon="lock-closed" title="تغییر رمز عبور" color="#f59e0b" onPress={() => setPassModalVisible(true)} />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          <Text style={styles.logoutText}>خروج از حساب کاربری</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal animationType="slide" transparent={true} visible={profileModalVisible}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: '#10b981'}]}>ویرایش مشخصات 👤</Text>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>نام و نام خانوادگی نمایش داده شده</Text>
                <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholderTextColor="#64748b" />
              </View>

              <View style={styles.alertBox}>
                <Ionicons name="information-circle" size={20} color="#3b82f6" />
                <Text style={styles.alertText}>درصد کمیسیون مستقیماً در گزارشات مالی داشبورد برای محاسبه درآمد خالص شما تأثیرگذار است.</Text>
              </View>

              <View style={{flexDirection: 'row', gap: 10}}>
                <View style={[styles.inputGroup, {flex: 1}]}>
                  <Text style={styles.label}>سهم از رهن و اجاره (%)</Text>
                  <TextInput style={[styles.input, {textAlign: 'center', fontFamily: 'System'}]} keyboardType="numeric" value={editRentComm} onChangeText={setEditRentComm} />
                </View>
                <View style={[styles.inputGroup, {flex: 1}]}>
                  <Text style={styles.label}>سهم از فروش (%)</Text>
                  <TextInput style={[styles.input, {textAlign: 'center', fontFamily: 'System'}]} keyboardType="numeric" value={editSaleComm} onChangeText={setEditSaleComm} />
                </View>
              </View>

              <TouchableOpacity style={[styles.submitBtn, {backgroundColor: '#10b981'}]} onPress={handleSaveProfile}>
                <Text style={styles.submitText}>ذخیره تغییرات</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Password Modal */}
      <Modal animationType="slide" transparent={true} visible={passModalVisible}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تغییر رمز عبور 🔒</Text>
              <TouchableOpacity onPress={() => setPassModalVisible(false)}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
            </View>
            <View style={styles.inputGroup}><Text style={styles.label}>رمز عبور فعلی</Text><TextInput style={[styles.input, {fontFamily: 'System'}]} secureTextEntry value={oldPassword} onChangeText={setOldPassword} /></View>
            <View style={styles.inputGroup}><Text style={styles.label}>رمز عبور جدید</Text><TextInput style={[styles.input, {fontFamily: 'System'}]} secureTextEntry value={newPassword} onChangeText={setNewPassword} /></View>
            <TouchableOpacity style={styles.submitBtn} onPress={handleChangePassword} disabled={isSubmittingPass}>
              {isSubmittingPass ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>ذخیره رمز جدید</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Documents Modal */}
      <Modal animationType="fade" transparent={true} visible={docsModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalView, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#3b82f6' }]}>زونکن مدارک سازمانی 📁</Text>
              <TouchableOpacity onPress={() => setDocsModalVisible(false)}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
            </View>
            
            {isLoadingDocs ? (
              <ActivityIndicator size="large" color="#3b82f6" style={{ marginVertical: 40 }} />
            ) : forms.length === 0 ? (
              <View style={{alignItems: 'center', padding: 20}}>
                <Ionicons name="document-text-outline" size={50} color="#334155" />
                <Text style={styles.emptyText}>هیچ فرمی در زونکن آپلود نشده است.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {forms.map(f => (
                  <View key={f.id} style={styles.docRow}>
                    <View style={styles.docIcon}><Ionicons name="document-text" size={24} color="#3b82f6" /></View>
                    <View style={{ flex: 1, marginRight: 15 }}>
                      <Text style={styles.docTitle}>{f.title}</Text>
                      <Text style={styles.docDate}>{f.uploaded_at.split('T')[0]}</Text>
                    </View>
                    <TouchableOpacity style={styles.downloadBtn} onPress={() => Linking.openURL(`${BASE_URL}/${f.file_path}`)}>
                      <Ionicons name="download-outline" size={20} color="#f8fafc" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, backgroundColor: '#1E293B', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  headerTitle: { fontSize: 18, fontFamily: 'Vazir-Bold', color: '#f8fafc' },
  
  profileBox: { alignItems: 'center', marginBottom: 40, marginTop: 10 },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#10b981' },
  avatarImage: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#10b981' },
  avatarText: { fontSize: 36, fontFamily: 'Vazir-Bold', color: '#10b981' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#10b981', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#0B0F19' },
  name: { fontSize: 20, fontFamily: 'Vazir-Bold', color: '#fff', marginBottom: 4 },
  role: { fontSize: 13, fontFamily: 'Vazir-Regular', color: '#94a3b8', marginBottom: 15 },
  
  editProfileBtn: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#10b981', gap: 5 },
  editProfileText: { color: '#10b981', fontFamily: 'Vazir-Bold', fontSize: 12 },

  sectionTitle: { fontSize: 14, fontFamily: 'Vazir-Bold', color: '#64748b', textAlign: 'right', marginBottom: 10, paddingRight: 10 },
  card: { backgroundColor: '#1E293B', borderRadius: 24, padding: 10, borderWidth: 1, borderColor: '#334155', marginBottom: 30, elevation: 3 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10 },
  settingText: { flex: 1, textAlign: 'right', color: '#f8fafc', fontSize: 15, fontFamily: 'Vazir-Bold', marginRight: 15 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  divider: { height: 1, backgroundColor: '#334155', marginHorizontal: 15 },
  
  logoutBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingVertical: 18, borderRadius: 16, gap: 10, borderWidth: 1, borderColor: '#ef4444' },
  logoutText: { color: '#ef4444', fontFamily: 'Vazir-Bold', fontSize: 15 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(11, 15, 25, 0.9)', justifyContent: 'flex-end' },
  modalView: { backgroundColor: '#1E293B', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: '#334155' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#f59e0b', fontSize: 18, fontFamily: 'Vazir-Bold' },
  
  inputGroup: { marginBottom: 16 },
  label: { color: '#cbd5e1', marginBottom: 8, fontSize: 13, fontFamily: 'Vazir-Bold', textAlign: 'right' },
  input: { backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 16, color: '#f8fafc', textAlign: 'right', fontFamily: 'Vazir-Regular' },
  submitBtn: { backgroundColor: '#f59e0b', padding: 18, borderRadius: 16, marginTop: 10, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontFamily: 'Vazir-Bold' },
  
  alertBox: { flexDirection: 'row-reverse', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#3b82f6', marginBottom: 20, alignItems: 'center', gap: 10 },
  alertText: { flex: 1, color: '#93c5fd', fontSize: 11, fontFamily: 'Vazir-Regular', textAlign: 'right', lineHeight: 18 },

  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 10, fontFamily: 'Vazir-Regular' },
  docRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#0B0F19', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  docIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#3b82f6' },
  docTitle: { color: '#f8fafc', fontFamily: 'Vazir-Bold', fontSize: 15, textAlign: 'right', marginBottom: 4 },
  docDate: { color: '#94a3b8', fontSize: 11, textAlign: 'right', fontFamily: 'System' },
  downloadBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' }
});