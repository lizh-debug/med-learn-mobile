// Card editor – clean writing experience with [[ autocomplete
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { serializeMarkdown, parseFrontmatter } from '../lib/markdownParser';
import { writeFile, readFile } from '../lib/fileStore';
import { useAppStore, LAYERS, SYSTEMS } from '../store/useAppStore';
import { useAutocomplete, type CardRef } from '../lib/useAutocomplete';

// ── Accordion Section ──
function AccordionSection({
  num, icon, label, hint, value, fieldName, isActive, onToggle,
  onFieldChange, showLinkHint, onTriggerLink, setter, compact,
}: {
  num: string; icon: string; label: string; hint: string; value: string; fieldName: string;
  isActive: boolean; onToggle: () => void;
  onFieldChange: (text: string, field: string, setter?: (t: string) => void) => void;
  showLinkHint?: boolean;
  onTriggerLink?: (field: string) => void;
  setter?: (t: string) => void;
  compact?: boolean;
}) {
  const lastText = useRef('');

  function handleChange(text: string) {
    if (text === lastText.current) return;
    lastText.current = text;
    onFieldChange(text, fieldName, setter);
  }

  const preview = value ? value.split('\n')[0].slice(0, 50) + (value.length > 50 ? '…' : '') : '';

  return (
    <View style={[styles.sectionCard, isActive && styles.sectionCardActive]}>
      <TouchableOpacity style={styles.sectionHeader} onPress={onToggle} activeOpacity={0.6}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionIcon}>{icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>{label}</Text>
            {!isActive && preview ? (
              <Text style={styles.sectionPreview} numberOfLines={1}>{preview}</Text>
            ) : !isActive ? (
              <Text style={styles.sectionHint}>{hint}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.sectionHeaderRight}>
          {onTriggerLink && isActive && (
            <TouchableOpacity style={styles.linkBtn} onPress={() => onTriggerLink(fieldName)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.linkBtnText}>🔗</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.sectionChevron}>{isActive ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>
      {isActive && (
        <View style={styles.sectionBody}>
          <TextInput
            style={[styles.sectionInput, compact ? styles.sectionInputCompact : styles.sectionInputFull]}
            value={value}
            onChangeText={handleChange}
            onChange={(e) => {
              const text = (e.nativeEvent as any).text;
              if (typeof text === 'string') handleChange(text);
            }}
            placeholder={hint}
            placeholderTextColor="#3A4860"
            multiline
            textAlignVertical="top"
            autoFocus
          />
          {showLinkHint && (
            <Text style={styles.linkHint}>输入 [[ 可链接到已有卡片</Text>
          )}
        </View>
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
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  function toggleSection(key: string) {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // Autocomplete — shared hook
  const {
    allCards, showAutocomplete, acQuery, acField, collapsedSystems, setCollapsedSystems,
    fieldValues, onFieldChange: acOnFieldChange, handleTriggerLink: acHandleTriggerLink,
    applyAutocomplete: acApplyAutocomplete, closeAutocomplete, sysLayerGroups,
  } = useAutocomplete();

  const fieldSetters: Record<string, (t: string) => void> = {
    q1: setQ1, q3: setQ3, q4: setQ4, q5: setQ5,
    q6sym: setQ6Sym, q6sign: setQ6Sign, q6exam: setQ6Exam, q6treat: setQ6Treat,
  };

  function onFieldChange(text: string, fieldName: string, setter?: (t: string) => void) {
    acOnFieldChange(text, fieldName, setter || fieldSetters[fieldName]);
  }

  function handleTriggerLink(fieldName: string) {
    acHandleTriggerLink(fieldName);
  }

  function applyAutocomplete(card: CardRef) {
    acApplyAutocomplete(card, fieldSetters[acField]);
  }

  useEffect(() => {
    if (existingPath) loadExisting();
    else loadTemplate();
  }, [existingPath, prefillTitle]);

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
          <Text style={styles.pageTitle}>{existingPath ? '编辑卡片' : '新卡片'}</Text>
        </View>
        <Text style={styles.pageHint}>★ 在 3~6 问题点击右上角 🔗 按钮即可建立知识关联，反向链接自动生成</Text>

        {/* Title */}
        <View style={styles.fieldCard} testID="glass">
          <Text style={styles.fieldLabel}>标题</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder=""
            placeholderTextColor="#5A6980"
          />
        </View>

        {/* System + Layer picker — compact row */}
        <View style={styles.pickerCard} testID="glass">
          <Text style={styles.fieldLabel}>系统 & 层</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
            {SYSTEMS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.pickerChip, system === s && styles.pickerChipActive]}
                onPress={() => setSystem(s)}
              >
                <Text style={[styles.pickerChipText, system === s && styles.pickerChipTextActive]} numberOfLines={1}>
                  {s.replace('系统', '').replace('诊断公式', '诊断')}
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

        {/* 6 sections — accordion style */}
        <AccordionSection
          num="1" icon="💡" label="一句话概括"
          hint="用一句话说清这个知识节点的本质"
          value={q1} fieldName="q1"
          isActive={openSections.has('q1')}
          onToggle={() => toggleSection('q1')}
          onFieldChange={onFieldChange} setter={setQ1}
          onTriggerLink={handleTriggerLink}
        />
        <AccordionSection
          num="2" icon="📍" label="定位（哪门课）"
          hint="如：病理生理学"
          value={q2Course} fieldName="q2"
          isActive={openSections.has('q2')}
          onToggle={() => toggleSection('q2')}
          onFieldChange={(t: string) => setQ2Course(t)}
        />
        <AccordionSection
          num="3" icon="⬇️" label="踩在什么上面"
          hint="前置知识，每行一条 [[wiki链接]]"
          value={q3} fieldName="q3"
          isActive={openSections.has('q3')}
          onToggle={() => toggleSection('q3')}
          onFieldChange={onFieldChange} setter={setQ3} showLinkHint
          onTriggerLink={handleTriggerLink}
        />
        <AccordionSection
          num="4" icon="⬆️" label="通向哪里"
          hint="后续知识，每行一条 [[wiki链接]]"
          value={q4} fieldName="q4"
          isActive={openSections.has('q4')}
          onToggle={() => toggleSection('q4')}
          onFieldChange={onFieldChange} setter={setQ4} showLinkHint
          onTriggerLink={handleTriggerLink}
        />
        <AccordionSection
          num="5" icon="↔️" label="横向定位（考试核心）"
          hint="同课知识点，课本定位，前后章节逻辑"
          value={q5} fieldName="q5"
          isActive={openSections.has('q5')}
          onToggle={() => toggleSection('q5')}
          onFieldChange={onFieldChange} setter={setQ5} showLinkHint
          onTriggerLink={handleTriggerLink}
        />

        {/* Q6 */}
        <View style={styles.q6Card}>
          <Text style={styles.q6Title}>🩺 6. 如果现在是医生（临床反向）</Text>
          <AccordionSection
            num="6a" icon="🤒" label="症状"
            hint="这个病/知识对应什么症状？" value={q6Sym} fieldName="q6sym"
            isActive={openSections.has('q6sym')} onToggle={() => toggleSection('q6sym')}
            onFieldChange={onFieldChange} setter={setQ6Sym} onTriggerLink={handleTriggerLink}
            compact
          />
          <AccordionSection
            num="6b" icon="🩺" label="体征"
            hint="查体能发现什么？" value={q6Sign} fieldName="q6sign"
            isActive={openSections.has('q6sign')} onToggle={() => toggleSection('q6sign')}
            onFieldChange={onFieldChange} setter={setQ6Sign} onTriggerLink={handleTriggerLink}
            compact
          />
          <AccordionSection
            num="6c" icon="🔬" label="检查"
            hint="需要做什么辅助检查？" value={q6Exam} fieldName="q6exam"
            isActive={openSections.has('q6exam')} onToggle={() => toggleSection('q6exam')}
            onFieldChange={onFieldChange} setter={setQ6Exam} onTriggerLink={handleTriggerLink}
            compact
          />
          <AccordionSection
            num="6d" icon="💊" label="治疗"
            hint="怎么治？核心原则和药物？" value={q6Treat} fieldName="q6treat"
            isActive={openSections.has('q6treat')} onToggle={() => toggleSection('q6treat')}
            onFieldChange={onFieldChange} setter={setQ6Treat} onTriggerLink={handleTriggerLink}
            compact
          />
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

        <View style={{ height: 120 }} />
      </ScrollView>
    </KeyboardAvoidingView>

      {/* Autocomplete — outside KeyboardAvoidingView to prevent clipping */}
      {showAutocomplete && (
        <View style={styles.acOverlay}>
          <TouchableOpacity
            style={styles.acBackdrop}
            onPress={closeAutocomplete}
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
              onPress={closeAutocomplete}
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
  flex: { flex: 1, backgroundColor: '#080B12' },
  container: { flex: 1 },
  content: { padding: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#E8EDF5' },
  pageHint: { fontSize: 13, color: '#8E9DB5', marginBottom: 16, lineHeight: 18, fontStyle: 'italic' },

  titleInput: { fontSize: 18, fontWeight: '600', color: '#E8EDF5', padding: 0 },

  // Basic field card (title, pickers)
  fieldCard: {
    backgroundColor: '#0F1520', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 0.5, borderColor: 'rgba(0,229,255,0.08)',
  },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#00E5FF', textTransform: 'uppercase', letterSpacing: 0.5 },

  // ── Accordion sections ──
  sectionCard: {
    backgroundColor: '#0F1520', borderRadius: 14, marginBottom: 10,
    borderWidth: 0.5, borderColor: 'rgba(0,229,255,0.06)',
    overflow: 'hidden',
  },
  sectionCardActive: {
    borderColor: 'rgba(0,229,255,0.25)',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  sectionIcon: { fontSize: 18 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#E8EDF5' },
  sectionPreview: { fontSize: 12, color: '#8E9DB5', marginTop: 3 },
  sectionHint: { fontSize: 12, color: '#3A4860', marginTop: 3, fontStyle: 'italic' },
  sectionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkBtn: { padding: 4 },
  linkBtnText: { fontSize: 16 },
  sectionChevron: { fontSize: 10, color: '#5A6980' },
  sectionBody: { paddingHorizontal: 16, paddingBottom: 14 },
  sectionInput: {
    fontSize: 16, color: '#E8EDF5', padding: 14,
    backgroundColor: '#141B26', borderRadius: 10,
    borderWidth: 0.5, borderColor: 'rgba(0,229,255,0.08)',
  },
  sectionInputFull: { minHeight: 140 },
  sectionInputCompact: { minHeight: 80 },
  linkHint: { fontSize: 12, color: '#5A6980', marginTop: 8, fontStyle: 'italic' },

  // Q6 card
  q6Card: {
    backgroundColor: '#0F1520', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 0.5, borderColor: 'rgba(0,229,255,0.08)',
  },
  q6Title: { fontSize: 16, fontWeight: '700', color: '#FF3D71', marginBottom: 10 },

  pickerCard: {
    backgroundColor: '#0F1520', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 0.5, borderColor: 'rgba(0,229,255,0.08)',
  },
  pickerScroll: { maxHeight: 42, marginBottom: 12 },
  pickerChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16,
    backgroundColor: '#1A2233', marginRight: 8,
    borderWidth: 0.5, borderColor: 'rgba(0,229,255,0.10)',
  },
  pickerChipActive: { backgroundColor: '#00E5FF', borderColor: '#00E5FF' },
  pickerChipText: { fontSize: 14, color: '#8E9DB5', fontWeight: '500' },
  pickerChipTextActive: { color: '#080B12', fontWeight: '600' },
  layerRow: { flexDirection: 'row', gap: 8 },
  layerChip: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#1A2233', alignItems: 'center',
  },
  layerChipActive: { backgroundColor: 'rgba(0,229,255,0.10)' },
  layerChipText: { fontSize: 14, fontWeight: '600', color: '#8E9DB5' },
  layerChipTextActive: { color: '#00E5FF' },

  saveBtn: {
    backgroundColor: '#00E5FF', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: '#00E5FF', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6,
  },
  saveBtnDone: { backgroundColor: '#00FF88' },
  saveBtnText: { color: '#080B12', fontSize: 16, fontWeight: '700' },

  acOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999, justifyContent: 'flex-end',
  },
  acBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  acBox: {
    backgroundColor: '#0F1520', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '70%',
    borderTopWidth: 0.5, borderColor: 'rgba(0,229,255,0.15)',
  },
  acHeader: { marginBottom: 12 },
  acTitle: { fontSize: 17, fontWeight: '600', color: '#E8EDF5' },
  acQuery: { fontSize: 14, color: '#00E5FF', marginTop: 4, fontWeight: '500' },
  acHint: { fontSize: 13, color: '#8E9DB5', marginTop: 4 },
  acList: { maxHeight: 400 },
  acSysGroup: { marginBottom: 8, borderRadius: 12, overflow: 'hidden' },
  acSysHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#141B26', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10,
  },
  acChevron: { fontSize: 10, color: '#5A6980', marginRight: 10, width: 14 },
  acSysHeaderCurrent: { backgroundColor: 'rgba(0,229,255,0.06)' },
  acGroupArrow: { fontSize: 10, color: '#5A6980', marginRight: 10, width: 14 },
  acSysTitle: { fontSize: 14, fontWeight: '600', color: '#E8EDF5', flex: 1 },
  acSysTitleCurrent: { color: '#00E5FF' },
  acGroupBadge: {
    backgroundColor: 'rgba(0,229,255,0.08)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 3, minWidth: 24, alignItems: 'center',
  },
  acGroupBadgeText: { fontSize: 12, fontWeight: '600', color: '#8E9DB5' },
  acSysBody: {
    backgroundColor: '#0F1520',
    borderBottomLeftRadius: 10, borderBottomRightRadius: 10, paddingBottom: 4,
  },
  acLayerGroup: { marginBottom: 2 },
  acLayerHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 18 },
  acLayerLabel: { fontSize: 12, fontWeight: '700', color: '#5A6980', flex: 1, textTransform: 'uppercase' },
  acLayerCount: { fontSize: 11, color: '#5A6980' },
  acItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 22,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  acItemTitle: { fontSize: 15, fontWeight: '600', color: '#00E5FF', flex: 1 },
  acItemPath: { fontSize: 11, color: '#5A6980', marginLeft: 10, maxWidth: '40%' },
  acEmptyWrap: { padding: 30, alignItems: 'center' },
  acEmpty: { fontSize: 15, color: '#8E9DB5' },
  acEmptyHint: { fontSize: 13, color: '#5A6980', marginTop: 4 },
  acClose: {
    marginTop: 12, backgroundColor: '#141B26', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  acCloseText: { fontSize: 16, fontWeight: '600', color: '#E8EDF5' },
});
