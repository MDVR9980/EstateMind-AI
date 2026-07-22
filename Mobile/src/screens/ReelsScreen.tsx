import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import api, { BASE_URL } from '../services/api';

const { width, height } = Dimensions.get('window');

export default function ReelsScreen({ navigation }: any) {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchProperties();
    }, [])
  );

  const fetchProperties = async () => {
    try {
      const response = await api.get(`/api/properties/app-list`);
      // فقط فایل‌هایی که دارای عکس هستند را برای Reels جدا می‌کنیم
      const withImages = response.data.properties.filter((p: any) => p.image_urls && p.image_urls !== "[]");
      setProperties(withImages);
    } catch (error) {
      console.log("Error fetching reels:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (!price || price === 0) return 'توافقی';
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' تومان';
  };

  const renderReel = ({ item }: { item: any }) => {
    let imageUrl = '';
    try {
      const images = JSON.parse(item.image_urls);
      imageUrl = `${BASE_URL}${images[0]}`; // در نسخه واقعی می‌توان قابلیت نمایش ویدیوی MP4 هم گذاشت
    } catch (e) {}

    return (
      <View style={styles.reelContainer}>
        <Image source={{ uri: imageUrl }} style={styles.reelImage} />
        
        <LinearGradient
          colors={['transparent', 'rgba(11, 15, 25, 0.8)', 'rgba(11, 15, 25, 1)']}
          style={styles.gradientOverlay}
        />

        {/* دکمه‌های کناری (شبیه لایک و کامنت اینستاگرام) */}
        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}>
            <Ionicons name="heart" size={36} color="#f43f5e" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Properties'); }}>
            <Ionicons name="information-circle" size={36} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}>
            <Ionicons name="share-social" size={36} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* اطلاعات پایین صفحه */}
        <View style={styles.bottomInfo}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{item.property_type}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.price}>{formatPrice(item.price_total)}</Text>
          
          <View style={styles.featuresRow}>
            <View style={styles.feature}><Ionicons name="location" size={14} color="#3b82f6" /><Text style={styles.featureText}>{item.neighborhood}</Text></View>
            <View style={styles.feature}><Ionicons name="resize" size={14} color="#10b981" /><Text style={styles.featureText}>{item.built_area} متر</Text></View>
            <View style={styles.feature}><Ionicons name="bed" size={14} color="#a855f7" /><Text style={styles.featureText}>{item.rooms} خواب</Text></View>
          </View>

          {/* نمایش خودکار مزایای کشف شده توسط هوش مصنوعی در زیر ریلز */}
          {item.ai_pros ? (
            <View style={styles.aiProsBox}>
              <Text style={styles.aiProsTitle}><MaterialCommunityIcons name="magic-staff" size={16} /> مزایای این ملک (هوش مصنوعی):</Text>
              <Text style={styles.aiProsText} numberOfLines={2}>{item.ai_pros}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* دکمه بازگشت شناور */}
      <TouchableOpacity onPress={() => { Haptics.selectionAsync(); navigation.goBack(); }} style={styles.floatingBackBtn}>
        <Ionicons name="close" size={28} color="#fff" />
      </TouchableOpacity>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#10b981" /></View>
      ) : properties.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="images-outline" size={60} color="#334155" />
          <Text style={{ color: '#94a3b8', marginTop: 10 }}>فایلی با عکس موجود نیست.</Text>
        </View>
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderReel}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToAlignment="start"
          decelerationRate="fast"
          onMomentumScrollEnd={() => Haptics.selectionAsync()} // ویبره ملایم هنگام تغییر اسلاید (حس ریلز)
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  floatingBackBtn: { position: 'absolute', top: 50, right: 20, zIndex: 100, width: 45, height: 45, backgroundColor: 'rgba(11, 15, 25, 0.6)', borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  
  reelContainer: { width, height },
  reelImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  gradientOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },
  
  rightActions: { position: 'absolute', right: 15, bottom: 150, alignItems: 'center', gap: 25 },
  actionBtn: { alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 5 },
  
  bottomInfo: { position: 'absolute', bottom: 40, left: 15, right: 70 },
  typeBadge: { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderWidth: 1, borderColor: '#10b981', alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
  typeText: { color: '#10b981', fontSize: 11, fontWeight: 'bold' },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'right', marginBottom: 5, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 5 },
  price: { color: '#10b981', fontSize: 24, fontWeight: 'bold', textAlign: 'right', marginBottom: 15, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 5 },
  
  featuresRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginBottom: 15 },
  feature: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  featureText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  
  aiProsBox: { backgroundColor: 'rgba(168, 85, 247, 0.15)', borderWidth: 1, borderColor: '#a855f7', borderRadius: 16, padding: 12 },
  aiProsTitle: { color: '#e9d5ff', fontSize: 12, fontWeight: 'bold', marginBottom: 4, textAlign: 'right' },
  aiProsText: { color: '#fff', fontSize: 12, textAlign: 'right', lineHeight: 20 }
});