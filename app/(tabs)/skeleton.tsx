// Tab 1: System skeleton — 暖铜学术风格知识树浏览器
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Link } from 'expo-router';
import { useAppStore, SYSTEMS } from '../../src/store/useAppStore';
import { copper, copperBg, paperWhite, jadeWhite, inkColor, ochreGray, clayGray, warmBorder } from '../../src/theme/colors';
import { shadows } from '../../src/theme/shadows';
import { spacing, radius } from '../../src/theme/spacing';
import SkeletonTree from '../../src/components/SkeletonTree';

export default function SkeletonScreen() {
  const selectedSystem = useAppStore((s) => s.selectedSystem);
  const setSelectedSystem = useAppStore((s) => s.setSelectedSystem);
  const skeletonRefreshKey = useAppStore((s) => s.skeletonRefreshKey);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={styles.container}>
      {/* System selector */}
      <View style={styles.systemBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.systemScroll}>
          {SYSTEMS.map((sys) => {
            const active = selectedSystem === sys;
            return (
              <TouchableOpacity
                key={sys}
                style={[styles.systemChip, active && styles.systemChipActive]}
                onPress={() => setSelectedSystem(sys)}
              >
                <Text style={[styles.systemChipText, active && styles.systemChipTextActive]}>
                  {sys}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={ochreGray} style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索知识节点..."
            placeholderTextColor={clayGray}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
        {searchQuery ? (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => { setSearchQuery(''); Keyboard.dismiss(); }}
          >
            <Ionicons name="close-circle" size={20} color={ochreGray} />
          </TouchableOpacity>
        ) : null}
        <Link href="/overview" asChild>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="book-outline" size={20} color={copper} />
          </TouchableOpacity>
        </Link>
        <Link href="/graph" asChild>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="git-network-outline" size={20} color={copper} />
          </TouchableOpacity>
        </Link>
      </View>

      {/* Hero Banner */}
      <Link href="/overview" asChild>
        <TouchableOpacity style={styles.heroBanner} activeOpacity={0.85}>
          <View style={styles.heroLeft}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="leaf-outline" size={22} color={copper} />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>入门指南</Text>
              <Text style={styles.heroSubtitle}>把医学知识织成一张网</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={copper} />
        </TouchableOpacity>
      </Link>

      {/* Skeleton tree */}
      <SkeletonTree key={`${selectedSystem}-${skeletonRefreshKey}`} systemName={selectedSystem} searchQuery={searchQuery} />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: paperWhite },
  // ── System selector ──
  systemBar: {
    backgroundColor: jadeWhite,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: warmBorder,
  },
  systemScroll: { paddingHorizontal: spacing.md },
  systemChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: paperWhite,
    marginRight: spacing.sm,
    borderWidth: 0.5,
    borderColor: warmBorder,
  },
  systemChipActive: { backgroundColor: copper, borderColor: copper },
  systemChipText: { fontSize: 14, fontWeight: '500', color: ochreGray },
  systemChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  // ── Search ──
  actionBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm,
    backgroundColor: jadeWhite,
    borderBottomWidth: 0.5,
    borderBottomColor: warmBorder,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: paperWhite,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: 38,
    borderWidth: 0.5,
    borderColor: warmBorder,
  },
  searchInput: {
    flex: 1, fontSize: 15, color: inkColor, paddingVertical: 0,
  },
  clearBtn: { padding: 2 },
  iconBtn: {
    width: 38, height: 38,
    borderRadius: radius.lg,
    backgroundColor: paperWhite,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 0.5,
    borderColor: warmBorder,
  },
  // ── Hero banner ──
  heroBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: jadeWhite,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: copperBg,
    ...shadows.sm,
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  heroIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: copperBg,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  heroTextWrap: { flex: 1 },
  heroTitle: { fontSize: 16, fontWeight: '700', color: inkColor },
  heroSubtitle: { fontSize: 13, color: ochreGray, marginTop: 2 },
});
