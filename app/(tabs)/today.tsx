// Tab 2: Today - daily card fill entry
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, type CardMeta } from '../../src/store/useAppStore';
import { listDirRecursive, readNode, ensureInit } from '../../src/lib/fileStore';

export default function TodayScreen() {
  const router = useRouter();
  const today = useAppStore((s) => s.today);
  const recentCards = useAppStore((s) => s.recentCards);
  const setRecentCards = useAppStore((s) => s.setRecentCards);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRecentCards();
  }, []);

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

  return (
    <View style={styles.container}>
      {/* Date header */}
      <View style={styles.dateBanner}>
        <Text style={styles.dateText}>{today}</Text>
        <Text style={styles.quoteText}>今天学了什么？</Text>
      </View>

      {/* Recent cards */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {recentCards.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>还没有卡片</Text>
            <Text style={styles.emptyHint}>点击下方按钮，填第一张日结卡片</Text>
          </View>
        ) : (
          recentCards.map((card, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.cardRow}
              onPress={() => router.push(`/card/${encodeURIComponent(card.path)}`)}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardMeta}>{card.system} · {card.filled}</Text>
              </View>
              <Text style={styles.cardArrow}>→</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* FAB button */}
      <TouchableOpacity style={styles.fab} onPress={handleNewCard}>
        <Text style={styles.fabText}>+ 填一张卡片</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  dateBanner: {
    backgroundColor: '#2563eb',
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  dateText: { fontSize: 14, color: '#bfdbfe', fontWeight: '500' },
  quoteText: { fontSize: 22, color: '#fff', fontWeight: '800', marginTop: 4 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 90 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  emptyHint: { fontSize: 14, color: '#9ca3af', marginTop: 4 },
  cardRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  cardMeta: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  cardArrow: { fontSize: 18, color: '#d1d5db' },
  fab: {
    position: 'absolute', bottom: 24, left: 24, right: 24,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#2563eb', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
