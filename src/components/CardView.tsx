// Card reading view - renders markdown with tappable [[wiki links]]
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Pressable, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { readNode, deleteFile, ensureInit } from '../lib/fileStore';
import { parseLine, extractWikiLinks } from '../lib/markdownParser';
import { useAppStore } from '../store/useAppStore';
import BacklinksList from './BacklinksList';

interface Props {
  filePath: string;
  isSpeedAnchor?: boolean;
  speedContent?: string;
}

function parseSpeedContent(raw: string): { summary: string; textbook: string } {
  // Format: 📖 *summary* → 《textbook》
  let text = raw.replace(/^📖\s*/, '');
  let summary = '';
  let textbook = '';

  // Extract *...* part
  const asteriskMatch = text.match(/\*(.+?)\*/);
  if (asteriskMatch) {
    summary = asteriskMatch[1].trim();
  } else {
    summary = text.replace(/→\s*《.+》/, '').trim();
  }

  // Extract 《...》 part
  const bookMatch = text.match(/《(.+?)》/);
  if (bookMatch) {
    textbook = bookMatch[1].trim();
  }

  return { summary, textbook };
}

export default function CardView({ filePath, isSpeedAnchor, speedContent }: Props) {
  const router = useRouter();
  const setEditingCardPath = useAppStore((s) => s.setEditingCardPath);
  const removeRecentCard = useAppStore((s) => s.removeRecentCard);
  const triggerSkeletonRefresh = useAppStore((s) => s.triggerSkeletonRefresh);
  const skeletonRefreshKey = useAppStore((s) => s.skeletonRefreshKey);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [frontmatter, setFrontmatter] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadCard();
  }, [filePath, skeletonRefreshKey]);

  async function loadCard() {
    setLoading(true);
    setNotFound(false);
    try {
      await ensureInit(); // 确保 memStore 已填充
      const node = await readNode(filePath);
      setFrontmatter(node.frontmatter);
      const bodyTitle = node.body.match(/^#\s+(.+)$/m)?.[1];
      setTitle(bodyTitle || (node.frontmatter.birthplace as string) || filePath.split('/').pop()?.replace('.md', '') || '');
      setContent(node.body);
    } catch {
      setNotFound(true);
      setTitle(filePath.split('/').pop()?.replace('.md', '') || '未找到');
    }
    setLoading(false);
  }

  function handleLinkPress(linkPath: string) {
    if (linkPath.startsWith('骨架/')) {
      const system = linkPath.replace('骨架/', '').replace('.md', '');
      router.push(`/skeleton/${encodeURIComponent(system)}`);
    } else if (linkPath.startsWith('临床锚点/')) {
      router.push(`/anchor/${encodeURIComponent(linkPath)}`);
    } else if (linkPath === '00-总入口' || linkPath === '00-总入口.md') {
      router.push('/overview');
    } else {
      router.push(`/card/${encodeURIComponent(linkPath)}`);
    }
  }

  function handleEdit() {
    setEditingCardPath(filePath);
    router.push('/card/edit/existing');
  }

  const [deleting, setDeleting] = useState(false);

  async function performDelete() {
    setDeleting(true);
    try {
      await deleteFile(filePath);
      removeRecentCard(filePath);
      triggerSkeletonRefresh();
      router.back();
    } catch (e) {
      setDeleting(false);
      Alert.alert('删除失败', String(e));
    }
  }

  function handleDelete() {
    const msg = `确定要删除「${title}」吗？删除后骨架中对应节点将变回灰色。`;
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) performDelete();
    } else {
      Alert.alert('删除卡片', msg, [
        { text: '取消', style: 'cancel' },
        { text: '删除', style: 'destructive', onPress: performDelete },
      ]);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (notFound) {
    // Speed anchor: show built-in summary + options
    if (isSpeedAnchor && speedContent) {
      const { summary, textbook } = parseSpeedContent(speedContent);
      return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/skeleton')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← 返回</Text>
          </TouchableOpacity>

          <View style={styles.speedHeader}>
            <Text style={styles.speedTitle}>{title}</Text>
            <View style={styles.speedBadgeRow}>
              <Text style={styles.speedBadge}>📖 速通锚点</Text>
            </View>
          </View>

          {/* 本质概括 */}
          <View style={styles.speedSection}>
            <Text style={styles.speedSectionLabel}>本质概括</Text>
            <Text style={styles.speedSummary}>{summary}</Text>
          </View>

          {/* 课本出处 */}
          {textbook ? (
            <View style={styles.speedSection}>
              <Text style={styles.speedSectionLabel}>课本出处</Text>
              <Text style={styles.speedTextbook}>📚 {textbook}</Text>
            </View>
          ) : null}

          {/* Hint */}
          <View style={styles.speedHint}>
            <Text style={styles.speedHintText}>
              如果你已经学过这个知识点，可以直接使用系统内置的摘要内容；如果想深入理解并创建自己的卡片，可以手动填写。
            </Text>
          </View>

          {/* Action buttons */}
          <TouchableOpacity
            style={styles.speedUseBtn}
            onPress={() => {
              const prefillContent = `\n## 1. 一句话\n\n${summary}\n\n## 2. 定位\n\n系统：\n层：[]\n课程：\n\n## 3. 踩在什么上面（纵向向下）\n\n## 4. 通向哪里（纵向向上）\n\n## 5. 横向定位 — 对应哪门课、在课本哪里（考试核心）\n\n## 6. 如果现在是医生（临床反向）\n`;
              router.push({
                pathname: '/card/edit/new',
                params: { prefillTitle: title, prefillContent, cardPath: filePath },
              });
            }}
          >
            <Text style={styles.speedUseBtnText}>使用内置摘要</Text>
            <Text style={styles.speedUseBtnHint}>自动填入一句话总结</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.speedCreateBtn}
            onPress={() => router.push({
              pathname: '/card/edit/new',
              params: { prefillTitle: title, cardPath: filePath },
            })}
          >
            <Text style={styles.speedCreateBtnText}>创建新卡片</Text>
            <Text style={styles.speedCreateBtnHint}>从空白模板开始填写</Text>
          </TouchableOpacity>

          <View style={styles.bottomPad} />
        </ScrollView>
      );
    }

    // Regular not found
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundTitle}>{title}</Text>
        <Text style={styles.notFoundHint}>该卡片尚未填写</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push({
            pathname: '/card/edit/new',
            params: { prefillTitle: title, cardPath: filePath },
          })}
        >
          <Text style={styles.createBtnText}>立即填写</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lines = content.split('\n');
  // Extract system & layer from 定位 section
  let systemName = '';
  let layerName = '';
  let courseName = '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back button */}
      <TouchableOpacity onPress={() => router.replace('/(tabs)/skeleton')} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← 返回</Text>
      </TouchableOpacity>

      {/* Header card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
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
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>
              {(frontmatter.system as string) || filePath.split('/')[1] || ''}
            </Text>
          </View>
          {frontmatter.layer ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>{frontmatter.layer as string}层</Text>
            </View>
          ) : null}
          {frontmatter.filled ? (
            <View style={[styles.metaChip, styles.metaChipDate]}>
              <Text style={styles.metaTextDate}>填写于 {frontmatter.filled as string}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Render body */}
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <View key={idx} style={styles.spacer} />;

        // Skip the first # heading (already in header)
        if (trimmed.startsWith('# ') && idx === 0) return null;

        // ## headings
        if (trimmed.startsWith('## ')) {
          const heading = trimmed.replace('## ', '');
          let icon = '';
          if (heading.includes('一句话')) icon = '💡 ';
          else if (heading.includes('定位')) icon = '📍 ';
          else if (heading.includes('踩在')) icon = '⬇️ ';
          else if (heading.includes('通向')) icon = '⬆️ ';
          else if (heading.includes('哪里类似')) icon = '↔️ ';
          else if (heading.includes('如果现在是医生')) icon = '🩺 ';
          return <Text key={idx} style={styles.h2}>{icon}{heading}</Text>;
        }

        // ### sub-headings
        if (trimmed.startsWith('### ')) {
          return <Text key={idx} style={styles.h3}>{trimmed.replace('### ', '')}</Text>;
        }

        // Blockquote
        if (trimmed.startsWith('> ')) {
          return (
            <View key={idx} style={styles.quoteBox}>
              <Text style={styles.quote}>{trimmed.replace(/^>\s*/, '')}</Text>
            </View>
          );
        }

        // 定位 line: parse system/layer/course
        if (trimmed.startsWith('系统：') || trimmed.includes('系统：')) {
          const sysMatch = trimmed.match(/系统：(\S+)/);
          if (sysMatch) systemName = sysMatch[1];
          const layerMatch = trimmed.match(/层：\[(\S+)\]/);
          if (layerMatch) layerName = layerMatch[1];
          const courseMatch = trimmed.match(/课程：(\S+)/);
          if (courseMatch) courseName = courseMatch[1];

          return (
            <View key={idx} style={styles.positionRow}>
              {systemName ? <Text style={styles.posChip}>📚 {systemName}</Text> : null}
              {layerName ? <Text style={styles.posChip}>🏷 {layerName}层</Text> : null}
              {courseName ? <Text style={styles.posChip}>📖 {courseName}</Text> : null}
            </View>
          );
        }

        // Q6 sub-section lines: - 症状：, - 体征：, - 检查：, - 治疗：
        const q6Match = trimmed.match(/^-\s*(症状|体征|检查|治疗)[：:]\s*(.*)/);
        if (q6Match) {
          const tagColors: Record<string, string> = {
            '症状': '#f59e0b', '体征': '#ef4444', '检查': '#3b82f6', '治疗': '#22c55e',
          };
          const tag = q6Match[1];
          const rest = q6Match[2];
          // Parse rest for wiki links so they become tappable
          const restNodes = rest ? parseLine(rest) : [];
          return (
            <View key={idx} style={styles.q6Row}>
              <View style={[styles.q6Tag, { backgroundColor: tagColors[tag] || '#6b7280' }]}>
                <Text style={styles.q6TagText}>{tag}</Text>
              </View>
              {restNodes.length > 0 ? (
                <View style={styles.q6LinkWrap}>
                  {restNodes.map((node, ni) => {
                    if (node.isWikiLink) {
                      return (
                        <Pressable key={ni} onPress={() => handleLinkPress(node.linkPath!)}>
                          <Text style={styles.inlineLink}>[[{node.text}]]</Text>
                        </Pressable>
                      );
                    }
                    return <Text key={ni} style={styles.q6Text}>{node.text}</Text>;
                  })}
                </View>
              ) : (
                <Text style={styles.q6Text}>{rest || '(待填写)'}</Text>
              )}
            </View>
          );
        }

        // Wiki link lines — any line containing [[...]]
        if (trimmed.includes('[[')) {
          const nodes = parseLine(trimmed);
          return (
            <View key={idx} style={styles.linkLine}>
              {nodes.map((node, ni) => {
                if (node.isWikiLink) {
                  return (
                    <Pressable key={ni} onPress={() => handleLinkPress(node.linkPath!)}>
                      <Text style={styles.inlineLink}>[[{node.text}]]</Text>
                    </Pressable>
                  );
                }
                return <Text key={ni} style={styles.linkPlain}>{node.text} </Text>;
              })}
            </View>
          );
        }

        // Regular list items
        if (trimmed.startsWith('- ')) {
          return <Text key={idx} style={styles.listItem}>{trimmed}</Text>;
        }

        // Plain paragraph
        return <Text key={idx} style={styles.paragraph}>{trimmed}</Text>;
      })}

      {/* Backlinks interaction panel */}
      <View style={styles.backlinksSection}>
        <BacklinksList title={title} />
      </View>
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  notFoundTitle: { fontSize: 20, fontWeight: '700', color: '#374151' },
  notFoundHint: { fontSize: 14, color: '#9ca3af', marginTop: 8, marginBottom: 20 },
  createBtn: {
    backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
  },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Back button
  backBtn: {
    backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8,
  },
  backBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  // Header
  headerCard: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 10, flex: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8,
  },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  deleteBtn: {
    backgroundColor: 'rgba(239,68,68,0.3)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8,
  },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteBtnText: { color: '#fecaca', fontSize: 13, fontWeight: '600' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12,
  },
  metaChipDate: { backgroundColor: 'rgba(255,255,255,0.15)' },
  metaText: { fontSize: 12, color: '#bfdbfe', fontWeight: '500' },
  metaTextDate: { fontSize: 12, color: '#bfdbfe' },

  // Content
  h2: {
    fontSize: 17, fontWeight: '700', color: '#1e40af',
    marginTop: 20, marginBottom: 8,
  },
  h3: { fontSize: 15, fontWeight: '600', color: '#374151', marginTop: 14, marginBottom: 4 },
  paragraph: { fontSize: 15, color: '#374151', lineHeight: 23, marginVertical: 4 },
  spacer: { height: 8 },

  // Quote
  quoteBox: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 3, borderLeftColor: '#3b82f6',
    padding: 12, marginVertical: 6, borderRadius: 6,
  },
  quote: { fontSize: 14, color: '#374151', lineHeight: 20, fontStyle: 'italic' },

  // Position chips
  positionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
  posChip: {
    fontSize: 13, fontWeight: '600', color: '#1e40af',
    backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    overflow: 'hidden',
  },

  // Wiki links
  linkLine: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 3 },
  inlineLink: {
    fontSize: 15, color: '#2563eb', fontWeight: '600',
    lineHeight: 22,
  },
  linkPlain: { fontSize: 15, color: '#6b7280', lineHeight: 22 },

  // List
  listItem: { fontSize: 15, color: '#374151', lineHeight: 22, marginVertical: 2, paddingLeft: 8 },

  backlinksSection: {
    marginTop: 24,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  bottomPad: { height: 60 },

  // Q6 clinical reverse sub-sections
  q6Row: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 4, paddingLeft: 8 },
  q6Tag: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
    marginRight: 8, marginTop: 2,
  },
  q6TagText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  q6Text: { fontSize: 14, color: '#374151', flex: 1, lineHeight: 20 },
  q6LinkWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },

  // Speed anchor
  speedHeader: { marginBottom: 16, marginTop: 8 },
  speedTitle: { fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 8 },
  speedBadgeRow: { flexDirection: 'row' },
  speedBadge: {
    fontSize: 12, fontWeight: '700', color: '#7c3aed',
    backgroundColor: '#f3e8ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    overflow: 'hidden',
  },
  speedSection: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  speedSectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 8,
  },
  speedSummary: { fontSize: 15, color: '#1f2937', lineHeight: 24 },
  speedTextbook: { fontSize: 14, color: '#2563eb', lineHeight: 22, fontWeight: '500' },
  speedHint: {
    backgroundColor: '#fffbeb', borderRadius: 10, padding: 12, marginBottom: 16,
    borderLeftWidth: 3, borderLeftColor: '#f59e0b',
  },
  speedHintText: { fontSize: 13, color: '#92400e', lineHeight: 20 },
  speedUseBtn: {
    backgroundColor: '#7c3aed', borderRadius: 12, padding: 16, marginBottom: 10,
    alignItems: 'center',
  },
  speedUseBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  speedUseBtnHint: { fontSize: 12, color: '#ddd6fe', marginTop: 2 },
  speedCreateBtn: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#d1d5db',
  },
  speedCreateBtnText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  speedCreateBtnHint: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
});
