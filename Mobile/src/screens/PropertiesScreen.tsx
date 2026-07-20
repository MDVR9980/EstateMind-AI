import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Image, Alert, Modal, ScrollView, KeyboardAvoidingView, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import MapView, { Marker } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import api, { BASE_URL } from '../services/api';

export default function PropertiesScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [activeProps, setActiveProps] = useState<any[]>([]);
  const [pendingProps, setPendingProps] = useState<any[]>([]);
  const [mapItems, setMapItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [semanticQuery, setSemanticQuery] = useState('');
  const [isMapView, setIsMapView] = useState(false);
  
  const [cmaModalVisible, setCmaModalVisible] = useState(false);
  const [cmaData, setCmaData] = useState<any>(null);
  const [isCmaLoading, setIsCmaLoading] = useState(false);
  
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedProp, setSelectedProp] = useState<any>(null);

  // استیت‌های مودال ویرایش
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

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
      if (response.data.status === 'success') {
        setMapItems(response.data.data);
      }
    } catch (error) {
      console.log("Error fetching map data");
    }
  };

  const formatPrice = (price: number) => {
    if (!price || price === 0) return 'توافقی';
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' تومان';
  };

  const getCoordinates = (neighborhood: string, index: number) => {
    let lat = 36.30; let lng = 59.58;
    if (neighborhood.includes('سجاد')) { lat = 36.315; lng = 59.540; }
    else if (neighborhood.includes('هاشمیه')) { lat = 36.335; lng = 59.530; }
    else if (neighborhood.includes('وکیل')) { lat = 36.330; lng = 59.510; }
    const offsetLat = (index % 5) * 0.003;
    const offsetLng = (index % 5) * 0.003;
    return { latitude: lat + offsetLat, longitude: lng + offsetLng };
  };

  const handleVirtualStaging = async () => {
    setOptionsModalVisible(false);
    Toast.show({ type: 'info', text1: 'در حال پردازش AI 🛋️', text2: 'هوش مصنوعی در حال چیدمان مبلمان است...' });
    try {
      await api.post(`/api/properties/${selectedProp.id}/virtual-stage`);
      Toast.show({ type: 'success', text1: 'جادو شد! ✨', text2: 'عکس دکور شده به گالری ملک اضافه شد.' });
      fetchAllProperties();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'ملک عکسی برای دکور شدن ندارد.' });
    }
  };

  const handleApprove = async (id: number, isExclusive: boolean) => {
    try {
      await api.put(`/api/properties/${id}/approve`, { is_exclusive: isExclusive });
      Toast.show({ type: 'success', text1: 'تایید شد', text2: isExclusive ? 'به عنوان فایل شخصی ثبت شد.' : 'فایل عمومی شد.' });
      fetchAllProperties();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکل در تایید فایل.' });
    }
  };

  const handleDelete = async (id: number, isPending: boolean = false) => {
    if(!isPending) setOptionsModalVisible(false);
    Alert.alert('حذف فایل', 'آیا از حذف این فایل مطمئن هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/api/properties/${id}`);
          Toast.show({ type: 'success', text1: 'حذف شد', text2: 'فایل با موفقیت حذف شد.' });
          fetchAllProperties();
        } catch(e) { 
          Toast.show({ type: 'error', text1: 'خطا', text2: 'شما دسترسی حذف ندارید.' }); 
        }
      }}
    ]);
  };

  const handleSemanticSearch = async () => {
    if (!semanticQuery) return;
    Toast.show({ type: 'info', text1: 'هوش مصنوعی 🧠', text2: `در حال درک مفهوم "${semanticQuery}"...` });
    try {
      const response = await api.post(`/api/match/semantic-search`, { query: semanticQuery });
      if (response.data.status === 'success' && response.data.matches.length > 0) {
        const matchText = response.data.matches.map((m: any) => `- ${m.title}\n(${formatPrice(m.price)}) 🎯 ${m.score}%`).join('\n\n');
        Alert.alert('✨ یافت شد!', `${response.data.matches.length} فایل متناسب:\n\n${matchText}`);
      } else {
        Alert.alert('نتیجه‌ای نداشت', 'فایلی که از لحاظ مفهومی با نیاز شما همخوانی داشته باشد یافت نشد.');
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکل در موتور جستجوی معنایی.' });
    }
  };

  const handleCMA = async (propId: number) => {
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

  const handleDivarPublish = async (propId: number) => {
    Alert.alert('انتشار در دیوار؟', 'ربات به صورت خودکار فرم دیوار را پر می‌کند.', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'بله، منتشر کن', onPress: async () => {
          Toast.show({ type: 'info', text1: 'ربات فعال شد', text2: 'در حال ارسال دستور به خزنده‌ی دیوار...' });
          try {
            await api.post(`/api/crawler/publish-to-divar/${propId}`);
            Toast.show({ type: 'success', text1: 'انجام شد', text2: 'پنجره مرورگر ربات در سرور باز شد.' });
          } catch (error) { Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکل ارتباط با ربات.' }); }
      }}
    ]);
  };

  const handleMakePublic = async () => {
    setOptionsModalVisible(false);
    Alert.alert('عمومی کردن', 'آیا این فایل برای سایر همکاران قابل رویت شود؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'بله', onPress: async () => {
        try {
          await api.put(`/api/properties/${selectedProp.id}/make-public`);
          Toast.show({ type: 'success', text1: 'انجام شد', text2: 'فایل عمومی شد.' });
          fetchAllProperties();
        } catch(e) { Toast.show({ type: 'error', text1: 'خطا', text2: 'فایل عمومی نشد.' }); }
      }}
    ]);
  };

  const handleAIMatchBuyers = async () => {
    setOptionsModalVisible(false);
    Toast.show({ type: 'info', text1: 'در حال بررسی...', text2: 'جستجوی خریداران در قیف فروش' });
    try {
      const response = await api.get(`/api/properties/${selectedProp.id}/match-buyers`);
      if (response.data.matches && response.data.matches.length > 0) {
        const matchText = response.data.matches.map((m: any) => `- ${m.name} (${m.phone})\nبودجه: ${m.budget > 0 ? formatPrice(m.budget) : 'نامحدود'}`).join('\n\n');
        Alert.alert('🎯 خریداران یافت شدند!', matchText);
      } else {
        Alert.alert('نتیجه‌ای نداشت', 'مشتری با بودجه مناسب این فایل در سیستم ندارید.');
      }
    } catch(e) { Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکل ارتباطی' }); }
  };

  const handleShare = async (prop: any) => {
    try {
      const priceStr = prop.price_total > 0 ? `${formatPrice(prop.price_total)}` : 'توافقی';
      const catalogUrl = `${BASE_URL}/catalog/property/${prop.id}`;
      const shareMessage = `🏢 ${prop.title}\n📍 محله: ${prop.neighborhood}\n📏 متراژ: ${prop.built_area} متر\n💰 قیمت: ${priceStr}\n\nمشاهده کاتالوگ و عکس‌ها:\n${catalogUrl}`;
      await Share.share({ message: shareMessage, title: prop.title });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکل در باز کردن منوی اشتراک‌گذاری' });
    }
  };
  
  const openOptions = (prop: any) => { setSelectedProp(prop); setOptionsModalVisible(true); };

  // === توابع مربوط به ویرایش فایل ===
  const openEditModal = () => {
    setOptionsModalVisible(false);
    setEditPrice(selectedProp.price_total ? selectedProp.price_total.toString() : '');
    setEditPhone(selectedProp.owner_phone || '');
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    setIsSavingEdit(true);
    try {
      const payload = {
        price_total: parseFloat(editPrice.replace(/,/g, '') || '0'),
        owner_phone: editPhone
      };
      await api.put(`/api/properties/${selectedProp.id}/edit`, payload);
      Toast.show({ type: 'success', text1: 'ذخیره شد', text2: 'اطلاعات ملک با موفقیت بروزرسانی شد.' });
      setEditModalVisible(false);
      fetchAllProperties();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'مشکل در ذخیره اطلاعات' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleUploadMedia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setIsUploadingMedia(true);
      try {
        // آپلود عکس‌ها یکی یکی
        for (let asset of result.assets) {
          const cleanUri = Platform.OS === 'android' ? asset.uri : asset.uri.replace('file://', '');
          let formData = new FormData();
          formData.append('file', {
            uri: cleanUri,
            name: 'property_image.jpg',
            type: 'image/jpeg',
          } as any);

          await api.post(`/api/properties/${selectedProp.id}/upload-media`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
        Toast.show({ type: 'success', text1: 'موفقیت', text2: 'عکس‌ها با موفقیت به گالری اضافه شدند.' });
        fetchAllProperties(); // رفرش لیست تا عکس در کاور نمایش داده شود
      } catch (error) {
        Toast.show({ type: 'error', text1: 'خطا', text2: 'آپلود تصاویر با مشکل مواجه شد.' });
      } finally {
        setIsUploadingMedia(false);
      }
    }
  };

  const displayData = activeTab === 'active' ? activeProps : pendingProps;
  const filteredProperties = displayData.filter(p => p.title.includes(searchQuery) || p.neighborhood.includes(searchQuery));

  const renderPendingCard = ({ item }: { item: any }) => {
    let imageUrl = null;
    try { const images = JSON.parse(item.image_urls || "[]"); if (images.length > 0) imageUrl = `${BASE_URL}${images[0]}`; } catch (e) {}

    return (
      <View style={[styles.card, { borderColor: '#f59e0b', borderWidth: 2 }]}>
        <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>شکار ربات 🕷️</Text></View>
        {imageUrl ? (<Image source={{ uri: imageUrl }} style={styles.cardImage} />) : (<View style={styles.cardImagePlaceholder}><Ionicons name="home-outline" size={40} color="#475569" /></View>)}
        
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardPrice}>{formatPrice(item.price_total)}</Text>
          
          <View style={styles.cardDetails}>
            <View style={styles.detailItem}><Ionicons name="location-outline" size={14} color="#f43f5e" /><Text style={styles.detailText}>{item.neighborhood}</Text></View>
            <View style={styles.detailItem}><Ionicons name="resize-outline" size={14} color="#3b82f6" /><Text style={styles.detailText}>{item.built_area} متر</Text></View>
          </View>
          
          <Text style={{ color: '#cbd5e1', fontSize: 11, textAlign: 'right', marginBottom: 15, lineHeight: 18 }} numberOfLines={2}>{item.description}</Text>

          <View style={styles.approveActions}>
            <TouchableOpacity style={[styles.approveBtn, { backgroundColor: '#10b981' }]} onPress={() => handleApprove(item.id, true)}>
              <Ionicons name="lock-closed" size={14} color="#fff" /><Text style={styles.actionBtnText}>شخصی</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.approveBtn, { backgroundColor: '#3b82f6' }]} onPress={() => handleApprove(item.id, false)}>
              <Ionicons name="globe" size={14} color="#fff" /><Text style={styles.actionBtnText}>عمومی</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.approveBtn, { backgroundColor: '#ef4444' }]} onPress={() => handleDelete(item.id, true)}>
              <Ionicons name="trash" size={14} color="#fff" /><Text style={styles.actionBtnText}>حذف</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderActiveCard = ({ item }: { item: any }) => {
    let imageUrl = null;
    try { const images = JSON.parse(item.image_urls || "[]"); if (images.length > 0) imageUrl = `${BASE_URL}${images[0]}`; } catch (e) {}

    return (
      <View style={styles.card}>
        {imageUrl ? (<Image source={{ uri: imageUrl }} style={styles.cardImage} />) : (<View style={styles.cardImagePlaceholder}><Ionicons name="home-outline" size={40} color="#475569" /></View>)}
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row-reverse', gap: 5 }}>
              <Text style={styles.cardType}>{item.deal_type}</Text>
              <Text style={styles.cardExclusive}>{item.is_exclusive ? 'شخصی 🔒' : 'عمومی 👁️'}</Text>
            </View>
            <TouchableOpacity onPress={() => openOptions(item)} style={{ padding: 5 }}><Ionicons name="ellipsis-horizontal" size={20} color="#94a3b8" /></TouchableOpacity>
          </View>
          
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardPrice}>{formatPrice(item.price_total)}</Text>
          
          <View style={styles.cardDetails}>
            <View style={styles.detailItem}><Ionicons name="location-outline" size={14} color="#f43f5e" /><Text style={styles.detailText}>{item.neighborhood}</Text></View>
            <View style={styles.detailItem}><Ionicons name="resize-outline" size={14} color="#3b82f6" /><Text style={styles.detailText}>{item.built_area} متر</Text></View>
            <View style={styles.detailItem}><Ionicons name="bed-outline" size={14} color="#8b5cf6" /><Text style={styles.detailText}>{item.rooms} خواب</Text></View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtnCMA} onPress={() => handleCMA(item.id)}><Ionicons name="stats-chart" size={16} color="#fff" /><Text style={styles.actionBtnText}>CMA</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnDivar} onPress={() => handleDivarPublish(item.id)}><MaterialCommunityIcons name="spider-web" size={16} color="#fff" /><Text style={styles.actionBtnText}>دیوار</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnShare} onPress={() => handleShare(item)}><Ionicons name="share-social" size={16} color="#fff" /></TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-forward" size={24} color="#f8fafc" /></TouchableOpacity>
        <Text style={styles.headerTitle}>بانک اطلاعات املاک</Text>
        <TouchableOpacity onPress={() => setIsMapView(!isMapView)} style={styles.mapToggleBtn}><Ionicons name={isMapView ? "list" : "map"} size={20} color="#10b981" /></TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'active' && styles.tabBtnActive]} onPress={() => setActiveTab('active')}>
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>بانک اصلی ({activeProps.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActivePending]} onPress={() => setActiveTab('pending')}>
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>صندوق ربات ({pendingProps.length})</Text>
        </TouchableOpacity>
      </View>

      {!isMapView && activeTab === 'active' && (
        <>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
            <TextInput style={styles.searchInput} placeholder="جستجو در عنوان یا محله..." placeholderTextColor="#64748b" value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <View style={styles.aiSearchContainer}>
            <TouchableOpacity style={styles.aiSearchBtn} onPress={handleSemanticSearch}><Text style={styles.aiSearchBtnText}>بگرد</Text></TouchableOpacity>
            <TextInput style={styles.aiSearchInput} placeholder="جستجوی مفهومی (مثلاً: یه خونه نورگیر)..." placeholderTextColor="#a855f7" value={semanticQuery} onChangeText={setSemanticQuery} />
            <MaterialCommunityIcons name="magic-staff" size={20} color="#a855f7" style={styles.aiSearchIcon} />
          </View>
        </>
      )}

      {loading ? ( <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10b981" /></View> ) : isMapView ? (
        <MapView style={{ flex: 1 }} initialRegion={{ latitude: 36.30, longitude: 59.58, latitudeDelta: 0.09, longitudeDelta: 0.09 }} userInterfaceStyle="dark">
          {mapItems.map((item, index) => {
            const coords = getCoordinates(item.neighborhood, index);
            return <Marker key={item.id} coordinate={coords} pinColor={item.color || "blue"} title={item.title} description={item.price} />;
          })}
        </MapView>
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

      {/* مودال گزینه‌های بیشتر */}
      <Modal animationType="fade" transparent={true} visible={optionsModalVisible} onRequestClose={() => setOptionsModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setOptionsModalVisible(false)}>
          <View style={styles.optionsModalView}>
            <View style={styles.optionsHeader}><Text style={{color: '#fff', fontWeight: 'bold'}}>{selectedProp?.title}</Text></View>
            
            {selectedProp?.is_exclusive && (
              <TouchableOpacity style={styles.optionRow} onPress={handleMakePublic}>
                <Ionicons name="eye-outline" size={22} color="#10b981" />
                <Text style={styles.optionText}>عمومی کردن فایل</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.optionRow} onPress={handleAIMatchBuyers}>
              <Ionicons name="people-outline" size={22} color="#3b82f6" />
              <Text style={styles.optionText}>مچینگ با خریداران قیف</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow} onPress={handleVirtualStaging}>
              <MaterialCommunityIcons name="sofa-outline" size={22} color="#a855f7" />
              <Text style={styles.optionText}>چیدمان مجازی با AI</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow} onPress={openEditModal}>
              <Ionicons name="pencil-outline" size={22} color="#f59e0b" />
              <Text style={styles.optionText}>ویرایش و آپلود گالری</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.optionRow, { borderBottomWidth: 0 }]} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={22} color="#ef4444" />
              <Text style={[styles.optionText, { color: '#ef4444' }]}>حذف فایل</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* مودال ویرایش فایل و آپلود گالری */}
      <Modal animationType="slide" transparent={true} visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlayFlex}>
          <View style={styles.editModalView}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#f59e0b' }]}>ویرایش و گالری ✏️</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>قیمت کل (تومان)</Text>
                <TextInput 
                  style={[styles.input, { fontFamily: 'System', color: '#10b981', fontWeight: 'bold' }]} 
                  keyboardType="numeric" 
                  value={editPrice} 
                  onChangeText={(text) => setEditPrice(text.replace(/,/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ","))} 
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>شماره موبایل مالک</Text>
                <TextInput 
                  style={[styles.input, { fontFamily: 'System' }]} 
                  keyboardType="phone-pad" 
                  value={editPhone} 
                  onChangeText={setEditPhone} 
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>گالری تصاویر</Text>
                <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadMedia} disabled={isUploadingMedia}>
                  {isUploadingMedia ? (
                    <ActivityIndicator color="#3b82f6" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={24} color="#3b82f6" />
                      <Text style={styles.uploadBtnText}>انتخاب و آپلود عکس‌ها</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={saveEdit} disabled={isSavingEdit}>
                {isSavingEdit ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>ذخیره تغییرات</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
              <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator size="large" color="#f59e0b" /><Text style={{ color: '#f59e0b', marginTop: 10 }}>در حال تحلیل بازار منطقه...</Text></View>
            ) : cmaData ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.cmaAlertBox}>
                  <Text style={styles.cmaAlertTitle}>💡 استراتژی پرزنت به مالک:</Text>
                  <Text style={styles.cmaAlertText}>میانگین قیمت واقعی در این منطقه <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{cmaData.suggested_price.toLocaleString()}</Text> تومان است. </Text>
                </View>

                <View style={styles.cmaScenarios}>
                  <View style={[styles.cmaBox, { borderColor: '#ef4444' }]}><Text style={[styles.cmaBoxLabel, { color: '#ef4444' }]}>جسورانه (تند)</Text><Text style={styles.cmaBoxValue}>{cmaData.scenarios.aggressive.price.toLocaleString()}</Text><Text style={styles.cmaBoxDays}>{cmaData.scenarios.aggressive.days}</Text></View>
                  <View style={[styles.cmaBox, { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', transform: [{ scale: 1.05 }] }]}><Text style={[styles.cmaBoxLabel, { color: '#10b981' }]}>نرمال (ارزش واقعی)</Text><Text style={[styles.cmaBoxValue, { color: '#10b981' }]}>{cmaData.scenarios.market.price.toLocaleString()}</Text><Text style={styles.cmaBoxDays}>{cmaData.scenarios.market.days}</Text></View>
                  <View style={[styles.cmaBox, { borderColor: '#f59e0b' }]}><Text style={[styles.cmaBoxLabel, { color: '#f59e0b' }]}>فروش فوری</Text><Text style={styles.cmaBoxValue}>{cmaData.scenarios.conservative.price.toLocaleString()}</Text><Text style={styles.cmaBoxDays}>{cmaData.scenarios.conservative.days}</Text></View>
                </View>
              </ScrollView>
            ) : null}
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
  mapToggleBtn: { width: 40, height: 40, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#10b981' },
  
  tabContainer: { flexDirection: 'row-reverse', marginHorizontal: 20, backgroundColor: '#1e293b', borderRadius: 16, padding: 4, marginBottom: 15 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabBtnActive: { backgroundColor: '#3b82f6' },
  tabBtnActivePending: { backgroundColor: '#f59e0b' },
  tabText: { color: '#64748b', fontWeight: 'bold', fontSize: 13 },
  tabTextActive: { color: '#fff' },

  searchContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#1e293b', marginHorizontal: 20, borderRadius: 16, paddingHorizontal: 15, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  searchIcon: { marginLeft: 10 },
  searchInput: { flex: 1, color: '#f8fafc', paddingVertical: 12, textAlign: 'right' },
  
  aiSearchContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(168, 85, 247, 0.1)', marginHorizontal: 20, borderRadius: 16, paddingLeft: 5, paddingRight: 15, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.5)' },
  aiSearchIcon: { marginLeft: 10 },
  aiSearchInput: { flex: 1, color: '#e9d5ff', paddingVertical: 12, textAlign: 'right', fontSize: 12 },
  aiSearchBtn: { backgroundColor: '#a855f7', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, marginLeft: 5 },
  aiSearchBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#64748b', marginTop: 10, fontSize: 16 },
  
  card: { backgroundColor: '#1e293b', borderRadius: 24, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#334155', position: 'relative' },
  cardImage: { width: '100%', height: 160 },
  cardImagePlaceholder: { width: '100%', height: 140, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  cardContent: { padding: 16 },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
  cardType: { backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 10, fontWeight: 'bold' },
  cardExclusive: { backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 10, fontWeight: 'bold' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', textAlign: 'right', marginBottom: 6 },
  cardPrice: { fontSize: 18, fontWeight: 'bold', color: '#10b981', textAlign: 'right', marginBottom: 12, fontFamily: 'System' },
  cardDetails: { flexDirection: 'row-reverse', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 12, marginBottom: 12 },
  detailItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  detailText: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold' },

  actionsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 8, marginTop: 5 },
  actionBtnCMA: { flex: 2, flexDirection: 'row-reverse', backgroundColor: '#f59e0b', paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 5 },
  actionBtnDivar: { flex: 2, flexDirection: 'row-reverse', backgroundColor: '#ef4444', paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 5 },
  actionBtnShare: { flex: 1, backgroundColor: '#334155', paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  pendingBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#f59e0b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, zIndex: 10 },
  pendingBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  approveActions: { flexDirection: 'row-reverse', gap: 8, marginTop: 10 },
  approveBtn: { flex: 1, flexDirection: 'row-reverse', paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'center' },
  modalOverlayFlex: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'flex-end' },
  
  optionsModalView: { backgroundColor: '#1e293b', width: '80%', alignSelf: 'center', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#334155' },
  optionsHeader: { borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 10, marginBottom: 10, alignItems: 'center' },
  optionRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 15 },
  optionText: { color: '#f8fafc', fontSize: 14, fontWeight: 'bold' },
  
  // استایل‌های جدید برای مودال ویرایش
  editModalView: { backgroundColor: '#1e293b', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  inputGroup: { marginBottom: 16 },
  label: { color: '#cbd5e1', marginBottom: 8, fontSize: 13, fontWeight: 'bold', textAlign: 'right' },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 16, padding: 16, color: '#f8fafc', textAlign: 'right' },
  uploadBtn: { flexDirection: 'row-reverse', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', gap: 10 },
  uploadBtnText: { color: '#3b82f6', fontSize: 14, fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#f59e0b', padding: 16, borderRadius: 16, marginTop: 10, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  cmaModalView: { backgroundColor: '#1e293b', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '80%', marginTop: 'auto' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#f59e0b', fontSize: 18, fontWeight: 'bold' },
  cmaAlertBox: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 1, borderColor: '#3b82f6', padding: 15, borderRadius: 16, marginBottom: 20 },
  cmaAlertTitle: { color: '#60a5fa', fontWeight: 'bold', fontSize: 14, textAlign: 'right', marginBottom: 5 },
  cmaAlertText: { color: '#cbd5e1', fontSize: 12, textAlign: 'right', lineHeight: 22 },
  cmaScenarios: { gap: 12 },
  cmaBox: { backgroundColor: '#0f172a', borderWidth: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  cmaBoxLabel: { fontSize: 12, fontWeight: 'bold', marginBottom: 5 },
  cmaBoxValue: { fontSize: 20, color: '#f8fafc', fontWeight: 'bold', fontFamily: 'System', marginBottom: 5 },
  cmaBoxDays: { fontSize: 10, color: '#64748b' }
});