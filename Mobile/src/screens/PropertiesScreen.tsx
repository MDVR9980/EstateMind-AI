import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Image, Alert, Modal, ScrollView, KeyboardAvoidingView, Platform, Dimensions, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import MapView, { Marker } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import api, { BASE_URL } from '../services/api';

const { width } = Dimensions.get('window');

export default function PropertiesScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [activeProps, setActiveProps] = useState<any[]>([]);
  const [pendingProps, setPendingProps] = useState<any[]>([]);
  const [mapItems, setMapItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [semanticQuery, setSemanticQuery] = useState('');
  const [isMapView, setIsMapView] = useState(false);
  
  // Modals States
  const [cmaModalVisible, setCmaModalVisible] = useState(false);
  const [cmaData, setCmaData] = useState<any>(null);
  const [isCmaLoading, setIsCmaLoading] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedProp, setSelectedProp] = useState<any>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Social Share Modal
  const [shareModalVisible, setShareModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchAllProperties();
      fetchMapData();
    }, [])
  );

  const fetchAllProperties = async () => {
    setLoading(true);
    try {
      const [activeRes, pendingRes] = await Promise.all([
        api.get(`/api/properties/app-list`),
        api.get(`/api/properties/pending-list`)
      ]);
      setActiveProps(activeRes.data.properties || []);
      setPendingProps(pendingRes.data.properties || []);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'دریافت اطلاعات با مشکل مواجه شد.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMapData = async () => {
    try {
      const response = await api.get('/api/properties/map-data');
      if (response.data.status === 'success') setMapItems(response.data.data);
    } catch (error) {}
  };

  const formatPrice = (price: number) => {
    if (!price || price === 0) return 'توافقی';
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' تومان';
  };

  const getCoordinates = (neighborhood: string, index: number) => {
    let lat = 36.30; let lng = 59.58;
    if (neighborhood?.includes('سجاد')) { lat = 36.315; lng = 59.540; }
    else if (neighborhood?.includes('هاشمیه')) { lat = 36.335; lng = 59.530; }
    else if (neighborhood?.includes('وکیل')) { lat = 36.330; lng = 59.510; }
    return { latitude: lat + ((index % 5) * 0.003), longitude: lng + ((index % 5) * 0.003) };
  };

  // ==========================================
  // دکمه‌های هدر (ربات و دیوار)
  // ==========================================
  const handleWakeCrawler = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Toast.show({ type: 'info', text1: 'درحال بیدارسازی...', text2: 'ربات خزنده در حال راه‌اندازی است.' });
    try {
      const res = await api.post('/api/crawler/start');
      Alert.alert('وضعیت ربات 🕷️', res.data.message);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'ارتباط با ربات برقرار نشد.' });
    }
  };

  const handleDivarLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await api.post('/api/crawler/divar-login');
      Toast.show({ type: 'success', text1: 'درخواست ارسال شد', text2: res.data.message });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکل در باز کردن مرورگر دیوار.' });
    }
  };

  // ==========================================
  // دکمه‌های روی کارت املاک
  // ==========================================
  const handleDivarPublish = async (propId: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Toast.show({ type: 'info', text1: 'ارسال به دیوار...', text2: 'ربات در حال درج آگهی شماست.' });
    try {
      const res = await api.post(`/api/crawler/publish-to-divar/${propId}`);
      Alert.alert('انتشار موفق', res.data.message);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'ارتباط با ربات دیوار برقرار نشد.' });
    }
  };

  const handleCMA = async (propId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCmaLoading(true); setCmaModalVisible(true);
    try {
      const response = await api.get(`/api/pricing/analyze/${propId}`);
      setCmaData(response.data);
    } catch (error) {
      setCmaModalVisible(false); 
      Toast.show({ type: 'error', text1: 'خطا', text2: 'اطلاعات کافی برای تحلیل این فایل وجود ندارد.' });
    } finally {
      setIsCmaLoading(false);
    }
  };

  const handleCatalog = (propId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const catalogUrl = `${BASE_URL}/catalog/property/${propId}`;
    Linking.openURL(catalogUrl).catch(() => Toast.show({ type: 'error', text1: 'خطا در باز کردن لینک' }));
  };

  const handleSmartEval = async (prop: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Toast.show({ type: 'info', text1: 'در حال ارزیابی...', text2: 'هوش مصنوعی در حال بررسی ملک است.' });
    try {
      const res = await api.post(`/api/properties/${prop.id}/generate-ai-details`);
      Alert.alert('ارزیابی هوشمند ✨', `نقاط قوت:\n${res.data.pros}\n\nنقاط ضعف:\n${res.data.cons}`);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'موتور ارزیابی در دسترس نیست.' });
    }
  };

  const handleAIMatchBuyers = async (propId: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Toast.show({ type: 'info', text1: 'در حال جستجو...', text2: 'بررسی خریداران در قیف فروش' });
    try {
      const response = await api.get(`/api/properties/${propId}/match-buyers`);
      if (response.data.matches && response.data.matches.length > 0) {
        const matchText = response.data.matches.map((m: any) => `- ${m.name} (${m.phone})\nبودجه: ${m.budget > 0 ? formatPrice(m.budget) : 'نامحدود'}`).join('\n\n');
        Alert.alert('🎯 خریداران یافت شدند!', matchText);
      } else {
        Alert.alert('نتیجه‌ای نداشت', 'مشتری با بودجه مناسب این فایل در سیستم ندارید.');
      }
    } catch(e) { Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکل ارتباطی' }); }
  };

  const openEditModal = (prop: any) => {
    setSelectedProp(prop);
    setEditPrice(prop.price_total ? prop.price_total.toString() : '');
    setEditPhone(prop.owner_phone || '');
    setEditModalVisible(true); // TODO: In future, integrate with a real edit screen if needed
    Toast.show({ type: 'info', text1: 'ویرایش', text2: 'برای ویرایش کامل از نسخه وب استفاده کنید.' });
  };

  const handleDelete = (id: number, isPending: boolean = false) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('حذف فایل', 'آیا از حذف این فایل مطمئن هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        try {
          const endpoint = isPending ? `/api/properties/pending/${id}` : `/api/properties/${id}`;
          await api.delete(endpoint);
          Toast.show({ type: 'success', text1: 'حذف شد', text2: 'فایل با موفقیت حذف شد.' });
          fetchAllProperties();
        } catch(e) { 
          Toast.show({ type: 'error', text1: 'خطا', text2: 'شما دسترسی حذف ندارید یا خطایی رخ داده است.' }); 
        }
      }}
    ]);
  };

  const handleApprove = async (id: number, isExclusive: boolean) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await api.put(`/api/properties/${id}/approve`, { is_exclusive: isExclusive });
      Toast.show({ type: 'success', text1: 'تایید شد', text2: 'فایل با موفقیت به بانک اطلاعات اضافه شد.' });
      fetchAllProperties();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکل در ثبت و تایید فایل رخ داد.' });
    }
  };

  // انتشار در شبکه‌های اجتماعی
  const openSocialShare = (prop: any) => {
    setSelectedProp(prop);
    setShareModalVisible(true);
  };

  const shareToApp = async (platform: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const catalogUrl = `${BASE_URL}/catalog/property/${selectedProp.id}`;
    const text = `🏢 *${selectedProp.title}*\n📍 ${selectedProp.neighborhood}\n💰 ${formatPrice(selectedProp.price_total)}\n\nمشاهده تصاویر و جزئیات بیشتر:\n${catalogUrl}`;
    
    let url = '';
    if (platform === 'whatsapp') url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    else if (platform === 'telegram') url = `tg://msg?text=${encodeURIComponent(text)}`;
    else if (platform === 'instagram') url = `instagram://story-camera`;
    else {
      Share.share({ message: text, title: selectedProp.title });
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (e) {
      Share.share({ message: text, title: selectedProp.title });
    }
    setShareModalVisible(false);
  };

  // ==========================================
  // رندر کارت‌های املاک
  // ==========================================
  const renderActiveCard = ({ item }: { item: any }) => {
    let imageUrl = null;
    try { const images = JSON.parse(item.image_urls || "[]"); if (images.length > 0) imageUrl = `${BASE_URL}${images[0]}`; } catch (e) {}

    return (
      <View style={styles.card}>
        <View style={styles.cardTopActions}>
          <Text style={item.is_exclusive ? styles.cardExclusive : styles.cardPublic}>
            {item.is_exclusive ? 'شخصی 🔒' : 'عمومی 👁️'}
          </Text>
          <Text style={styles.cardType}>{item.deal_type}</Text>
        </View>

        {imageUrl ? (<Image source={{ uri: imageUrl }} style={styles.cardImage} />) : (<View style={styles.cardImagePlaceholder}><Ionicons name="business-outline" size={40} color="#334155" /></View>)}
        
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          
          <View style={styles.cardDetails}>
            <View style={styles.detailItem}><Ionicons name="location-outline" size={14} color="#94a3b8" /><Text style={styles.detailText}>{item.neighborhood}</Text></View>
          </View>
          
          <Text style={styles.cardPrice}>مبلغ کل: {formatPrice(item.price_total)}</Text>

          <TouchableOpacity style={[styles.gridBtn, styles.btnDivar]} onPress={() => handleDivarPublish(item.id)}>
            <MaterialCommunityIcons name="bullhorn" size={16} color="#fff" />
            <Text style={styles.gridBtnTextWhite}>انتشار یک کلیکی در دیوار</Text>
          </TouchableOpacity>

          <View style={styles.btnGridRow}>
            <TouchableOpacity style={[styles.gridBtnHalf, styles.btnCMA]} onPress={() => handleCMA(item.id)}>
              <Ionicons name="stats-chart" size={14} color="#fff" />
              <Text style={styles.gridBtnTextWhite}>کارشناسی قیمت</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.gridBtnHalf, styles.btnCatalog]} onPress={() => handleCatalog(item.id)}>
              <Ionicons name="eye" size={14} color="#fff" />
              <Text style={styles.gridBtnTextWhite}>مشاهده کاتالوگ</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.btnGridRow}>
            <TouchableOpacity style={[styles.gridBtnHalf, styles.btnEval]} onPress={() => handleSmartEval(item)}>
              <MaterialCommunityIcons name="magic-staff" size={14} color="#fff" />
              <Text style={styles.gridBtnTextWhite}>ارزیابی هوشمند</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.gridBtnHalf, styles.btnMatch]} onPress={() => handleAIMatchBuyers(item.id)}>
              <Ionicons name="people" size={14} color="#fff" />
              <Text style={styles.gridBtnTextWhite}>مچینگ خریدار</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.btnGridRow}>
             <TouchableOpacity style={[styles.gridBtnHalf, styles.btnSocial]} onPress={() => openSocialShare(item)}>
              <Ionicons name="share-social" size={14} color="#fff" />
              <Text style={styles.gridBtnTextWhite}>انتشار شبکه‌ها</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.gridBtnQuarter, styles.btnEdit]} onPress={() => openEditModal(item)}>
              <Ionicons name="pencil" size={14} color="#fff" />
              <Text style={styles.gridBtnTextWhite}>ویرایش</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.gridBtnQuarter, styles.btnDelete]} onPress={() => handleDelete(item.id)}>
              <Ionicons name="trash" size={14} color="#fff" />
              <Text style={styles.gridBtnTextWhite}>حذف</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    );
  };

  const renderPendingCard = ({ item }: { item: any }) => {
    let imageUrl = null;
    try { 
      const images = JSON.parse(item.image_urls || "[]"); 
      if (images.length > 0) imageUrl = `${BASE_URL}${images[0]}`; 
    } catch (e) {}

    return (
      <View style={[styles.card, { borderColor: '#f59e0b', borderWidth: 1 }]}>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeText}>شکار ربات 🕷️</Text>
        </View>
        
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="home-outline" size={40} color="#334155" />
          </View>
        )}
        
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.cardPrice, { color: '#f59e0b' }]}>{formatPrice(item.price_total)}</Text>
          
          <View style={styles.cardDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={14} color="#f43f5e" />
              <Text style={styles.detailText}>{item.neighborhood}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="resize-outline" size={14} color="#3b82f6" />
              <Text style={styles.detailText}>{item.built_area ? `${item.built_area} متر` : 'نامشخص'}</Text>
            </View>
          </View>
          
          <Text style={{ color: '#94a3b8', fontSize: 11, textAlign: 'right', marginBottom: 15, lineHeight: 18, fontFamily: 'Vazir-Regular' }} numberOfLines={2}>
            {item.description || 'توضیحاتی برای این فایل ثبت نشده است.'}
          </Text>

          <View style={styles.approveActions}>
            <TouchableOpacity style={[styles.approveBtn, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981' }]} onPress={() => handleApprove(item.id, true)}>
              <Ionicons name="lock-closed" size={16} color="#10b981" />
              <Text style={[styles.actionBtnText, {color: '#10b981'}]}>ثبت شخصی</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.approveBtn, { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' }]} onPress={() => handleApprove(item.id, false)}>
              <Ionicons name="globe" size={16} color="#3b82f6" />
              <Text style={[styles.actionBtnText, {color: '#3b82f6'}]}>ثبت عمومی</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.approveBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' }]} onPress={() => handleDelete(item.id, true)}>
              <Ionicons name="trash" size={16} color="#ef4444" />
              <Text style={[styles.actionBtnText, {color: '#ef4444'}]}>حذف</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const handleSemanticSearch = async () => {
    if (!semanticQuery) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Toast.show({ type: 'info', text1: 'هوش مصنوعی 🧠', text2: `در حال جستجوی: ${semanticQuery}` });
    try {
      const response = await api.post(`/api/match/semantic-search`, { query: semanticQuery });
      if (response.data.status === 'success' && response.data.matches.length > 0) {
        const matchText = response.data.matches.map((m: any) => `- ${m.title}\n(${formatPrice(m.price)}) 🎯 ${m.score}%`).join('\n\n');
        Alert.alert('✨ یافت شد!', matchText);
      } else {
        Alert.alert('نتیجه‌ای نداشت', 'فایلی که از لحاظ مفهومی با نیاز شما همخوانی داشته باشد یافت نشد.');
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکل در موتور جستجو.' });
    }
  };

  const displayData = activeTab === 'active' ? activeProps : pendingProps;
  const filteredProperties = displayData.filter(p => p.title?.includes(searchQuery) || p.neighborhood?.includes(searchQuery));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button on the right for standard alignment */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-forward" size={24} color="#f8fafc" /></TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.mainTitle}>بانک اطلاعات املاک 🏢</Text>
          <Text style={styles.subTitle}>مدیریت فایل‌ها، فیلتر پیشرفته</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Horizontal Scroll for top action buttons to prevent overflow on small screens */}
      <View style={styles.topActionsScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topActionsScroll}>
          <TouchableOpacity onPress={() => navigation.navigate('AddProperty')} style={[styles.headerTopBtn, {backgroundColor: '#10b981', borderColor: '#10b981'}]}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={[styles.headerTopBtnText, {color: '#fff'}]}>ثبت فایل جدید</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleWakeCrawler} style={[styles.headerTopBtn, {backgroundColor: '#1E293B', borderColor: '#334155'}]}>
             <Ionicons name="bug-outline" size={20} color="#94a3b8" />
             <Text style={[styles.headerTopBtnText, {color: '#94a3b8'}]}>بیدار کردن ربات</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDivarLogin} style={[styles.headerTopBtn, {borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)'}]}>
            <Ionicons name="log-in-outline" size={20} color="#ef4444" />
            <Text style={[styles.headerTopBtnText, {color: '#ef4444'}]}>لاگین دیوار</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsMapView(!isMapView)} style={styles.headerTopBtn}>
            <Ionicons name={isMapView ? "list" : "map"} size={20} color="#c084fc" />
            <Text style={[styles.headerTopBtnText, {color: '#c084fc'}]}>{isMapView ? 'لیست' : 'نمایش نقشه'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'active' && styles.tabBtnActive]} 
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>فایل‌های فعال ({activeProps.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActivePending]} 
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>صندوق ربات ({pendingProps.length})</Text>
        </TouchableOpacity>
      </View>

      {!isMapView && (
        <View style={{paddingHorizontal: 20}}>
          <View style={styles.aiSearchContainer}>
            <TouchableOpacity style={styles.aiSearchBtn} onPress={handleSemanticSearch}><Text style={styles.aiSearchBtnText}>بگرد</Text></TouchableOpacity>
            <TextInput style={styles.aiSearchInput} placeholder="جستجوی عامیانه با هوش مصنوعی (مثال: یه خونه نورگیر برای زوج)..." placeholderTextColor="#a855f7" value={semanticQuery} onChangeText={setSemanticQuery} />
            <MaterialCommunityIcons name="magic-staff" size={20} color="#a855f7" style={styles.aiSearchIcon} />
          </View>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
            <TextInput style={styles.searchInput} placeholder="جستجو در عنوان، محله..." placeholderTextColor="#64748b" value={searchQuery} onChangeText={setSearchQuery} />
          </View>
        </View>
      )}

      {loading ? ( <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10b981" /></View> ) : isMapView ? (
        <View style={styles.mapContainer}>
          <MapView style={{ flex: 1 }} initialRegion={{ latitude: 36.30, longitude: 59.58, latitudeDelta: 0.09, longitudeDelta: 0.09 }} userInterfaceStyle="dark">
            {mapItems.map((item, index) => {
              const coords = getCoordinates(item.neighborhood, index);
              return <Marker key={item.id} coordinate={coords} pinColor={item.color || "blue"} title={item.title} description={item.price} />;
            })}
          </MapView>
        </View>
      ) : filteredProperties.length === 0 ? ( 
        <View style={styles.centerContainer}><Ionicons name="folder-open-outline" size={60} color="#334155" /><Text style={styles.emptyText}>فایلی یافت نشد!</Text></View> 
      ) : (
        <FlatList 
          data={filteredProperties} 
          keyExtractor={(item) => item.id.toString()} 
          renderItem={activeTab === 'active' ? renderActiveCard : renderPendingCard}
          contentContainerStyle={styles.listContent} 
          showsVerticalScrollIndicator={false} 
        />
      )}

      {/* مودال شبکه‌های اجتماعی */}
      <Modal animationType="slide" transparent={true} visible={shareModalVisible} onRequestClose={() => setShareModalVisible(false)}>
        <View style={styles.modalOverlayFlex}>
          <View style={[styles.cmaModalView, { borderColor: '#3b82f6', maxHeight: '50%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: '#3b82f6'}]}>انتشار یک‌کلیکی 🚀</Text>
              <TouchableOpacity onPress={() => setShareModalVisible(false)}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
            </View>
            <Text style={{color: '#cbd5e1', textAlign: 'right', marginBottom: 20, fontFamily: 'Vazir-Regular'}}>کجا می‌خواهید این فایل را پرزنت کنید؟ متن هوشمند به صورت خودکار ساخته می‌شود.</Text>
            
            <View style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10}}>
               <TouchableOpacity style={[styles.socialBtn, {backgroundColor: '#25D366'}]} onPress={() => shareToApp('whatsapp')}>
                <Ionicons name="logo-whatsapp" size={24} color="#fff" />
                <Text style={styles.socialBtnText}>واتساپ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialBtn, {backgroundColor: '#e1306c'}]} onPress={() => shareToApp('instagram')}>
                <Ionicons name="logo-instagram" size={24} color="#fff" />
                <Text style={styles.socialBtnText}>استوری اینستاگرام</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialBtn, {backgroundColor: '#0088cc'}]} onPress={() => shareToApp('telegram')}>
                <Ionicons name="logo-telegram" size={24} color="#fff" />
                <Text style={styles.socialBtnText}>تلگرام</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialBtn, {backgroundColor: '#3b82f6'}]} onPress={() => shareToApp('system')}>
                <Ionicons name="share-social" size={24} color="#fff" />
                <Text style={styles.socialBtnText}>سایر (سیستم)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* مودال CMA */}
      <Modal animationType="slide" transparent={true} visible={cmaModalVisible} onRequestClose={() => setCmaModalVisible(false)}>
        <View style={styles.modalOverlayFlex}>
          <View style={styles.cmaModalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ترازوی هوشمند (CMA) ⚖️</Text>
              <TouchableOpacity onPress={() => setCmaModalVisible(false)}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
            </View>
            {isCmaLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator size="large" color="#f59e0b" /><Text style={{ color: '#f59e0b', marginTop: 10, fontFamily: 'Vazir-Bold' }}>در حال تحلیل بازار منطقه...</Text></View>
            ) : cmaData ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.cmaAlertBox}>
                  <Text style={styles.cmaAlertTitle}>💡 استراتژی پرزنت به مالک:</Text>
                  <Text style={styles.cmaAlertText}>{cmaData.conclusion}</Text>
                </View>
                <Text style={styles.cmaSubTitle}>فایل شما (هدف)</Text>
                <View style={[styles.cmaCard, { borderColor: '#10b981' }]}>
                  <Text style={styles.cmaTitle}>{cmaData.target?.title}</Text>
                  <Text style={[styles.cmaPrice, { color: '#10b981' }]}>{formatPrice(cmaData.target?.price || 0)}</Text>
                </View>
                <Text style={styles.cmaSubTitle}>رقبا در بازار (بکشید به چپ/راست)</Text>
                <FlatList
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  data={cmaData.comparables}
                  keyExtractor={(_, i) => i.toString()}
                  renderItem={({ item }) => (
                    <View style={[styles.cmaCard, { width: width - 80, borderColor: '#ef4444', marginHorizontal: 10 }]}>
                      <Text style={styles.cmaTitle}>{item.title}</Text>
                      <Text style={[styles.cmaPrice, { color: '#ef4444' }]}>{formatPrice(item.price)}</Text>
                    </View>
                  )}
                />
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
      <TouchableOpacity style={styles.fabAddProp} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('AddProperty'); }}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 5 },
  headerCenter: { alignItems: 'center' },
  backBtn: { width: 40, height: 40, backgroundColor: '#1E293B', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  mainTitle: { fontSize: 18, fontFamily: 'Vazir-Bold', color: '#f8fafc', textAlign: 'center' },
  subTitle: { fontSize: 11, fontFamily: 'Vazir-Regular', color: '#94a3b8', textAlign: 'center', marginTop: 2 },

  // Horizontal Scroll for Top Actions
  topActionsScrollContainer: { paddingHorizontal: 20, marginBottom: 15 },
  topActionsScroll: { flexDirection: 'row-reverse', gap: 10, alignItems: 'center' },
  headerTopBtn: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)', gap: 6 },
  headerTopBtnText: { fontFamily: 'Vazir-Bold', fontSize: 12 },
  headerTopBtnTextOnly: { paddingHorizontal: 10 },
  headerTopBtnTextPlain: { color: '#94a3b8', fontFamily: 'Vazir-Regular', fontSize: 13 },

  // Tab Styles
  tabContainer: { flexDirection: 'row-reverse', marginHorizontal: 20, backgroundColor: '#1E293B', borderRadius: 16, padding: 4, marginBottom: 15, borderWidth: 1, borderColor: '#334155' },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabBtnActive: { backgroundColor: '#3b82f6' },
  tabBtnActivePending: { backgroundColor: '#f59e0b' },
  tabText: { color: '#64748b', fontFamily: 'Vazir-Bold', fontSize: 13 },
  tabTextActive: { color: '#fff' },

  searchContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 16, paddingHorizontal: 15, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  searchIcon: { marginLeft: 10 },
  searchInput: { flex: 1, color: '#f8fafc', paddingVertical: 12, textAlign: 'right', fontFamily: 'Vazir-Regular' },
  
  aiSearchContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(168, 85, 247, 0.1)', borderRadius: 16, paddingLeft: 5, paddingRight: 15, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.5)' },
  aiSearchIcon: { marginLeft: 10 },
  aiSearchInput: { flex: 1, color: '#e9d5ff', paddingVertical: 12, textAlign: 'right', fontSize: 12, fontFamily: 'Vazir-Regular' },
  aiSearchBtn: { backgroundColor: '#a855f7', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, marginLeft: 5 },
  aiSearchBtnText: { color: '#fff', fontSize: 12, fontFamily: 'Vazir-Bold' },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#64748b', marginTop: 10, fontSize: 14, fontFamily: 'Vazir-Regular' },
  mapContainer: { flex: 1, margin: 20, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },

  card: { backgroundColor: '#1E293B', borderRadius: 20, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
  cardTopActions: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row-reverse', justifyContent: 'space-between', zIndex: 10 },
  cardImage: { width: '100%', height: 200 },
  cardImagePlaceholder: { width: '100%', height: 200, backgroundColor: '#0B0F19', justifyContent: 'center', alignItems: 'center' },
  cardType: { backgroundColor: '#1E293B', color: '#10b981', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, fontSize: 11, fontFamily: 'Vazir-Bold', borderWidth: 1, borderColor: '#10b981' },
  cardExclusive: { backgroundColor: 'rgba(255,255,255,0.9)', color: '#10b981', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, fontSize: 11, fontFamily: 'Vazir-Bold' },
  cardPublic: { backgroundColor: 'rgba(255,255,255,0.9)', color: '#f59e0b', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, fontSize: 11, fontFamily: 'Vazir-Bold' },
  
  cardContent: { padding: 15 },
  cardTitle: { fontSize: 16, fontFamily: 'Vazir-Bold', color: '#f8fafc', textAlign: 'right', marginBottom: 10 },
  cardDetails: { flexDirection: 'row-reverse', gap: 15, marginBottom: 10 },
  detailItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  detailText: { color: '#94a3b8', fontSize: 12, fontFamily: 'Vazir-Regular' },
  cardPrice: { fontSize: 15, color: '#94a3b8', textAlign: 'right', marginBottom: 15, fontFamily: 'System' },

  pendingBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#f59e0b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, zIndex: 10, elevation: 5 },
  pendingBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'Vazir-Bold' },
  approveActions: { flexDirection: 'row-reverse', gap: 8, marginTop: 10 },
  approveBtn: { flex: 1, flexDirection: 'row-reverse', paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1 },
  actionBtnText: { fontSize: 12, fontFamily: 'Vazir-Bold' },

  // Grid Buttons
  btnGridRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  gridBtn: { width: '100%', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, marginBottom: 8, gap: 5 },
  gridBtnHalf: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 5 },
  gridBtnQuarter: { flex: 0.5, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 5 },
  gridBtnTextWhite: { color: '#fff', fontSize: 11, fontFamily: 'Vazir-Bold' },
  
  btnDivar: { backgroundColor: '#ef4444' },
  btnCMA: { backgroundColor: '#f59e0b' },
  btnCatalog: { backgroundColor: '#3b82f6' },
  btnEval: { backgroundColor: '#10b981' },
  btnMatch: { backgroundColor: '#06b6d4' },
  btnSocial: { backgroundColor: '#6366f1' },
  btnEdit: { backgroundColor: '#a855f7' },
  btnDelete: { backgroundColor: '#f43f5e' },

  socialBtn: { width: '48%', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 12, gap: 8, marginBottom: 10 },
  socialBtnText: { color: '#fff', fontFamily: 'Vazir-Bold', fontSize: 13 },

  modalOverlayFlex: { flex: 1, backgroundColor: 'rgba(11, 15, 25, 0.85)', justifyContent: 'flex-end' },
  cmaModalView: { backgroundColor: '#1E293B', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '85%', borderWidth: 1, borderColor: '#f59e0b' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#f59e0b', fontSize: 18, fontFamily: 'Vazir-Bold' },
  cmaAlertBox: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: '#10b981', padding: 15, borderRadius: 16, marginBottom: 20 },
  cmaAlertTitle: { color: '#10b981', fontFamily: 'Vazir-Bold', fontSize: 14, textAlign: 'right', marginBottom: 5 },
  cmaAlertText: { color: '#f8fafc', fontSize: 13, textAlign: 'right', lineHeight: 24, fontFamily: 'Vazir-Regular' },
  cmaSubTitle: { color: '#94a3b8', textAlign: 'right', marginBottom: 10, fontFamily: 'Vazir-Bold' },
  cmaCard: { backgroundColor: '#0B0F19', padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
  cmaTitle: { color: '#fff', fontSize: 15, fontFamily: 'Vazir-Bold', textAlign: 'right', marginBottom: 10 },
  cmaPrice: { fontSize: 20, fontWeight: 'bold', textAlign: 'right', fontFamily: 'System', marginBottom: 15 },
  fabAddProp: { position: 'absolute', bottom: 30, left: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#10b981', shadowOpacity: 0.4, shadowRadius: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
});