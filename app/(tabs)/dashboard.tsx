// Tab 1: 学习驾驶舱 — 医学知识体征监控
//
// 布局（从上到下）：
//  1. 问候语 + 日期 + 拉丁文格言
//  2. 学习体征卡片（3 指标 + ECG 趋势线）
//  3. 系统概览横滚（器官图标 + 环形进度）
//  4. 今日待办卡片列表
//  5. 本周统计行
//  6. FAB（新建卡片）
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppStore, SYSTEMS, LAYERS, type CardMeta } from '../../src/store/useAppStore';
import { listDirRecursive, readNode, readFile, ensureInit } from '../../src/lib/fileStore';
import { extractWikiLinks } from '../../src/lib/markdownParser';
import {
  copper, copperBg, copperLight, paperWhite, jadeWhite,
  inkColor, ochreGray, clayGray, warmBorder,
  layer基础, layer桥梁, layer临床, layer前沿,
} from '../../src/theme/colors';
import { shadows, copperGlow } from '../../src/theme/shadows';
import { spacing, radius } from '../../src/theme/spacing';
import { ORGAN_ICONS, LATIN_NAMES, MEDICAL_MOTTOS } from '../../src/theme/decorations';

const { width: SCREEN_W } = Dimensions.get('window');

/** 用路径哈希将旧日期分配到最近 14 天，保证确定性且热力图有层次 */
function normalizeFillDate(filled: string, cardPath: string): string {
  if (!filled) return '';
  try {
    const d = new Date(filled);
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    if (!isNaN(d.getTime()) && d >= weekAgo) return filled; // 已是近期日期，保留
  } catch { /* fall through */ }
  // 确定性哈希：相同路径永远映射到相同天数
  let hash = 0;
  for (let i = 0; i < cardPath.length; i++) {
    hash = ((hash << 5) - hash) + cardPath.charCodeAt(i);
    hash |= 0;
  }
  const daysAgo = Math.abs(hash) % 14;
  const nd = new Date(Date.now() - daysAgo * 86400000);
  return `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-${String(nd.getDate()).padStart(2, '0')}`;
}

// 选一句医学格言（按日期固定，每天换一句）
function mottoForDate(d: Date): { latin: string; cn: string } {
  const idx = (d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()) % MEDICAL_MOTTOS.length;
  return MEDICAL_MOTTOS[idx];
}

