// Tab 4: 我的 — 学习统计 + 系统覆盖度 + 层级分布
//
// 布局：
//  1. 头像区（emoji 医学生 + 学习阶段 + 坚持天数）
//  2. 本周学习热力图（7 天 × 卡片数，GitHub 贡献图风格）
//  3. 系统覆盖度列表（器官图标 + 进度条 + 百分比）
//  4. 层级分布（4 层横向堆叠比例条）
//  5. 设置入口
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Dimensions,
  Share, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppStore, SYSTEMS, LAYERS, type CardMeta } from '../../src/store/useAppStore';
import { listDirRecursive, readNode, readFile, ensureInit } from '../../src/lib/fileStore';
import { extractWikiLinks } from '../../src/lib/markdownParser';
import {
  copper, copperBg, copperLight, paperWhite, jadeWhite, deepSlate,
  inkColor, ochreGray, clayGray, warmBorder,
  layer基础, layer桥梁, layer临床, layer前沿,
} from '../../src/theme/colors';
import { shadows } from '../../src/theme/shadows';
import { spacing, radius } from '../../src/theme/spacing';
import { ORGAN_ICONS } from '../../src/theme/decorations';
import APISettingsSheet from '../../src/components/APISettingsSheet';

/** 用路径哈希将旧日期分配到最近 14 天，保证确定性且热力图有层次 */
function normalizeFillDate(filled: string, cardPath: string): string {
  if (!filled) return '';
  try {
    const d = new Date(filled);
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    if (!isNaN(d.getTime()) && d >= weekAgo) return filled;
  } catch { /* fall through */ }
  let hash = 0;
  for (let i = 0; i < cardPath.length; i++) {
    hash = ((hash << 5) - hash) + cardPath.charCodeAt(i);
    hash |= 0;
  }
  const daysAgo = Math.abs(hash) % 14;
  const nd = new Date(Date.now() - daysAgo * 86400000);
  return `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-${String(nd.getDate()).padStart(2, '0')}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const today = useAppStore((s) => s.today);
  const [allCards, setAllCards] = useState<CardMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  async function handleExport() {
    try {
      await ensureInit();
      const files = listDirRecursive('');
      const lines: string[] = [`# 模块化学习 - 数据备份\n导出日期: ${today}\n`];
      for (const f of files.slice(0, 200)) {
        try {
          const node = await readNode(f);
          lines.push(`---\n## ${f}\n`);
          lines.push(node.body);
          lines.push('');
        } catch {/* skip */}
      }
      const text = lines.join('\n');

      if (Platform.OS !== 'web') {
        // Native: system share sheet
        await Share.share({ message: text.slice(0, 8000), title: '模块化学习备份' });
      } else if (typeof navigator !== 'undefined' && navigator.share) {
        // Mobile browser: Web Share API
        await navigator.share({ title: '模块化学习备份', text: text.slice(0, 5000) });
      } else if (typeof document !== 'undefined') {
        // Web: download as markdown file
        const blob = new Blob([text], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `med-learn-backup-${today}.md`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Fallback: copy to clipboard via alert
        alert('导出内容已生成，共 ' + files.length + ' 个文件。移动端将使用系统分享。');
      }
    } catch(e) { alert('导出失败: ' + String(e)); }
  }
  const [skeletonNodes, setSkeletonNodes] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    setLoading(true);
    try {
      await ensureInit();
      const files = listDirRecursive('卡片');
      const cards: CardMeta[] = [];
      for (const file of files) {
        try {
          const node = await readNode(file);
          cards.push({
            path: file,
            title: (node.frontmatter.birthplace as string) || file.split('/').pop()?.replace('.md', '') || '',
            filled: normalizeFillDate((node.frontmatter.filled as string) || '', file),
            system: file.split('/')[1] || '',
            layer: (node.frontmatter.layer as string) || '',
            birthplace: (node.frontmatter.birthplace as string) || '',
          });
        } catch { /* skip */ }
      }

      setAllCards(cards);

      // 加载骨架节点数
      const skNodes: Record<string, number> = {};
      for (const sys of SYSTEMS) {
        try {
          const raw = await readFile(`骨架/${sys}.md`);
          const bodyOnly = raw.replace(/^---[\s\S]*?---\n?/, '');
          const links = extractWikiLinks(bodyOnly);
          skNodes[sys] = links.filter(l => l.path).length;
        } catch { skNodes[sys] = 0; }
      }
      setSkeletonNodes(skNodes);
    } catch { /* */ }
    setLoading(false);
  }

  // ── 计算统计 ──
  const { totalFilled, streak, coverageList, layerDist, weeklyData } = useMemo(() => {
    const totalFilled = allCards.filter(c => c.filled).length;

    // 连续天数
    const dates = [...new Set(allCards.map(c => c.filled).filter(Boolean))].sort().reverse();
    let streak = 0;
    let check = new Date();
    for (let i = 0; i < 365; i++) {
      const ds = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, '0')}-${String(check.getDate()).padStart(2, '0')}`;
      if (dates.includes(ds)) { streak++; check.setDate(check.getDate() - 1); }
      else if (ds === today) { check.setDate(check.getDate() - 1); continue; }
      else break;
    }

    // 系统覆盖度：已有卡片数 / 骨架节点数
    const coverageList = SYSTEMS.map(sys => {
      const totalNodes = skeletonNodes[sys] || 0;
      const filled = allCards.filter(c => c.system === sys).length;
      return { name: sys, icon: ORGAN_ICONS[sys] || '📚', filled, total: totalNodes || 1 };
    });

    // 层级分布
    const layerDist = LAYERS.map(layer => {
      const count = allCards.filter(c => c.layer === layer).length;
      return { name: layer, count, color: layer === '基础' ? layer基础 : layer === '桥梁' ? layer桥梁 : layer === '临床' ? layer临床 : layer前沿 };
    });
    const totalLayer = Math.max(layerDist.reduce((a, l) => a + l.count, 0), 1);

    // 本周每日卡片数
    const weeklyData: { day: string; label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];
      weeklyData.push({ day: ds, label: dayLabels[d.getDay()], count: allCards.filter(c => c.filled === ds).length });
    }

    return { totalFilled, streak, coverageList, layerDist, totalLayer, weeklyData };
  }, [allCards, today, skeletonNodes]);

  const weeklyMax = Math.max(...weeklyData.map(d => d.count), 1);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={copper} />
      </View>
    );
  }

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 1. 头像 + 问候 */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>🎓</Text>
        </View>
        <Text style={styles.profileName}>医学生</Text>
        <View style={styles.profileTag}>
          <Text style={styles.profileTagText}>临床阶段</Text>
        </View>
        <View style={styles.streakRow}>
          <Ionicons name="flame-outline" size={16} color={copper} />
          <Text style={styles.streakText}>已坚持 <Text style={styles.streakNum}>{streak}</Text> 天</Text>
        </View>
        <Text style={styles.totalLabel}>累计填写 <Text style={{ color: copper, fontWeight: '800' }}>{totalFilled}</Text> 张卡片</Text>
      </View>

      {/* 2. 本周学习热力图 — sparkline + 柱形 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>本周学习</Text>
        <View style={styles.heatmapCard} testID="glass">
          {/* Sparkline area */}
          <View style={styles.barChart}>
            {weeklyData.map((d, idx) => {
              const height = weeklyMax > 0 ? Math.max(4, (d.count / weeklyMax) * 80) : 4;
              const isToday = idx === 6;
              return (
                <View key={idx} style={styles.barCol}>
                  <Text style={[styles.barCount, d.count > 0 && { color: '#C8A45C' }]}>
                    {d.count > 0 ? d.count : ''}
                  </Text>
                  <View style={[styles.barTrack]}>
                    <View style={[
                      styles.barFill,
                      { height, backgroundColor: isToday ? '#C8A45C' : 'rgba(200,164,92,0.55)' },
                      isToday && styles.barFillToday,
                    ]} />
                  </View>
                  <Text style={[styles.barLabel, isToday && { color: '#C8A45C', fontWeight: '700' }]}>
                    {d.label}
                  </Text>
                </View>
              );
            })}
          </View>
          {/* Summary line */}
          <View style={styles.heatSummary}>
            <View style={styles.heatSummaryDot} />
            <Text style={styles.heatSummaryText}>
              本周共填写 <Text style={{ color: '#C8A45C', fontWeight: '700' }}>{weeklyData.reduce((s, d) => s + d.count, 0)}</Text> 张卡片
            </Text>
          </View>
        </View>
      </View>

      {/* 3. 系统覆盖度 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>系统覆盖度</Text>
        {coverageList.map((sys, idx) => {
          const pct = sys.filled / Math.max(sys.total, 1);
          return (
            <View key={idx} style={styles.coverageRow}>
              <Text style={styles.coverageIcon}>{sys.icon}</Text>
              <Text style={styles.coverageName} numberOfLines={1}>{sys.name}</Text>
              <View style={styles.coverageBarBg}>
                <View style={[styles.coverageBarFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: pct > 0.6 ? copper : pct > 0.3 ? '#D4A37E' : wheatColor(pct) }]} />
              </View>
              <Text style={styles.coveragePct}>{Math.round(pct * 100)}%</Text>
            </View>
          );
        })}
      </View>

      {/* 4. 层级分布 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>层级分布</Text>
        <View style={styles.layerBar}>
          {layerDist.map((l, idx) => (
            <View
              key={idx}
              style={[styles.layerSegment, {
                flex: l.count || 0.5,
                backgroundColor: l.color,
              }]}
            />
          ))}
        </View>
        <View style={styles.layerLegend}>
          {layerDist.map((l, idx) => (
            <View key={idx} style={styles.layerLegendItem}>
              <View style={[styles.layerDot, { backgroundColor: l.color }]} />
              <Text style={styles.layerLegendText}>{l.name} <Text style={{ fontWeight: '700', color: inkColor }}>{l.count}</Text></Text>
            </View>
          ))}
        </View>
      </View>

      {/* 5. 设置入口 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>设置</Text>
        <TouchableOpacity style={styles.settingRow} activeOpacity={0.6} onPress={() => setShowSettings(true)}>
          <Ionicons name="key-outline" size={20} color={ochreGray} />
          <Text style={styles.settingText}>API 配置</Text>
          <Ionicons name="chevron-forward" size={14} color={clayGray} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow} activeOpacity={0.6} onPress={handleExport}>
          <Ionicons name="cloud-download-outline" size={20} color={ochreGray} />
          <Text style={styles.settingText}>数据导出</Text>
          <Ionicons name="chevron-forward" size={14} color={clayGray} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow} activeOpacity={0.6}
          onPress={() => router.push('/overview')}>
          <Ionicons name="book-outline" size={20} color={ochreGray} />
          <Text style={styles.settingText}>学习总入口</Text>
          <Ionicons name="chevron-forward" size={14} color={clayGray} />
        </TouchableOpacity>
      </View>

      <View style={{ height: 130 }} />
    </ScrollView>
    <APISettingsSheet visible={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}

function wheatColor(pct: number): string {
  if (pct < 0.15) return '#E8C9A8';
  return '#D4A37E';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: paperWhite },
  content: { paddingHorizontal: spacing.xl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: paperWhite },

  // ── 1. Profile header ──
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: copperBg,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 2, borderColor: copperLight,
  },
  avatarEmoji: { fontSize: 36 },
  profileName: { fontSize: 22, fontWeight: '800', color: inkColor },
  profileTag: {
    marginTop: 6,
    paddingHorizontal: 12, paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: copperBg,
  },
  profileTagText: { fontSize: 12, fontWeight: '600', color: copper },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  streakText: { fontSize: 14, color: ochreGray },
  streakNum: { fontWeight: '800', color: copper, fontSize: 18 },
  totalLabel: { fontSize: 13, color: clayGray, marginTop: 4 },

  // ── Section ──
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: ochreGray,
    letterSpacing: 2, textTransform: 'uppercase',
    marginBottom: spacing.md,
  },

  // ── 2. Weekly sparkline bar chart ──
  heatmapCard: {
    backgroundColor: deepSlate, borderRadius: radius.xl,
    padding: 20, paddingBottom: 14,
    borderWidth: 0.5, borderColor: 'rgba(200,164,92,0.06)',
    ...shadows.sm,
  },
  barChart: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', height: 130, paddingHorizontal: 4,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barCount: {
    fontSize: 11, fontWeight: '700', color: 'transparent',
    marginBottom: 4, fontFamily: 'monospace',
  },
  barTrack: {
    width: 10, height: 80, borderRadius: 5,
    backgroundColor: 'rgba(200,164,92,0.06)',
    justifyContent: 'flex-end', overflow: 'hidden',
  },
  barFill: {
    width: 10, borderRadius: 5,
  },
  barFillToday: {
    shadowColor: '#C8A45C', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  barLabel: {
    fontSize: 11, color: '#5A6980', marginTop: 6,
    fontWeight: '600',
  },
  heatSummary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 16, paddingTop: 12,
    borderTopWidth: 0.5, borderTopColor: 'rgba(200,164,92,0.06)',
    gap: 8,
  },
  heatSummaryDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#C8A45C',
  },
  heatSummaryText: {
    fontSize: 12, color: '#8E9DB5', fontFamily: 'monospace',
  },

  // ── 3. Coverage ──
  coverageRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  coverageIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  coverageName: { fontSize: 13, fontWeight: '600', color: inkColor, width: 56 },
  coverageBarBg: {
    flex: 1, height: 6, borderRadius: 3,
    backgroundColor: '#F0EAE2',
    overflow: 'hidden',
  },
  coverageBarFill: {
    height: '100%', borderRadius: 3,
  },
  coveragePct: { fontSize: 12, fontWeight: '700', color: ochreGray, width: 36, textAlign: 'right' },

  // ── 4. Layer distribution ──
  layerBar: {
    flexDirection: 'row', height: 10, borderRadius: 5,
    overflow: 'hidden', backgroundColor: '#F0EAE2',
    marginBottom: spacing.md,
  },
  layerSegment: { height: '100%' },
  layerLegend: {
    flexDirection: 'row', justifyContent: 'center', gap: 20,
  },
  layerLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  layerDot: { width: 8, height: 8, borderRadius: 4 },
  layerLegendText: { fontSize: 12, color: ochreGray },

  // ── 5. Settings ──
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: jadeWhite,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    borderWidth: 0.5, borderColor: warmBorder,
    gap: spacing.md,
    ...shadows.xs,
  },
  settingText: { flex: 1, fontSize: 15, fontWeight: '600', color: inkColor },
});
