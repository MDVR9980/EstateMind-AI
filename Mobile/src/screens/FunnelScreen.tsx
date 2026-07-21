import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DraxProvider, DraxView, DraxList } from 'react-native-drax';
import { Audio } from 'expo-av';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width * 0.75;

const STAGES = [
  { id: 'لید جدید', title: 'لید جدید 📥', color: '#3b82f6' },
  { id: 'بازدید', title: 'بازدید 👁️', color: '#f59e0b' },
  { id: 'جلسه در دفتر', title: 'جلسه 🤝', color: '#a855f7' },
  { id: 'قرارداد موفق', title: 'قرارداد موفق 🏆', color: '#10b981' },
];

export default function FunnelScreen({ navigation }: any) {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sound, setSound] = useState<Audio.Sound>();
  const confettiRef = useRef<LottieView>(null);

  useFocusEffect(
    useCallback(() => {
      fetchClients();
    }, [])
  );

  const fetchClients = async () => {
    try {
      const response = await api.get('/api/clients/app-list');
      setClients(response.data.clients);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'خطا', text2: 'دریافت مشتریان با خطا مواجه شد.' });
    } finally {
      setLoading(false);
    }
  };

  // بارگذاری صدای موفقیت
  useEffect(() => {
    async function loadSound() {
      // توجه: در پروژه واقعی، یک فایل کوتاه mp3 در پوشه assets قرار دهید
      // const { sound: audioSound } = await Audio.Sound.createAsync(require('../../assets/success.mp3'));
      // setSound(audioSound);
    }
    loadSound();
    return () => { if (sound) sound.unloadAsync(); };
  }, []);

  const playSuccessEffect = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (sound) await sound.playAsync();
    confettiRef.current?.play(0, 100); // پخش Lottie
  };

  const handleDrop = async (clientId: number, newStage: string) => {
    // بروزرسانی UI قبل از سرور (Optimistic Update)
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, funnel_stage: newStage } : c));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (newStage === 'قرارداد موفق') {
      playSuccessEffect();
      Toast.show({ type: 'success', text1: 'تارگت زده شد! 🎉', text2: 'کمیسیون این معامله به حساب شما افزوده شد.' });
    }

    try {
      await api.put('/api/clients/update-stage', { client_id: clientId, new_stage: newStage });
    } catch (error) {
      fetchClients(); // در صورت خطا دیتا را برگردان
      Toast.show({ type: 'error', text1: 'خطا', text2: 'ارتباط با سرور قطع شد.' });
    }
  };

  const renderCard = ({ item }: { item: any }) => (
    <DraxView
      style={styles.card}
      draggingStyle={styles.draggingCard}
      dragReleasedStyle={styles.draggingCard}
      hoverDraggingStyle={styles.hoverDraggingCard}
      payload={item.id}
      onDragStart={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.clientName}>{item.name}</Text>
        <Ionicons name="person-circle-outline" size={24} color="#94a3b8" />
      </View>
      <Text style={styles.clientPhone}>{item.phone}</Text>
      <Text style={styles.clientBudget}>بودجه: {(item.budget_limit || 0).toLocaleString()} تومان</Text>
    </DraxView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* هدر */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>قیف فروش (Kanban)</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* افکت Confetti پنهان */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LottieView
          ref={confettiRef}
          source={require('../../assets/confetti.json')} // حتما یک فایل confetti.json دانلود کرده و در assets بگذارید
          loop={false}
          style={{ width: '100%', height: '100%' }}
        />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#10b981" /></View>
      ) : (
        <DraxProvider>
          <DraxList
            data={STAGES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(stage) => stage.id}
            contentContainerStyle={styles.boardContainer}
            renderItemContent={({ item: stage }: any) => {
              const columnClients = clients.filter(c => c.funnel_stage === stage.id);
              
              return (
                <DraxView
                  style={[styles.column, { borderTopColor: stage.color }]}
                  receivingStyle={styles.receivingColumn}
                  onReceiveDragDrop={(event) => handleDrop(event.dragged.payload, stage.id)}
                >
                  <View style={styles.columnHeader}>
                    <Text style={[styles.columnTitle, { color: stage.color }]}>{stage.title}</Text>
                    <View style={styles.countBadge}><Text style={styles.countText}>{columnClients.length}</Text></View>
                  </View>
                  
                  <DraxList
                    data={columnClients}
                    renderItemContent={renderCard}
                    keyExtractor={(client) => client.id.toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                  />
                </DraxView>
              );
            }}
          />
        </DraxProvider>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, backgroundColor: '#1E293B', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  boardContainer: { paddingHorizontal: 15, paddingVertical: 10, gap: 15 },
  
  // Columns
  column: { width: COLUMN_WIDTH, backgroundColor: '#0f172a', borderRadius: 24, padding: 15, borderWidth: 1, borderColor: '#1E293B', borderTopWidth: 4, maxHeight: '90%' },
  receivingColumn: { backgroundColor: '#1e293b', borderColor: '#10b981' },
  columnHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  columnTitle: { fontSize: 16, fontWeight: 'bold' },
  countBadge: { backgroundColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },

  // Cards
  card: { backgroundColor: '#1E293B', padding: 15, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155', elevation: 3 },
  draggingCard: { opacity: 0.5, transform: [{ scale: 1.05 }] },
  hoverDraggingCard: { opacity: 0.8 },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  clientName: { color: '#f8fafc', fontWeight: 'bold', fontSize: 14 },
  clientPhone: { color: '#94a3b8', fontSize: 12, fontFamily: 'System', textAlign: 'right', marginBottom: 4 },
  clientBudget: { color: '#10b981', fontSize: 11, fontWeight: 'bold', textAlign: 'right', fontFamily: 'System' }
});