// Shared autocomplete hook — used by CardEditor and AnchorEditor
import { useState, useRef, useEffect } from 'react';
import { Keyboard } from 'react-native';
import { listDirRecursive, readFile, ensureInit } from './fileStore';
import { parseFrontmatter } from './markdownParser';
import { SYSTEMS } from '../store/useAppStore';

export interface CardRef {
  path: string;
  title: string;
  layer: string;
  system: string;
}

export const LAYER_LABELS: Record<string, string> = {
  '基础': '🟢 基础层', '桥梁': '🟡 桥梁层', '临床': '🔴 临床层', '前沿': '🔵 前沿层',
};
const LAYER_ORDER = ['基础', '桥梁', '临床', '前沿'];

async function loadAllCards(): Promise<CardRef[]> {
  await ensureInit();
  const cards: CardRef[] = [];
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

  return cards;
}

export function useAutocomplete() {
  const [allCards, setAllCards] = useState<CardRef[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [acQuery, setAcQueryVal] = useState('');
  const [acField, setAcField] = useState('');
  const [collapsedSystems, setCollapsedSystems] = useState<Record<string, boolean>>({});
  const fieldValues = useRef<Record<string, string>>({});

  useEffect(() => {
    loadAllCards().then(setAllCards).catch(() => {});
  }, []);

  function onFieldChange(text: string, fieldName: string, setter?: (t: string) => void) {
    setter?.(text);
    fieldValues.current[fieldName] = text;

    const lastOpen = text.lastIndexOf('[[');
    if (lastOpen === -1 || text.indexOf(']]', lastOpen) !== -1) {
      setShowAutocomplete(false);
      return;
    }
    setAcQueryVal(text.slice(lastOpen + 2));
    setAcField(fieldName);
    setShowAutocomplete(true);
  }

  function handleTriggerLink(fieldName: string) {
    Keyboard.dismiss();
    setAcQueryVal('');
    setAcField(fieldName);
    setShowAutocomplete(true);
  }

  function applyAutocomplete(card: CardRef, setter: (t: string) => void) {
    setShowAutocomplete(false);
    const cleanPath = card.path.replace(/\.md$/, '');
    const replaceText = `[[${cleanPath}|${card.title}]]`;
    const currentText = fieldValues.current[acField] || '';
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

  function closeAutocomplete() {
    setShowAutocomplete(false);
  }

  function setAcQuery(q: string) {
    setAcQueryVal(q);
  }

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

  return {
    allCards,
    showAutocomplete,
    acQuery,
    acField,
    collapsedSystems,
    setCollapsedSystems,
    fieldValues,
    onFieldChange,
    handleTriggerLink,
    applyAutocomplete,
    closeAutocomplete,
    setAcQuery,
    sysLayerGroups,
  };
}
