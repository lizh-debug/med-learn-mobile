// ══════════════════════════════════════════════════════════════
// 医维斯 Ivis — JARVIS-Inspired Dark Cyberpunk Color System
// ══════════════════════════════════════════════════════════════

// ── Primary Accent: Premium Dark Gold ──
export const neonCyan      = '#C8A45C';
export const neonCyanLight = '#D4B87A';
export const neonCyanDark  = '#A07830';
export const neonCyanGlow  = 'rgba(200,164,92,0.25)';
export const neonCyanBg    = 'rgba(200,164,92,0.10)';

// ── Secondary HUD Accents ──
export const amberGold     = '#FFB800';
export const amberGoldGlow = 'rgba(255,184,0,0.18)';
export const neoGreen      = '#00FF88';
export const neoGreenGlow  = 'rgba(0,255,136,0.18)';
export const neoMagenta    = '#FF3D71';
export const neoMagentaGlow= 'rgba(255,61,113,0.18)';
export const neoViolet     = '#A855F7';
export const neoVioletGlow = 'rgba(168,85,247,0.18)';

// ── Dark Background Spectrum (gray-black, floating feel) ──
export const voidBlack     = '#080B10';
export const abyssBlue     = '#0C1016';
export const deepSlate     = '#11161C';
export const darkGraphite  = '#1C2330';
export const midnightSteel = '#21262D';
export const shadowIron    = '#2A3040';

// ── Text Spectrum ──
export const iceWhite  = '#E8EDF5';
export const frostGray = '#8E9DB5';
export const mistGray  = '#5A6980';
export const deadGray  = '#2D3A4D';

// ── Glass Morphism ──
export const glassDark         = 'rgba(22,27,34,0.75)';
export const glassLighter      = 'rgba(28,35,48,0.65)';
export const glassBorder       = 'rgba(200,164,92,0.08)';
export const glassBorderStrong = 'rgba(200,164,92,0.18)';

// ── 4-Layer Tag Colors (dark-optimized) ──
export const layer基础 = neoGreen;
export const layer桥梁 = amberGold;
export const layer临床 = neoMagenta;
export const layer前沿 = '#5B8DAB';

// ── Q6 Clinical Category Colors ──
export const q6症状   = amberGold;
export const q6体征   = neoMagenta;
export const q6检查异常 = neonCyan;
export const q6治疗   = neoGreen;

// ── AI Chat ──
export const aiBubbleUser      = neonCyan;
export const aiBubbleUserText  = voidBlack;
export const aiBubbleAssistant = deepSlate;
export const aiPurple          = neoViolet;
export const purpleAccent      = neoViolet;
export const purpleBg          = 'rgba(168,85,247,0.08)';

// ── Tab Bar ──
export const tabBarBackground = 'rgba(13,17,23,0.85)';
export const tabBarBorder     = 'rgba(200,164,92,0.08)';

// ── Knowledge Graph ──
export const graphNodeSkeleton = amberGold;
export const graphNodeCard     = neonCyan;
export const graphNodeAnchor   = neoMagenta;
export const graphEdge         = 'rgba(200,164,92,0.12)';
export const graphBg           = voidBlack;

// ── Dividers ──
export const separator       = 'rgba(0,229,255,0.08)';
export const opaqueSeparator = shadowIron;
export const warmBorder      = shadowIron;
export const warmBorderLight = midnightSteel;

// ── Semantic Colors ──
export const successColor     = neoGreen;
export const successBg        = 'rgba(0,255,136,0.08)';
export const warningColor     = amberGold;
export const destructiveColor = neoMagenta;
export const destructiveBg    = 'rgba(255,61,113,0.08)';

// ── Fills ──
export const systemFill          = 'rgba(0,229,255,0.08)';
export const secondarySystemFill = 'rgba(0,229,255,0.05)';
export const tertiarySystemFill  = 'rgba(0,229,255,0.03)';
export const quaternarySystemFill= 'rgba(0,229,255,0.02)';

// ══════════════════════════════════════════════════════════════
// Backward-compat aliases — old names → new dark values
// All existing imports keep working.
// ══════════════════════════════════════════════════════════════

export const copper      = neonCyan;
export const copperLight = neonCyanLight;
export const copperDark  = neonCyanDark;
export const copperBg    = neonCyanBg;
export const copperGlow  = neonCyanGlow;

export const paperWhite = voidBlack;
export const jadeWhite  = 'rgba(22,28,36,0.88)'; // floating panel on black
export const warmWhite  = 'rgba(38,45,54,0.75)';
export const darkPanel   = 'rgba(38,45,54,0.82)'; // alias for jadeWhite
export const linenBg    = 'rgba(15,20,25,0.65)';

export const inkColor  = iceWhite;
export const ochreGray = frostGray;
export const clayGray  = mistGray;

export const indigoBlue  = neonCyan;
export const indigoLight = 'rgba(0,229,255,0.08)';

// ── Backward-compat iOS aliases ──
export const systemBlue              = neonCyan;
export const systemGreen             = neoGreen;
export const systemOrange            = amberGold;
export const systemRed               = neoMagenta;
export const systemPurple            = neoViolet;
export const systemPink              = '#E0A0B0';
export const systemYellow            = '#E8C966';
export const systemTeal              = '#7BB5B0';
export const systemIndigo            = '#4A6785';
export const systemBackground        = voidBlack;
export const secondarySystemBackground  = abyssBlue;
export const tertiarySystemBackground   = voidBlack;
export const systemGroupedBackground    = abyssBlue;
export const secondaryGroupedBackground = deepSlate;
export const label       = iceWhite;
export const secondaryLabel = frostGray;
export const tertiaryLabel  = mistGray;
export const quaternaryLabel = deadGray;
export const tintColor   = neonCyan;

// ══════════════════════════════════════════════════════════════
// Ivis native tokens — use in NEW components directly
// ══════════════════════════════════════════════════════════════

export const ivis = {
  primary: neonCyan,
  primaryGlow: neonCyanGlow,
  primaryBg: neonCyanBg,
  amber: amberGold,
  green: neoGreen,
  magenta: neoMagenta,
  violet: neoViolet,
  bg: {
    base: voidBlack,
    panel: deepSlate,
    elevated: darkGraphite,
    input: midnightSteel,
    border: shadowIron,
  },
  text: {
    primary: iceWhite,
    secondary: frostGray,
    tertiary: mistGray,
    disabled: deadGray,
  },
  glass: {
    dark: glassDark,
    lighter: glassLighter,
    border: glassBorder,
    borderStrong: glassBorderStrong,
  },
  hud: {
    cyan: neonCyan,
    green: neoGreen,
    amber: amberGold,
    red: neoMagenta,
    violet: neoViolet,
  },
} as const;
