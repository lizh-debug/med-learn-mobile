// Tab 2: Today — 暖铜学术每日卡片
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppStore, type CardMeta } from '../../src/store/useAppStore';
import { listDirRecursive, readNode, ensureInit } from '../../src/lib/fileStore';
import { copper, copperBg, paperWhite, jadeWhite, inkColor, ochreGray, clayGray } from '../../src/theme/colors';
import { shadows, fabShadow } from '../../src/theme/shadows';
import { spacing, radius } from '../../src/theme/spacing';

export default function TodayScreen() {
  const router = useRouter();
  const today = useAppStore((s) => s.today);
  const recentCards = useAppStore((s) => s.recentCards);
  const setRecentCards = useAppStore((s) => s.setRecentCards);
  const [refreshing, setRefreshing] = useState(false);
  const [hasFocused, setHasFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocused) {
        setHasFocused(true);
        loadRecentCards();
      }
    }, [hasFocused])
  );

  async function loadRecentCards() {
    try {
      await ensureInit();
      const files = listDirRecursive('卡片');
      const cards: CardMeta[] = [];
      for (const file of files.slice(-20)) {
        try {
          const node = await readNode(file);
          const filled = (node.frontmatter.filled as string) || '';
          cards.push({
            path: file,
            title: (node.frontmatter.birthplace as string) || file.split('/').pop()?.replace('.md', '') || '',
            filled,
            system: file.split('/')[1] || '',
            layer: (node.frontmatter.layer as string) || '',
            birthplace: (node.frontmatter.birthplace as string) || '',
          });
        } catch { /* skip */ }
      }
      cards.sort((a, b) => b.filled.localeCompare(a.filled));
      setRecentCards(cards.slice(0, 15));
    } catch { /* no cards yet */ }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadRecentCards();
    setRefreshing(false);
  }

  function handleNewCard() {
    router.push({
      pathname: '/card/edit/new',
      params: { prefillTitle: '', prefillSystem: '', prefillLayer: '' },
    });
  }

  if (!hasFocused) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator size="small" color={copper} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.largeTitle}>今天学了什么？</Text>
        <Text style={styles.dateLabel}>{today}</Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={copper} />}
      >
        {recentCards.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyRing}>
              <View style={styles.emptyRingInner}>
                <Ionicons name="sparkles-outline" size={36} color={copper} />
              </View>
            </View>
            <Text style={styles.emptyTitle}>从这里开始记录你的学习轨迹</Text>
            <Text style={styles.emptyHint}>点击下方 + 按钮，创建第一张知识卡片</Text>
          </View>
        ) : (
          recentCards.map((card, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.cardRow}
              activeOpacity={0.7}
              onPress={() => router.push(`/card/${encodeURIComponent(card.path)}`)}
            >
              {/* Left gradient accent line */}
              <View style={styles.cardAccent} />
              <View style={styles.cardLeft}>
                <Text style={styles.cardTitle} numberOfLines={1}>{card.title}</Text>
                <Text style={styles.cardMeta}>{card.system} · {card.filled}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={clayGray} />
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Copper FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={handleNewCard}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: paperWhite },
  container: { flex: 1, backgroundColor: paperWhite },
  // ── Header ──
  header: {
    backgroundColor: jadeWhite,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(200,134,93,0.1)',
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: inkColor,
    lineHeight: 41,
    letterSpacing: 0.37,
  },
  dateLabel: {
    fontSize: 15,
    color: ochreGray,
    marginTop: 4,
  },
  // ── Card list ──
  list: { flex: 1 },
  listContent: { padding: spacing.lg },
  // ── Empty state ──
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyRing: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: copperBg,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  emptyRingInner: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: jadeWhite,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: inkColor,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 15,
    color: ochreGray,
  },
  // ── Card row with accent ──
  cardRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: jadeWhite,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardAccent: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: copper,
    opacity: 0.5,
  },
  cardLeft: { flex: 1, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg },
  cardTitle: { fontSize: 17, fontWeight: '600', color: inkColor },
  cardMeta: { fontSize: 13, color: ochreGray, marginTop: 4 },
  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: copper,
    justifyContent: 'center',
    alignItems: 'center',
    ...fabShadow(),
  },
});