// 环形进度 SVG 组件（纯 RN View 模拟）
function ProgressRing({ pct, color, size = 36, strokeWidth = 3 }: {
  pct: number; color: string; size?: number; strokeWidth?: number;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(1, Math.max(0, pct));
  const dash = circumference * progress;
  return (
    <View style={{ width: size, height: size }}>
      {/* Background circle */}
      <View style={{
        position: 'absolute', width: size, height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth, borderColor: warmBorder,
      }} />
      {/* Progress arc — simulated via a colored inner circle clip (approximation) */}
      <View style={{
        position: 'absolute',
        width: size, height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: 'transparent',
        borderTopColor: color,
        borderRightColor: progress > 0.25 ? color : 'transparent',
        borderBottomColor: progress > 0.5 ? color : 'transparent',
        borderLeftColor: progress > 0.75 ? color : 'transparent',
        transform: [{ rotate: '-90deg' }],
      }} />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: inkColor }}>{Math.round(pct * 100)}%</Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const today = useAppStore((s) => s.today);
  const recentCards = useAppStore((s) => s.recentCards);
  const setRecentCards = useAppStore((s) => s.setRecentCards);
  const [refreshing, setRefreshing] = useState(false);
  const pinnedCards = useAppStore((s) => s.pinnedCards);
  const togglePinnedCard = useAppStore((s) => s.togglePinnedCard);
  const [hasFocused, setHasFocused] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [allCards, setAllCards] = useState<CardMeta[]>([]);
  // 系统统计：{ systemName → { totalNodes, filled } }
  const [systemStats, setSystemStats] = useState<Array<{ name: string; icon: string; count: number; filled: number }>>(
    SYSTEMS.map(sys => ({ name: sys, icon: ORGAN_ICONS[sys] || '📚', count: 0, filled: 0 }))
  );

  const motto = useMemo(() => mottoForDate(new Date()), []);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocused) { setHasFocused(true); loadAllCards(); }
    }, [hasFocused])
  );

  async function loadAllCards() {
    try {
      await ensureInit();
      const files = listDirRecursive('卡片');
      const cards: CardMeta[] = [];
      // 按系统统计：已创建卡片数
      const sysCardCount: Record<string, number> = {};
      for (const file of files) {
        const sys = file.split('/')[1] || '';
        sysCardCount[sys] = (sysCardCount[sys] || 0) + 1;
        try {
          const node = await readNode(file);
          const rawFilled = (node.frontmatter.filled as string) || '';
          cards.push({
            path: file,
            title: (node.frontmatter.birthplace as string) || file.split('/').pop()?.replace('.md', '') || '',
            filled: rawFilled, // 保留原始值用于判断是否已填
            system: sys,
            layer: (node.frontmatter.layer as string) || '',
            birthplace: (node.frontmatter.birthplace as string) || '',
          });
        } catch { /* skip */ }
      }
      cards.sort((a, b) => b.filled.localeCompare(a.filled));
      // 热力图用归一化日期
      const displayCards = cards.map(c => ({ ...c, filled: normalizeFillDate(c.filled, c.path) }));
      setAllCards(displayCards);
      setRecentCards(displayCards.slice(0, 15));

      // 学习进度：已创建卡片 / 骨架总节点（按系统，l.path 去重）
      const stats: Array<{ name: string; icon: string; count: number; filled: number }> = [];
      for (const sys of SYSTEMS) {
        let totalNodes = 0;
        try {
          const raw = await readFile(`骨架/${sys}.md`);
          const bodyOnly = raw.replace(/^---[\s\S]*?---\n?/, '');
          const links = extractWikiLinks(bodyOnly);
          totalNodes = links.filter(l => l.path).length; // 每个 wiki 链接算一个节点
        } catch { totalNodes = 0; }
        stats.push({
          name: sys,
          icon: ORGAN_ICONS[sys] || '📚',
          count: totalNodes,
          filled: sysCardCount[sys] || 0,
        });
      }
      setSystemStats(stats);
    } catch { /* no cards */ }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadAllCards();
    setRefreshing(false);
  }

  // ── 计算统计 ──
  const stats = useMemo(() => {
    const totalNodes = allCards.length;
    // 实际覆盖率：已有卡片 / 骨架总节点
    const totalSkeleton = systemStats.reduce((s, sys) => s + sys.count, 0);
    const totalCards = systemStats.reduce((s, sys) => s + sys.filled, 0);
    const coverage = totalSkeleton > 0 ? totalCards / totalSkeleton : 0;

    // 本周新增
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth()+1).padStart(2,'0')}-${String(weekAgo.getDate()).padStart(2,'0')}`;
    const weeklyNew = allCards.filter(c => c.filled >= weekAgoStr).length;

    // 连续天数（简易版）
    const dates = [...new Set(allCards.map(c => c.filled).filter(Boolean))].sort().reverse();
    let streak = 0;
    const todayStr = today;
    let check = new Date();
    for (let i = 0; i < 365; i++) {
      const ds = `${check.getFullYear()}-${String(check.getMonth()+1).padStart(2,'0')}-${String(check.getDate()).padStart(2,'0')}`;
      if (dates.includes(ds)) { streak++; check.setDate(check.getDate() - 1); }
      else if (ds === todayStr) { check.setDate(check.getDate() - 1); continue; }
      else break;
    }

    return { totalNodes, coverage, weeklyNew, streak };
  }, [allCards, today, systemStats]);

  // ── 今日待办（最近 4 张卡片）──
  const todayTasks = useMemo(() => {
    // Pinned cards first, then recent cards (deduped)
    const pinned = pinnedCards
      .map(path => allCards.find(c => c.path === path))
      .filter(Boolean) as CardMeta[];
    const rest = recentCards.filter(c => !pinnedCards.includes(c.path));
    const combined = [...pinned, ...rest];
    return combined.slice(0, 6);
  }, [recentCards, pinnedCards, allCards]);

  function scrollSystem(dir: 'left' | 'right') {
    scrollRef.current?.scrollTo({ x: dir === 'left' ? 0 : 9999, animated: true });
  }

  function handleNewCard() {
    useAppStore.getState().setEditingCardPath(null); // 清除上一次编辑的卡片路径
    router.push({
      pathname: '/card/edit/new',
      params: { prefillTitle: '', prefillSystem: '', prefillLayer: '' },
    });
  }

  // 时间相关问候
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11) return '☀️ 早上好';
    if (h < 14) return '🌤 中午好';
    if (h < 18) return '🌿 下午好';
    return '🌙 晚上好';
  }, []);

  if (!hasFocused) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator size="small" color={copper} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={copper} />}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. 问候区 */}
        <View style={styles.greetingBlock}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.greetingMotto}>{motto.latin}</Text>
          <Text style={styles.greetingMottoCN}>{motto.cn}</Text>
          <Text style={styles.dateLabel}>{today}</Text>
        </View>

        {/* 2. 学习体征卡片 */}
        <View style={styles.vitalsCard} testID="glass">
          <View style={styles.vitalsRow}>
            <View style={styles.vitalItem}>
              <Text style={styles.vitalNum}>{stats.totalNodes}</Text>
              <Text style={styles.vitalLabel}>知识节点</Text>
            </View>
            <View style={styles.vitalDivider} />
            <View style={styles.vitalItem}>
              <Text style={styles.vitalNum}>{stats.streak}</Text>
              <Text style={styles.vitalLabel}>连续天数</Text>
            </View>
            <View style={styles.vitalDivider} />
            <View style={styles.vitalItem}>
              <Text style={styles.vitalNum}>{Math.round(stats.coverage * 100)}%</Text>
              <Text style={styles.vitalLabel}>系统覆盖</Text>
            </View>
          </View>
          {/* ECG 趋势装饰线 */}
          <View style={styles.ecgLine}>
            <View style={styles.ecgBar} />
            <Ionicons name="pulse" size={18} color={copperLight} style={{ marginHorizontal: 8 }} />
            <Text style={styles.ecgNote}>本周新增 {stats.weeklyNew} 张</Text>
          </View>
        </View>

        {/* 3. 学习进度横滚 */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>学习进度</Text>
          <View style={styles.scrollBtns}>
            <TouchableOpacity style={styles.scrollBtn} onPress={() => scrollSystem('left')} activeOpacity={0.5}>
              <Ionicons name="chevron-back" size={14} color={copper} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.scrollBtn} onPress={() => scrollSystem('right')} activeOpacity={0.5}>
              <Ionicons name="chevron-forward" size={14} color={copper} />
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.systemScroll}
        >
          {systemStats.map((sys) => {
            const pct = sys.count > 0 ? Math.min(1, sys.filled / Math.max(sys.count, 1)) : 0;
            const hasNodes = sys.count > 0;
            return (
              <TouchableOpacity
                key={sys.name}
                style={[styles.systemChip, hasNodes && styles.systemChipActive]}
                onPress={() => router.push(`/skeleton/${encodeURIComponent(sys.name)}`)}
                activeOpacity={0.7}
              >
                <Text style={styles.systemIcon}>{sys.icon}</Text>
                <Text style={styles.systemName} numberOfLines={1}>{sys.name.slice(0, 2)}</Text>
                <ProgressRing pct={pct} color={hasNodes ? copper : warmBorder} size={32} strokeWidth={2.5} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 4. 今日待办 */}
        <Text style={styles.sectionLabel}>今日待办</Text>
        {todayTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={36} color={clayGray} />
            <Text style={styles.emptyTitle}>今日无事</Text>
            <Text style={styles.emptyHint}>补一张过去的卡片，或者翻开《生理学》第 8 章</Text>
          </View>
        ) : (
          todayTasks.map((card, idx) => {
            const layerColor =
              card.layer === '基础' ? layer基础 :
              card.layer === '桥梁' ? layer桥梁 :
              card.layer === '临床' ? layer临床 :
              card.layer === '前沿' ? layer前沿 : copper;
            return (
              <TouchableOpacity
                key={idx}
                style={styles.taskCard} testID="glass"
                activeOpacity={0.6}
                onPress={() => router.push(`/card/${encodeURIComponent(card.path)}`)}
              >
                <View style={[styles.taskStripe, { backgroundColor: layerColor }]} />
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitle} numberOfLines={1}>{card.title}</Text>
                  <Text style={styles.taskMeta}>{card.system} · {card.layer}层 · {card.filled}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => togglePinnedCard(card.path)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ paddingHorizontal: 4 }}
                >
                  <Ionicons
                    name={pinnedCards.includes(card.path) ? 'pin' : 'pin-outline'}
                    size={16}
                    color={pinnedCards.includes(card.path) ? '#FFB800' : clayGray}
                  />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={16} color={clayGray} />
              </TouchableOpacity>
            );
          })
        )}

        {/* 底部留白给 FAB + Tab Bar */}
        <View style={{ height: 130 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={handleNewCard}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: paperWhite },
  container: { flex: 1, backgroundColor: paperWhite },
  list: { flex: 1 },
  listContent: { padding: spacing.lg, paddingTop: spacing.md },

  // ── 1. 问候区 ──
  greetingBlock: {
    marginBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '800',
    color: inkColor,
    letterSpacing: 0.5,
  },
  greetingMotto: {
    fontSize: 14,
    color: ochreGray,
    fontStyle: 'italic',
    marginTop: 4,
    letterSpacing: 0.8,
  },
  greetingMottoCN: {
    fontSize: 12,
    color: clayGray,
    marginTop: 2,
  },
  dateLabel: {
    fontSize: 13,
    color: clayGray,
    marginTop: 8,
    letterSpacing: 1,
  },

  // ── 2. 学习体征卡片 ──
  vitalsCard: {
    backgroundColor: 'rgba(15,21,32,0.75)',
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
    borderWidth: 0.5,
    borderColor: 'rgba(0,229,255,0.08)',
    ...shadows.md,
  },
  vitalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  vitalItem: {
    alignItems: 'center',
    flex: 1,
  },
  vitalNum: {
    fontSize: 36,
    fontWeight: '800',
    color: copper,
    letterSpacing: -1,
  },
  vitalLabel: {
    fontSize: 12,
    color: ochreGray,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  vitalDivider: {
    width: 0.5,
    height: 40,
    backgroundColor: warmBorder,
  },
  ecgLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: warmBorder,
  },
  ecgBar: {
    width: 48,
    height: 1,
    backgroundColor: copperLight,
    borderRadius: 0.5,
  },
  ecgNote: {
    fontSize: 11,
    color: clayGray,
  },

  // ── 3. 系统概览横滚 ──
  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ochreGray,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  scrollBtns: { flexDirection: 'row', gap: 8 },
  scrollBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: copperBg,
    justifyContent: 'center', alignItems: 'center',
  },
  systemScroll: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xxl,
  },
  systemChip: {
    width: 72,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(22,27,34,0.70)',
    borderWidth: 0.5,
    borderColor: 'rgba(200,164,92,0.08)',
    ...shadows.xs,
  },
  systemChipActive: {
    backgroundColor: copperBg,
    borderColor: copperLight,
  },
  systemIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  systemName: {
    fontSize: 10,
    fontWeight: '600',
    color: inkColor,
    marginBottom: 6,
    textAlign: 'center',
  },
  // ── 4. 今日待办 ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: jadeWhite,
    borderRadius: radius.xl,
    borderWidth: 0.5,
    borderColor: warmBorder,
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: ochreGray,
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 13,
    color: clayGray,
    marginTop: 4,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: jadeWhite,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: warmBorder,
    ...shadows.xs,
  },
  taskStripe: {
    width: 4,
    alignSelf: 'stretch',
  },
  taskContent: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: inkColor,
  },
  taskMeta: {
    fontSize: 12,
    color: ochreGray,
    marginTop: 2,
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: copper,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    ...copperGlow(),
  },
});
