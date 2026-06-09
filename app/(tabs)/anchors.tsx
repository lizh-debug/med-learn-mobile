// Tab 3: Clinical anchors — 暖铜学术分段控制
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppStore, ANCHOR_CATEGORIES } from '../../src/store/useAppStore';
import { listDir } from '../../src/lib/fileStore';
import { copper, copperBg, paperWhite, jadeWhite, inkColor, ochreGray, clayGray, warmBorder } from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { shadows } from '../../src/theme/shadows';
import AnchorGrid from '../../src/components/AnchorGrid';

type Category = '症状' | '体征' | '检查异常';
const CATEGORIES: Category[] = ['症状', '体征', '检查异常'];

export default function AnchorsScreen() {
  const anchorCategory = useAppStore((s) => s.anchorCategory);
  const setAnchorCategory = useAppStore((s) => s.setAnchorCategory);
  const [anchors, setAnchors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [hasFocused, setHasFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocused) {
        setHasFocused(true);
        loadAnchors();
      }
    }, [hasFocused])
  );

  function loadAnchors() {
    setLoading(true);
    const result: Record<string, string[]> = {};
    for (const cat of CATEGORIES) {
      const files = listDir(`临床锚点/${cat}`);
      result[cat] = files
        .map(f => f.split('/').pop()?.replace('.md', '') || '')
        .filter(Boolean);
      if (result[cat].length === 0) {
        result[cat] = [...ANCHOR_CATEGORIES[cat]];
      }
    }
    setAnchors(result);
    setLoading(false);
  }

  const refreshKey = useAppStore((s) => s.skeletonRefreshKey);
  useFocusEffect(
    useCallback(() => {
      loadAnchors();
    }, [refreshKey])
  );

  const currentAnchors = anchors[anchorCategory] || ANCHOR_CATEGORIES[anchorCategory];

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={copper} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Copper segmented control */}
      <View style={styles.segmentedBar}>
        <View style={styles.segmentedControl}>
          {CATEGORIES.map((cat) => {
            const active = anchorCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.segment, active && styles.segmentActive]}
                onPress={() => setAnchorCategory(cat)}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {cat}
                </Text>
                <Text style={[styles.segmentCount, active && styles.segmentCountActive]}>
                  {(anchors[cat] || []).length}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Description */}
      <Text style={styles.subtitle}>
        {anchorCategory === '症状' && '常见症状，从症状反查疾病'}
        {anchorCategory === '体征' && '体征线索，从查体定位系统'}
        {anchorCategory === '检查异常' && '检查异常，从化验倒推病生'}
      </Text>

      {/* Anchor grid */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <AnchorGrid anchors={currentAnchors} category={anchorCategory} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: paperWhite },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: paperWhite },
  // ── Segmented control (copper style) ──
  segmentedBar: {
    backgroundColor: jadeWhite,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: warmBorder,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: copperBg,
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 4,
  },
  segmentActive: {
    backgroundColor: copper,
    ...shadows.sm,
  },
  segmentText: { fontSize: 14, fontWeight: '600', color: ochreGray },
  segmentTextActive: { color: '#FFFFFF' },
  segmentCount: { fontSize: 13, color: clayGray },
  segmentCountActive: { color: 'rgba(255,255,255,0.7)' },
  // ── Content ──
  subtitle: {
    fontSize: 13,
    color: ochreGray,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 40 },
});
