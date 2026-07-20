import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

export default function ChatbotScreen({ navigation }: any) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'سلام! 👋 من دستیار هوشمند CRM شما هستم. چطور می‌تونم کمکت کنم؟', isUser: false }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), text: inputText, isUser: true };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await api.post(`/api/chat/`, { message: userMsg.text });
      if (response.data.status === 'success') {
        const aiMsg: Message = { id: (Date.now() + 1).toString(), text: response.data.reply, isUser: false };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (error) {
      const errorMsg: Message = { id: (Date.now() + 1).toString(), text: '❌ خطا در ارتباط با سرور.', isUser: false };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.msgWrapper, item.isUser ? styles.msgUser : styles.msgAI]}>
      <Text style={[styles.msgText, item.isUser ? styles.msgTextUser : styles.msgTextAI]}>{item.text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>دستیار هوشمند (AI)</Text>
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
        />

        {isTyping && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color="#8b5cf6" />
            <Text style={styles.typingText}>در حال پردازش...</Text>
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
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, backgroundColor: '#1e293b' },
  backBtn: { width: 40, height: 40, backgroundColor: '#334155', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
  chatContainer: { padding: 15, paddingBottom: 20 },
  msgWrapper: { maxWidth: '80%', padding: 15, borderRadius: 20, marginBottom: 10 },
  msgUser: { alignSelf: 'flex-start', backgroundColor: '#3b82f6', borderBottomLeftRadius: 4 },
  msgAI: { alignSelf: 'flex-end', backgroundColor: '#1e293b', borderBottomRightRadius: 4, borderWidth: 1, borderColor: '#334155' },
  msgText: { fontSize: 14, lineHeight: 22 },
  msgTextUser: { color: '#fff', textAlign: 'right' },
  msgTextAI: { color: '#e2e8f0', textAlign: 'right' },
  typingIndicator: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10, gap: 10 },
  typingText: { color: '#8b5cf6', fontSize: 12, fontWeight: 'bold' },
  inputContainer: { flexDirection: 'row-reverse', padding: 15, backgroundColor: '#1e293b', alignItems: 'center', gap: 10 },
  input: { flex: 1, backgroundColor: '#0f172a', color: '#fff', borderRadius: 20, paddingHorizontal: 15, paddingTop: 12, paddingBottom: 12, textAlign: 'right', maxHeight: 100 },
  sendBtn: { width: 45, height: 45, backgroundColor: '#8b5cf6', borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' }
});