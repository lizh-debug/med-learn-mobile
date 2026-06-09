// Tab 2: 知识网络 — 系统星座卡片布局
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { listDirRecursive, readFile, fileExists } from '../../src/lib/fileStore';
import { extractWikiLinks } from '../../src/lib/markdownParser';
import {
  copper, copperBg, paperWhite, jadeWhite,
  inkColor, ochreGray, frostGray, clayGray, warmBorder,
} from '../../src/theme/colors';
import { shadows } from '../../src/theme/shadows';
import { spacing, radius } from '../../src/theme/spacing';
import { SYSTEM_COLORS, ORGAN_ICONS } from '../../src/theme/decorations';
import { SYSTEMS } from '../../src/store/useAppStore';

interface SysStats {
  system: string;
  icon: string;
  color: string;
  totalCards: number;
  totalLinks: number;
  topNodes: string[];
}

export default function NetworkScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sysStats, setSysStats] = useState<SysStats[]>([]);
  const [totalStats, setTotalStats] = useState({ nodes: 0, edges: 0 });

  useEffect(() => { buildStats(); }, []);

  async function buildStats() {
    setLoading(true);
    try {
      const allFiles = listDirRecursive('卡片');
      const edgeSet = new Set<string>();
      let totalEdges = 0;

      const stats: SysStats[] = await Promise.all(SYSTEMS.map(async (sys) => {
        const sysFiles = allFiles.filter(f => f.startsWith(`卡片/${sys}/`));
        const nodeNames: string[] = [];
        let links = 0;

        for (const f of sysFiles.slice(0, 30)) {
          try {
            const content = await readFile(f);
            const title = content.match(/^#\s+(.+)$/m)?.[1] || f.split('/').pop()?.replace('.md', '') || '';
            nodeNames.push(title);
            const body = content.replace(/^---[\s\S]*?---\n?/, '');
            const wikiLinks = extractWikiLinks(body);
            for (const l of wikiLinks) {
              const tp = l.path.endsWith('.md') ? l.path : l.path + '.md';
              const key = `${f}|${tp}`;
              if (!edgeSet.has(key)) { edgeSet.add(key); links++; totalEdges++; }
            }
          } catch {/* skip */}
        }

        return {
          system: sys,
          icon: ORGAN_ICONS[sys] || '📚',
          color: SYSTEM_COLORS[sys] || '#C8A45C',
          totalCards: sysFiles.length,
          totalLinks: links,
          topNodes: nodeNames.slice(0, 5),
        };
      }));

      setSysStats(stats);
      setTotalStats({ nodes: allFiles.length, edges: totalEdges });
    } catch {/* */}
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={copper} />
        <Text style={styles.loadingText}>构建知识网络...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats bar */}
      <View style={styles.statsBar} testID="glass">
        <View style={styles.stat}>
          <Text style={styles.statNum}>{totalStats.nodes}</Text>
          <Text style={styles.statLabel}>NODES</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statNum}>{totalStats.edges}</Text>
          <Text style={styles.statLabel}>LINKS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statNum}>{sysStats.filter(s => s.totalCards > 0).length}</Text>
          <Text style={styles.statLabel}>SYSTEMS</Text>
        </View>
      </View>

      {/* System constellation cards */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {sysStats.map((sys) => (
          <TouchableOpacity
            key={sys.system}
            style={styles.sysCard}
            activeOpacity={0.7}
            onPress={() => router.push(`/skeleton/${encodeURIComponent(sys.system)}`)}
            testID="glass"
          >
            {/* Header */}
            <View style={styles.sysHeader}>
              <View style={[styles.sysIconWrap, { backgroundColor: sys.color + '18' }]}>
                <Text style={styles.sysIcon}>{sys.icon}</Text>
              </View>
              <View style={styles.sysInfo}>
                <Text style={styles.sysName}>{sys.system.replace('系统', '')}</Text>
                <Text style={styles.sysMeta}>{sys.totalCards} 卡片 · {sys.totalLinks} 链接</Text>
              </View>
              <View style={styles.sysBadge}>
                <Text style={styles.sysBadgeText}>{sys.totalCards}</Text>
              </View>
            </View>

            {/* Mini node preview */}
            {sys.topNodes.length > 0 && (
              <View style={styles.sysNodes}>
                {sys.topNodes.map((node, i) => (
                  <View key={i} style={styles.sysNodeRow}>
                    <View style={[styles.sysNodeDot, { backgroundColor: sys.color }]} />
                    <Text style={styles.sysNodeText} numberOfLines={1}>{node}</Text>
                  </View>
                ))}
                {sys.totalCards > 5 && (
                  <Text style={styles.sysMore}>+{sys.totalCards - 5} 更多节点</Text>
                )}
              </View>
            )}

            {/* Link strength bar */}
            {sys.totalCards > 0 && (
              <View style={styles.sysLinkBar}>
                <View style={[styles.sysLinkFill, {
                  width: `${Math.min(100, (sys.totalLinks / Math.max(sys.totalCards, 1)) * 20)}%`,
                  backgroundColor: sys.color,
                }]} />
              </View>
            )}
          </TouchableOpacity>
        ))}
        <View style={{ height: 130 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: paperWhite },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: paperWhite },
  loadingText: { marginTop: 8, color: ochreGray, fontSize: 13 },

  // Stats bar
  statsBar: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(22,27,34,0.75)',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(200,164,92,0.08)',
    gap: 24,
  },
  stat: { alignItems: 'center', minWidth: 72 },
  statNum: {
    fontSize: 20, fontWeight: '800', color: copper,
    fontFamily: 'monospace', letterSpacing: 1,
  },
  statLabel: {
    fontSize: 9, fontWeight: '700', color: clayGray,
    fontFamily: 'monospace', letterSpacing: 3, marginTop: 1,
  },
  statDivider: { width: 0.5, height: 28, backgroundColor: 'rgba(200,164,92,0.12)' },

  // Scroll
  list: { flex: 1 },
  listContent: { padding: spacing.lg, gap: spacing.md },

  // System card
  sysCard: {
    backgroundColor: jadeWhite,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 0.5, borderColor: 'rgba(200,164,92,0.06)',
    ...shadows.sm,
  },
  sysHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  sysIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  sysIcon: { fontSize: 22 },
  sysInfo: { flex: 1 },
  sysName: { fontSize: 17, fontWeight: '700', color: inkColor },
  sysMeta: { fontSize: 12, color: ochreGray, marginTop: 2 },
  sysBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: 'rgba(200,164,92,0.12)',
  },
  sysBadgeText: { fontSize: 14, fontWeight: '800', color: copper },

  // Node preview
  sysNodes: {
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 0.5, borderTopColor: 'rgba(200,164,92,0.06)',
    gap: 6,
  },
  sysNodeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sysNodeDot: { width: 6, height: 6, borderRadius: 3 },
  sysNodeText: { fontSize: 13, color: frostGray, flex: 1 },
  sysMore: { fontSize: 11, color: clayGray, marginTop: 4, fontStyle: 'italic' },

  // Link bar
  sysLinkBar: {
    marginTop: 12, height: 3, borderRadius: 2,
    backgroundColor: 'rgba(200,164,92,0.06)',
    overflow: 'hidden',
  },
  sysLinkFill: {
    height: '100%', borderRadius: 2,
    minWidth: 4,
  },
});
