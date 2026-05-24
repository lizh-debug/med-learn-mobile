// Tab 1: System skeleton - shows 4-layer knowledge tree
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, SYSTEMS } from '../../src/store/useAppStore';
import SkeletonTree from '../../src/components/SkeletonTree';
import { Link } from 'expo-router';

export default function SkeletonScreen() {
  const router = useRouter();
  const selectedSystem = useAppStore((s) => s.selectedSystem);
  const setSelectedSystem = useAppStore((s) => s.setSelectedSystem);
  const skeletonRefreshKey = useAppStore((s) => s.skeletonRefreshKey);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={styles.container}>
      {/* System selector */}
      <View style={styles.systemBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {SYSTEMS.map((sys) => (
            <TouchableOpacity
              key={sys}
              style={[styles.systemChip, selectedSystem === sys && styles.systemChipActive]}
              onPress={() => setSelectedSystem(sys)}
            >
              <Text style={[styles.systemChipText, selectedSystem === sys && styles.systemChipTextActive]}>
                {sys}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Action bar: search + overview + graph */}
      <View style={styles.actionBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索知识节点..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery ? (
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => { setSearchQuery(''); Keyboard.dismiss(); }}
          >
            <Text style={styles.searchBtnText}>清除</Text>
          </TouchableOpacity>
        ) : null}
        <Link href="/overview" asChild>
          <TouchableOpacity style={styles.graphBtn}>
            <Text style={styles.graphBtnText}>📋</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/graph" asChild>
          <TouchableOpacity style={styles.graphBtn}>
            <Text style={styles.graphBtnText}>🕸</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* 入门指南入口 — prominent banner for new users */}
      <Link href="/overview" asChild>
        <TouchableOpacity style={styles.introBanner} activeOpacity={0.85}>
          <View style={styles.introBannerLeft}>
            <Text style={styles.introBannerIcon}>📖</Text>
            <View style={styles.introBannerTextWrap}>
              <Text style={styles.introBannerTitle}>入门指南</Text>
              <Text style={styles.introBannerSubtitle}>什么是模块化学习？3 分钟快速上手</Text>
            </View>
          </View>
          <Text style={styles.introBannerArrow}>→</Text>
        </TouchableOpacity>
      </Link>

      {/* Skeleton tree — keyed by refreshKey to force remount after card save */}
      <SkeletonTree key={`${selectedSystem}-${skeletonRefreshKey}`} systemName={selectedSystem} searchQuery={searchQuery} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  systemBar: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  systemChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  systemChipActive: { backgroundColor: '#2563eb' },
  systemChipText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  systemChipTextActive: { color: '#fff', fontWeight: '600' },
  actionBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  searchBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  graphBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  graphBtnText: { fontSize: 20 },
  introBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#eff6ff',
    marginHorizontal: 16, marginTop: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5, borderColor: '#93c5fd',
  },
  introBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  introBannerIcon: { fontSize: 28, marginRight: 12 },
  introBannerTextWrap: { flex: 1 },
  introBannerTitle: { fontSize: 16, fontWeight: '700', color: '#1e40af' },
  introBannerSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  introBannerArrow: { fontSize: 22, color: '#93c5fd', fontWeight: '700' },
});
