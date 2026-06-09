// Overview page — renders 00-总入口.md with all system/anchors links
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { readNode, ensureInit } from '../src/lib/fileStore';
import { parseLine } from '../src/lib/markdownParser';
import WikiLinkText from '../src/components/WikiLinkText';

// ---- Table renderer ----
function parseTableRows(rows: string[]): { header: string[]; data: string[][] } {
  if (rows.length === 0) return { header: [], data: [] };
  const header = splitCells(rows[0]);
  const data: string[][] = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].match(/^\|[\s\-:|]+$/)) continue;
    data.push(splitCells(rows[i]));
  }
  return { header, data };
}

function splitCells(row: string): string[] {
  return row.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
}

function MarkdownTable({ rows }: { rows: string[] }) {
  const { header, data } = parseTableRows(rows);
  if (header.length === 0) return null;
  const colCount = header.length;
  const colWidths: number[] = Array(colCount).fill(60);
  const allRows = [header, ...data];
  for (const row of allRows) {
    for (let i = 0; i < colCount; i++) {
      const len = (row[i] || '').length;
      colWidths[i] = Math.max(colWidths[i], Math.min(len * 8 + 16, 150));
    }
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
      <View style={styles.tableWrap}>
        <View style={styles.tableHeaderRow}>
          {header.map((cell, ci) => (
            <View key={ci} style={[styles.tableHeaderCell, { width: colWidths[ci] }]}>
              <Text style={styles.tableHeaderText}>{cell}</Text>
            </View>
          ))}
        </View>
        {data.map((row, ri) => (
          <View key={ri} style={[styles.tableDataRow, ri % 2 === 0 && styles.tableDataRowEven]}>
            {row.map((cell, ci) => (
              <View key={ci} style={[styles.tableDataCell, { width: colWidths[ci] }]}>
                {cell.includes('[[') ? (
                  <WikiLinkText nodes={parseLine(cell)} />
                ) : (
                  <Text style={styles.tableDataText}>{cell}</Text>
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export default function OverviewScreen() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverview();
  }, []);

  async function loadOverview() {
    setLoading(true);
    try {
      await ensureInit();
      const node = await readNode('00-总入口');
      setContent(node.body);
    } catch {
      setContent('');
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#C8865D" />
      </View>
    );
  }

  const lines = content.split('\n');
  const elements: Array<{ type: string; line?: string; rows?: string[] }> = [];
  let tableBuffer: string[] = [];

  function flushTable() {
    if (tableBuffer.length > 0) {
      elements.push({ type: 'table', rows: [...tableBuffer] });
      tableBuffer = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|')) {
      tableBuffer.push(trimmed);
      continue;
    }
    flushTable();
    if (!trimmed) {
      elements.push({ type: 'spacer' });
    } else if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      elements.push({ type: 'heading', line: trimmed });
    } else if (trimmed.startsWith('> ')) {
      elements.push({ type: 'quote', line: trimmed });
    } else if (trimmed.startsWith('- ') || /^\d+\./.test(trimmed)) {
      elements.push({ type: 'list', line: trimmed });
    } else {
      elements.push({ type: 'text', line: trimmed });
    }
  }
  flushTable();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {elements.map((el, idx) => {
        switch (el.type) {
          case 'spacer':
            return <View key={idx} style={styles.spacer} />;
          case 'heading': {
            const t = el.line!;
            if (t.startsWith('# ') && idx === 0) {
              return <Text key={idx} style={styles.h1}>{t.replace('# ', '')}</Text>;
            }
            if (t.startsWith('## ')) {
              return <Text key={idx} style={styles.h2}>{t.replace('## ', '')}</Text>;
            }
            if (t.startsWith('### ')) {
              return <Text key={idx} style={styles.h3}>{t.replace('### ', '')}</Text>;
            }
            return <Text key={idx} style={styles.h2}>{t}</Text>;
          }
          case 'quote':
            return (
              <View key={idx} style={styles.quoteBox}>
                <Text style={styles.quote}>{el.line!.replace(/^>\s*/, '')}</Text>
              </View>
            );
          case 'list': {
            const nodes = parseLine(el.line!);
            const hasLinks = nodes.some(n => n.isWikiLink);
            if (hasLinks) {
              return (
                <View key={idx} style={styles.linkLine}>
                  <WikiLinkText nodes={nodes} />
                </View>
              );
            }
            return <Text key={idx} style={styles.listItem}>{el.line}</Text>;
          }
          case 'table':
            return <MarkdownTable key={idx} rows={el.rows!} />;
          default: {
            const nodes = parseLine(el.line!);
            const hasLinks = nodes.some(n => n.isWikiLink);
            if (hasLinks) {
              return (
                <View key={idx} style={styles.linkLine}>
                  <WikiLinkText nodes={nodes} />
                </View>
              );
            }
            return <Text key={idx} style={styles.paragraph}>{el.line}</Text>;
          }
        }
      })}
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F2' },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  h1: { fontSize: 24, fontWeight: '800', color: '#1C1C2A', marginBottom: 16 },
  h2: { fontSize: 18, fontWeight: '700', color: '#4A6785', marginTop: 20, marginBottom: 10 },
  h3: { fontSize: 15, fontWeight: '600', color: '#1C1C2A', marginTop: 14, marginBottom: 6 },
  quoteBox: {
    backgroundColor: '#F5EDE4', borderLeftWidth: 3,
    borderLeftColor: '#C8865D', padding: 10, marginVertical: 6, borderRadius: 4,
  },
  quote: { fontSize: 14, color: '#1C1C2A', lineHeight: 20, fontStyle: 'italic' },
  linkLine: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 3, paddingLeft: 8 },
  listItem: { fontSize: 14, color: '#1C1C2A', marginVertical: 3, paddingLeft: 16, lineHeight: 22 },
  paragraph: { fontSize: 14, color: '#1C1C2A', lineHeight: 22, marginVertical: 4 },
  spacer: { height: 8 },
  bottomPad: { height: 60 },
  tableScroll: { marginVertical: 12, borderRadius: 8, overflow: 'hidden' },
  tableWrap: { borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 8, overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#C8865D' },
  tableHeaderCell: { paddingVertical: 8, paddingHorizontal: 8, justifyContent: 'center' },
  tableHeaderText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  tableDataRow: { flexDirection: 'row', backgroundColor: '#FFFCF8' },
  tableDataRowEven: { backgroundColor: '#FAF7F2' },
  tableDataCell: { paddingVertical: 6, paddingHorizontal: 8, justifyContent: 'center' },
  tableDataText: { fontSize: 11, color: '#1C1C2A', lineHeight: 16 },
});
