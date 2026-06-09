// 医维斯 Ivis — Neon Border Panel Wrapper
// Glass-morphism card with 1px neon border and corner brackets.

import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { neonCyan, glassBorder, deepSlate } from '../theme/colors';

interface Props {
  children: React.ReactNode;
  color?: string;
  style?: ViewStyle;
  /** Show corner bracket decorations */
  corners?: boolean;
}

export default React.memo(function NeonBorder({
  children,
  color = neonCyan,
  style,
  corners = true,
}: Props) {
  return (
    <View style={[styles.panel, { borderColor: glassBorder }, style]}>
      {corners && (
        <>
          {/* Top-left */}
          <View style={[styles.corner, styles.cornerTL, { borderColor: color }]} />
          {/* Top-right */}
          <View style={[styles.corner, styles.cornerTR, { borderColor: color }]} />
          {/* Bottom-left */}
          <View style={[styles.corner, styles.cornerBL, { borderColor: color }]} />
          {/* Bottom-right */}
          <View style={[styles.corner, styles.cornerBR, { borderColor: color }]} />
        </>
      )}
      {children}
    </View>
  );
});

const CORNER_SIZE = 8;
const CORNER_WIDTH = 1.5;

const styles = StyleSheet.create({
  panel: {
    backgroundColor: deepSlate,
    borderRadius: 12,
    borderWidth: 0.5,
    overflow: 'visible',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderWidth: 0,
    opacity: 0.5,
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: 2,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: 2,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: 2,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: 2,
  },
});
