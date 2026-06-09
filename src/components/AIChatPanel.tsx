// 医维斯 Ivis — AI Chat Panel (Glass-morphism, neon accents)
// Slides up from bottom, covers ~80% screen.
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
        content: '⟡ **IVIS** online.\n\n我是你的医学知识操作系统。\n\n* 浏览并管理全部知识卡片\n* 搜索概念，创建新节点\n* 分析学习进度，建议学习路径\n* 导航到 App 任意页面\n\n试试说：\n• "打开心血管系统"\n• "创建一个关于心力衰竭的卡片"\n• "我的学习进度怎么样？"',
        status: 'done',
      });
    }
  }, [isPanelOpen]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    // In proxy mode no client-side key is needed (proxy injects it)
    const hasProxy = !!process.env.EXPO_PUBLIC_AI_PROXY_URL;
    if (!apiKey && !hasProxy) {
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
    <Animated.View
    testID="glass-heavy"
    style={[
      styles.wrapper,
      { transform: [{ translateY: slideAnim }] },
    ]}
  >
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>⟡ IVIS</Text>
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

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>AI 只是辅助工具，自己动手才能更好地构建知识体系</Text>
        </View>

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="输入消息..."
            placeholderTextColor="#B8A99A"
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
    backgroundColor: 'rgba(10,14,23,0.55)',
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    zIndex: 9998,
    shadowColor: '#00E5FF', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
    paddingTop: 48,
    borderLeftWidth: 0.5, borderRightWidth: 0.5, borderBottomWidth: 0.5,
    borderColor: 'rgba(0,229,255,0.10)',
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,229,255,0.12)',
    backgroundColor: 'rgba(15,21,32,0.95)',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#00E5FF', letterSpacing: 3 },
  headerRight: { flexDirection: 'row', gap: 10 },
  headerBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
    backgroundColor: 'rgba(0,229,255,0.08)',
  },
  headerBtnText: { fontSize: 14, fontWeight: '500', color: '#8E9DB5' },
  list: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: '#5A6980' },
  disclaimer: {
    paddingHorizontal: 16, paddingVertical: 6,
    alignItems: 'center',
  },
  disclaimerText: {
    fontSize: 12, color: '#5A6980',
  },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: 'rgba(15,21,32,0.95)', borderTopWidth: 0.5, borderTopColor: 'rgba(0,229,255,0.12)',
  },
  input: {
    flex: 1, backgroundColor: '#1A2233', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, color: '#E8EDF5',
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#00E5FF', borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  sendBtnDisabled: { backgroundColor: '#2D3A4D' },
  sendBtnText: { color: '#080B12', fontSize: 15, fontWeight: '700' },
});
