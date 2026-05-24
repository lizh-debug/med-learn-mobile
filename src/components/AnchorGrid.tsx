// Anchor grid component - displays clinical anchors as tappable cards
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

interface Props {
  anchors: string[];
  category: string; // "症状" | "体征" | "检查异常"
}

export default function AnchorGrid({ anchors, category }: Props) {
  const router = useRouter();

  function handlePress(name: string) {
    const path = `临床锚点/${category}/${name}.md`;
    router.push(`/anchor/${encodeURIComponent(path)}`);
  }

  function handleAdd() {
    router.push(`/anchor/edit/new?category=${encodeURIComponent(category)}`);
  }

  return (
    <View style={styles.grid}>
      {anchors.map((name) => (
        <TouchableOpacity
          key={name}
          style={styles.card}
          onPress={() => handlePress(name)}
        >
          <Text style={styles.cardIcon}>{getIcon(category)}</Text>
          <Text style={styles.cardText}>{name}</Text>
        </TouchableOpacity>
      ))}
      {/* Add new anchor button */}
      <TouchableOpacity style={styles.addCard} onPress={handleAdd}>
        <Text style={styles.addIcon}>+</Text>
        <Text style={styles.addText}>新增</Text>
      </TouchableOpacity>
    </View>
  );
}

function getIcon(category: string): string {
  switch (category) {
    case '症状': return '🔍';
    case '体征': return '🩺';
    case '检查异常': return '📊';
    default: return '📋';
  }
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  card: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardIcon: { fontSize: 24, marginBottom: 6 },
  cardText: { fontSize: 13, fontWeight: '600', color: '#1f2937', textAlign: 'center' },
  addCard: {
    width: '30%',
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: { fontSize: 28, color: '#2563eb', fontWeight: '300', marginBottom: 4 },
  addText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
});
