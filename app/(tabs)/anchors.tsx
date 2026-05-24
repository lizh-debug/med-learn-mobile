// Tab 3: Clinical anchors - dynamically loaded from filesystem
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, ANCHOR_CATEGORIES } from '../../src/store/useAppStore';
import { listDir } from '../../src/lib/fileStore';
import AnchorGrid from '../../src/components/AnchorGrid';

type Category = '症状' | '体征' | '检查异常';
const CATEGORIES: Category[] = ['症状', '体征', '检查异常'];

export default function AnchorsScreen() {
  const anchorCategory = useAppStore((s) => s.anchorCategory);
  const setAnchorCategory = useAppStore((s) => s.setAnchorCategory);
  const [anchors, setAnchors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnchors();
  }, []);

  function loadAnchors() {
    setLoading(true);
    const result: Record<string, string[]> = {};
    for (const cat of CATEGORIES) {
      const files = listDir(`临床锚点/${cat}`);
      result[cat] = files
        .map(f => f.split('/').pop()?.replace('.md', '') || '')
        .filter(Boolean);
      // Fallback to hardcoded list if no files found
      if (result[cat].length === 0) {
        result[cat] = [...ANCHOR_CATEGORIES[cat]];
      }
    }
    setAnchors(result);
    setLoading(false);
  }

  // Refresh anchors when returning from creating a new one
  const refreshKey = useAppStore((s) => s.skeletonRefreshKey);
  useEffect(() => {
    loadAnchors();
  }, [refreshKey]);

  const currentAnchors = anchors[anchorCategory] || ANCHOR_CATEGORIES[anchorCategory];

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Category tabs */}
      <View style={styles.tabBar}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.tab, anchorCategory === cat && styles.tabActive]}
            onPress={() => setAnchorCategory(cat)}
          >
            <Text style={[styles.tabText, anchorCategory === cat && styles.tabTextActive]}>
              {cat}
            </Text>
            <Text style={[styles.tabCount, anchorCategory === cat && styles.tabCountActive]}>
              ({(anchors[cat] || []).length})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Anchor grid */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>
          {anchorCategory === '症状' && '常见症状，从症状反查疾病'}
          {anchorCategory === '体征' && '体征线索，从查体定位系统'}
          {anchorCategory === '检查异常' && '检查异常，从化验倒推病生'}
        </Text>
        <AnchorGrid anchors={currentAnchors} category={anchorCategory} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 4,
  },
  tabActive: { backgroundColor: '#2563eb' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  tabCount: { fontSize: 13, color: '#9ca3af', marginLeft: 4 },
  tabCountActive: { color: '#bfdbfe' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  subtitle: { fontSize: 13, color: '#9ca3af', textAlign: 'center', marginBottom: 16 },
});
