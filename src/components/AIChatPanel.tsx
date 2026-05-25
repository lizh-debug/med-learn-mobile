// AI Chat panel — slides up from bottom, covers ~80% screen
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  TouchableOpacity, FlatList, KeyboardAvoidingView, Platform,
  Animated, Dimensions,
} from 'react-native';
import { useChatStore, genId, ChatMessage } from '../store/useChatStore';
import { chat } from '../lib/aiService';
import AIMessageBubble from './AIMessageBubble';
import APISettingsSheet from './APISettingsSheet';

const { height: SCREEN_H } = Dimensions.get('window');
const PANEL_H = SCREEN_H * 0.82;

export default function AIChatPanel() {
  const isPanelOpen = useChatStore((s) => s.isPanelOpen);
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const apiKey = useChatStore((s) => s.apiKey);
  const endpoint = useChatStore((s) => s.endpoint);
  const model = useChatStore((s) => s.model);
  const addMessage = useChatStore((s) => s.addMessage);
  const setLoading = useChatStore((s) => s.setLoading);
  const closePanel = useChatStore((s) => s.closePanel);
  const updateMessageStatus = useChatStore((s) => s.updateMessageStatus);

  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const slideAnim = useRef(new Animated.Value(PANEL_H)).current;
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isPanelOpen ? 0 : PANEL_H,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isPanelOpen]);

  // Show welcome message on first open
  useEffect(() => {
    if (isPanelOpen && messages.length === 0) {
      addMessage({
        id: genId(),
        role: 'assistant',
        content: '你好！我是你的医学学习助手 ✨\n\n我可以帮你：\n• 创建新的知识卡片\n• 补充和编辑已有卡片\n• 搜索你已有的知识\n• 回答医学问题\n\n试试说"帮我创建一张关于心力衰竭的卡片"',
        status: 'done',
      });
    }
  }, [isPanelOpen]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    setInput('');
    const userMsg: ChatMessage = { id: genId(), role: 'user', content: text, status: 'done' };
    addMessage(userMsg);
    setLoading(true);

    // Add a placeholder for the assistant
    const aiMsgId = genId();
    const aiMsg: ChatMessage = { id: aiMsgId, role: 'assistant', content: '', status: 'thinking' };
    addMessage(aiMsg);

    try {
      const currentMessages = useChatStore.getState().messages;
      const result = await chat(
        currentMessages.filter((m) => m.content || m.role === 'user'),
        apiKey, endpoint, model,
        (toolId, status, statusText) => {
          updateMessageStatus(aiMsgId, status, statusText);
        },
      );

      updateMessageStatus(aiMsgId, 'done');
      // Replace the placeholder with the real response
      useChatStore.setState((s) => ({
        messages: s.messages.map((m) =>
          m.id === aiMsgId ? { ...m, content: result.message.content, status: 'done' as const } : m
        ),
      }));
    } catch (e: any) {
      updateMessageStatus(aiMsgId, 'error');
      useChatStore.setState((s) => ({
        messages: s.messages.map((m) =>
          m.id === aiMsgId ? { ...m, content: e.message || '请求失败', status: 'error' as const } : m
        ),
      }));
    } finally {
      setLoading(false);
    }
  }, [input, isLoading, apiKey, endpoint, model]);

  if (!isPanelOpen) return null;

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ translateY: slideAnim }] }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>✨ AI 学习助手</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>设置</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={closePanel} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          style={styles.list}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <AIMessageBubble message={item} />}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
            }
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>开始对话吧</Text>
            </View>
          }
        />

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="输入消息..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={2000}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Text style={styles.sendBtnText}>发送</Text>
          </TouchableOpacity>
        </View>

        {/* Settings overlay */}
        <APISettingsSheet visible={showSettings} onClose={() => setShowSettings(false)} />
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute', top: 0, left: 0, right: 0, height: PANEL_H,
    backgroundColor: '#f8f9fa',
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    zIndex: 9998,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
    paddingTop: 48, // safe area
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  headerRight: { flexDirection: 'row', gap: 12 },
  headerBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  headerBtnText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  list: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: '#9ca3af' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb',
  },
  input: {
    flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#111',
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#7c3aed', borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  sendBtnDisabled: { backgroundColor: '#d1d5db' },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
