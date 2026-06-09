// Card reading view - renders markdown with tappable [[wiki links]]
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Pressable, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { readNode, deleteFile, ensureInit } from '../lib/fileStore';
import { parseLine, extractWikiLinks } from '../lib/markdownParser';
import { useAppStore } from '../store/useAppStore';
import BacklinksList from './BacklinksList';
import MarkdownTable from './MarkdownTable';

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

export default React.memo(function CardView({ filePath, isSpeedAnchor, speedContent }: Props) {
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

  const { lines, tableSkipIdx, tableRowsAt } = useMemo(() => {
    const lines = content.split('\n');
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
    return { lines, tableSkipIdx, tableRowsAt };
  }, [content]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00E5FF" />
      </View>
    );
  }

  if (notFound) {
    // Speed anchor: show built-in summary + options
    if (isSpeedAnchor && speedContent) {
      const { summary, textbook } = parseSpeedContent(speedContent);
      return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

  // Extract system & layer from 定位 section
  let systemName = '';
  let layerName = '';
  let courseName = '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => { if (router.canGoBack()) router.back(); else router.push('/(tabs)/dashboard'); }} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← 返回</Text>
      </TouchableOpacity>
      {/* Header card */}
      <View style={styles.headerCard} testID="glass">
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
        // Table rendering — skip non-start rows, render group at start
        if (tableSkipIdx.has(idx)) return null;
        if (tableRowsAt.has(idx)) {
          const rows = tableRowsAt.get(idx)!;
          if (rows.length >= 2) {
            return <MarkdownTable key={idx} rows={rows} />;
          }
          // Single | line isn't a table, render as paragraph below
        }

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
            '症状': '#FFB800', '体征': '#FF3D71', '检查': '#00E5FF', '治疗': '#00FF88',
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
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080B12' },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: '#080B12' },
  notFoundTitle: { fontSize: 20, fontWeight: '700', color: '#E8EDF5', marginTop: 8 },
  notFoundHint: { fontSize: 15, color: '#8E9DB5', marginTop: 8, marginBottom: 24 },
  createBtn: {
    backgroundColor: '#00E5FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
    shadowColor: '#00E5FF', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6,
  },
  createBtnText: { color: '#080B12', fontSize: 16, fontWeight: '700' },

  backBtn: {
    paddingHorizontal: 0, paddingVertical: 8, alignSelf: 'flex-start', marginBottom: 4,
  },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#00E5FF' },

  // Header — dark glass card with neon accent
  headerCard: {
    backgroundColor: '#0F1520',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#00E5FF',
    borderWidth: 0.5,
    borderColor: 'rgba(0,229,255,0.12)',
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 12, flex: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    backgroundColor: 'rgba(0,229,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 0.5, borderColor: 'rgba(0,229,255,0.3)',
  },
  editBtnText: { color: '#00E5FF', fontSize: 13, fontWeight: '600' },
  deleteBtn: {
    backgroundColor: 'rgba(255,61,113,0.15)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 0.5, borderColor: 'rgba(255,61,113,0.3)',
  },
  deleteBtnDisabled: { opacity: 0.4 },
  deleteBtnText: { color: '#FF3D71', fontSize: 13, fontWeight: '600' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: {
    backgroundColor: 'rgba(0,229,255,0.08)',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12,
    borderWidth: 0.5, borderColor: 'rgba(0,229,255,0.15)',
  },
  metaChipDate: { backgroundColor: 'rgba(255,255,255,0.05)' },
  metaText: { fontSize: 12, color: '#8E9DB5', fontWeight: '500' },
  metaTextDate: { fontSize: 12, color: '#5A6980' },

  // Content
  h2: {
    fontSize: 20, fontWeight: '700', color: '#00E5FF',
    marginTop: 24, marginBottom: 10,
  },
  h3: { fontSize: 17, fontWeight: '600', color: '#E8EDF5', marginTop: 16, marginBottom: 6 },
  paragraph: { fontSize: 17, color: '#E8EDF5', lineHeight: 24, marginVertical: 4 },
  spacer: { height: 10 },

  // Quote — dark glass with cyan left stripe
  quoteBox: {
    backgroundColor: 'rgba(0,229,255,0.06)',
    borderLeftWidth: 3, borderLeftColor: '#00E5FF',
    padding: 12, marginVertical: 6, borderRadius: 8,
  },
  quote: { fontSize: 15, color: '#E8EDF5', lineHeight: 22, fontStyle: 'italic' },

  // Position chips
  positionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 },
  posChip: {
    fontSize: 13, fontWeight: '600', color: '#00E5FF',
    backgroundColor: 'rgba(0,229,255,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    overflow: 'hidden',
  },

  // Wiki links
  linkLine: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 3 },
  inlineLink: {
    fontSize: 17, color: '#00E5FF', fontWeight: '600',
    lineHeight: 24,
  },
  linkPlain: { fontSize: 17, color: '#8E9DB5', lineHeight: 24 },

  // List
  listItem: { fontSize: 17, color: '#E8EDF5', lineHeight: 24, marginVertical: 2, paddingLeft: 8 },

  backlinksSection: {
    marginTop: 28,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,229,255,0.10)',
    paddingTop: 16,
  },
  bottomPad: { height: 120 },

  // Q6 clinical tags
  q6Row: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 5, paddingLeft: 8 },
  q6Tag: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6,
    marginRight: 10, marginTop: 2,
  },
  q6TagText: { fontSize: 12, fontWeight: '700', color: '#080B12' },
  q6Text: { fontSize: 15, color: '#E8EDF5', flex: 1, lineHeight: 22 },
  q6LinkWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },

  // Speed anchor
  speedHeader: { marginBottom: 20, marginTop: 12 },
  speedTitle: { fontSize: 22, fontWeight: '700', color: '#E8EDF5', marginBottom: 8 },
  speedBadgeRow: { flexDirection: 'row' },
  speedBadge: {
    fontSize: 13, fontWeight: '700', color: '#A855F7',
    backgroundColor: 'rgba(168,85,247,0.12)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8,
    overflow: 'hidden',
  },
  speedSection: {
    backgroundColor: '#0F1520', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 0.5, borderColor: 'rgba(0,229,255,0.08)',
  },
  speedSectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#5A6980', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 8,
  },
  speedSummary: { fontSize: 17, color: '#E8EDF5', lineHeight: 24 },
  speedTextbook: { fontSize: 15, color: '#00E5FF', lineHeight: 22, fontWeight: '500' },
  speedHint: {
    backgroundColor: 'rgba(255,184,0,0.08)', borderRadius: 12, padding: 14, marginBottom: 16,
    borderLeftWidth: 3, borderLeftColor: '#FFB800',
  },
  speedHintText: { fontSize: 14, color: '#FFB800', lineHeight: 20 },
  speedUseBtn: {
    backgroundColor: '#00E5FF', borderRadius: 12, padding: 16, marginBottom: 10,
    alignItems: 'center',
  },
  speedUseBtnText: { fontSize: 16, fontWeight: '700', color: '#080B12' },
  speedUseBtnHint: { fontSize: 13, color: 'rgba(8,11,18,0.6)', marginTop: 2 },
  speedCreateBtn: {
    backgroundColor: 'rgba(0,229,255,0.06)', borderRadius: 12, padding: 16, marginBottom: 10,
    alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(0,229,255,0.15)',
  },
  speedCreateBtnText: { fontSize: 16, fontWeight: '600', color: '#E8EDF5' },
  speedCreateBtnHint: { fontSize: 13, color: '#5A6980', marginTop: 2 },
});
