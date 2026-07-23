import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Image, Alert, Modal, ScrollView, Dimensions, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import MapView, { Marker } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import api, { BASE_URL } from '../services/api';

const { width } = Dimensions.get('window');

export default function PropertiesScreen({ navigation }: any) {
  // تب‌های اصلی
  const [mainTab, setMainTab] = useState<'active' | 'pending' | 'trash'>('active');
  
  // 🌟 زیرتب‌های فایل‌های فعال (ترکیبی / فقط شخصی / فقط عمومی)
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'private' | 'public'>('all');
  
  // 🌟 چیپ‌های فیلتر سریع دسته‌بندی
  const [categoryFilter, setCategoryFilter] = useState<string>('همه');

  const [activeProps, setActiveProps] = useState<any[]>([]);
  const [pendingProps, setPendingProps] = useState<any[]>([]);
  const [trashProps, setTrashProps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [semanticQuery, setSemanticQuery] = useState('');
  const [isMapView, setIsMapView] = useState(false);

  // تنظیمات ربات با تعداد فایل
  const [botCountModal, setBotCountModal] = useState(false);
  const [botCount, setBotCount] = useState(50);

  useFocusEffect(
    useCallback(() => {
      fetchAllProperties();
    }, [])
  );

  const fetchAllProperties = async () => {
    setLoading(true);
    try {
      const [activeRes, pendingRes, trashRes] = await Promise.all([
        api.get(`/api/properties/app-list`),
        api.get(`/api/properties/pending-list`),
        api.get(`/api/properties/trash-list`)
      ]);
      setActiveProps(activeRes.data.properties || []);
      setPendingProps(pendingRes.data.properties || []);
      setTrashProps(trashRes.data.properties || []);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'دریافت اطلاعات با مشکل مواجه شد.' });
    } finally { setLoading(false); }
  };

  const formatPrice = (price: number) => {
    if (!price || price === 0) return 'توافقی';
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' تومان';
  };

  // بیدار کردن ربات دیوار با ارسال تعداد فایل غیرتکراری
  const handleWakeCrawler = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setBotCountModal(false);
    Toast.show({ type: 'info', text1: 'درحال بیدارسازی...', text2: `ربات در حال استخراج ${botCount} فایل غیرتکراری است.` });
    try {
      const res = await api.post('/api/crawler/start', { target_count: botCount, city: "mashhad" });
      Alert.alert('وضعیت ربات 🕷️', res.data.message);
    } catch (e) { Toast.show({ type: 'error', text1: 'خطا', text2: 'ارتباط با ربات برقرار نشد.' }); }
  };

  const handleMoveToTrash = async (id: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('انتقال به زباله‌دان', 'آیا از انتقال این فایل به زباله‌دان مطمئن هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'انتقال', style: 'destructive', onPress: async () => {
        try {
          await api.put(`/api/properties/${id}/trash`);
          Toast.show({ type: 'success', text1: 'انجام شد', text2: 'فایل به زباله‌دان منتقل شد.' });
          fetchAllProperties();
        } catch(e) { Toast.show({ type: 'error', text1: 'خطا' }); }
      }}
    ]);
  };

  const handleRestore = async (id: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await api.put(`/api/properties/${id}/restore`);
      Toast.show({ type: 'success', text1: 'بازیابی شد', text2: 'فایل مجدداً فعال شد.' });
      fetchAllProperties();
    } catch(e) { Toast.show({ type: 'error', text1: 'خطا' }); }
  };

  // 🧠 موتور فیلتر چندگانه در موبایل
  const getFilteredData = () => {
    let rawList = mainTab === 'active' ? activeProps : mainTab === 'pending' ? pendingProps : trashProps;

    if (mainTab === 'active') {
      if (privacyFilter === 'private') rawList = rawList.filter(p => p.is_exclusive === true);
      else if (privacyFilter === 'public') rawList = rawList.filter(p => p.is_exclusive === false);
    }

    if (categoryFilter !== 'همه') {
      if (categoryFilter === 'آپارتمان') rawList = rawList.filter(p => p.property_type === 'آپارتمان' || p.property_type === 'apartment');
      else if (categoryFilter === 'ویلایی') rawList = rawList.filter(p => p.property_type === 'ویلایی' || p.property_type === 'villa');
      else if (categoryFilter === 'زمین و کلنگی') rawList = rawList.filter(p => p.property_type?.includes('زمین') || p.property_type?.includes('کلنگی') || p.property_type === 'land');
      else if (categoryFilter === 'فروش') rawList = rawList.filter(p => p.deal_type === 'فروش' || p.deal_type === 'SALE');
      else if (categoryFilter === 'اجاره') rawList = rawList.filter(p => p.deal_type === 'رهن و اجاره' || p.deal_type === 'RENT');
    }

    if (searchQuery) {
      rawList = rawList.filter(p => p.title?.includes(searchQuery) || p.neighborhood?.includes(searchQuery));
    }

    return rawList;
  };

  const filteredProperties = getFilteredData();

  const renderPropertyCard = ({ item }: { item: any }) => {
    let imageUrl = null;
    try { const images = JSON.parse(item.image_urls || "[]"); if (images.length > 0) imageUrl = `${BASE_URL}${images[0]}`; } catch (e) {}

    return (
      <View style={styles.card}>
        <View style={styles.cardTopActions}>
          <Text style={item.is_exclusive ? styles.cardExclusive : styles.cardPublic}>{item.is_exclusive ? 'شخصی 🔒' : 'عمومی 👁️'}</Text>
          <Text style={styles.cardType}>{item.deal_type}</Text>
        </View>

        {imageUrl ? (<Image source={{ uri: imageUrl }} style={styles.cardImage} />) : (<View style={styles.cardImagePlaceholder}><Ionicons name="business-outline" size={40} color="#334155" /></View>)}
        
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.cardDetails}>
            <View style={styles.detailItem}><Ionicons name="location-outline" size={14} color="#94a3b8" /><Text style={styles.detailText}>{item.neighborhood}</Text></View>
            <View style={styles.detailItem}><Ionicons name="resize-outline" size={14} color="#10b981" /><Text style={styles.detailText}>{item.built_area} متر</Text></View>
          </View>
          <Text style={styles.cardPrice}>مبلغ: {formatPrice(item.price_total)}</Text>

          {mainTab === 'trash' ? (
            <View style={styles.btnGridRow}>
              <TouchableOpacity style={[styles.gridBtnHalf, { backgroundColor: '#10b981' }]} onPress={() => handleRestore(item.id)}>
                <Ionicons name="refresh" size={14} color="#fff" />
                <Text style={styles.gridBtnTextWhite}>بازیابی فایل</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.btnGridRow}>
              <TouchableOpacity style={[styles.gridBtnHalf, styles.btnCatalog]} onPress={() => Linking.openURL(`${BASE_URL}/catalog/property/${item.id}`)}>
                <Ionicons name="eye" size={14} color="#fff" />
                <Text style={styles.gridBtnTextWhite}>مشاهده کاتالوگ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.gridBtnHalf, styles.btnDelete]} onPress={() => handleMoveToTrash(item.id)}>
                <Ionicons name="trash" size={14} color="#fff" />
                <Text style={styles.gridBtnTextWhite}>زباله‌دان</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* هدر */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-forward" size={24} color="#f8fafc" /></TouchableOpacity>
        <Text style={styles.mainTitle}>بانک اطلاعات املاک 🏢</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* دکمه‌های بالا */}
      <View style={styles.topActionsScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topActionsScroll}>
          <TouchableOpacity onPress={() => navigation.navigate('AddProperty')} style={[styles.headerTopBtn, {backgroundColor: '#10b981', borderColor: '#10b981'}]}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={[styles.headerTopBtnText, {color: '#fff'}]}>ثبت جدید</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setBotCountModal(true)} style={[styles.headerTopBtn, {backgroundColor: '#1E293B', borderColor: '#334155'}]}>
             <Ionicons name="bug-outline" size={18} color="#94a3b8" />
             <Text style={[styles.headerTopBtnText, {color: '#94a3b8'}]}>ربات دیوار</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 🌟 تب‌های اصلی (فعال / ربات / زباله‌دان) 🌟 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabBtn, mainTab === 'active' && styles.tabBtnActive]} onPress={() => setMainTab('active')}>
          <Text style={[styles.tabText, mainTab === 'active' && styles.tabTextActive]}>فعال ({activeProps.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, mainTab === 'pending' && styles.tabBtnActivePending]} onPress={() => setMainTab('pending')}>
          <Text style={[styles.tabText, mainTab === 'pending' && styles.tabTextActive]}>ربات ({pendingProps.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, mainTab === 'trash' && { backgroundColor: '#ef4444' }]} onPress={() => setMainTab('trash')}>
          <Text style={[styles.tabText, mainTab === 'trash' && styles.tabTextActive]}>زباله‌دان ({trashProps.length})</Text>
        </TouchableOpacity>
      </View>

      {/* 🌟 زیر‌تب‌های ۳ گانه (ترکیبی / شخصی / عمومی) 🌟 */}
      {mainTab === 'active' && (
        <View style={styles.subTabContainer}>
          <TouchableOpacity style={[styles.subTabBtn, privacyFilter === 'all' && styles.subTabActive]} onPress={() => setPrivacyFilter('all')}>
            <Text style={[styles.subTabText, privacyFilter === 'all' && styles.subTabTextActive]}>ترکیبی (همه)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.subTabBtn, privacyFilter === 'private' && styles.subTabActivePrivate]} onPress={() => setPrivacyFilter('private')}>
            <Text style={[styles.subTabText, privacyFilter === 'private' && styles.subTabTextActive]}>🔒 فقط شخصی</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.subTabBtn, privacyFilter === 'public' && styles.subTabActivePublic]} onPress={() => setPrivacyFilter('public')}>
            <Text style={[styles.subTabText, privacyFilter === 'public' && styles.subTabTextActive]}>👁️ فقط عمومی</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 🌟 چیپ‌های دسته‌بندی سریع (Chips) 🌟 */}
      <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {['همه', 'آپارتمان', 'ویلایی', 'زمین و کلنگی', 'فروش', 'اجاره'].map((cat) => (
            <TouchableOpacity 
              key={cat} 
              onPress={() => setCategoryFilter(cat)}
              style={[styles.chipBtn, categoryFilter === cat && styles.chipBtnActive]}
            >
              <Text style={[styles.chipText, categoryFilter === cat && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* سرچ‌بار */}
      <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#64748b" style={{ marginLeft: 8 }} />
          <TextInput style={styles.searchInput} placeholder="جستجو در عنوان، محله..." placeholderTextColor="#64748b" value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10b981" /></View>
      ) : filteredProperties.length === 0 ? (
        <View style={styles.centerContainer}><Ionicons name="folder-open-outline" size={60} color="#334155" /><Text style={styles.emptyText}>فایلی یافت نشد!</Text></View>
      ) : (
        <FlatList 
          data={filteredProperties} 
          keyExtractor={(item) => item.id.toString()} 
          renderItem={renderPropertyCard}
          contentContainerStyle={styles.listContent} 
          showsVerticalScrollIndicator={false} 
        />
      )}

      {/* مودال انتخاب تعداد فایل‌های ربات دیوار */}
      <Modal animationType="slide" transparent={true} visible={botCountModal}>
        <View style={styles.modalOverlayFlex}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>تعداد استخراج فایل غیرتکراری 🕷️</Text>
            <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'right', marginBottom: 20, fontFamily: 'Vazir-Regular' }}>ربات دیوار را اسکن کرده و دقیقا این تعداد فایل جدید ذخیره می‌کند:</Text>
            
            <View style={{ flexDirection: 'row-reverse', gap: 10, marginBottom: 25 }}>
              {[20, 50, 100].map(c => (
                <TouchableOpacity key={c} style={[styles.countBtn, botCount === c && styles.countBtnActive]} onPress={() => setBotCount(c)}>
                  <Text style={[styles.countText, botCount === c && { color: '#fff' }]}>{c} فایل</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.startBotBtn} onPress={handleWakeCrawler}>
              <Text style={styles.startBotText}>استارت اسکن ربات</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 5 },
  backBtn: { width: 40, height: 40, backgroundColor: '#1E293B', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  mainTitle: { fontSize: 18, fontFamily: 'Vazir-Bold', color: '#f8fafc' },

  topActionsScrollContainer: { paddingHorizontal: 20, marginBottom: 10 },
  topActionsScroll: { flexDirection: 'row-reverse', gap: 10, alignItems: 'center' },
  headerTopBtn: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#334155', backgroundColor: 'rgba(255,255,255,0.05)', gap: 6 },
  headerTopBtnText: { fontFamily: 'Vazir-Bold', fontSize: 12 },

  tabContainer: { flexDirection: 'row-reverse', marginHorizontal: 20, backgroundColor: '#1E293B', borderRadius: 16, padding: 4, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 12 },
  tabBtnActive: { backgroundColor: '#10b981' },
  tabBtnActivePending: { backgroundColor: '#f59e0b' },
  tabText: { color: '#64748b', fontFamily: 'Vazir-Bold', fontSize: 12 },
  tabTextActive: { color: '#fff' },

  subTabContainer: { flexDirection: 'row-reverse', marginHorizontal: 20, backgroundColor: '#0B0F19', borderRadius: 12, padding: 3, marginBottom: 10, borderWidth: 1, borderColor: '#1E293B' },
  subTabBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 8 },
  subTabActive: { backgroundColor: '#334155' },
  subTabActivePrivate: { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderWidth: 1, borderColor: '#f59e0b' },
  subTabActivePublic: { backgroundColor: 'rgba(59, 130, 246, 0.2)', borderWidth: 1, borderColor: '#3b82f6' },
  subTabText: { color: '#64748b', fontFamily: 'Vazir-Bold', fontSize: 11 },
  subTabTextActive: { color: '#f8fafc' },

  chipBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  chipBtnActive: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981' },
  chipText: { color: '#94a3b8', fontSize: 11, fontFamily: 'Vazir-Bold' },
  chipTextActive: { color: '#10b981' },

  searchContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: '#334155' },
  searchInput: { flex: 1, color: '#f8fafc', paddingVertical: 10, textAlign: 'right', fontFamily: 'Vazir-Regular', fontSize: 12 },

  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#64748b', marginTop: 10, fontSize: 14, fontFamily: 'Vazir-Regular' },

  card: { backgroundColor: '#1E293B', borderRadius: 20, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
  cardTopActions: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row-reverse', justifyContent: 'space-between', zIndex: 10 },
  cardImage: { width: '100%', height: 160 },
  cardImagePlaceholder: { width: '100%', height: 160, backgroundColor: '#0B0F19', justifyContent: 'center', alignItems: 'center' },
  cardType: { backgroundColor: '#1E293B', color: '#10b981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 10, fontFamily: 'Vazir-Bold' },
  cardExclusive: { backgroundColor: 'rgba(0,0,0,0.7)', color: '#f59e0b', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 10, fontFamily: 'Vazir-Bold' },
  cardPublic: { backgroundColor: 'rgba(0,0,0,0.7)', color: '#3b82f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 10, fontFamily: 'Vazir-Bold' },
  
  cardContent: { padding: 14 },
  cardTitle: { fontSize: 15, fontFamily: 'Vazir-Bold', color: '#f8fafc', textAlign: 'right', marginBottom: 8 },
  cardDetails: { flexDirection: 'row-reverse', gap: 15, marginBottom: 8 },
  detailItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  detailText: { color: '#94a3b8', fontSize: 11, fontFamily: 'Vazir-Regular' },
  cardPrice: { fontSize: 14, color: '#10b981', textAlign: 'right', marginBottom: 12, fontFamily: 'Vazir-Bold' },

  btnGridRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 8 },
  gridBtnHalf: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 5 },
  gridBtnTextWhite: { color: '#fff', fontSize: 11, fontFamily: 'Vazir-Bold' },
  btnCatalog: { backgroundColor: '#3b82f6' },
  btnDelete: { backgroundColor: '#ef4444' },

  modalOverlayFlex: { flex: 1, backgroundColor: 'rgba(11, 15, 25, 0.85)', justifyContent: 'center', padding: 20 },
  modalView: { backgroundColor: '#1E293B', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { color: '#10b981', fontSize: 16, fontFamily: 'Vazir-Bold', textAlign: 'right', marginBottom: 8 },
  countBtn: { flex: 1, backgroundColor: '#0B0F19', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  countBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  countText: { color: '#94a3b8', fontFamily: 'Vazir-Bold', fontSize: 12 },
  startBotBtn: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  startBotText: { color: '#fff', fontFamily: 'Vazir-Bold', fontSize: 14 }
});