// Skeleton tree component - 4-layer knowledge tree
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { readFile, listDirRecursive, ensureInit } from '../lib/fileStore';
import { useAppStore, LAYER_ICONS, LAYER_COLORS, type Layer } from '../store/useAppStore';

interface Props {
  systemName: string;
  searchQuery?: string;
}

interface TreeNode {
  text: string;         // display name
  linkPath: string;     // card file path (卡片/系统/节点名)
  isFilled: boolean;
  isSpeedAnchor: boolean;
  speedContent: string; // 📖 speed anchor educational text
  layer: number;        // 0=基础, 1=桥梁, 2=临床, 3=前沿
}

const LAYER_NAMES: Layer[] = ['基础', '桥梁', '临床', '前沿'];

export default React.memo(function SkeletonTree({ systemName, searchQuery }: Props) {
  const router = useRouter();
  const refreshKey = useAppStore((s) => s.skeletonRefreshKey);
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true, 3: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flat, setFlat] = useState(false);

  useEffect(() => {
    loadSkeleton();
  }, [systemName, refreshKey]);

  async function loadSkeleton() {
    setLoading(true);
    setError('');
    try {
      await ensureInit(); // 确保 memStore 已填充
      const raw = await readFile(`骨架/${systemName}.md`);
      await parseNodes(raw);
    } catch (e) {
      setError(`找不到骨架/${systemName}.md`);
      setNodes([]);
    }
    setLoading(false);
  }

  async function parseNodes(raw: string) {
    const result: TreeNode[] = [];
    let currentLayer = 0;
    let hasLayerHeaders = false;
    const lines = raw.split('\n');

    // Build set of filled card titles from existing card files
    const existingCards = listDirRecursive('卡片');
    const existingTitles = new Set(
      existingCards.map(p => p.split('/').pop()?.replace('.md', ''))
    );

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Detect layer headers: "## 🟢 基础层（...）" or "> 🟢 **基础层**"
      if (trimmed.includes('🟢') && (trimmed.includes('基础层') || trimmed.includes('基础'))) {
        currentLayer = 0; hasLayerHeaders = true;
        continue;
      }
      if (trimmed.includes('🟡') && (trimmed.includes('桥梁层') || trimmed.includes('桥梁'))) {
        currentLayer = 1; hasLayerHeaders = true;
        continue;
      }
      if (trimmed.includes('🔴') && (trimmed.includes('临床层') || trimmed.includes('临床'))) {
        currentLayer = 2; hasLayerHeaders = true;
        continue;
      }
      if (trimmed.includes('🔵') && (trimmed.includes('前沿层') || trimmed.includes('前沿'))) {
        currentLayer = 3; hasLayerHeaders = true;
        continue;
      }

      if (!hasLayerHeaders && currentLayer < 0) currentLayer = 0;

      // 📖 speed anchor line — associate with the previous node
      if (trimmed.startsWith('📖')) {
        if (result.length > 0 && result[result.length - 1].layer === currentLayer) {
          const prev = result[result.length - 1];
          prev.isSpeedAnchor = true;
          prev.speedContent = trimmed;
        }
        continue;
      }

      // Try to extract wiki link from line - supports multiple formats:
      //   ### [[卡片/系统/节点|显示名]]
      //   ### 节点名 → [[卡片/系统/节点|已填]]
      //   - [[卡片/系统/节点|显示名 ← 已填]]
      //   - [[卡片/系统/节点]]
      const linkMatch = trimmed.match(/\[\[([^\]]+)\]\]/);
      if (!linkMatch) continue;

      const inner = linkMatch[1];
      const pipeIdx = inner.indexOf('|');
      const linkPath = pipeIdx !== -1 ? inner.slice(0, pipeIdx).trim() : inner.trim();
      const displayFromLink = pipeIdx !== -1 ? inner.slice(pipeIdx + 1).trim() : linkPath.split('/').pop() || linkPath;

      // Detect if already filled: "← 已填" in display text or in the line
      const isFilled =
        line.includes('← 已填') ||
        displayFromLink.includes('← 已填') ||
        displayFromLink === '已填';

      // Extract the real node name
      let nodeName: string;

      // Format: "### 节点名 → [[...|已填]]"
      const arrowMatch = trimmed.match(/^#+\s*(.+?)\s*→\s*\[\[/);
      if (arrowMatch) {
        nodeName = arrowMatch[1].trim();
      } else {
        // Format: "### [[...|显示名]]" or "- [[...|显示名 ← 已填]]"
        nodeName = displayFromLink.replace(/←\s*已填/, '').trim();
      }

      // Check against existing cards
      const cardFileTitle = linkPath.split('/').pop() || '';
      const cardExists = existingTitles.has(cardFileTitle) || existingTitles.has(nodeName);

      result.push({
        text: nodeName,
        linkPath,
        isFilled: isFilled || cardExists,
        isSpeedAnchor: false, // set to true if 📖 line follows
        speedContent: '',
        layer: currentLayer,
      });
    }

    setNodes(result);
    setFlat(!hasLayerHeaders);
  }

  const handleNodePress = useCallback((node: TreeNode) => {
    let url = `/card/${encodeURIComponent(node.linkPath)}`;
    if (node.isSpeedAnchor && node.speedContent) {
      url += `?isSpeedAnchor=1&speedContent=${encodeURIComponent(node.speedContent)}`;
    }
    router.push(url);
  }, []);

  const toggleCollapse = (layer: number) => {
    setCollapsed(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#C8865D" />
        <Text style={styles.loadingText}>加载骨架...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Filter by search query
  const q = (searchQuery || '').toLowerCase();
  const filtered = q ? nodes.filter(n => n.text.toLowerCase().includes(q) || n.linkPath.toLowerCase().includes(q)) : nodes;

  // Group nodes by layer
  const nodesByLayer: Record<number, TreeNode[]> = {};
  for (let i = 0; i < 4; i++) {
    nodesByLayer[i] = filtered.filter(n => n.layer === i);
  }

  // Render node row
  const renderNode = (node: TreeNode, nIdx: number) => (
    <TouchableOpacity
      key={nIdx}
      style={styles.nodeRow}
      onPress={() => handleNodePress(node)}
    >
      <View style={[
        styles.nodeDot,
        node.isFilled ? styles.nodeDotFilled : styles.nodeDotEmpty,
        node.isSpeedAnchor && styles.nodeDotSpeed,
      ]} />
      <View style={styles.nodeTextWrap}>
        <Text style={[
          styles.nodeText,
          node.isFilled && styles.nodeTextFilled,
          node.isSpeedAnchor && styles.nodeTextSpeed,
        ]} numberOfLines={2}>
          {node.text}
        </Text>
        {node.isFilled && (
          <Text style={styles.filledBadge}> 已填</Text>
        )}
        {node.isSpeedAnchor && (
          <Text style={styles.speedBadge}>📖</Text>
        )}
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  // Flat mode: simple list without layer accordion
  if (flat) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.layerSection} testID="glass">
          <View style={styles.nodesList}>
            {filtered.length === 0 ? (
              <Text style={styles.emptyLayer}>暂无节点</Text>
            ) : (
              filtered.map((node, nIdx) => renderNode(node, nIdx))
            )}
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {LAYER_NAMES.map((layerName, layerIdx) => {
        const layerNodes = nodesByLayer[layerIdx];
        const isCollapsed = collapsed[layerIdx];

        return (
          <View key={layerIdx} style={styles.layerSection}>
            <TouchableOpacity
              style={styles.layerHeader}
              onPress={() => toggleCollapse(layerIdx)}
              activeOpacity={0.6}
            >
              <View style={[styles.layerDot, { backgroundColor: LAYER_COLORS[layerName] }]} />
              <Text style={styles.layerTitle}>{layerName}层</Text>
              <Text style={styles.nodeCount}>
                {layerNodes.filter(n => n.isFilled).length}/{layerNodes.length} 已填
              </Text>
              <Text style={styles.chevron}>{isCollapsed ? '▶' : '▼'}</Text>
            </TouchableOpacity>

            {!isCollapsed && (
              <View style={styles.nodesList}>
                {layerNodes.length === 0 ? (
                  <Text style={styles.emptyLayer}>暂无节点</Text>
                ) : (
                  layerNodes.map((node, nIdx) => renderNode(node, nIdx))
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  loadingText: { marginTop: 8, color: '#5A6980', fontSize: 14 },
  errorText: { fontSize: 16, color: '#FF3D71' },

  layerSection: {
    marginBottom: 16,
    backgroundColor: 'rgba(22,27,34,0.70)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0.5, borderColor: 'rgba(200,164,92,0.06)',
  },
  layerHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: 'rgba(28,35,48,0.60)',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(200,164,92,0.06)',
  },
  layerIcon: { fontSize: 14, marginRight: 8, width: 20 },
  layerDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  layerTitle: { fontSize: 17, fontWeight: '700', color: '#E8EDF5', flex: 1 },
  nodeCount: { fontSize: 12, color: '#5A6980', marginRight: 10 },
  chevron: { fontSize: 12, color: '#5A6980' },
  nodesList: { paddingVertical: 4 },
  emptyLayer: { padding: 20, fontSize: 14, color: '#5A6980', textAlign: 'center' },

  nodeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  nodeDot: {
    width: 10, height: 10, borderRadius: 5,
    marginRight: 12,
  },
  nodeDotFilled: { backgroundColor: '#00FF88' },
  nodeDotEmpty: { backgroundColor: '#2D3A4D' },
  nodeDotSpeed: { backgroundColor: '#FFB800', borderRadius: 2, width: 8, height: 8 },
  nodeTextWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  nodeText: { fontSize: 17, color: '#5A6980', lineHeight: 22 },
  nodeTextFilled: { color: '#E8EDF5', fontWeight: '700' },
  nodeTextSpeed: { color: '#FFB800', fontSize: 15, fontStyle: 'italic' },
  filledBadge: {
    fontSize: 11, color: '#00FF88', fontWeight: '700',
    backgroundColor: 'rgba(0,255,136,0.10)',
    paddingHorizontal: 8, paddingVertical: 1, borderRadius: 8,
    marginLeft: 8, overflow: 'hidden',
  },
  speedBadge: { fontSize: 13, marginLeft: 6 },
  arrow: { fontSize: 20, color: '#B8A99A', marginLeft: 6 },
});
