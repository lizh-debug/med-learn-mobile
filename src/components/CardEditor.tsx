// Card editor – clean writing experience with [[ autocomplete
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { serializeMarkdown, parseFrontmatter } from '../lib/markdownParser';
import { writeFile, readFile, listDirRecursive, ensureInit } from '../lib/fileStore';
import { useAppStore, LAYERS, SYSTEMS } from '../store/useAppStore';

// ---- Field component ----
function EditorField({
  label, hint, value, fieldName, multiline,
  onFieldChange, showLinkHint, onTriggerLink,
}: {
  label: string; hint: string; value: string; fieldName: string;
  onFieldChange: (text: string, field: string) => void; multiline?: boolean;
  showLinkHint?: boolean;
  onTriggerLink?: (field: string) => void;
}) {
  const lastText = useRef('');

  function handleChange(text: string) {
    if (text === lastText.current) return;
    lastText.current = text;
    onFieldChange(text, fieldName);
  }

  return (
    <View style={styles.fieldCard}>
      <View style={styles.labelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {onTriggerLink && (
          <TouchableOpacity
            style={styles.linkTrigger}
            onPress={() => onTriggerLink(fieldName)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.linkTriggerText}>🔗</Text>
          </TouchableOpacity>
        )}
      </View>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMulti]}
        value={value}
        onChangeText={handleChange}
        onChange={(e) => {
          const text = (e.nativeEvent as any).text;
          if (typeof text === 'string') handleChange(text);
        }}
        placeholder=""
        placeholderTextColor="#c7c9cd"
        multiline={multiline}
        textAlignVertical="top"
      />
      {showLinkHint && (
        <Text style={styles.linkHint}>输入 [[ 可链接到已有卡片</Text>
      )}
    </View>
  );
}

interface Props {
  existingPath?: string;
  prefillTitle?: string;
  prefillSystem?: string;
  prefillLayer?: string;
  prefillContent?: string;
}

export default function CardEditor({ existingPath: propPath, prefillTitle, prefillSystem, prefillLayer, prefillContent }: Props) {
  const router = useRouter();
  const addRecentCard = useAppStore((s) => s.addRecentCard);
  const editingCardPath = useAppStore((s) => s.editingCardPath);
  const setEditingCardPath = useAppStore((s) => s.setEditingCardPath);

  // Use prop first, then store (for store-based navigation from CardView)
  const existingPath = propPath || editingCardPath || undefined;

  const [system, setSystem] = useState(prefillSystem || '心血管系统');
  const [layer, setLayer] = useState(prefillLayer || '临床');
  const [title, setTitle] = useState(prefillTitle || '');
  const [q1, setQ1] = useState('');
  const [q2Course, setQ2Course] = useState('');
  const [q3, setQ3] = useState('');
  const [q4, setQ4] = useState('');
  const [q5, setQ5] = useState('');
  const [q6Sym, setQ6Sym] = useState('');
  const [q6Sign, setQ6Sign] = useState('');
  const [q6Exam, setQ6Exam] = useState('');
  const [q6Treat, setQ6Treat] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Autocomplete
  const [allCards, setAllCards] = useState<Array<{ path: string; title: string; layer: string; system: string }>>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [acQuery, setAcQuery] = useState('');
  const [acField, setAcField] = useState('');
  const [collapsedSystems, setCollapsedSystems] = useState<Record<string, boolean>>({});
  const fieldValues = useRef<Record<string, string>>({ q1: '', q3: '', q4: '', q5: '', q6sym: '', q6sign: '', q6exam: '', q6treat: '' });

  useEffect(() => {
    loadCards();
    if (existingPath) loadExisting();
    else loadTemplate();
  }, [existingPath, prefillTitle]);

  async function loadCards() {
    try {
      await ensureInit();
      const cards: Array<{ path: string; title: string; layer: string; system: string }> = [];
      const seen = new Set<string>();

      // 1. All card files — extract layer + system from frontmatter
      const cardFiles = listDirRecursive('卡片');
      for (const file of cardFiles) {
        try {
          const content = await readFile(file);
          const { frontmatter, body } = parseFrontmatter(content);
          const t = (frontmatter.birthplace as string) || body.match(/^#\s+(.+)$/m)?.[1] || file.split('/').pop()?.replace('.md', '') || '';
          const lyr = (frontmatter.layer as string) || '';
          const sys = (frontmatter.system as string) || file.split('/')[1] || '';
          cards.push({ path: file, title: t, layer: lyr, system: sys });
          seen.add(file.replace(/\.md$/, ''));
        } catch { /* skip */ }
      }

      // 2. Skeleton nodes (unfilled) — read all system skeleton files
      const skelFiles = listDirRecursive('骨架');
      for (const skelFile of skelFiles) {
        try {
          const sysName = skelFile.split('/').pop()?.replace('.md', '') || '';
          const content = await readFile(skelFile);
          const lines = content.split('\n');
          let currentLayer = '';
          for (const line of lines) {
            // Track layer
            if (line.includes('🟢') && (line.includes('基础层') || line.includes('基础'))) currentLayer = '基础';
            else if (line.includes('🟡') && (line.includes('桥梁层') || line.includes('桥梁'))) currentLayer = '桥梁';
            else if (line.includes('🔴') && (line.includes('临床层') || line.includes('临床'))) currentLayer = '临床';
            else if (line.includes('🔵') && (line.includes('前沿层') || line.includes('前沿'))) currentLayer = '前沿';

            // Extract wiki links from skeleton lines
            const linkMatch = line.match(/\[\[([^\]]+)\]\]/);
            if (!linkMatch) continue;

            const inner = linkMatch[1];
            const pipeIdx = inner.indexOf('|');
            const linkPath = pipeIdx !== -1 ? inner.slice(0, pipeIdx).trim() : inner.trim();
            let displayName: string;

            // Format: "### 节点名 → [[path|已填]]" — extract name before →
            const arrowMatch = line.match(/^#+\s*(.+?)\s*→\s*\[\[/);
            if (arrowMatch) {
              displayName = arrowMatch[1].trim();
            } else if (pipeIdx !== -1) {
              displayName = inner.slice(pipeIdx + 1).trim().replace(/←\s*已填/, '').trim();
            } else {
              displayName = linkPath.split('/').pop() || linkPath;
            }
            if (!displayName || displayName === '已填') {
              displayName = linkPath.split('/').pop() || linkPath;
            }

            // Skip if already has a card
            const cleanPath = linkPath.replace(/\.md$/, '');
            if (seen.has(cleanPath)) continue;
            seen.add(cleanPath);

            cards.push({
              path: cleanPath,
              title: displayName,
              layer: currentLayer,
              system: sysName,
            });
          }
        } catch { /* skip */ }
      }

      // 3. Anchor files
      const anchorFiles = listDirRecursive('临床锚点');
      for (const file of anchorFiles) {
        try {
          const name = file.split('/').pop()?.replace('.md', '') || '';
          if (name && name !== '临床锚点模板') {
            cards.push({ path: file, title: `⚓ ${name}`, layer: '', system: '⚓ 临床锚点' });
          }
        } catch { /* skip */ }
      }

      setAllCards(cards);
    } catch (e) { console.error('loadCards failed:', e); }
  }

  async function loadExisting() {
    try {
      const content = await readFile(existingPath!);
      const { frontmatter, body } = parseFrontmatter(content);
      setSystem((frontmatter.system as string) || prefillSystem || '心血管系统');
      setTitle((frontmatter.birthplace as string) || '');
      parseFields(body);
    } catch { /* */ }
  }

  async function loadTemplate() {
    try {
      if (prefillContent) {
        parseFields(prefillContent);
      } else {
        const content = await readFile('日结卡片模板');
        const clean = content.replace(/^- \[\[\]\]\s*$/gm, '').replace(/^- \[\[\]\] —\s*$/gm, '');
        parseFields(clean);
      }
    } catch { /* leave empty */ }
  }

  function parseFields(body: string) {
    const sections = body.split(/\n## /);
    for (const section of sections) {
      const s = section.trim();
      if (s.startsWith('1. 一句话')) setQ1(extractBody(s));
      else if (s.startsWith('2. 定位')) {
        for (const l of s.split('\n')) {
          if (l.includes('课程：')) setQ2Course(l.split('课程：')[1]?.trim() || '');
        }
      } else if (s.startsWith('3. 踩在')) setQ3(extractBody(s));
      else if (s.startsWith('4. 通向')) setQ4(extractBody(s));
      else if (s.startsWith('5. 横向') || s.startsWith('5. 还有')) setQ5(extractBody(s));
      else if (s.startsWith('6. 如果')) {
        for (const sub of s.split('\n')) {
          if (sub.startsWith('- 症状：')) setQ6Sym(sub.replace('- 症状：', '').trim());
          else if (sub.startsWith('- 体征：')) setQ6Sign(sub.replace('- 体征：', '').trim());
          else if (sub.startsWith('- 检查：')) setQ6Exam(sub.replace('- 检查：', '').trim());
          else if (sub.startsWith('- 治疗：')) setQ6Treat(sub.replace('- 治疗：', '').trim());
        }
      }
    }
  }

  function extractBody(section: string): string {
    const idx = section.indexOf('\n');
    if (idx === -1) return '';
    const body = section.slice(idx);
    return body
      .split('\n')
      .filter(line => {
        const t = line.trim();
        if (!t) return false;
        if (t.startsWith('<!--')) return false;
        if (t === '- [[]]' || t === '- [[]] —') return false;
        return true;
      })
      .join('\n')
      .trim();
  }

  function buildBody(): string {
    return [
      `# ${title}`, '',
      `## 1. 一句话`, q1 || '', '',
      `## 2. 定位`,
      `系统：${system}　　　　　　　层：[${layer}]`,
      ...(q2Course ? [`课程：${q2Course}`] : []), '',
      `## 3. 踩在什么上面（纵向向下）`, q3 || '', '',
      `## 4. 通向哪里（纵向向上）`, q4 || '', '',
      `## 5. 横向定位 — 对应哪门课、在课本哪里（考试核心）`, q5 || '', '',
      `## 6. 如果现在是医生（临床反向）`,
      q6Sym ? `- 症状：${q6Sym}` : '- 症状：',
      q6Sign ? `- 体征：${q6Sign}` : '- 体征：',
      q6Exam ? `- 检查：${q6Exam}` : '- 检查：',
      q6Treat ? `- 治疗：${q6Treat}` : '- 治疗：',
    ].join('\n');
  }

  // ---- Field change handler: update state + detect [[ ----
  function onFieldChange(text: string, fieldName: string) {
    const setters: Record<string, (t: string) => void> = {
      q1: setQ1, q3: setQ3, q4: setQ4, q5: setQ5,
      q6sym: setQ6Sym, q6sign: setQ6Sign, q6exam: setQ6Exam, q6treat: setQ6Treat,
    };
    setters[fieldName]?.(text);
    fieldValues.current[fieldName] = text;

    // Check for unclosed [[
    const lastOpen = text.lastIndexOf('[[');
    if (lastOpen === -1 || text.indexOf(']]', lastOpen) !== -1) {
      setShowAutocomplete(false);
      return;
    }
    setAcQuery(text.slice(lastOpen + 2));
    setAcField(fieldName);
    setShowAutocomplete(true);
  }

  function handleTriggerLink(fieldName: string) {
    Keyboard.dismiss();
    setAcQuery('');
    setAcField(fieldName);
    setShowAutocomplete(true);
  }

  function applyAutocomplete(card: { path: string; title: string }) {
    setShowAutocomplete(false);

    const cleanPath = card.path.replace(/\.md$/, '');
    const replaceText = `[[${cleanPath}|${card.title}]]`;

    const currentText = fieldValues.current[acField] || '';

    const setters: Record<string, (t: string) => void> = {
      q1: setQ1, q3: setQ3, q4: setQ4, q5: setQ5,
      q6sym: setQ6Sym, q6sign: setQ6Sign, q6exam: setQ6Exam, q6treat: setQ6Treat,
    };
    const setter = setters[acField];
    if (setter) {
      // If there's an unclosed [[, replace it; otherwise append
      const lastOpen = currentText.lastIndexOf('[[');
      const hasClose = lastOpen !== -1 && currentText.indexOf(']]', lastOpen) !== -1;
      let newText: string;
      if (lastOpen !== -1 && !hasClose) {
        // Replace the unclosed [[ with the full link
        newText = currentText.slice(0, lastOpen) + replaceText;
      } else {
        // Append: add newline if field has content
        const sep = currentText ? '\n' : '';
        newText = currentText + sep + replaceText;
      }
      setter(newText);
      fieldValues.current[acField] = newText;
    }
  }

  const LAYER_LABELS: Record<string, string> = {
    '基础': '🟢 基础层', '桥梁': '🟡 桥梁层', '临床': '🔴 临床层', '前沿': '🔵 前沿层',
  };
  const LAYER_ORDER = ['基础', '桥梁', '临床', '前沿'];

  // Group cards by system → layer (mirrors skeleton tree hierarchy)
  const sysLayerGroups = (() => {
    const q = acQuery.toLowerCase();
    const matches = allCards.filter(c =>
      c.title.toLowerCase().includes(q) || c.path.toLowerCase().includes(q)
    );

    const cardItems = matches.filter(c => c.path.startsWith('卡片/'));
    const anchorItems = matches.filter(c => c.path.startsWith('临床锚点/'));

    // Deduplicate
    const seen = new Set<string>();
    const dedupe = <T extends typeof allCards>(items: T) => items.filter(c => {
      if (seen.has(c.path)) return false;
      seen.add(c.path);
      return true;
    });

    // Group cards: system → layer → cards
    const sysMap = new Map<string, Map<string, typeof allCards>>();
    for (const c of dedupe(cardItems)) {
      const sys = c.system || c.path.split('/')[1] || '其他';
      if (!sysMap.has(sys)) sysMap.set(sys, new Map());
      const layerMap = sysMap.get(sys)!;
      const lyr = c.layer || '其他';
      if (!layerMap.has(lyr)) layerMap.set(lyr, []);
      layerMap.get(lyr)!.push(c);
    }

    // Sort by SYSTEMS order, current system first
    const sysNames = Array.from(sysMap.keys()).sort((a, b) => {
      if (a === system) return -1;
      if (b === system) return 1;
      const ai = SYSTEMS.indexOf(a as any);
      const bi = SYSTEMS.indexOf(b as any);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    const result: Array<{
      key: string; system: string;
      layers: Array<{ layer: string; label: string; cards: typeof allCards }>;
    }> = [];

    for (const sysName of sysNames) {
      const layerMap = sysMap.get(sysName)!;
      const layers: Array<{ layer: string; label: string; cards: typeof allCards }> = [];

      // Sort layers by predefined order
      const layerNames = Array.from(layerMap.keys()).sort((a, b) => {
        const ai = LAYER_ORDER.indexOf(a);
        const bi = LAYER_ORDER.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });

      for (const lyr of layerNames) {
        const label = LAYER_LABELS[lyr] || lyr;
        layers.push({ layer: lyr, label, cards: layerMap.get(lyr)! });
      }

      result.push({ key: `sys-${sysName}`, system: sysName, layers });
    }

    // Anchor group (no layer grouping)
    if (anchorItems.length > 0) {
      result.push({
        key: 'anchor', system: '⚓ 临床锚点',
        layers: [{ layer: '', label: '', cards: dedupe(anchorItems) }],
      });
    }

    return result.filter(g => g.layers.some(l => l.cards.length > 0));
  })();

  // ---- Save ----
  async function handleSave() {
    const nodeTitle = title || q1.split('\n')[0]?.slice(0, 50) || '新卡片';
    const today = new Date().toISOString().slice(0, 10);

    const fm: Record<string, unknown> = {
      birthplace: existingPath
        ? ((await loadFm()).birthplace || nodeTitle)
        : nodeTitle,
      system,
      layer,
      projections: [],
      filled: today,
    };

    const body = buildBody();
    const content = serializeMarkdown(fm, body);
    const filePath = existingPath || `卡片/${system}/${nodeTitle}`;

    const isNewCard = !existingPath;

    setSaving(true);
    try {
      await writeFile(filePath, content);
      addRecentCard({ path: filePath, title: nodeTitle, system, layer, filled: today, birthplace: fm.birthplace as string });

      // Auto-register new card in the skeleton file
      if (isNewCard) {
        await registerInSkeleton(system, layer, nodeTitle);
      }

      setEditingCardPath(null);
      setSaved(true);
      setTimeout(() => router.back(), 600);
    } catch (e) {
      Alert.alert('保存失败', String(e));
      setSaving(false);
    }
  }

  /** Append a new node line to the skeleton file at the correct layer section */
  async function registerInSkeleton(sys: string, lyr: string, nodeTitle: string) {
    try {
      const skelPath = `骨架/${sys}.md`;
      const skelContent = await readFile(skelPath);

      // Map layer name to section header prefix
      const layerPrefix: Record<string, string> = {
        '基础': '## 🟢 基础层',
        '桥梁': '## 🟡 桥梁层',
        '临床': '## 🔴 临床层',
        '前沿': '## 🔵 前沿层',
      };
      const targetHeader = layerPrefix[lyr];
      if (!targetHeader) return;

      const newLine = `- [[卡片/${sys}/${nodeTitle}|${nodeTitle}]]\n`;

      // Find target section and the next section header
      const lines = skelContent.split('\n');
      let targetIdx = -1;
      let nextHeaderIdx = -1;

      for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim();
        if (t.startsWith(targetHeader)) {
          targetIdx = i;
        } else if (targetIdx >= 0 && t.startsWith('## ') && i > targetIdx) {
          nextHeaderIdx = i;
          break;
        }
      }

      if (targetIdx < 0) return; // layer section not found

      // Find last wiki link line in the section (skip empty lines at end)
      const insertEnd = nextHeaderIdx > 0 ? nextHeaderIdx : lines.length;
      let lastNodeIdx = -1;
      for (let i = targetIdx + 1; i < insertEnd; i++) {
        if (lines[i].includes('[[') || lines[i].includes('→')) {
          lastNodeIdx = i;
        }
      }

      // If any existing node line ends with newlines, insert after; otherwise after header
      const insertAt = lastNodeIdx > 0 ? lastNodeIdx + 1 : targetIdx + 1;

      // Check if node already exists (don't duplicate)
      if (skelContent.includes(`卡片/${sys}/${nodeTitle}`)) return;

      lines.splice(insertAt, 0, newLine);
      await writeFile(skelPath, lines.join('\n'));
    } catch {
      // Skeleton file missing or unreadable — skip silently
    }
  }

  async function loadFm() {
    try { const c = await readFile(existingPath!); return parseFrontmatter(c).frontmatter; }
    catch { return {}; }
  }

  return (
    <View style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/skeleton')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← 返回</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>{existingPath ? '编辑卡片' : '新卡片'}</Text>
        </View>
        <Text style={styles.pageHint}>★ 在 3~6 问题点击右上角 🔗 按钮即可建立知识关联，反向链接自动生成</Text>

        {/* Title */}
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>标题</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder=""
            placeholderTextColor="#c7c9cd"
          />
        </View>

        {/* System + Layer picker — compact row */}
        <View style={styles.pickerCard}>
          <Text style={styles.fieldLabel}>系统 & 层</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
            {SYSTEMS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.pickerChip, system === s && styles.pickerChipActive]}
                onPress={() => setSystem(s)}
              >
                <Text style={[styles.pickerChipText, system === s && styles.pickerChipTextActive]}>
                  {s.length > 4 ? s.slice(0, 3) : s}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.layerRow}>
            {LAYERS.map((l) => (
              <TouchableOpacity
                key={l}
                style={[styles.layerChip, layer === l && styles.layerChipActive]}
                onPress={() => setLayer(l)}
              >
                <Text style={[styles.layerChipText, layer === l && styles.layerChipTextActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 6 fields */}
        <EditorField label="1. 一句话概括" hint="用一句话说清这个知识节点的本质" value={q1} fieldName="q1" onFieldChange={onFieldChange} multiline onTriggerLink={handleTriggerLink} />
        <EditorField label="2. 定位（哪门课）" hint="如：病理生理学" value={q2Course} fieldName="q2" onFieldChange={(t) => setQ2Course(t)} />
        <EditorField label="3. 踩在什么上面" hint="- [[前置知识1]]&#10;- [[前置知识2]]" value={q3} fieldName="q3" onFieldChange={onFieldChange} multiline showLinkHint onTriggerLink={handleTriggerLink} />
        <EditorField label="4. 通向哪里" hint="- [[后续知识1]]&#10;- [[后续知识2]]" value={q4} fieldName="q4" onFieldChange={onFieldChange} multiline showLinkHint onTriggerLink={handleTriggerLink} />
        <EditorField label="5. 横向定位（考试核心）" hint="- [[同课知识点]] — 在课本中的定位？与前后章节的逻辑关系？" value={q5} fieldName="q5" onFieldChange={onFieldChange} multiline showLinkHint onTriggerLink={handleTriggerLink} />

        {/* Q6: 临床反向 — 4 sub-fields grouped */}
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>6. 如果现在是医生（临床反向）</Text>
          <Text style={styles.q6Hint}>按症状→体征→检查→治疗四个板块向前追溯</Text>
          <EditorField label="症状" hint="这个病/知识对应什么症状？" value={q6Sym} fieldName="q6sym" onFieldChange={onFieldChange} multiline onTriggerLink={handleTriggerLink} />
          <EditorField label="体征" hint="查体能发现什么？" value={q6Sign} fieldName="q6sign" onFieldChange={onFieldChange} multiline onTriggerLink={handleTriggerLink} />
          <EditorField label="检查" hint="需要做什么辅助检查？" value={q6Exam} fieldName="q6exam" onFieldChange={onFieldChange} multiline onTriggerLink={handleTriggerLink} />
          <EditorField label="治疗" hint="怎么治？核心原则和药物？" value={q6Treat} fieldName="q6treat" onFieldChange={onFieldChange} multiline onTriggerLink={handleTriggerLink} />
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, (saving || saved) && styles.saveBtnDone]}
          onPress={handleSave}
          disabled={saving || saved}
        >
          <Text style={styles.saveBtnText}>
            {saved ? '✅ 已保存' : saving ? '保存中...' : '保存卡片'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
    </KeyboardAvoidingView>

      {/* Autocomplete — outside KeyboardAvoidingView to prevent clipping */}
      {showAutocomplete && (
        <View style={styles.acOverlay}>
          <TouchableOpacity
            style={styles.acBackdrop}
            onPress={() => setShowAutocomplete(false)}
            activeOpacity={1}
          />
          <View style={styles.acBox}>
            <View style={styles.acHeader}>
              <Text style={styles.acTitle}>选择要链接的卡片</Text>
              {acQuery ? (
                <Text style={styles.acQuery}>筛选: "{acQuery}"</Text>
              ) : (
                <Text style={styles.acHint}>共 {allCards.length} 张卡片，按系统 → 层级排列</Text>
              )}
            </View>
            <ScrollView style={styles.acList} keyboardShouldPersistTaps="always">
              {sysLayerGroups.length > 0 ? (
                sysLayerGroups.map((group) => {
                  const isCurrent = group.system === system;
                  const totalCards = group.layers.reduce((s, l) => s + l.cards.length, 0);
                  const isCollapsed = collapsedSystems[group.key] ?? !isCurrent;
                  return (
                    <View key={group.key} style={styles.acSysGroup}>
                      <TouchableOpacity
                        style={[styles.acSysHeader, isCurrent && styles.acSysHeaderCurrent]}
                        onPress={() => setCollapsedSystems(prev => ({ ...prev, [group.key]: !isCollapsed }))}
                        activeOpacity={0.6}
                      >
                        <Text style={styles.acChevron}>{isCollapsed ? '▶' : '▼'}</Text>
                        <Text style={[styles.acSysTitle, isCurrent && styles.acSysTitleCurrent]}>
                          {isCurrent ? '📌 ' : '📎 '}{group.system}
                        </Text>
                        <View style={styles.acGroupBadge}>
                          <Text style={styles.acGroupBadgeText}>{totalCards}</Text>
                        </View>
                      </TouchableOpacity>
                      {!isCollapsed && (
                        <View style={styles.acSysBody}>
                          {group.layers.map((layer) => (
                            <View key={layer.layer || layer.label} style={styles.acLayerGroup}>
                              {layer.label ? (
                                <View style={styles.acLayerHeader}>
                                  <Text style={styles.acLayerLabel}>{layer.label}</Text>
                                  <Text style={styles.acLayerCount}>{layer.cards.length}张</Text>
                                </View>
                              ) : null}
                              {layer.cards.map((card, ci) => (
                                <TouchableOpacity
                                  key={ci}
                                  style={styles.acItem}
                                  onPress={() => applyAutocomplete(card)}
                                >
                                  <Text style={styles.acItemTitle} numberOfLines={1}>{card.title}</Text>
                                  <Text style={styles.acItemPath} numberOfLines={1}>{card.path}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <View style={styles.acEmptyWrap}>
                  <Text style={styles.acEmpty}>没有匹配的已有卡片</Text>
                  <Text style={styles.acEmptyHint}>请先在骨架中创建卡片，然后再来链接</Text>
                </View>
              )}
              <View style={{ height: 12 }} />
            </ScrollView>
            <TouchableOpacity
              style={styles.acClose}
              onPress={() => setShowAutocomplete(false)}
            >
              <Text style={styles.acCloseText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f8f9fa' },
  container: { flex: 1 },
  content: { padding: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12 },
  backBtn: {
    backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  backBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#111' },
  pageHint: { fontSize: 12, color: '#6b7280', marginBottom: 16, lineHeight: 18, fontStyle: 'italic' },

  titleInput: { fontSize: 18, fontWeight: '600', color: '#111', padding: 0 },

  // Cards
  fieldCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  linkTrigger: { padding: 4 },
  linkTriggerText: { fontSize: 14 },
  fieldHint: { fontSize: 11, color: '#b0b7c3', marginBottom: 6, fontStyle: 'italic', lineHeight: 16 },
  fieldInput: { fontSize: 15, color: '#1f2937', padding: 0, minHeight: 28 },
  fieldInputMulti: { minHeight: 56 },
  linkHint: { fontSize: 10, color: '#c7c9cd', marginTop: 6, fontStyle: 'italic' },
  q6Hint: { fontSize: 12, color: '#9ca3af', marginBottom: 10, fontStyle: 'italic' },

  // Pickers
  pickerCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  pickerScroll: { marginBottom: 10 },
  pickerChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 14, backgroundColor: '#f3f4f6', marginRight: 6,
  },
  pickerChipActive: { backgroundColor: '#2563eb' },
  pickerChipText: { fontSize: 12, color: '#6b7280' },
  pickerChipTextActive: { color: '#fff', fontWeight: '600' },
  layerRow: { flexDirection: 'row', gap: 8 },
  layerChip: {
    flex: 1, paddingVertical: 7, borderRadius: 10,
    backgroundColor: '#f3f4f6', alignItems: 'center',
  },
  layerChipActive: { backgroundColor: '#e0e7ff' },
  layerChipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  layerChipTextActive: { color: '#2563eb' },

  // Save
  saveBtn: {
    backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  saveBtnDone: { backgroundColor: '#22c55e' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Autocomplete — fixed overlay replaces Modal
  acOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
    justifyContent: 'flex-end',
  },
  acBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  acBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '70%',
  },
  acHeader: { marginBottom: 12 },
  acTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  acQuery: { fontSize: 13, color: '#2563eb', marginTop: 4, fontWeight: '500' },
  acHint: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  acList: { maxHeight: 400 },
  // System group
  acSysGroup: { marginBottom: 8, borderRadius: 10, overflow: 'hidden' },
  acSysHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f3f4f6', paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 8,
  },
  acChevron: { fontSize: 10, color: '#9ca3af', marginRight: 8, width: 14 },
  acSysHeaderCurrent: { backgroundColor: '#dbeafe' },
  acGroupArrow: { fontSize: 10, color: '#6b7280', marginRight: 8, width: 14 },
  acSysTitle: { fontSize: 13, fontWeight: '700', color: '#374151', flex: 1 },
  acSysTitleCurrent: { color: '#1e40af' },
  acGroupBadge: {
    backgroundColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2, minWidth: 24,
    alignItems: 'center',
  },
  acGroupBadgeText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  // System body
  acSysBody: {
    backgroundColor: '#fafafa',
    borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
    paddingBottom: 4,
  },
  // Layer subgroup
  acLayerGroup: { marginBottom: 2 },
  acLayerHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, paddingHorizontal: 16,
    backgroundColor: '#f0f4ff',
  },
  acLayerLabel: { fontSize: 11, fontWeight: '700', color: '#4b5563', flex: 1 },
  acLayerCount: { fontSize: 10, color: '#9ca3af' },
  // Card items
  acItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 20,
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  acItemTitle: { fontSize: 14, fontWeight: '600', color: '#2563eb', flex: 1 },
  acItemPath: { fontSize: 10, color: '#9ca3af', marginLeft: 8, maxWidth: '40%' },
  // Empty
  acEmptyWrap: { padding: 30, alignItems: 'center' },
  acEmpty: { fontSize: 14, color: '#9ca3af' },
  acEmptyHint: { fontSize: 12, color: '#d1d5db', marginTop: 4 },
  // Close
  acClose: {
    marginTop: 12, backgroundColor: '#f3f4f6', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  acCloseText: { fontSize: 15, fontWeight: '600', color: '#374151' },
});
