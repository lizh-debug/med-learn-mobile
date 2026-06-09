// Anchor editor – 4-section structured editing for clinical anchors with [[ autocomplete
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { serializeMarkdown, parseFrontmatter } from '../lib/markdownParser';
import { writeFile, readFile } from '../lib/fileStore';
import { useAppStore } from '../store/useAppStore';
import { useAutocomplete, type CardRef } from '../lib/useAutocomplete';

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

  // Autocomplete — shared hook
  const {
    allCards, showAutocomplete, acQuery, acField, collapsedSystems, setCollapsedSystems,
    fieldValues, onFieldChange: acOnFieldChange, handleTriggerLink: acHandleTriggerLink,
    applyAutocomplete: acApplyAutocomplete, closeAutocomplete, sysLayerGroups,
  } = useAutocomplete();

  const fieldSetters: Record<string, (t: string) => void> = {
    oneliner: setOneliner, baseLayer: setBaseLayer, bridgeLayer: setBridgeLayer, sysLinks: setSysLinks,
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
    if (!isNew) loadAnchor();
    else loadTemplate();
  }, [filePath, isNew]);

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

  return (
    <View style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Text style={styles.pageTitle}>{isNew ? '新建锚点' : `编辑锚点：${title}`}</Text>
        </View>

        {isNew ? (
          <View style={styles.sectionCard} testID="glass">
            <Text style={styles.sectionLabel}>锚点名称</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder=""
              placeholderTextColor="#5A6980"
            />
            <Text style={styles.hint}>保存后将创建到 临床锚点/{category}/ 目录</Text>
          </View>
        ) : null}

        {/* 1. 一句话概括 */}
        <View style={styles.sectionCard} testID="glass">
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
            onChangeText={(t) => onFieldChange(t, 'oneliner', setOneliner)}
            placeholder=""
            placeholderTextColor="#c7c9cd"
            multiline textAlignVertical="top"
          />
        </View>

        {/* 2. 鉴别矩阵 */}
        <View style={styles.sectionCard} testID="glass">
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
        <View style={styles.sectionCard} testID="glass">
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
            onChangeText={(t) => onFieldChange(t, 'baseLayer', setBaseLayer)}
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
            onChangeText={(t) => onFieldChange(t, 'bridgeLayer', setBridgeLayer)}
            placeholder=""
            placeholderTextColor="#c7c9cd"
            multiline textAlignVertical="top"
          />
        </View>

        {/* 4. 关联系统骨架 */}
        <View style={styles.sectionCard} testID="glass">
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
            onChangeText={(t) => onFieldChange(t, 'sysLinks', setSysLinks)}
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
            onPress={closeAutocomplete}
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
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: '#E8EDF5' },

  titleInput: { fontSize: 18, fontWeight: '600', color: '#E8EDF5', padding: 0 },

  sectionCard: {
    backgroundColor: '#0F1520', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 0.5, borderColor: 'rgba(0,229,255,0.08)',
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#00E5FF' },
  subLabel: { fontSize: 14, fontWeight: '600', color: '#E8EDF5', marginTop: 12 },
  linkTrigger: { padding: 4 },
  linkTriggerText: { fontSize: 16 },
  hint: { fontSize: 13, color: '#5A6980', marginBottom: 8, fontStyle: 'italic' },
  fieldMulti: { fontSize: 16, color: '#E8EDF5', minHeight: 60, padding: 0, textAlignVertical: 'top' },
  fieldMultiLarge: { fontSize: 14, color: '#E8EDF5', minHeight: 120, padding: 0, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

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
  acSysHeaderCurrent: { backgroundColor: 'rgba(0,229,255,0.06)' },
  acChevron: { fontSize: 10, color: '#5A6980', marginRight: 10, width: 14 },
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
  acClose: {
    marginTop: 12, backgroundColor: '#141B26', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  acCloseText: { fontSize: 16, fontWeight: '600', color: '#E8EDF5' },
});
