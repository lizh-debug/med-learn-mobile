// Chat message bubble — user (blue right) / assistant (white left)
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { parseLine } from '../lib/markdownParser';
import WikiLinkText from './WikiLinkText';
import MarkdownTable from './MarkdownTable';
import type { ChatMessage } from '../store/useChatStore';

interface Props {
  message: ChatMessage;
}

export default React.memo(function AIMessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const isLoading = message.status === 'thinking';
  const isToolCall = message.status === 'calling_tool';
  const isError = message.status === 'error';

  const renderedContent = useMemo(() => {
    if (isLoading || isToolCall || !message.content) return null;
    const lines = message.content.split('\n');

    const tableSkipIdx = new Set<number>();
    const tableRowsAt = new Map<number, string[]>();
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (t.startsWith('|') && t.includes('|', 1)) {
        const start = i;
        const rows: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          rows.push(lines[i].trim());
          i++;
        }
        tableRowsAt.set(start, rows);
        for (let j = start + 1; j < i; j++) tableSkipIdx.add(j);
        i--;
      }
    }

    const elements: React.ReactNode[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (tableSkipIdx.has(i)) continue;
      if (tableRowsAt.has(i)) {
        const rows = tableRowsAt.get(i)!;
        if (rows.length >= 2) {
          elements.push(<MarkdownTable key={i} rows={rows} scrollEnabled={false} />);
          continue;
        }
      }
      const nodes = parseLine(lines[i]);
      if (nodes.length === 0) {
        elements.push(<Text key={i} style={{ height: 8 }} />);
      } else {
        elements.push(<WikiLinkText key={i} nodes={nodes} />);
      }
    }
    return elements;
  }, [message.content, isLoading, isToolCall]);

  if (isToolCall) {
    return (
      <View style={[styles.bubble, styles.toolBubble]}>
        <View style={styles.toolRow}>
          <ActivityIndicator size="small" color="#C8865D" />
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
          <ActivityIndicator size="small" color={isUser ? '#fff' : '#C8865D'} />
        ) : (
          <View>
            {renderedContent}
          </View>
        )}
      </View>
      {isUser && <Text style={styles.avatar}>👤</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', marginVertical: 6, paddingHorizontal: 12, alignItems: 'flex-end' },
  userWrapper: { justifyContent: 'flex-end' },
  assistantWrapper: { justifyContent: 'flex-start' },
  avatar: { fontSize: 16, marginHorizontal: 4, marginBottom: 2 },
  bubble: {
    maxWidth: '78%', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
  },
  userBubble: { backgroundColor: '#00E5FF', borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: '#0F1520', borderBottomLeftRadius: 4, borderWidth: 0.5, borderColor: 'rgba(0,229,255,0.15)' },
  errorBubble: { borderColor: '#FF3D71', backgroundColor: 'rgba(255,61,113,0.08)' },
  toolBubble: {
    alignSelf: 'flex-start', marginLeft: 48, marginVertical: 4,
    backgroundColor: 'rgba(255,184,0,0.08)', borderWidth: 0.5, borderColor: 'rgba(255,184,0,0.2)', borderRadius: 12,
  },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolText: { fontSize: 13, color: '#FFB800', fontWeight: '500' },
});
