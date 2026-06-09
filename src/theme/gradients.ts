// 医维斯 Ivis — Neon Cyberpunk Gradient Presets

export const gradients = {
  /** 霓虹青渐变 — 按钮、强调 */
  cyanNeon: ['#00E5FF', '#0097A7'] as const,

  /** 暗→虚空黑 — 卡片淡出 */
  darkFade: ['#0F1520', '#080B12'] as const,

  /** 霓虹青光晕 → 透明 — 装饰性淡出 */
  cyanGlow: ['rgba(0,229,255,0.3)', 'rgba(0,229,255,0)'] as const,

  /** 琥珀光晕 → 透明 */
  amberGlow: ['rgba(255,184,0,0.3)', 'rgba(255,184,0,0)'] as const,

  /** 霓虹青→透明 — 左侧装饰线 */
  cyanLineLeft: ['#00E5FF', 'rgba(0,229,255,0)'] as const,

  /** 玻璃→透明 — 面板淡入 */
  glassToTransparent: ['rgba(15,21,32,1)', 'rgba(15,21,32,0)'] as const,

  // ── Backward-compat aliases ──
  copperWarm: ['#00E5FF', '#0097A7'] as const,
  paperFade: ['#0F1520', '#080B12'] as const,
  copperGlow: ['rgba(0,229,255,0.3)', 'rgba(0,229,255,0)'] as const,
  copperLineLeft: ['#00E5FF', 'rgba(0,229,255,0)'] as const,
  paperToTransparent: ['rgba(8,11,18,1)', 'rgba(8,11,18,0)'] as const,
};

export const gradientFallbacks = {
  cyanNeon: '#00E5FF',
  darkFade: '#080B12',
  cyanGlow: 'rgba(0,229,255,0.15)',
  amberGlow: 'rgba(255,184,0,0.15)',
  cyanLineLeft: '#00E5FF',
  glassToTransparent: '#0F1520',
  // compat
  copperWarm: '#00E5FF',
  paperFade: '#080B12',
  copperGlow: 'rgba(0,229,255,0.15)',
  copperLineLeft: '#00E5FF',
  paperToTransparent: '#080B12',
};
