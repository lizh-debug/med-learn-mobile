// Anchor detail page with proper table rendering
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { readNode, deleteFile, ensureInit } from '../../src/lib/fileStore';
import { parseLine } from '../../src/lib/markdownParser';
import { useAppStore } from '../../src/store/useAppStore';
import WikiLinkText from '../../src/components/WikiLinkText';
import MarkdownTable from '../../src/components/MarkdownTable';

// ---- Main screen ----
export default function AnchorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const filePath = decodeURIComponent(id || '');
  const triggerSkeletonRefresh = useAppStore((s) => s.triggerSkeletonRefresh);
  const skeletonRefreshKey = useAppStore((s) => s.skeletonRefreshKey);

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  function handleEdit() {
    router.push(`/anchor/edit/${encodeURIComponent(filePath)}`);
  }

  async function performDelete() {
    setDeleting(true);
    try {
      await deleteFile(filePath);
      triggerSkeletonRefresh();
      router.back();
    } catch (e) {
      setDeleting(false);
      Alert.alert('删除失败', String(e));
    }
  }

  function handleDelete() {
    const msg = `确定要删除「${title}」吗？`;
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) performDelete();
    } else {
      Alert.alert('删除锚点', msg, [
        { text: '取消', style: 'cancel' },
        { text: '删除', style: 'destructive', onPress: performDelete },
      ]);
    }
  }

  useEffect(() => {
    loadAnchor();
  }, [filePath, skeletonRefreshKey]);

  async function loadAnchor() {
    setLoading(true);
    try {
      await ensureInit(); // 确保 memStore 已填充
      const node = await readNode(filePath);
      const bodyTitle = node.body.match(/^#\s+(.+)$/m)?.[1] || '';
      setTitle(bodyTitle);
      setContent(node.body);
    } catch {
      setTitle('锚点未找到');
      setContent('');
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00E5FF" />
      </View>
    );
  }

  // Pre-process: group consecutive table rows
  const lines = content.split('\n');
  const elements: Array<{ type: 'text' | 'heading' | 'quote' | 'link' | 'list' | 'table' | 'spacer'; line?: string; rows?: string[] }> = [];
  let tableBuffer: string[] = [];

  function flushTable() {
    if (tableBuffer.length > 0) {
      elements.push({ type: 'table', rows: [...tableBuffer] });
      tableBuffer = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('|')) {
      tableBuffer.push(trimmed);
      continue;
    }

    flushTable();

    if (!trimmed) {
      elements.push({ type: 'spacer' });
    } else if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      elements.push({ type: 'heading', line: trimmed });
    } else if (trimmed.startsWith('> ')) {
      elements.push({ type: 'quote', line: trimmed });
    } else if (trimmed.includes('[[')) {
      elements.push({ type: 'link', line: trimmed });
    } else if (trimmed.startsWith('- ')) {
      elements.push({ type: 'list', line: trimmed });
    } else {
      elements.push({ type: 'text', line: trimmed });
    }
  }
  flushTable();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => { if (router.canGoBack()) router.back(); else router.push('/(tabs)/clinical'); }} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← 返回</Text>
      </TouchableOpacity>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
            <Text style={styles.editBtnText}>编辑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteBtn, deleting && styles.deleteBtnDisabled]}
            onPress={handleDelete}
            disabled={deleting}
          >
            <Text style={styles.deleteBtnText}>{deleting ? '删除中...' : '删除'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {elements.map((el, idx) => {
        switch (el.type) {
          case 'spacer':
            return <View key={idx} style={styles.spacer} />;
          case 'heading': {
            const t = el.line!;
            if (t.startsWith('# ') && idx === 0) return null; // skip title
            if (t.startsWith('## ')) {
              return <Text key={idx} style={styles.h2}>{t.replace('## ', '')}</Text>;
            }
            if (t.startsWith('### ')) {
              return <Text key={idx} style={styles.h3}>{t.replace('### ', '')}</Text>;
            }
            return <Text key={idx} style={styles.h2}>{t.replace('# ', '')}</Text>;
          }
          case 'quote':
            return (
              <View key={idx} style={styles.quoteBox}>
                <Text style={styles.quote}>{el.line!.replace(/^>\s*/, '')}</Text>
              </View>
            );
          case 'link': {
            const nodes = parseLine(el.line!);
            return (
              <View key={idx} style={styles.linkLine}>
                <Text style={styles.bullet}>  •  </Text>
                <WikiLinkText nodes={nodes} />
              </View>
            );
          }
          case 'list':
            return <Text key={idx} style={styles.listItem}>{el.line}</Text>;
          case 'table':
            return <MarkdownTable key={idx} rows={el.rows!} />;
          default:
            return <Text key={idx} style={styles.paragraph}>{el.line}</Text>;
        }
      })}

      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080B12' },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#080B12' },
  backBtn: {
    paddingHorizontal: 0, paddingVertical: 8, alignSelf: 'flex-start', marginBottom: 4,
  },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#00E5FF' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#E8EDF5', flex: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    backgroundColor: '#00E5FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  editBtnText: { color: '#080B12', fontSize: 13, fontWeight: '600' },
  deleteBtn: {
    backgroundColor: '#FF3D71', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  h2: { fontSize: 20, fontWeight: '700', color: '#00E5FF', marginTop: 24, marginBottom: 10 },
  h3: { fontSize: 17, fontWeight: '600', color: '#E8EDF5', marginTop: 16, marginBottom: 8 },
  quoteBox: {
    backgroundColor: 'rgba(0,229,255,0.06)', borderLeftWidth: 3,
    borderLeftColor: '#00E5FF', padding: 12, marginVertical: 8, borderRadius: 8,
  },
  quote: { fontSize: 15, color: '#E8EDF5', lineHeight: 22, fontStyle: 'italic' },
  linkLine: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 4, paddingLeft: 8 },
  bullet: { fontSize: 15, color: '#8E9DB5' },
  listItem: { fontSize: 15, color: '#E8EDF5', marginVertical: 3, paddingLeft: 16, lineHeight: 22 },
  paragraph: { fontSize: 17, color: '#E8EDF5', lineHeight: 24, marginVertical: 4 },
  spacer: { height: 10 },
  bottomPad: { height: 120 },

  // Table styles
  tableScroll: { marginVertical: 12, borderRadius: 8, overflow: 'hidden' },
  tableWrap: { borderWidth: 1, borderColor: '#1E2838', borderRadius: 8, overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#00E5FF' },
  tableHeaderCell: { paddingVertical: 8, paddingHorizontal: 8, justifyContent: 'center' },
  tableHeaderText: { fontSize: 12, fontWeight: '700', color: '#080B12' },
  tableDataRow: { flexDirection: 'row', backgroundColor: '#0F1520' },
  tableDataRowEven: { backgroundColor: '#141B26' },
  tableDataCell: { paddingVertical: 6, paddingHorizontal: 8, justifyContent: 'center' },
  tableDataText: { fontSize: 12, color: '#E8EDF5', lineHeight: 16 },
});
