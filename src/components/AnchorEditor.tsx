// Anchor editor – 4-section structured editing for clinical anchors with [[ autocomplete
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { serializeMarkdown, parseFrontmatter } from '../lib/markdownParser';
import { writeFile, readFile, listDirRecursive, ensureInit } from '../lib/fileStore';
import { useAppStore, SYSTEMS } from '../store/useAppStore';

interface Props {
  filePath: string;
  isNew?: boolean;
  category?: string;
}

export default function AnchorEditor({ filePath, isNew, category }: Props) {
  const router = useRouter();
  const triggerSkeletonRefresh = useAppStore((s) => s.triggerSkeletonRefresh);

  const [title, setTitle] = useState('');
  const [oneliner, setOneliner] = useState('');
  const [matrix, setMatrix] = useState('');
  const [baseLayer, setBaseLayer] = useState('');
  const [bridgeLayer, setBridgeLayer] = useState('');
  const [sysLinks, setSysLinks] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Autocomplete
  const [allCards, setAllCards] = useState<Array<{ path: string; title: string; layer: string; system: string }>>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [acQuery, setAcQuery] = useState('');
  const [acField, setAcField] = useState('');
  const [collapsedSystems, setCollapsedSystems] = useState<Record<string, boolean>>({});
  const fieldValues = useRef<Record<string, string>>({ oneliner: '', baseLayer: '', bridgeLayer: '', sysLinks: '' });

  useEffect(() => {
    loadCards();
    if (!isNew) loadAnchor();
    else loadTemplate();
  }, [filePath, isNew]);

  async function loadCards() {
    try {
      await ensureInit();
      const cards: Array<{ path: string; title: string; layer: string; system: string }> = [];
      const seen = new Set<string>();

      // 1. Existing card files
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

      // 2. Skeleton nodes (unfilled)
      const skelFiles = listDirRecursive('骨架');
      for (const skelFile of skelFiles) {
        try {
          const sysName = skelFile.split('/').pop()?.replace('.md', '') || '';
          const content = await readFile(skelFile);
          const lines = content.split('\n');
          let currentLayer = '';
          for (const line of lines) {
            if (line.includes('🟢') && (line.includes('基础层') || line.includes('基础'))) currentLayer = '基础';
            else if (line.includes('🟡') && (line.includes('桥梁层') || line.includes('桥梁'))) currentLayer = '桥梁';
            else if (line.includes('🔴') && (line.includes('临床层') || line.includes('临床'))) currentLayer = '临床';
            else if (line.includes('🔵') && (line.includes('前沿层') || line.includes('前沿'))) currentLayer = '前沿';

            const linkMatch = line.match(/\[\[([^\]]+)\]\]/);
            if (!linkMatch) continue;

            const inner = linkMatch[1];
            const pipeIdx = inner.indexOf('|');
            const linkPath = pipeIdx !== -1 ? inner.slice(0, pipeIdx).trim() : inner.trim();
            let displayName: string;

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

            const cleanPath = linkPath.replace(/\.md$/, '');
            if (seen.has(cleanPath)) continue;
            seen.add(cleanPath);

            cards.push({ path: cleanPath, title: displayName, layer: currentLayer, system: sysName });
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

  function loadTemplate() {
    setMatrix('| 类型 | 特征 | 病因 |\n|------|------|------|\n| | | |');
  }

  async function loadAnchor() {
    try {
      const content = await readFile(filePath);
      const { frontmatter, body } = parseFrontmatter(content);
      const bodyTitle = body.match(/^#\s+(.+)$/m)?.[1] || filePath.split('/').pop()?.replace('.md', '') || '';
      setTitle(bodyTitle);
      parseAnchorBody(body);
    } catch { /* */ }
  }

  function parseAnchorBody(body: string) {
    const quoteMatch = body.match(/^>\s*\*\*一句话\*\*[：:]?\s*(.*?)$/m)
      || body.match(/^>\s*\*\*一句话\*\*[：:]?\s*([\s\S]*?)(?=\n##|\n(?:[^>]|$))/m);
    if (quoteMatch) setOneliner(quoteMatch[1].trim());

    const matrixMatch = body.match(/##\s*鉴别矩阵\s*\n([\s\S]*?)(?=\n##|\n#\s|$)/);
    if (matrixMatch) setMatrix(matrixMatch[1].trim());

    const traceMatch = body.match(/##\s*反向追溯\s*\n([\s\S]*?)(?=\n##\s*关联系统骨架|$)/);
    if (traceMatch) {
      const traceContent = traceMatch[1].trim();
      const baseMatch = traceContent.match(/###\s*🟢[^#]*\n([\s\S]*?)(?=###\s*🟡|$)/);
      const bridgeMatch = traceContent.match(/###\s*🟡[^#]*\n([\s\S]*?)$/);

      if (baseMatch) setBaseLayer(baseMatch[1].trim());
      else {
        const bm = traceContent.match(/(?:^|\n)-\s*\*\*基础层\*\*[：:]?\s*(.*)$/m);
        if (bm) setBaseLayer(bm[1].trim());
        else setBaseLayer(traceContent.split(/###/)[0]?.trim() || traceContent);
      }
      if (bridgeMatch) setBridgeLayer(bridgeMatch[1].trim());
      else {
        const bm = traceContent.match(/(?:^|\n)-\s*\*\*桥梁层\*\*[：:]?\s*(.*)$/m);
        if (bm) setBridgeLayer(bm[1].trim());
      }
    }

    const sysMatch = body.match(/##\s*关联系统骨架\s*\n([\s\S]*?)$/);
    if (sysMatch) setSysLinks(sysMatch[1].trim());
  }

  function buildBody(): string {
    const parts: string[] = [];
    parts.push(`# ${title}`, '');
    parts.push(`> **一句话**：${oneliner || ''}`, '');

    parts.push('## 鉴别矩阵', '');
    parts.push(matrix || '', '');

    parts.push('## 反向追溯', '');
    parts.push('### 🟢 基础层前置');
    parts.push(baseLayer || '', '');
    parts.push('### 🟡 桥梁层');
    parts.push(bridgeLayer || '', '');

    parts.push('## 关联系统骨架');
    parts.push(sysLinks || '', '');

    return parts.join('\n');
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('请输入锚点名称');
      return;
    }
    setSaving(true);
    try {
      const body = buildBody();
      const content = serializeMarkdown({}, body);
      const savePath = isNew
        ? `临床锚点/${category}/${title}.md`
        : filePath;
      await writeFile(savePath, content);
      triggerSkeletonRefresh();
      setSaved(true);
      setTimeout(() => router.back(), 500);
    } catch (e) {
      setSaving(false);
      Alert.alert('保存失败', String(e));
    }
  }

  // ---- Autocomplete logic ----
  function onFieldChange(text: string, fieldName: string) {
    const setters: Record<string, (t: string) => void> = {
      oneliner: setOneliner, baseLayer: setBaseLayer, bridgeLayer: setBridgeLayer, sysLinks: setSysLinks,
    };
    setters[fieldName]?.(text);
    fieldValues.current[fieldName] = text;

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
      oneliner: setOneliner, baseLayer: setBaseLayer, bridgeLayer: setBridgeLayer, sysLinks: setSysLinks,
    };
    const setter = setters[acField];
    if (setter) {
      const lastOpen = currentText.lastIndexOf('[[');
      const hasClose = lastOpen !== -1 && currentText.indexOf(']]', lastOpen) !== -1;
      let newText: string;
      if (lastOpen !== -1 && !hasClose) {
        newText = currentText.slice(0, lastOpen) + replaceText;
      } else {
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

  const sysLayerGroups = (() => {
    const q = acQuery.toLowerCase();
    const matches = allCards.filter(c =>
      c.title.toLowerCase().includes(q) || c.path.toLowerCase().includes(q)
    );

    const cardItems = matches.filter(c => c.path.startsWith('卡片/'));
    const anchorItems = matches.filter(c => c.path.startsWith('临床锚点/'));

    const seen = new Set<string>();
    const dedupe = <T extends typeof allCards>(items: T) => items.filter(c => {
      if (seen.has(c.path)) return false;
      seen.add(c.path);
      return true;
    });

    const sysMap = new Map<string, Map<string, typeof allCards>>();
    for (const c of dedupe(cardItems)) {
      const sys = c.system || c.path.split('/')[1] || '其他';
      if (!sysMap.has(sys)) sysMap.set(sys, new Map());
      const layerMap = sysMap.get(sys)!;
      const lyr = c.layer || '其他';
      if (!layerMap.has(lyr)) layerMap.set(lyr, []);
      layerMap.get(lyr)!.push(c);
    }

    const sysNames = Array.from(sysMap.keys()).sort((a, b) => {
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

    if (anchorItems.length > 0) {
      result.push({
        key: 'anchor', system: '⚓ 临床锚点',
        layers: [{ layer: '', label: '', cards: dedupe(anchorItems) }],
      });
    }

    return result.filter(g => g.layers.some(l => l.cards.length > 0));
  })();

  return (
    <View style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/skeleton')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← 返回</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>{isNew ? '新建锚点' : `编辑锚点：${title}`}</Text>
        </View>

        {isNew ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>锚点名称</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder=""
              placeholderTextColor="#c7c9cd"
            />
            <Text style={styles.hint}>保存后将创建到 临床锚点/{category}/ 目录</Text>
          </View>
        ) : null}

        {/* 1. 一句话概括 */}
        <View style={styles.sectionCard}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionLabel}>1. 一句话概括</Text>
            <TouchableOpacity style={styles.linkTrigger} onPress={() => handleTriggerLink('oneliner')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.linkTriggerText}>🔗</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>用一句话说清这个体征/症状的核心机制</Text>
          <TextInput
            style={styles.fieldMulti}
            value={oneliner}
            onChangeText={(t) => onFieldChange(t, 'oneliner')}
            placeholder=""
            placeholderTextColor="#c7c9cd"
            multiline textAlignVertical="top"
          />
        </View>

        {/* 2. 鉴别矩阵 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>2. 鉴别矩阵（Markdown 表格）</Text>
          <Text style={styles.hint}>使用 | 分隔列，换行分隔行</Text>
          <TextInput
            style={styles.fieldMultiLarge}
            value={matrix}
            onChangeText={setMatrix}
            placeholder=""
            placeholderTextColor="#c7c9cd"
            multiline textAlignVertical="top"
          />
        </View>

        {/* 3. 反向追溯 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>3. 反向追溯</Text>

          <View style={styles.labelRow}>
            <Text style={styles.subLabel}>🟢 基础层前置</Text>
            <TouchableOpacity style={styles.linkTrigger} onPress={() => handleTriggerLink('baseLayer')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.linkTriggerText}>🔗</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>每行一个 [[链接]]，注明关联的基础知识</Text>
          <TextInput
            style={styles.fieldMulti}
            value={baseLayer}
            onChangeText={(t) => onFieldChange(t, 'baseLayer')}
            placeholder=""
            placeholderTextColor="#c7c9cd"
            multiline textAlignVertical="top"
          />

          <View style={styles.labelRow}>
            <Text style={styles.subLabel}>🟡 桥梁层</Text>
            <TouchableOpacity style={styles.linkTrigger} onPress={() => handleTriggerLink('bridgeLayer')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.linkTriggerText}>🔗</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>每行一个 [[链接]]，注明病理/病生/诊断/药理关联</Text>
          <TextInput
            style={styles.fieldMulti}
            value={bridgeLayer}
            onChangeText={(t) => onFieldChange(t, 'bridgeLayer')}
            placeholder=""
            placeholderTextColor="#c7c9cd"
            multiline textAlignVertical="top"
          />
        </View>

        {/* 4. 关联系统骨架 */}
        <View style={styles.sectionCard}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionLabel}>4. 关联系统骨架</Text>
            <TouchableOpacity style={styles.linkTrigger} onPress={() => handleTriggerLink('sysLinks')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.linkTriggerText}>🔗</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>每个系统一行，使用 [[骨架/系统名]] 链接</Text>
          <TextInput
            style={styles.fieldMulti}
            value={sysLinks}
            onChangeText={(t) => onFieldChange(t, 'sysLinks')}
            placeholder=""
            placeholderTextColor="#c7c9cd"
            multiline textAlignVertical="top"
          />
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, (saving || saved) && styles.saveBtnDone]}
          onPress={handleSave}
          disabled={saving || saved}
        >
          <Text style={styles.saveBtnText}>
            {saved ? '✅ 已保存' : saving ? '保存中...' : '保存锚点'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
    </KeyboardAvoidingView>

      {/* Autocomplete overlay */}
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
                <Text style={styles.acHint}>共 {allCards.length} 张卡片，按系统排列</Text>
              )}
            </View>
            <ScrollView style={styles.acList} keyboardShouldPersistTaps="always">
              {sysLayerGroups.length > 0 ? (
                sysLayerGroups.map((group) => {
                  const isCurrent = false; // no current system in anchor editor
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
                          📎 {group.system}
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
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  backBtn: { backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  backBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#111' },

  titleInput: { fontSize: 18, fontWeight: '600', color: '#111', padding: 0 },

  sectionCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#1e40af' },
  subLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 10 },
  linkTrigger: { padding: 4 },
  linkTriggerText: { fontSize: 14 },
  hint: { fontSize: 10, color: '#b0b7c3', marginBottom: 6, fontStyle: 'italic' },
  fieldMulti: { fontSize: 14, color: '#1f2937', minHeight: 56, padding: 0, textAlignVertical: 'top' },
  fieldMultiLarge: { fontSize: 13, color: '#1f2937', minHeight: 120, padding: 0, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  saveBtn: {
    backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  saveBtnDone: { backgroundColor: '#22c55e' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Autocomplete overlay
  acOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999, justifyContent: 'flex-end',
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
  acSysGroup: { marginBottom: 8, borderRadius: 10, overflow: 'hidden' },
  acSysHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f3f4f6', paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 8,
  },
  acSysHeaderCurrent: { backgroundColor: '#dbeafe' },
  acChevron: { fontSize: 10, color: '#9ca3af', marginRight: 8, width: 14 },
  acSysTitle: { fontSize: 13, fontWeight: '700', color: '#374151', flex: 1 },
  acSysTitleCurrent: { color: '#1e40af' },
  acGroupBadge: {
    backgroundColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2, minWidth: 24, alignItems: 'center',
  },
  acGroupBadgeText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  acSysBody: {
    backgroundColor: '#fafafa',
    borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
    paddingBottom: 4,
  },
  acLayerGroup: { marginBottom: 2 },
  acLayerHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, paddingHorizontal: 16,
    backgroundColor: '#f0f4ff',
  },
  acLayerLabel: { fontSize: 11, fontWeight: '700', color: '#4b5563', flex: 1 },
  acLayerCount: { fontSize: 10, color: '#9ca3af' },
  acItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 20,
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  acItemTitle: { fontSize: 14, fontWeight: '600', color: '#2563eb', flex: 1 },
  acItemPath: { fontSize: 10, color: '#9ca3af', marginLeft: 8, maxWidth: '40%' },
  acEmptyWrap: { padding: 30, alignItems: 'center' },
  acEmpty: { fontSize: 14, color: '#9ca3af' },
  acClose: {
    marginTop: 12, backgroundColor: '#f3f4f6', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  acCloseText: { fontSize: 15, fontWeight: '600', color: '#374151' },
});
