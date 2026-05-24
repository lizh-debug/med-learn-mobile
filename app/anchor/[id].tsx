// Anchor detail page with proper table rendering
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { readNode, deleteFile, ensureInit } from '../../src/lib/fileStore';
import { parseLine } from '../../src/lib/markdownParser';
import { useAppStore } from '../../src/store/useAppStore';
import WikiLinkText from '../../src/components/WikiLinkText';

// ---- Table renderer ----
function parseTableRows(rows: string[]): { header: string[]; data: string[][] } {
  if (rows.length === 0) return { header: [], data: [] };
  const header = splitCells(rows[0]);
  const data: string[][] = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].match(/^\|[\s\-:|]+$/)) continue; // separator row
    data.push(splitCells(rows[i]));
  }
  return { header, data };
}

function splitCells(row: string): string[] {
  return row.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
}

function MarkdownTable({ rows }: { rows: string[] }) {
  const { header, data } = parseTableRows(rows);
  if (header.length === 0) return null;

  const allRows = [header, ...data];
  const colCount = header.length;
  // Calculate column widths based on content
  const colWidths: number[] = Array(colCount).fill(60);
  for (const row of allRows) {
    for (let i = 0; i < colCount; i++) {
      const len = (row[i] || '').length;
      colWidths[i] = Math.max(colWidths[i], Math.min(len * 8 + 16, 150));
    }
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
      <View style={styles.tableWrap}>
        {/* Header */}
        <View style={styles.tableHeaderRow}>
          {header.map((cell, ci) => (
            <View key={ci} style={[styles.tableHeaderCell, { width: colWidths[ci] }]}>
              <Text style={styles.tableHeaderText}>{cell}</Text>
            </View>
          ))}
        </View>
        {/* Data rows */}
        {data.map((row, ri) => (
          <View key={ri} style={[styles.tableDataRow, ri % 2 === 0 && styles.tableDataRowEven]}>
            {row.map((cell, ci) => (
              <View key={ci} style={[styles.tableDataCell, { width: colWidths[ci] }]}>
                <Text style={styles.tableDataText}>{cell}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

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
        <ActivityIndicator size="large" color="#2563eb" />
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
      <TouchableOpacity onPress={() => router.replace('/(tabs)/skeleton')} style={styles.backBtn}>
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
  container: { flex: 1, backgroundColor: '#fafafa' },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: {
    backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8,
  },
  backBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#111', flex: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8,
  },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  deleteBtn: {
    backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8,
  },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  h2: { fontSize: 17, fontWeight: '700', color: '#1e40af', marginTop: 18, marginBottom: 8 },
  h3: { fontSize: 15, fontWeight: '600', color: '#374151', marginTop: 14, marginBottom: 6 },
  quoteBox: {
    backgroundColor: '#eff6ff', borderLeftWidth: 3,
    borderLeftColor: '#3b82f6', padding: 10, marginVertical: 6, borderRadius: 4,
  },
  quote: { fontSize: 14, color: '#374151', lineHeight: 20, fontStyle: 'italic' },
  linkLine: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 3, paddingLeft: 8 },
  bullet: { fontSize: 14, color: '#6b7280' },
  listItem: { fontSize: 14, color: '#374151', marginVertical: 2, paddingLeft: 16, lineHeight: 22 },
  paragraph: { fontSize: 14, color: '#374151', lineHeight: 22, marginVertical: 4 },
  spacer: { height: 8 },
  bottomPad: { height: 60 },

  // Table styles
  tableScroll: { marginVertical: 12, borderRadius: 8, overflow: 'hidden' },
  tableWrap: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#2563eb' },
  tableHeaderCell: { paddingVertical: 8, paddingHorizontal: 8, justifyContent: 'center' },
  tableHeaderText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  tableDataRow: { flexDirection: 'row', backgroundColor: '#fff' },
  tableDataRowEven: { backgroundColor: '#f9fafb' },
  tableDataCell: { paddingVertical: 6, paddingHorizontal: 8, justifyContent: 'center' },
  tableDataText: { fontSize: 11, color: '#374151', lineHeight: 16 },
});
