// iOS SF typography scale
// Reference: Apple Human Interface Guidelines — Typography

import { Platform, StyleSheet } from 'react-native';

const sf = (weight: string) => {
  if (Platform.OS === 'ios') return { fontFamily: 'System', fontWeight: weight as any };
  // Android / Web fallback
  const map: Record<string, string> = {
    regular: '400',
    semibold: '600',
    bold: '700',
    heavy: '800',
  };
  return { fontWeight: map[weight] || '400' } as any;
};

export const typography = StyleSheet.create({
  largeTitle: {
    fontSize: 34,
    ...sf('bold'),
    lineHeight: 41,
    letterSpacing: 0.37,
  },
  title1: {
    fontSize: 28,
    ...sf('regular'),
    lineHeight: 34,
    letterSpacing: 0.36,
  },
  title2: {
    fontSize: 22,
    ...sf('regular'),
    lineHeight: 28,
    letterSpacing: 0.35,
  },
  title3: {
    fontSize: 20,
    ...sf('regular'),
    lineHeight: 25,
    letterSpacing: 0.38,
  },
  headline: {
    fontSize: 17,
    ...sf('semibold'),
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  body: {
    fontSize: 17,
    ...sf('regular'),
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  callout: {
    fontSize: 16,
    ...sf('regular'),
    lineHeight: 21,
    letterSpacing: -0.32,
  },
  subhead: {
    fontSize: 15,
    ...sf('regular'),
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  footnote: {
    fontSize: 13,
    ...sf('regular'),
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  caption1: {
    fontSize: 12,
    ...sf('regular'),
    lineHeight: 16,
    letterSpacing: 0,
  },
  caption2: {
    fontSize: 11,
    ...sf('semibold'),
    lineHeight: 13,
    letterSpacing: 0.07,
  },
});

// ── Monospace HUD Typography ──
const mono = (size: number, weight: string, lh: number, ls: number, extra?: object) => ({
  fontSize: size,
  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  fontWeight: weight as any,
  lineHeight: lh,
  letterSpacing: ls,
  ...(extra || {}),
});

export const hudType = StyleSheet.create({
  /** Large HUD number (36px) */
  monoLarge: mono(36, '700', 42, 2),
  /** Data display (16px) */
  monoData: mono(16, '600', 20, 1),
  /** Small label (11px, uppercase) */
  monoLabel: mono(11, '500', 14, 2, { textTransform: 'uppercase' as const }),
  /** Ivis branding title */
  ivisTitle: {
    fontSize: 28,
    fontWeight: '800' as any,
    letterSpacing: 4,
    textTransform: 'uppercase' as const,
  },
});

// Convenience: individual font sizes for inline use
export const fontSize = {
  largeTitle: 34,
  title1: 28,
  title2: 22,
  title3: 20,
  headline: 17,
  body: 17,
  callout: 16,
  subhead: 15,
  footnote: 13,
  caption1: 12,
  caption2: 11,
} as const;
