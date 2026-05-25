// Chat message bubble — user (blue right) / assistant (white left)
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { parseLine } from '../lib/markdownParser';
import WikiLinkText from './WikiLinkText';
import type { ChatMessage } from '../store/useChatStore';

interface Props {
  message: ChatMessage;
}

function renderContent(content: string) {
  const lines = content.split('\n');
  return lines.map((line, i) => {
    const nodes = parseLine(line);
    if (nodes.length === 0) return <Text key={i} style={{ height: 8 }} />;
    return (
      <WikiLinkText key={i} nodes={nodes} />
    );
  });
}

export default function AIMessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const isLoading = message.status === 'thinking';
  const isToolCall = message.status === 'calling_tool';
  const isError = message.status === 'error';

  if (isToolCall) {
    return (
      <View style={[styles.bubble, styles.toolBubble]}>
        <View style={styles.toolRow}>
          <ActivityIndicator size="small" color="#7c3aed" />
          <Text style={styles.toolText}>{message.statusText || '处理中...'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, isUser ? styles.userWrapper : styles.assistantWrapper]}>
      {!isUser && <Text style={styles.avatar}>✨</Text>}
      <View style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.assistantBubble,
        isError && styles.errorBubble,
      ]}>
        {isLoading ? (
          <ActivityIndicator size="small" color={isUser ? '#fff' : '#7c3aed'} />
        ) : (
          <View>
            {renderContent(message.content)}
          </View>
        )}
      </View>
      {isUser && <Text style={styles.avatar}>👤</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', marginVertical: 6, paddingHorizontal: 12, alignItems: 'flex-end' },
  userWrapper: { justifyContent: 'flex-end' },
  assistantWrapper: { justifyContent: 'flex-start' },
  avatar: { fontSize: 20, marginHorizontal: 4, marginBottom: 2 },
  bubble: {
    maxWidth: '78%', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
  },
  userBubble: { backgroundColor: '#2563eb', borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e5e7eb' },
  errorBubble: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  toolBubble: {
    alignSelf: 'flex-start', marginLeft: 48, marginVertical: 4,
    backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe', borderRadius: 12,
  },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolText: { fontSize: 13, color: '#7c3aed', fontWeight: '500' },
});
