import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Dimensions, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import api from '../services/api';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width * 0.82; 

const STAGES = [
  { id: 'لید جدید', title: 'لید جدید 📥', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.05)' },
  { id: 'بازدید', title: 'در حال بازدید 👁️', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.05)' },
  { id: 'جلسه در دفتر', title: 'جلسه و مذاکره 🤝', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.05)' },
  { id: 'قرارداد موفق', title: 'قرارداد موفق 🏆', color: '#10b981', bg: 'rgba(16, 185, 129, 0.05)' },
];

export default function FunnelScreen({ navigation }: any) {
  const [clients, setClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

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

  const playSuccessEffect = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      // استفاده از صدای پیش‌فرض در صورت نبودن فایل لوکال
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg' }
      );
      await sound.playAsync();
    } catch (error) {}
  };

  const handleMoveClient = (client: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const availableStages = STAGES.filter(s => s.id !== client.funnel_stage);
    
    const alertButtons = availableStages.map(stage => ({
      text: `انتقال به ${stage.title}`,
      onPress: () => updateStage(client.id, stage.id)
    }));

    alertButtons.push({ text: 'انصراف', onPress: () => {}, style: 'cancel' } as any);

    Alert.alert(
      'مدیریت قیف فروش',
      `مشتری "${client.name}" را به کدام مرحله منتقل می‌کنید؟`,
      alertButtons
    );
  };

  const updateStage = async (clientId: number, newStage: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Optimistic Update
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, funnel_stage: newStage } : c));

    if (newStage === 'قرارداد موفق') {
      playSuccessEffect();
      Toast.show({ type: 'success', text1: 'تارگت زده شد! 🎉', text2: 'مشتری با موفقیت به قرارداد تبدیل شد.' });
    }

    try {
      await api.put('/api/clients/update-stage', { client_id: clientId, new_stage: newStage });
    } catch (error) {
      fetchClients(); 
      Toast.show({ type: 'error', text1: 'خطا', text2: 'ارتباط با سرور قطع شد.' });
    }
  };

  const filteredClients = clients.filter(c => c.name.includes(searchQuery) || c.phone.includes(searchQuery));

  const renderCard = (item: any, stageColor: string) => (
    <TouchableOpacity 
      key={item.id} 
      style={[styles.card, { borderRightColor: stageColor }]} 
      onPress={() => handleMoveClient(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.clientName}>{item.name}</Text>
        <View style={[styles.iconBox, { backgroundColor: `${stageColor}15` }]}>
          <Ionicons name="swap-horizontal" size={16} color={stageColor} />
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.clientPhone}><Ionicons name="call-outline" size={12} /> {item.phone}</Text>
      </View>
      <View style={styles.budgetBox}>
        <Text style={styles.budgetLabel}>سقف بودجه:</Text>
        <Text style={[styles.clientBudget, { color: stageColor }]}>
          {item.budget_limit > 0 ? `${(item.budget_limit).toLocaleString()} تومان` : 'نامحدود'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); navigation.goBack(); }} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>مدیریت قیف فروش</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput} 
          placeholder="جستجوی نام یا موبایل..." 
          placeholderTextColor="#64748b" 
          value={searchQuery} 
          onChangeText={setSearchQuery} 
        />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b" /></View>
      ) : (
        <ScrollView 
          horizontal 
          inverted // راست‌چین کردن اسکرول
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.boardContainer}
          snapToInterval={COLUMN_WIDTH + 15}
          decelerationRate="fast"
        >
          {/* آرایه برعکس می‌شود تا لید جدید سمت راست قرار بگیرد */}
          {[...STAGES].reverse().map((stage) => {
            const columnClients = filteredClients.filter(c => c.funnel_stage === stage.id);
            return (
              <View key={stage.id} style={[styles.column, { borderColor: stage.color, backgroundColor: stage.bg }]}>
                <View style={[styles.columnHeader, { borderBottomColor: `${stage.color}40` }]}>
                  <View style={[styles.countBadge, { backgroundColor: stage.color }]}>
                    <Text style={styles.countText}>{columnClients.length}</Text>
                  </View>
                  <Text style={[styles.columnTitle, { color: stage.color }]}>{stage.title}</Text>
                </View>
                
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  {columnClients.length === 0 ? (
                    <View style={styles.emptyColumn}>
                      <MaterialCommunityIcons name="ghost-outline" size={40} color="rgba(255,255,255,0.1)" />
                      <Text style={styles.emptyText}>خالی</Text>
                    </View>
                  ) : (
                    columnClients.map(client => renderCard(client, stage.color))
                  )}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, backgroundColor: '#1E293B', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  headerTitle: { fontSize: 18, fontFamily: 'Vazir-Bold', color: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  searchContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#1E293B', marginHorizontal: 20, borderRadius: 16, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#334155' },
  searchIcon: { marginLeft: 10 },
  searchInput: { flex: 1, color: '#f8fafc', paddingVertical: 12, textAlign: 'right', fontFamily: 'Vazir-Regular' },

  boardContainer: { paddingHorizontal: 15, paddingVertical: 10, gap: 15, flexDirection: 'row' },
  
  column: { width: COLUMN_WIDTH, borderRadius: 24, padding: 15, borderWidth: 1, borderTopWidth: 5, maxHeight: '95%' },
  columnHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 12, borderBottomWidth: 1 },
  columnTitle: { fontSize: 15, fontFamily: 'Vazir-Bold' },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countText: { color: '#fff', fontSize: 12, fontFamily: 'System', fontWeight: 'bold' },

  emptyColumn: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  emptyText: { color: '#64748b', fontFamily: 'Vazir-Regular', marginTop: 10, fontSize: 12 },

  card: { backgroundColor: '#1E293B', padding: 15, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155', borderRightWidth: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  clientName: { color: '#f8fafc', fontFamily: 'Vazir-Bold', fontSize: 15 },
  iconBox: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  
  cardBody: { marginBottom: 12 },
  clientPhone: { color: '#94a3b8', fontSize: 12, fontFamily: 'System', textAlign: 'right' },
  
  budgetBox: { flexDirection: 'row-reverse', justifyContent: 'space-between', backgroundColor: '#0B0F19', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  budgetLabel: { color: '#64748b', fontSize: 11, fontFamily: 'Vazir-Regular' },
  clientBudget: { fontSize: 13, fontFamily: 'System', fontWeight: 'bold' }
});