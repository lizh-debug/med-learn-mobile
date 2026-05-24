// Backlinks panel — "who links to this card" interaction window
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { scanBacklinks } from '../lib/fileStore';

interface Props {
  title: string;
}

export default function BacklinksList({ title }: Props) {
  const router = useRouter();
  const [backlinks, setBacklinks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBacklinks();
  }, [title]);

  async function loadBacklinks() {
    setLoading(true);
    try {
      const links = await scanBacklinks(title);
      setBacklinks(links);
    } catch {
      setBacklinks([]);
    }
    setLoading(false);
  }

  const count = backlinks.length;

  return (
    <View style={styles.panel}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>🔗</Text>
          <Text style={styles.headerTitle}>反向链接</Text>
          {!loading && (
            <View style={[styles.badge, count > 0 ? styles.badgeActive : styles.badgeEmpty]}>
              <Text style={[styles.badgeText, count > 0 ? styles.badgeTextActive : styles.badgeTextEmpty]}>
                {count}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.headerHint}>谁引用了当前节点</Text>
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.loadingText}>扫描中...</Text>
        </View>
      ) : count === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>暂未发现反向链接</Text>
          <Text style={styles.emptyHint}>
            在其他卡片的正文中通过 [[{title}]] 引用此节点后，{'\n'}
            反向链接将自动出现在这里。
          </Text>
        </View>
      ) : (
        <View style={styles.linkList}>
          {backlinks.map((path, idx) => {
            const name = path.split('/').pop()?.replace('.md', '') || path;
            const sysName = path.split('/')[1] || '';
            return (
              <TouchableOpacity
                key={idx}
                style={styles.linkRow}
                onPress={() => router.push(`/card/${encodeURIComponent(path)}`)}
                activeOpacity={0.6}
              >
                <View style={styles.linkLeft}>
                  <Text style={styles.linkArrow}>←</Text>
                  <View style={styles.linkInfo}>
                    <Text style={styles.linkName}>{name}</Text>
                    <Text style={styles.linkPath}>{sysName}</Text>
                  </View>
                </View>
                <Text style={styles.linkChevron}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginTop: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  // Header
  header: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  headerIcon: { fontSize: 16, marginRight: 6 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#1e40af' },
  headerHint: { fontSize: 11, color: '#6b7280', marginTop: 2 },

  // Badge
  badge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeActive: { backgroundColor: '#2563eb' },
  badgeEmpty: { backgroundColor: '#e5e7eb' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextActive: { color: '#fff' },
  badgeTextEmpty: { color: '#9ca3af' },

  // Loading
  loadingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 20, gap: 8,
  },
  loadingText: { fontSize: 13, color: '#6b7280' },

  // Empty
  emptyBox: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: '#6b7280', marginBottom: 6 },
  emptyHint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 18 },

  // Link list
  linkList: { paddingVertical: 4 },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 16,
    borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6',
  },
  linkLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  linkArrow: { fontSize: 16, color: '#3b82f6', marginRight: 10, fontWeight: '700' },
  linkInfo: { flex: 1 },
  linkName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  linkPath: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  linkChevron: { fontSize: 20, color: '#d1d5db', fontWeight: '300' },
});
