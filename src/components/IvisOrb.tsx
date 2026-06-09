// 医维斯 Ivis — AI Orb (The JARVIS Core)
// Floating orb with pulse animation, always visible on every screen.
// Tap → open chat panel; Long-press → voice input.

import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity, View, Text, StyleSheet, Animated, Platform,
} from 'react-native';
import { useChatStore } from '../store/useChatStore';
import { neonCyan, neonCyanGlow, neoViolet, voidBlack } from '../theme/colors';

const ORB_SIZE = 56;
const PULSE_DURATION = 3000;

export default React.memo(function IvisOrb() {
  const isPanelOpen = useChatStore((s) => s.isPanelOpen);
  const isLoading = useChatStore((s) => s.isLoading);
  const openPanel = useChatStore((s) => s.openPanel);

  // Pulse animation for outer ring
  const pulseAnim = useRef(new Animated.Value(0)).current;
  // Rotate animation for inner hex
  const rotateAnim = useRef(new Animated.Value(0)).current;
  // Breathing scale
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Continuous pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: PULSE_DURATION / 2, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: PULSE_DURATION / 2, useNativeDriver: false }),
      ]),
    );
    // Slow rotation
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 12000,
        useNativeDriver: false,
      }),
    );
    pulse.start();
    rotate.start();
    return () => { pulse.stop(); rotate.stop(); };
  }, []);

  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.08, duration: 600, useNativeDriver: false }),
          Animated.timing(scaleAnim, { toValue: 0.95, duration: 600, useNativeDriver: false }),
        ]),
      ).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [isLoading]);

  if (isPanelOpen) return null;

  const outerScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.3] });
  const outerOpacity = pulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 0.1, 0.4] });
  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const ringStyle = (size: number, borderWidth: number, opacity: number) => ({
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth,
    borderColor: neonCyan,
    opacity,
  });

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      {/* Outer pulse ring */}
      <Animated.View
        style={[
          ringStyle(ORB_SIZE + 16, 1.5, 0),
          { opacity: outerOpacity, transform: [{ scale: outerScale }] },
        ]}
      />
      {/* Middle glow ring */}
      <View style={ringStyle(ORB_SIZE + 8, 0, 0)} />
      {/* Body */}
      <TouchableOpacity
        style={styles.orb}
        onPress={openPanel}
        activeOpacity={0.8}
        onLongPress={() => {
          // Voice input — not yet implemented on native, show hint
          if (Platform.OS === 'web') {
            openPanel();
          }
        }}
      >
        {/* Inner spinning hex */}
        <Animated.View style={[styles.hexWrap, { transform: [{ rotate }] }]}>
          <Text style={styles.hex}>⟡</Text>
        </Animated.View>
        {/* Core dot */}
        <View style={[styles.coreDot, { backgroundColor: isLoading ? neoViolet : neonCyan }]} />
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 110,
    left: 16,
    width: ORB_SIZE + 16,
    height: ORB_SIZE + 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: voidBlack,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: neonCyan,
    // Glow via shadow
    shadowColor: neonCyan,
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    elevation: 12,
  },
  hexWrap: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hex: {
    fontSize: 24,
    color: neonCyan,
    opacity: 0.7,
  },
  coreDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
