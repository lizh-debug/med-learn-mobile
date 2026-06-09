// Tab 2: 知识网络 — 力导向图谱 + 节点详情 + 统计面板
//
// 布局：
//  1. 顶部统计栏（节点/连线/已填）— 毛玻璃卡片
//  2. 全屏图谱区（WebView canvas + hex grid 背景纹理）
//  3. 底部选中节点详情卡片（滑动弹出，含快捷操作按钮）
//  4. 图例标签
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, ScrollView, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { listDirRecursive, readFile, fileExists } from '../../src/lib/fileStore';
import { extractWikiLinks } from '../../src/lib/markdownParser';
import {
  copper, copperBg, paperWhite, jadeWhite,
  inkColor, ochreGray, frostGray, clayGray, warmBorder,
  layer基础, layer桥梁, layer临床, layer前沿,
} from '../../src/theme/colors';
import { shadows } from '../../src/theme/shadows';
import { spacing, radius } from '../../src/theme/spacing';
import { SYSTEM_COLORS, HEX_GRID } from '../../src/theme/decorations';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// WebView 条件加载
const WebViewCmp = Platform.OS !== 'web'
  ? require('react-native-webview').WebView
  : null;

interface GraphNode {
  id: string;
  label: string;
  group: string;
  filled: boolean;
  path: string;
}

interface GraphEdge {
  from: string;
  to: string;
}

function GraphCanvas({ html, style }: { html: string; style: any }) {
  if (Platform.OS === 'web') {
    return React.createElement('iframe', {
      srcDoc: html,
      style: { width: '100%', height: '100%', border: 'none', ...style },
    });
  }
  if (WebViewCmp) {
    return React.createElement(WebViewCmp, {
      source: { html },
      style,
      scrollEnabled: false,
      javaScriptEnabled: true,
      onMessage: undefined, // handled by parent via html injection
    });
  }
  return React.createElement(View, { style });
}

