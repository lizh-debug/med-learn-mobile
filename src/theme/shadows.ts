// 暗金 · 液态玻璃 — Floating Shadow System
import { Platform } from 'react-native';

interface Shadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

const floatShadow = (opacity: number, radius: number, y: number): Shadow => ({
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: y },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation: Platform.OS === 'android' ? Math.round(radius * 1.6) : 0,
});

export const shadows = {
  xs: floatShadow(0.12, 6, 3),
  sm: floatShadow(0.18, 14, 8),
  md: floatShadow(0.25, 24, 14),
  lg: floatShadow(0.32, 35, 20),
  xl: floatShadow(0.40, 48, 28),
} as const;

export const fabShadow = (color?: string): Shadow => ({
  shadowColor: color || '#000000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.35,
  shadowRadius: 20,
  elevation: 12,
});

export const copperGlow = (): Shadow => fabShadow();
export const indigoGlow = (): Shadow => floatShadow(0.15, 16, 8);
export const greenGlow = (): Shadow => floatShadow(0.12, 12, 4);
export const amberGlow = (): Shadow => floatShadow(0.20, 18, 8);

export const glass = {
  backgroundColor: 'rgba(22,27,34,0.75)',
} as const;
