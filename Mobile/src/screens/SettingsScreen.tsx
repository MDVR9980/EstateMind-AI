import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import api, { BASE_URL } from '../services/api';

export default function SettingsScreen({ navigation }: any) {
  const [userData, setUserData] = useState({ full_name: 'کاربر سیستم', role: '...', avatar_letter: 'U', avatar_url: null });
  const [isUploading, setIsUploading] = useState(false);

  const [passModalVisible, setPassModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmittingPass, setIsSubmittingPass] = useState(false);

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
    } catch (e) { console.log("Error fetching profile"); }
  };

  const handleLogout = async () => {
    Alert.alert("خروج", "آیا مطمئن هستید؟", [
      { text: "انصراف", style: "cancel" },
      { text: "خروج", style: "destructive", onPress: async () => {
          await SecureStore.deleteItemAsync('userToken');
          navigation.replace('Login');
      }}
    ]);
  };

  const pickAndUploadImage = async () => {
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
      // حل مشکل آپلود در iOS: React Native FormData در iOS فقط فرمت file:// را می‌شناسد.
      // چون اکسپو خودبخود uri را با file:// می‌دهد، نیازی به حذف آن نیست.
      formData.append('file', {
        uri: uri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      } as any);

      // در Axios، زمانی که FormData ارسال می‌کنید، Content-Type نباید دستی ست شود (باندری لازم دارد)
      const response = await api.post('/api/users/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.status === 'success') {
        setUserData(prev => ({ ...prev, avatar_url: response.data.avatar_url }));
        Toast.show({ type: 'success', text1: 'موفق', text2: 'عکس پروفایل بروزرسانی شد.' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'آپلود عکس با خطا مواجه شد.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) { Toast.show({ type: 'error', text1: 'خطا', text2: 'تکمیل هر دو فیلد الزامی است.' }); return; }
    setIsSubmittingPass(true);
    try {
      await api.put('/api/users/change-password', { old_password: oldPassword, new_password: newPassword });
      Toast.show({ type: 'success', text1: 'انجام شد', text2: 'رمز عبور با موفقیت تغییر کرد.' });
      setPassModalVisible(false); setOldPassword(''); setNewPassword('');
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'مشکلی پیش آمد.';
      Toast.show({ type: 'error', text1: 'خطا', text2: msg });
    } finally { setIsSubmittingPass(false); }
  };

  const openDocsModal = async () => {
    setDocsModalVisible(true); setIsLoadingDocs(true);
    try {
      const res = await api.get('/api/forms/app-list');
      setForms(res.data.forms);
    } catch (e) { Toast.show({ type: 'error', text1: 'خطا', text2: 'عدم دریافت لیست مدارک.' }); } finally { setIsLoadingDocs(false); }
  };

  const downloadForm = (filePath: string) => {
    const url = `${BASE_URL}/${filePath}`;
    Linking.openURL(url).catch(err => Toast.show({ type: 'error', text1: 'خطا', text2: 'مرورگر باز نشد.' }));
  };

  const SettingRow = ({ icon, title, color, onPress }: any) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress}>
      <Ionicons name="chevron-back" size={20} color="#64748b" />
      <Text style={styles.settingText}>{title}</Text>
      <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}><Ionicons name={icon} size={20} color={color} /></View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-forward" size={24} color="#f8fafc" /></TouchableOpacity>
        <Text style={styles.headerTitle}>تنظیمات و پروفایل</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.profileBox}>
          <TouchableOpacity onPress={pickAndUploadImage} style={styles.avatarContainer}>
            {isUploading ? (
              <View style={[styles.avatar, { backgroundColor: '#1e293b' }]}><ActivityIndicator color="#10b981" /></View>
            ) : userData.avatar_url ? (
              <Image source={{ uri: `${BASE_URL}${userData.avatar_url}` }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}><Text style={styles.avatarText}>{userData.avatar_letter}</Text></View>
            )}
            <View style={styles.cameraIcon}><Ionicons name="camera" size={16} color="#fff" /></View>
          </TouchableOpacity>
          <Text style={styles.name}>{userData.full_name}</Text>
          <Text style={styles.role}>{userData.role}</Text>
        </View>

        <Text style={styles.sectionTitle}>تنظیمات اپلیکیشن</Text>
        <View style={styles.card}>
          <SettingRow icon="folder-open" title="زونکن مدارک (فرم‌های خام)" color="#3b82f6" onPress={openDocsModal} />
          <View style={styles.divider} />
          <SettingRow icon="id-card" title="کارت ویزیت دیجیتال NFC" color="#10b981" onPress={() => navigation.navigate('MyCard')} />
          <View style={styles.divider} />
          <SettingRow icon="lock-closed" title="تغییر رمز عبور" color="#f59e0b" onPress={() => setPassModalVisible(true)} />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>خروج از حساب کاربری</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal animationType="slide" transparent={true} visible={passModalVisible} onRequestClose={() => setPassModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تغییر رمز عبور 🔒</Text>
              <TouchableOpacity onPress={() => setPassModalVisible(false)}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
            </View>
            <View style={styles.inputGroup}><Text style={styles.label}>رمز عبور فعلی</Text><TextInput style={styles.input} secureTextEntry value={oldPassword} onChangeText={setOldPassword} /></View>
            <View style={styles.inputGroup}><Text style={styles.label}>رمز عبور جدید</Text><TextInput style={styles.input} secureTextEntry value={newPassword} onChangeText={setNewPassword} /></View>
            <TouchableOpacity style={styles.submitBtn} onPress={handleChangePassword} disabled={isSubmittingPass}>
              {isSubmittingPass ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>ذخیره رمز جدید</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={docsModalVisible} onRequestClose={() => setDocsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalView, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#3b82f6' }]}>زونکن مدارک 📁</Text>
              <TouchableOpacity onPress={() => setDocsModalVisible(false)}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
            </View>
            
            {isLoadingDocs ? (
              <ActivityIndicator size="large" color="#3b82f6" style={{ marginVertical: 40 }} />
            ) : forms.length === 0 ? (
              <Text style={styles.emptyText}>هیچ فرمی در زونکن آپلود نشده است.</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {forms.map(f => (
                  <View key={f.id} style={styles.docRow}>
                    <View style={styles.docIcon}><Ionicons name="document-text" size={20} color="#3b82f6" /></View>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={styles.docTitle}>{f.title}</Text>
                      <Text style={styles.docDate}>{f.uploaded_at.split('T')[0]}</Text>
                    </View>
                    <TouchableOpacity style={styles.downloadBtn} onPress={() => downloadForm(f.file_path)}>
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
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, backgroundColor: '#1e293b', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  profileBox: { alignItems: 'center', marginBottom: 30 },
  avatarContainer: { position: 'relative', marginBottom: 10 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#1e293b' },
  avatarImage: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#1e293b' },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#3b82f6', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#1e293b' },
  name: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  role: { fontSize: 12, color: '#94a3b8' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#94a3b8', textAlign: 'right', marginBottom: 10, paddingRight: 10 },
  card: { backgroundColor: '#1e293b', borderRadius: 20, padding: 10, borderWidth: 1, borderColor: '#334155', marginBottom: 30 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10 },
  settingText: { flex: 1, textAlign: 'right', color: '#f8fafc', fontSize: 14, fontWeight: 'bold', marginRight: 15 },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#334155', marginHorizontal: 10 },
  logoutBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingVertical: 15, borderRadius: 16, gap: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'flex-end' },
  modalView: { backgroundColor: '#1e293b', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#f59e0b', fontSize: 18, fontWeight: 'bold' },
  inputGroup: { marginBottom: 16 },
  label: { color: '#cbd5e1', marginBottom: 8, fontSize: 13, fontWeight: 'bold', textAlign: 'right' },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 16, color: '#f8fafc', textAlign: 'right', fontFamily: 'System' },
  submitBtn: { backgroundColor: '#f59e0b', padding: 16, borderRadius: 16, marginTop: 10, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptyText: { color: '#64748b', textAlign: 'center', paddingVertical: 20 },
  docRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#0f172a', padding: 15, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  docIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center' },
  docTitle: { color: '#f8fafc', fontWeight: 'bold', fontSize: 14, textAlign: 'right' },
  docDate: { color: '#94a3b8', fontSize: 10, textAlign: 'right', fontFamily: 'System', marginTop: 4 },
  downloadBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' }
});