function generateGraphHtml(
  nodes: GraphNode[],
  edges: GraphEdge[],
  hexGrid: typeof HEX_GRID,
): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  * { margin:0; padding:0; }
  html, body { width:100%; height:100%; overflow:hidden; background:#080B12; cursor:grab; }
  body:active { cursor:grabbing; }
  #graph { width:100%; height:100%; display:block; }
</style>
</head>
<body>
<canvas id="graph"></canvas>
<script>
  const nodes = ${JSON.stringify(nodes)};
  const edges = ${JSON.stringify(edges)};

  const canvas = document.getElementById('graph');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  let W, H;
  let time = 0;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // System color palette
  const sysColors = ${JSON.stringify(SYSTEM_COLORS)};
  function getColor(group) {
    return sysColors[group] || '#00E5FF';
  }

  // Init positions
  const pos = {};
  const vel = {};
  nodes.forEach((n, i) => {
    pos[n.id] = { x: W/2 + (Math.random()-0.5)*W*0.6, y: H/2 + (Math.random()-0.5)*H*0.6 };
    vel[n.id] = { vx:0, vy:0 };
  });

  // Edge map
  const edgeMap = {};
  edges.forEach(e => {
    if (!edgeMap[e.from]) edgeMap[e.from] = new Set();
    if (!edgeMap[e.to]) edgeMap[e.to] = new Set();
    edgeMap[e.from].add(e.to);
    edgeMap[e.to].add(e.from);
  });

  let dragged = null;
  let dragPos = null;
  let selectedNode = null;
  let hoveredNode = null;
  let mouseX = -100, mouseY = -100;

  // Per-node twinkle phase offset
  const twinklePhase = {};
  nodes.forEach(n => { twinklePhase[n.id] = Math.random() * Math.PI * 2; });

  function findNearby(px, py, radius) {
    let best = null, bestDist = radius * radius;
    for (const n of nodes) {
      const p = pos[n.id]; if (!p) continue;
      const dx = p.x-px, dy = p.y-py;
      const d2 = dx*dx+dy*dy;
      if (d2 < bestDist) { bestDist = d2; best = n; }
    }
    return best;
  }

  canvas.addEventListener('pointerdown', (e) => {
    const px = e.clientX, py = e.clientY;
    const hit = findNearby(px, py, 20);
    selectedNode = hit;
    if (hit) {
      dragged = hit.id; dragPos = {x:px,y:py};
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'select',node:hit}));
      }
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    if (dragged && dragPos && pos[dragged]) {
      pos[dragged].x += e.clientX - dragPos.x;
      pos[dragged].y += e.clientY - dragPos.y;
      dragPos = {x:e.clientX,y:e.clientY};
    } else {
      hoveredNode = findNearby(mouseX, mouseY, 18);
    }
  });
  canvas.addEventListener('pointerup', () => { dragged = null; });
  canvas.addEventListener('pointerleave', () => { hoveredNode = null; mouseX = -100; mouseY = -100; });

  // Force simulation
  const DAMP = 0.65, MAXV = 5, REP = 400, ATT = 0.003, CEN = 0.0008, MIN_E = 0.008;
  let stable = false, stableFrames = 0;

  function sim() {
    if (dragged) stableFrames = 0;
    if (stable) return;
    let maxE = 0;
    for (const n of nodes) {
      if (n.id === dragged) continue;
      const p = pos[n.id];
      let fx = (W/2-p.x)*CEN, fy = (H/2-p.y)*CEN;
      for (const other of nodes) {
        if (other.id === n.id) continue;
        const op = pos[other.id]; if (!op) continue;
        const dx = p.x-op.x, dy = p.y-op.y;
        const dist = Math.max(1, Math.sqrt(dx*dx+dy*dy));
        fx += (dx/dist)*REP/(dist*dist);
        fy += (dy/dist)*REP/(dist*dist);
      }
      const nb = edgeMap[n.id];
      if (nb) { for (const nid of nb) { const np = pos[nid]; if(!np)continue; fx += (np.x-p.x)*ATT; fy += (np.y-p.y)*ATT; } }
      const v = vel[n.id];
      v.vx = (v.vx+fx)*DAMP; v.vy = (v.vy+fy)*DAMP;
      const sp = Math.sqrt(v.vx*v.vx+v.vy*v.vy);
      if(sp>MAXV){v.vx=(v.vx/sp)*MAXV;v.vy=(v.vy/sp)*MAXV;}
      p.x+=v.vx; p.y+=v.vy;
      p.x=Math.max(16,Math.min(W-16,p.x)); p.y=Math.max(16,Math.min(H-16,p.y));
      maxE=Math.max(maxE,sp);
    }
    if(maxE<MIN_E){stableFrames++;if(stableFrames>30)stable=true;}
    else{stableFrames=0;stable=false;}
  }

  function drawStar(x, y, r, alpha, twinkleVal, colorHint) {
    const twinkle = 0.5 + 0.5 * Math.sin(twinkleVal);
    const a = alpha * twinkle;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, a) + ')';
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0,0,W,H);

    // ── Faint hex grid ──
    ctx.strokeStyle = 'rgba(0,229,255,0.03)';
    ctx.lineWidth = 0.3;
    const hs = 20 * Math.sqrt(3);
    const hw = 20 * 1.5;
    for (let row = -1; row < H/hs + 2; row++) {
      for (let col = -1; col < W/hw + 2; col++) {
        const cx = col * hw;
        const cy = row * hs + (col%2===0 ? 0 : hs/2);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = Math.PI/3 * i - Math.PI/6;
          const x = cx + 20 * Math.cos(a);
          const y = cy + 20 * Math.sin(a);
          i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
        }
        ctx.closePath(); ctx.stroke();
      }
    }

    // ── Constellation edges (barely visible unless hovering) ──
    const highlightNode = selectedNode || hoveredNode;
    for (const e of edges) {
      const f=pos[e.from], t=pos[e.to]; if(!f||!t)continue;
      // Only show edges connected to highlighted node
      const isHighlighted = highlightNode &&
        (e.from === highlightNode.id || e.to === highlightNode.id);
      if (isHighlighted) {
        const alpha = selectedNode ? 0.35 : 0.18;
        ctx.strokeStyle = 'rgba(0,229,255,'+alpha+')';
        ctx.lineWidth = selectedNode ? 1 : 0.4;
      } else {
        // Default: extremely faint
        ctx.strokeStyle = 'rgba(180,210,240,0.04)';
        ctx.lineWidth = 0.25;
      }
      ctx.beginPath(); ctx.moveTo(f.x,f.y); ctx.lineTo(t.x,t.y); ctx.stroke();
    }

    const isHover = hoveredNode && !selectedNode;

    // ── Star nodes (the nodes ARE the stars) ──
    for (const n of nodes) {
      const p = pos[n.id]; if (!p) continue;
      const degree = (edgeMap[n.id]?.size || 0);
      const isSel = selectedNode && selectedNode.id === n.id;
      const isHov = isHover && hoveredNode.id === n.id;
      // Size varies subtly: star points, not circles
      const baseR = n.filled ? (0.6 + degree * 0.2) : 0.4;
      const twinkle = twinklePhase[n.id] + time * 0.008; // slow, calm twinkle

      let glowAlpha;
      if (isSel) glowAlpha = 1.0;
      else if (isHov) glowAlpha = 0.9;
      else if (n.filled) glowAlpha = 0.55;
      else glowAlpha = 0.12;

      // All stars are cool white — the night sky is monochrome
      const colorHint = '180,210,240';

      // Draw the twinkling star point
      drawStar(p.x, p.y, baseR, glowAlpha, twinkle, colorHint);

      // Label: always on core nodes (degree >= 3), or on hover/select
      if (n.label && (isSel || isHov || degree >= 3)) {
        const lx = p.x + baseR + 8;
        const ly = p.y - 5;
        const isCore = degree >= 3 && !isSel && !isHov;
        ctx.fillStyle = isSel ? 'rgba(0,229,255,0.9)'
          : isHov ? 'rgba(255,255,255,0.8)'
          : 'rgba(255,255,255,0.45)';
        ctx.font = (isSel || isHov ? 'bold ' : '') + '10px "Courier New", monospace';
        ctx.fillText(n.label, lx, ly + 3);
      }
    }
  }

  function loop() {
    time++;
    sim(); draw();
    requestAnimationFrame(loop);
  }
  loop();
