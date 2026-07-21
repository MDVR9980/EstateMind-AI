import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

export default function ChatbotScreen({ navigation }: any) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'سلام! 👋 من دستیار هوشمند CRM شما هستم. می‌تونید در مورد فایل‌های آژانس، قیمت‌ها یا مقایسه املاک از من سوال بپرسید.', isUser: false }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userMsg: Message = { id: Date.now().toString(), text: inputText.trim(), isUser: true };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await api.post(`/api/chat/`, { message: userMsg.text });
      if (response.data.status === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const aiMsg: Message = { id: (Date.now() + 1).toString(), text: response.data.reply, isUser: false };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errorMsg: Message = { id: (Date.now() + 1).toString(), text: '❌ متاسفانه ارتباط من با سرور قطع شد.', isUser: false };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.isUser) {
      return (
        <View style={[styles.msgWrapper, styles.msgUser]}>
          <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.gradientMsg}>
            <Text style={styles.msgTextUser}>{item.text}</Text>
          </LinearGradient>
        </View>
      );
    } else {
      return (
        <View style={styles.aiRow}>
          <View style={styles.aiAvatar}>
            <MaterialCommunityIcons name="robot-outline" size={16} color="#10b981" />
          </View>
          <View style={[styles.msgWrapper, styles.msgAI]}>
            <Text style={styles.msgTextAI}>{item.text}</Text>
          </View>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); navigation.goBack(); }} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>دستیار هوشمند (AI)</Text>
          <Text style={styles.headerStatus}>آنلاین و آماده پاسخگویی 🟢</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />

        {isTyping && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color="#10b981" />
            <Text style={styles.typingText}>در حال بررسی...</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="سوالت رو بپرس..."
            placeholderTextColor="#64748b"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={isTyping || !inputText.trim()}>
            <LinearGradient colors={inputText.trim() ? ['#10b981', '#059669'] : ['#334155', '#1e293b']} style={styles.sendGradient}>
              <Ionicons name="send" size={20} color={inputText.trim() ? "#fff" : "#94a3b8"} style={{ marginLeft: 3 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155' },
  backBtn: { width: 40, height: 40, backgroundColor: '#0B0F19', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontFamily: 'Vazir-Bold', color: '#f8fafc' },
  headerStatus: { fontSize: 10, fontFamily: 'Vazir-Regular', color: '#10b981', marginTop: 2 },
  
  chatContainer: { padding: 15, paddingBottom: 20 },
  msgWrapper: { maxWidth: '80%', borderRadius: 20, marginBottom: 15 },
  
  msgUser: { alignSelf: 'flex-start' },
  gradientMsg: { padding: 15, borderBottomLeftRadius: 4, borderRadius: 20 },
  msgTextUser: { color: '#fff', textAlign: 'right', fontFamily: 'Vazir-Regular', fontSize: 14, lineHeight: 24 },
  
  aiRow: { flexDirection: 'row-reverse', alignItems: 'flex-end', marginBottom: 15 },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  msgAI: { alignSelf: 'flex-end', backgroundColor: '#1E293B', borderBottomRightRadius: 4, borderWidth: 1, borderColor: '#334155', padding: 15 },
  msgTextAI: { color: '#e2e8f0', textAlign: 'right', fontFamily: 'Vazir-Regular', fontSize: 14, lineHeight: 24 },
  
  typingIndicator: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10, gap: 10 },
  typingText: { color: '#10b981', fontSize: 12, fontFamily: 'Vazir-Bold' },
  
  inputContainer: { flexDirection: 'row-reverse', padding: 15, backgroundColor: '#1E293B', alignItems: 'flex-end', gap: 10, borderTopWidth: 1, borderTopColor: '#334155' },
  input: { flex: 1, backgroundColor: '#0B0F19', color: '#fff', borderRadius: 20, paddingHorizontal: 15, paddingTop: 12, paddingBottom: 12, textAlign: 'right', maxHeight: 120, fontFamily: 'Vazir-Regular', borderWidth: 1, borderColor: '#334155' },
  sendBtn: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden' },
  sendGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});