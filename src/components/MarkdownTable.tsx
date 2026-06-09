// Shared markdown table renderer — used by CardView, AnchorDetail, AIMessageBubble
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

function splitCells(row: string): string[] {
  return row.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
}

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

export default React.memo(function MarkdownTable({ rows, scrollEnabled = true }: { rows: string[]; scrollEnabled?: boolean }) {
  const { header, data } = parseTableRows(rows);
  if (header.length === 0) return null;

  const allRows = [header, ...data];
  const colCount = header.length;
  const colWidths: number[] = Array(colCount).fill(60);
  for (const row of allRows) {
    for (let i = 0; i < colCount; i++) {
      const len = (row[i] || '').length;
      colWidths[i] = Math.max(colWidths[i], Math.min(len * 8 + 16, 150));
    }
  }

  const content = (
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
              <Text style={styles.tableDataText}>{cell}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );

  if (scrollEnabled) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
        {content}
      </ScrollView>
    );
  }
  return content;
});

const styles = StyleSheet.create({
  tableScroll: { marginVertical: 8 },
  tableWrap: {
    borderWidth: 1, borderColor: '#1E2838', borderRadius: 8, overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row', backgroundColor: '#1A2233',
    borderBottomWidth: 1, borderBottomColor: '#1E2838',
  },
  tableHeaderCell: {
    paddingHorizontal: 8, paddingVertical: 10,
    borderRightWidth: 1, borderRightColor: '#1E2838',
  },
  tableHeaderText: { fontSize: 13, fontWeight: '700', color: '#00E5FF' },
  tableDataRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1E2838',
  },
  tableDataRowEven: { backgroundColor: '#141B26' },
  tableDataCell: {
    paddingHorizontal: 8, paddingVertical: 8,
    borderRightWidth: 1, borderRightColor: '#1E2838',
  },
  tableDataText: { fontSize: 13, color: '#E8EDF5' },
});
