// 医维斯 Ivis — HUD Data Display
// Monospace numeric readout with neon accent and trend indicator.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { neonCyan, iceWhite, frostGray, mistGray } from '../theme/colors';

interface Props {
  value: number | string;
  label: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  trend?: 'up' | 'down' | 'stable';
  unit?: string;
}

export default React.memo(function HUDData({
  value,
  label,
  color = neonCyan,
  size = 'md',
  trend,
  unit,
}: Props) {
  const numSize = size === 'lg' ? 36 : size === 'sm' ? 20 : 28;
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : trend === 'stable' ? '→' : '';
  const trendColor = trend === 'up' ? '#00FF88' : trend === 'down' ? '#FF3D71' : frostGray;

  return (
    <View style={styles.wrap}>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { fontSize: numSize, color }]}>
          {value}
        </Text>
        {unit && <Text style={[styles.unit, { color }]}>{unit}</Text>}
        {trendIcon !== '' && (
          <Text style={[styles.trend, { color: trendColor }]}>{trendIcon}</Text>
        )}
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  value: {
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 1,
  },
  unit: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 1,
  },
  trend: {
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 3,
  },
  label: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '600',
    color: mistGray,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
});
