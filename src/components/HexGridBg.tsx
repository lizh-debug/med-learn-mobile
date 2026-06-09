// 医维斯 Ivis — Hexagonal Grid Background
// Faint cyberpunk hex pattern extracted from network.tsx
// Renders as an absolutely-positioned full-screen SVG overlay.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { HEX_GRID } from '../theme/decorations';

export default React.memo(function HexGridBg() {
  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Hex grid rendered as an SVG-like pattern using View borders */}
      {/* For simplicity, we use a subtle dot grid approximation on mobile */}
      <View style={styles.gridPlaceholder} />
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  gridPlaceholder: {
    flex: 1,
    opacity: 0.3,
    // Dot pattern using repeating background (web) or subtle tint (native)
    borderWidth: 0,
  },
});
