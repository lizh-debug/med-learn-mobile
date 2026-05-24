// Global state management for v2 modular learning app
import { create } from 'zustand';

export type Layer = '基础' | '桥梁' | '临床' | '前沿';

export interface CardMeta {
  path: string;
  title: string;
  system: string;
  layer: string;
  filled: string;
  birthplace: string;
}

interface AppState {
  // Today's date
  today: string;

  // Selected system for skeleton view
  selectedSystem: string;

  // Recently filled cards (by date)
  recentCards: CardMeta[];

  // Search query
  searchQuery: string;

  // Anchor category filter
  anchorCategory: '症状' | '体征' | '检查异常';

  // Skeleton refresh trigger (incremented after card save)
  skeletonRefreshKey: number;

  // Card being edited (set before navigating to edit screen)
  editingCardPath: string | null;

  // Actions
  setToday: (date: string) => void;
  setSelectedSystem: (system: string) => void;
  setRecentCards: (cards: CardMeta[]) => void;
  addRecentCard: (card: CardMeta) => void;
  removeRecentCard: (path: string) => void;
  setSearchQuery: (query: string) => void;
  setAnchorCategory: (cat: '症状' | '体征' | '检查异常') => void;
  triggerSkeletonRefresh: () => void;
  setEditingCardPath: (path: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  today: formatDate(new Date()),
  selectedSystem: '心血管系统',
  recentCards: [],
  searchQuery: '',
  anchorCategory: '症状',
  skeletonRefreshKey: 0,
  editingCardPath: null,

  setToday: (date) => set({ today: date }),
  setSelectedSystem: (system) => set({ selectedSystem: system }),
  setRecentCards: (cards) => set({ recentCards: cards }),
  addRecentCard: (card) =>
    set((state) => ({
      recentCards: [card, ...state.recentCards.filter((c) => c.path !== card.path)],
      skeletonRefreshKey: state.skeletonRefreshKey + 1,
    })),
  removeRecentCard: (path) =>
    set((state) => ({
      recentCards: state.recentCards.filter((c) => c.path !== path),
      skeletonRefreshKey: state.skeletonRefreshKey + 1,
    })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setAnchorCategory: (cat) => set({ anchorCategory: cat }),
  triggerSkeletonRefresh: () => set((s) => ({ skeletonRefreshKey: s.skeletonRefreshKey + 1 })),
  setEditingCardPath: (path) => set({ editingCardPath: path }),
}));

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const SYSTEMS = [
  '心血管系统',
  '呼吸系统',
  '消化系统',
  '泌尿系统',
  '内分泌系统',
  '神经系统',
  '血液系统',
  '免疫系统',
  '运动系统',
  '生殖系统',
] as const;

export const LAYERS: Layer[] = ['基础', '桥梁', '临床', '前沿'];

export const LAYER_COLORS: Record<Layer, string> = {
  '基础': '#22c55e', // green
  '桥梁': '#eab308', // yellow
  '临床': '#ef4444', // red
  '前沿': '#3b82f6', // blue
};

export const LAYER_ICONS: Record<Layer, string> = {
  '基础': '🟢',
  '桥梁': '🟡',
  '临床': '🔴',
  '前沿': '🔵',
};

export const ANCHOR_CATEGORIES = {
  '症状': [
    '胸痛', '呼吸困难', '腹痛', '头痛',
    '发热', '晕厥', '出血', '关节痛',
    '恶心呕吐', '腹泻', '意识障碍', '背痛',
  ],
  '体征': [
    '心脏杂音', '高血压', '肺部啰音', '淋巴结肿大',
    '水肿', '腹部压痛', '黄疸', '甲状腺肿大',
    '贫血貌', '紫癜与瘀斑', '低血压与休克',
  ],
  '检查异常': [
    '心电图异常', '血常规异常', '肝功能异常', '肾功能异常',
    '血气分析异常', '血糖异常', '甲状腺功能异常',
  ],
} as const;
