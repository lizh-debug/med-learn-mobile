// Relationship graph view - shows card connections like Obsidian graph
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { listDirRecursive, readFile, fileExists } from '../lib/fileStore';
import { extractWikiLinks } from '../lib/markdownParser';

// WebView only works on native; on web we use an iframe
const WebViewCmp = Platform.OS !== 'web'
  ? require('react-native-webview').WebView
  : null;

function GraphIframe({ html, style }: { html: string; style: any }) {
  // On web, use iframe with srcdoc
  if (Platform.OS === 'web') {
    return (
      <iframe
        srcDoc={html}
        style={{ width: '100%', height: '100%', border: 'none', ...style }}
      />
    );
  }
  // On native, use WebView
  if (WebViewCmp) {
    return <WebViewCmp source={{ html }} style={style} scrollEnabled={false} javaScriptEnabled />;
  }
  return <View style={style} />;
}

interface GraphNode {
  id: string;
  label: string;
  group: string; // system name
  filled: boolean;
}

interface GraphEdge {
  from: string;
  to: string;
}

export default function GraphView() {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ nodes: 0, edges: 0, filled: 0 });

  useEffect(() => {
    buildGraph();
  }, []);

  async function buildGraph() {
    setLoading(true);
    try {
      const allFiles = listDirRecursive('');
      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];
      const nodeIds = new Set<string>();

      for (const filePath of allFiles) {
        try {
          const content = await readFile(filePath);
          const titleMatch = content.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1] : filePath.split('/').pop()?.replace('.md', '') || filePath;
          const system = filePath.split('/')[0] || '';

          if (!nodeIds.has(title)) {
            nodeIds.add(title);
            nodes.push({
              id: title,
              label: title.length > 10 ? title.slice(0, 10) + '..' : title,
              group: system,
              filled: true,
            });
          }

          // Extract wiki links from body — only include links to filled cards
          const bodyOnly = content.replace(/^---[\s\S]*?---\n?/, '');
          const links = extractWikiLinks(bodyOnly);

          for (const link of links) {
            const targetName = link.display;
            if (targetName && targetName !== title) {
              // Check if target card exists
              const targetPath = link.path.endsWith('.md') ? link.path : link.path + '.md';
              const exists = fileExists(targetPath);
              // Only add edge and target node if target card actually exists (is filled)
              if (exists) {
                edges.push({ from: title, to: targetName });
                if (!nodeIds.has(targetName)) {
                  nodeIds.add(targetName);
                  nodes.push({
                    id: targetName,
                    label: targetName.length > 10 ? targetName.slice(0, 10) + '..' : targetName,
                    group: targetPath.split('/')[0] || '',
                    filled: true,
                  });
                }
              }
            }
          }
        } catch { /* skip */ }
      }

      setStats({
        nodes: nodes.length,
        edges: edges.length,
        filled: nodes.filter(n => n.filled).length,
      });

      // Generate HTML with vis.js for the graph
      const graphHtml = generateGraphHtml(nodes, edges);
      setHtml(graphHtml);
    } catch { /* */ }
    setLoading(false);
  }

  function generateGraphHtml(nodes: GraphNode[], edges: GraphEdge[]): string {
    const nodesJSON = JSON.stringify(nodes);
    const edgesJSON = JSON.stringify(edges);

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <style>
    * { margin: 0; padding: 0; }
    body { background: #FAF7F2; overflow: hidden; }
    #graph { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <canvas id="graph"></canvas>
  <script>
    // Lightweight force-directed graph renderer
    const nodes = ${nodesJSON};
    const edges = ${edgesJSON};

    const canvas = document.getElementById('graph');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    // Initialize positions randomly
    const W = window.innerWidth;
    const H = window.innerHeight;
    const positions = {};
    const velocities = {};

    const colors = {
      '骨架': '#E8953A',
      '卡片': '#C8865D',
      '临床锚点': '#D4685A',
      '未填写': '#D1D1D6',
    };

    function getColor(group) {
      for (const key of Object.keys(colors)) {
        if (group && group.includes(key)) return colors[key];
      }
      return '#C8865D';
    }

    nodes.forEach((n, i) => {
      positions[n.id] = {
        x: W/2 + (Math.random() - 0.5) * W * 0.6,
        y: H/2 + (Math.random() - 0.5) * H * 0.6,
      };
      velocities[n.id] = { vx: 0, vy: 0 };
    });

    // Edge map for quick lookup
    const edgeMap = {};
    edges.forEach(e => {
      if (!edgeMap[e.from]) edgeMap[e.from] = new Set();
      if (!edgeMap[e.to]) edgeMap[e.to] = new Set();
      edgeMap[e.from].add(e.to);
      edgeMap[e.to].add(e.from);
    });

    let dragged = null;
    let dragPos = null;

    canvas.addEventListener('pointerdown', (e) => {
      const px = e.clientX;
      const py = e.clientY;
      for (const n of nodes) {
        const p = positions[n.id];
        if (!p) continue;
        const dx = p.x - px, dy = p.y - py;
        if (dx*dx + dy*dy < 400) {
          dragged = n.id;
          dragPos = { x: px, y: py };
          break;
        }
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (dragged && dragPos) {
        const p = positions[dragged];
        if (p) {
          p.x += e.clientX - dragPos.x;
          p.y += e.clientY - dragPos.y;
          dragPos = { x: e.clientX, y: e.clientY };
        }
      }
    });

    canvas.addEventListener('pointerup', () => { dragged = null; });
    canvas.addEventListener('pointerleave', () => { dragged = null; });

    // ---- Force simulation with energy decay ----
    const DAMPING = 0.6;      // strong damping to stabilize quickly
    const MAX_VEL = 5;         // cap velocity to prevent shaking
    const MIN_ENERGY = 0.01;   // stop simulation when energy below this
    const REPULSION = 500;
    const ATTRACTION = 0.003;
    const CENTER = 0.001;
    let stable = false;
    let stableFrames = 0;

    function simulate() {
      if (dragged) stableFrames = 0; // reset if user interacts

      let maxEnergy = 0;

      for (const id of Object.keys(positions)) {
        if (id === dragged) continue;
        const p = positions[id];
        let fx = (W/2 - p.x) * CENTER;
        let fy = (H/2 - p.y) * CENTER;

        // Repulsion between all nodes (only if not stable)
        if (!stable) {
          for (const other of nodes) {
            if (other.id === id) continue;
            const op = positions[other.id];
            if (!op) continue;
            const dx = p.x - op.x, dy = p.y - op.y;
            const dist = Math.max(1, Math.sqrt(dx*dx + dy*dy));
            const force = REPULSION / (dist * dist);
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }
        }

        // Attraction along edges
        const neighbors = edgeMap[id];
        if (neighbors) {
          for (const nid of neighbors) {
            const np = positions[nid];
            if (!np) continue;
            const dx = np.x - p.x, dy = np.y - p.y;
            fx += dx * ATTRACTION;
            fy += dy * ATTRACTION;
          }
        }

        // Apply with strong damping
        const v = velocities[id];
        v.vx = (v.vx + fx) * DAMPING;
        v.vy = (v.vy + fy) * DAMPING;

        // Cap velocity
        const speed = Math.sqrt(v.vx*v.vx + v.vy*v.vy);
        if (speed > MAX_VEL) {
          v.vx = (v.vx / speed) * MAX_VEL;
          v.vy = (v.vy / speed) * MAX_VEL;
        }

        p.x += v.vx;
        p.y += v.vy;

        // Clamp to screen
        p.x = Math.max(20, Math.min(W - 20, p.x));
        p.y = Math.max(20, Math.min(H - 20, p.y));

        maxEnergy = Math.max(maxEnergy, speed);
      }

      // Track stability: if energy stays low for 30 frames, stop simulating
      if (maxEnergy < MIN_ENERGY) {
        stableFrames++;
        if (stableFrames > 30) stable = true;
      } else {
        stableFrames = 0;
        stable = false;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Edges
      ctx.strokeStyle = 'rgba(200, 134, 93, 0.18)';
      ctx.lineWidth = 0.6;
      for (const edge of edges) {
        const from = positions[edge.from];
        const to = positions[edge.to];
        if (!from || !to) continue;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }

      // Nodes
      for (const n of nodes) {
        const p = positions[n.id];
        if (!p) continue;
        const r = n.filled ? 5 : 3;

        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.filled ? getColor(n.group) : '#D1D1D6';
        ctx.fill();

        // Copper pulse glow on center-ish nodes (degree > 3)
        const degree = edgeMap[n.id]?.size || 0;
        if (degree > 3) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(200, 134, 93, 0.25)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        if (degree > 1 || n.filled) {
          ctx.fillStyle = '#1C1C2A';
          ctx.font = '10px system-ui, sans-serif';
          ctx.fillText(n.label, p.x + 7, p.y + 4);
        }
      }
    }

    function loop() {
      if (!stable) simulate();
      draw();
      requestAnimationFrame(loop);
    }

    loop();
  </script>
</body>
</html>`;
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#C8865D" />
        <Text style={styles.loadingText}>构建知识图谱...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{stats.nodes}</Text>
          <Text style={styles.statLabel}>节点</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{stats.edges}</Text>
          <Text style={styles.statLabel}>链接</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{stats.filled}</Text>
          <Text style={styles.statLabel}>已填</Text>
        </View>
      </View>
      <GraphIframe html={html} style={styles.webview} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F2' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF7F2' },
  loadingText: { marginTop: 8, color: '#8B7E74', fontSize: 14 },
  statsBar: {
    flexDirection: 'row', justifyContent: 'center', gap: 40,
    paddingVertical: 12, backgroundColor: 'rgba(255,252,248,0.88)',
    borderBottomWidth: 0.5, borderBottomColor: '#E8E0D5',
  },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: '#C8865D' },
  statLabel: { fontSize: 11, color: '#8B7E74' },
  webview: { flex: 1 },
});
