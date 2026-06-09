// 医维斯 Ivis — Top HUD Status Bar
// RHS monospace status line. Does not block touches.

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useChatStore } from '../store/useChatStore';
import { neonCyan, iceWhite, mistGray, glassDark, glassBorder } from '../theme/colors';

interface Props {
  context?: string;
}

export default React.memo(function IvisHUD({ context = 'DASHBOARD' }: Props) {
  const isLoading = useChatStore((s) => s.isLoading);
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoading) {
      const scan = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(scanAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]),
      );
      scan.start();
      return () => scan.stop();
    }
  }, [isLoading]);

  const statusText = isLoading ? 'ANALYZING' : 'ONLINE';
  const statusColor = isLoading ? neonCyan : '#00FF88';

  return (
    <View style={styles.hud} pointerEvents="none">
      <View style={styles.line}>
        <Text style={styles.mono}>
          <Text style={{ color: neonCyan }}>⟡ </Text>
          <Text style={{ color: iceWhite }}>IVIS</Text>
          <Text style={{ color: mistGray }}> · </Text>
          <Text style={{ color: statusColor }}>{statusText}</Text>
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  hud: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
    paddingTop: 48,
    paddingRight: 16,
    paddingBottom: 4,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  mono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'Consolas, monospace',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
