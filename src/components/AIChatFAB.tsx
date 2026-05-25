// Floating action button — opens AI chat panel
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useChatStore } from '../store/useChatStore';

export default function AIChatFAB() {
  const isPanelOpen = useChatStore((s) => s.isPanelOpen);
  const openPanel = useChatStore((s) => s.openPanel);

  if (isPanelOpen) return null;

  return (
    <TouchableOpacity style={styles.fab} onPress={openPanel} activeOpacity={0.8}>
      <Text style={styles.icon}>✨</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute', bottom: 100, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#7c3aed',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 9997,
    shadowColor: '#7c3aed', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8, elevation: 8,
  },
  icon: { fontSize: 24 },
});
