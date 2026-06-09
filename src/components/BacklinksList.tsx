// Backlinks panel — "who links to this card" interaction window
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { scanBacklinks } from '../lib/fileStore';

interface Props {
  title: string;
}

export default React.memo(function BacklinksList({ title }: Props) {
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
          <ActivityIndicator size="small" color="#00E5FF" />
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
});

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#0F1520',
    borderRadius: 16,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 0.5, borderColor: 'rgba(0,229,255,0.08)',
  },

  header: {
    backgroundColor: 'rgba(0,229,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,229,255,0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  headerIcon: { fontSize: 16, marginRight: 8 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#00E5FF' },
  headerHint: { fontSize: 12, color: '#5A6980', marginTop: 2 },

  badge: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeActive: { backgroundColor: 'rgba(0,229,255,0.15)' },
  badgeEmpty: { backgroundColor: 'rgba(255,255,255,0.05)' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextActive: { color: '#00E5FF' },
  badgeTextEmpty: { color: '#5A6980' },

  loadingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 20, gap: 8,
  },
  loadingText: { fontSize: 14, color: '#5A6980' },

  emptyBox: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 32, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#8E9DB5', marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#5A6980', textAlign: 'center', lineHeight: 20 },

  linkList: { paddingVertical: 4 },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  linkLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  linkArrow: { fontSize: 16, color: '#00E5FF', marginRight: 10, fontWeight: '700' },
  linkInfo: { flex: 1 },
  linkName: { fontSize: 15, fontWeight: '600', color: '#E8EDF5' },
  linkPath: { fontSize: 12, color: '#5A6980', marginTop: 2 },
  linkChevron: { fontSize: 20, color: '#2D3A4D', fontWeight: '300' },
});