</script>
</body>
</html>`;
}

export default function NetworkScreen() {
  const router = useRouter();
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ nodes: 0, edges: 0, filled: 0 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [allNodes, setAllNodes] = useState<GraphNode[]>([]);

  useEffect(() => { buildGraph(); }, []);

  async function buildGraph() {
    setLoading(true);
    try {
      const allFiles = listDirRecursive('');
      const nodesMap = new Map<string, GraphNode>();
      const edgeList: GraphEdge[] = [];

      for (const filePath of allFiles) {
        try {
          const content = await readFile(filePath);
          const titleMatch = content.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1] : filePath.split('/').pop()?.replace('.md', '') || filePath;
          const system = filePath.split('/')[0] || '';

          if (!nodesMap.has(title)) {
            nodesMap.set(title, { id: title, label: title.length > 12 ? title.slice(0, 11) + '..' : title, group: system, filled: true, path: filePath });
          }
          const bodyOnly = content.replace(/^---[\s\S]*?---\n?/, '');
          const links = extractWikiLinks(bodyOnly);
          for (const link of links) {
            const target = link.display;
            if (target && target !== title) {
              const tp = link.path.endsWith('.md') ? link.path : link.path + '.md';
              if (fileExists(tp)) {
                edgeList.push({ from: title, to: target });
                if (!nodesMap.has(target)) {
                  nodesMap.set(target, { id: target, label: target.length > 12 ? target.slice(0, 11) + '..' : target, group: tp.split('/')[0] || '', filled: true, path: tp });
                }
              }
            }
          }
        } catch { /* skip */ }
      }

      const nodeList = [...nodesMap.values()];
      setAllNodes(nodeList);
      setStats({ nodes: nodeList.length, edges: edgeList.length, filled: nodeList.filter(n => n.filled).length });
      setHtml(generateGraphHtml(nodeList, edgeList, HEX_GRID));
    } catch { /* */ }
    setLoading(false);
  }

  function handleViewNode(node: GraphNode) {
    if (node.path.startsWith('临床锚点/')) {
      router.push(`/anchor/${encodeURIComponent(node.path)}`);
    } else if (node.path.startsWith('骨架/')) {
      const sys = node.path.replace('骨架/', '').replace('.md', '');
      router.push(`/skeleton/${encodeURIComponent(sys)}`);
    } else {
      router.push(`/card/${encodeURIComponent(node.path)}`);
    }
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
      {/* 顶部统计栏 — 星空 HUD */}
      <View style={styles.statsBar} testID="glass">
        <View style={styles.stat}>
          <Text style={styles.statIcon}>✦</Text>
          <Text style={styles.statNum}>{stats.nodes}</Text>
          <Text style={styles.statLabel}>STARS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statIcon}>◈</Text>
          <Text style={styles.statNum}>{stats.edges}</Text>
          <Text style={styles.statLabel}>LINKS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statIcon}>◆</Text>
          <Text style={styles.statNum}>{stats.filled}</Text>
          <Text style={styles.statLabel}>FILLED</Text>
        </View>
      </View>

      {/* 图谱区 */}
      <View style={styles.graphArea}>
        <GraphCanvas html={html} style={styles.webview} />
      </View>

      {/* 图例 — 星空风格 */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <Text style={styles.legendStar}>✦</Text>
          <Text style={styles.legendText}>已填</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendStarDim}>·</Text>
          <Text style={styles.legendText}>待填</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendHint}>悬停查看连线</Text>
        </View>
      </View>

      {/* 底部选中节点详情卡 — 玻璃态 */}
      {selectedNode && (
        <View style={styles.nodeDetail}>
          <View style={styles.nodeDetailHandle} />
          <View style={styles.nodeDetailHeader}>
            <Text style={styles.nodeStarIcon}>✦</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.nodeDetailTitle}>{selectedNode.id}</Text>
              <Text style={styles.nodeDetailMeta}>{selectedNode.group}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedNode(null)} style={styles.nodeDetailClose}>
              <Ionicons name="close" size={18} color={frostGray} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.nodeAction}
            onPress={() => handleViewNode(selectedNode)}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={16} color="#080B12" />
            <Text style={styles.nodeActionText}>OPEN NODE</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080B12' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#080B12' },
  loadingText: { marginTop: 8, color: '#5A6980', fontSize: 13, fontFamily: 'monospace' },

  // ── Stats bar (HUD) ──
  statsBar: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(10,14,23,0.75)',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,229,255,0.08)',
    gap: 24,
  },
  stat: { alignItems: 'center', minWidth: 72 },
  statIcon: { fontSize: 12, color: '#00E5FF', marginBottom: 2, opacity: 0.7 },
  statNum: {
    fontSize: 20, fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    letterSpacing: 1,
    // Glow via shadow (limited RN support; best on native)
    textShadowColor: 'rgba(0,229,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  statLabel: {
    fontSize: 9, fontWeight: '700',
    color: '#5A6980',
    fontFamily: 'monospace',
    letterSpacing: 3,
    marginTop: 1,
  },
  statDivider: {
    width: 0.5, height: 28,
    backgroundColor: 'rgba(0,229,255,0.12)',
  },

  // ── Graph ──
  graphArea: { flex: 1 },
  webview: { flex: 1 },

  // ── Legend (starry) ──
  legend: {
    flexDirection: 'row', justifyContent: 'center', gap: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(10,14,23,0.90)',
    borderTopWidth: 0.5, borderTopColor: 'rgba(0,229,255,0.08)',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendStar: { fontSize: 12, color: '#00E5FF', opacity: 0.8 },
  legendStarDim: { fontSize: 14, color: 'rgba(180,200,230,0.3)', fontWeight: '700' },
  legendText: { fontSize: 10, color: '#5A6980', fontFamily: 'monospace', letterSpacing: 1 },
  legendHint: { fontSize: 10, color: '#3A4860', fontFamily: 'monospace', letterSpacing: 1 },

  // ── Node detail card (glass) ──
  nodeDetail: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(15,21,32,0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderTopWidth: 0.5,
    borderColor: 'rgba(0,229,255,0.15)',
    shadowColor: '#00E5FF', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
  },
  nodeDetailHandle: {
    width: 36, height: 3, borderRadius: 2,
    backgroundColor: 'rgba(0,229,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  nodeDetailHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 14,
  },
  nodeStarIcon: { fontSize: 20, color: '#00E5FF' },
  nodeDetailTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  nodeDetailMeta: { fontSize: 12, color: '#5A6980', fontFamily: 'monospace', marginTop: 2 },
  nodeDetailClose: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
  },
  nodeAction: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#00E5FF',
    paddingVertical: 12,
    borderRadius: 10,
  },
  nodeActionText: { fontSize: 14, fontWeight: '700', color: '#080B12', fontFamily: 'monospace', letterSpacing: 2 },
});
