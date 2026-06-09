// Floating action button — opens AI chat panel
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useChatStore } from '../store/useChatStore';

export default React.memo(function AIChatFAB() {
  const isPanelOpen = useChatStore((s) => s.isPanelOpen);
  const openPanel = useChatStore((s) => s.openPanel);

  if (isPanelOpen) return null;

  return (
    <TouchableOpacity style={styles.fab} onPress={openPanel} activeOpacity={0.8}>
      <Text style={styles.icon}>✨</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFCF8',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9997,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    shadowColor: '#8B6F5A',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  icon: { fontSize: 22 },
});
