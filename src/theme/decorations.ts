// ── 医学品牌装饰元素 ─────────────────────────────────────
// 用于页面背景、空状态、加载动画的视觉资产
// 不含实际图片，全部为代码可生成的参数和 SVG 数据

// ═══════════════════════════════════════════════════════════
// 器官极简图标映射（11 系统 → emoji / SVG 回退）
// ═══════════════════════════════════════════════════════════
export const ORGAN_ICONS: Record<string, string> = {
  '心血管系统': '🫀',
  '呼吸系统': '🫁',
  '消化系统': '🫄',
  '泌尿系统': '🫘',
  '神经系统': '🧠',
  '血液系统': '🩸',
  '内分泌系统': '🦋',
  '免疫系统': '🛡️',
  '运动系统': '🦴',
  '生殖系统': '🧬',
  '诊断公式': '📐',
};

// ═══════════════════════════════════════════════════════════
// 系统色板（从铜色主色衍生 11 个系统专属色）
// ═══════════════════════════════════════════════════════════
export const SYSTEM_COLORS: Record<string, string> = {
  '心血管系统': '#FF3D71',   // neon magenta — 心脏
  '呼吸系统': '#00E5FF',     // neon cyan — 空气
  '消化系统': '#FFB800',     // amber — 消化
  '泌尿系统': '#7BB5B0',     // teal — 液体
  '神经系统': '#A855F7',     // violet — 神经
  '血液系统': '#FF3D71',     // magenta — 血液
  '内分泌系统': '#FFB800',   // amber — 激素
  '免疫系统': '#00FF88',     // green — 免疫
  '运动系统': '#B5A082',     // bone (unchanged)
  '生殖系统': '#E0A0B0',     // pink (unchanged)
  '诊断公式': '#00E5FF',     // cyan — 公式
};

// ═══════════════════════════════════════════════════════════
// 标题区装饰圆环（背景 SVG 参数）
// ═══════════════════════════════════════════════════════════
export interface DecorativeRing {
  cx: number;        // 圆心 X（相对于 viewBox 0-1）
  cy: number;        // 圆心 Y
  r: number;         // 半径（相对于 viewBox）
  opacity: number;
  strokeWidth: number;
}

export const DECORATIVE_RINGS: DecorativeRing[] = [
  { cx: 0.80, cy: 0.22, r: 0.48, opacity: 0.06, strokeWidth: 1.0 },
  { cx: 0.15, cy: 0.65, r: 0.32, opacity: 0.04, strokeWidth: 0.8 },
  { cx: 0.70, cy: 0.75, r: 0.22, opacity: 0.05, strokeWidth: 0.6 },
];

// ═══════════════════════════════════════════════════════════
// ECG 波形数据（用于学习趋势装饰线）
// ═══════════════════════════════════════════════════════════
export const ECG_WAVEFORM_PATH =
  'M0,25 L8,25 L12,8 L16,38 L20,25 L28,25 L32,12 L36,25 L44,25 L48,18 L52,25 ' +
  'L60,25 L64,32 L68,25 L76,25 L80,15 L84,25 L92,25 L96,20 L100,25 ' +
  'L108,25 L112,28 L116,25 L124,25 L128,25';

// ECG 波形绘制参数
export const ECG_CONFIG = {
  viewBox: '0 0 128 48',
  strokeColor: 'rgba(0,229,255,0.35)',
  strokeWidth: 1.2,
  fillColor: 'rgba(0,229,255,0.05)',
  dotRadius: 2.5,
  dotColor: '#00E5FF',
};

// ═══════════════════════════════════════════════════════════
// 六边形网格参数（知识网络背景纹理）
// ═══════════════════════════════════════════════════════════
export const HEX_GRID = {
  size: 20,
  strokeWidth: 0.4,
  strokeColor: 'rgba(0,229,255,0.05)',
  fillColor: 'transparent',
};

// ═══════════════════════════════════════════════════════════
// 脉冲呼吸动画参数
// ═══════════════════════════════════════════════════════════
export const PULSE_ANIMATION = {
  duration: 3000,       // ms，一个完整呼吸周期
  scaleMin: 0.96,
  scaleMax: 1.04,
  opacityMin: 0.6,
  opacityMax: 1.0,
};

// ═══════════════════════════════════════════════════════════
// 拉丁文系统名映射（学术仪式感）
// ═══════════════════════════════════════════════════════════
export const LATIN_NAMES: Record<string, string> = {
  '心血管系统': 'Systema Cardiovasculare',
  '呼吸系统': 'Systema Respiratorium',
  '消化系统': 'Systema Digestorium',
  '泌尿系统': 'Systema Urinarium',
  '神经系统': 'Systema Nervosum',
  '血液系统': 'Systema Haematologicum',
  '内分泌系统': 'Systema Endocrinum',
  '免疫系统': 'Systema Immunitatis',
  '运动系统': 'Systema Locomotorium',
  '生殖系统': 'Systema Reproductivum',
  '诊断公式': 'Formulae Diagnosticae',
};

// ═══════════════════════════════════════════════════════════
// 医学格言（用于空状态/问候区点缀）
// ═══════════════════════════════════════════════════════════
export const MEDICAL_MOTTOS = [
  { latin: 'Primum non nocere', cn: '首先，不伤害' },
  { latin: 'Ars longa, vita brevis', cn: '艺术长存，生命短暂' },
  { latin: 'Mens sana in corpore sano', cn: '健全的精神寓于健全的身体' },
  { latin: 'Similia similibus curantur', cn: '以相似治相似' },
  { latin: 'Natura sanat, medicus curat', cn: '自然治愈，医生辅助' },
];

// ═══════════════════════════════════════════════════════════
// 空状态引导文案
// ═══════════════════════════════════════════════════════════
export const EMPTY_STATE_MESSAGES = {
  noCards: {
    title: '今日无事',
    subtitle: '补一张过去的卡片，或者翻开《生理学》第 8 章',
    action: '开始填写卡片',
  },
  noAnchors: {
    title: '尚无临床锚点',
    subtitle: '从症状出发，反向追溯疾病的本质',
    action: '创建第一个锚点',
  },
  noNetwork: {
    title: '知识网络尚未形成',
    subtitle: '填写更多卡片后，节点之间的连线将自然显现',
    action: '去填写卡片',
  },
};

// ═══════════════════════════════════════════════════════════
// Tab 图标名称映射（供 tab bar 使用）
// ═══════════════════════════════════════════════════════════
export const TAB_ICONS = {
  dashboard: { active: 'pulse', inactive: 'pulse-outline' },
  network: { active: 'git-network', inactive: 'git-network-outline' },
  clinical: { active: 'fitness', inactive: 'fitness-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
} as const;
