# UI Redesign Plan — 医学知识驾驶舱

## 目标

将当前"Markdown 文件浏览器"风格的 app，改造为具有医学 DNA 的高级感学习工具。
从 3 Tab（骨架/今天/锚点）升级为 4 Tab（仪表盘/知识网络/临床推理/我的）。

---

## Part 0: 设计令牌层（必须先做）

### 0.1 新色彩系统 — 写入 `src/theme/colors.ts`

当前文件是 iOS 默认色板，需要替换为暖铜学术色系。

```ts
// ── 品牌主色 ──
export const copper = '#C8865D';           // 暖铜主色，替代 systemBlue
export const copperLight = '#E8C9A8';      // 铜色浅
export const copperDark = '#A0643D';       // 铜色深
export const copperGlow = 'rgba(200,134,93,0.18)'; // 铜色光晕

// ── 背景色 ──
export const paperWhite = '#FAF7F2';       // 宣纸白（暖调基底）
export const jadeWhite = '#FFFCF8';        // 玉白（卡片表面）
export const linenBg = '#F5F0E8';          // 麻布暖灰（分组背景）

// ── 文字色 ──
export const inkBlack = '#1C1C2A';         // 墨色（主文字）
export const ochreGray = '#8B7E74';        // 赭石灰（辅文字）
export const clayGray = '#B5A99C';         // 陶土灰（浅文字）

// ── 4 层标签色（降低饱和度以匹配暖色系）──
export const layer基础 = '#5BAF84';        // 翠绿（原 #34C759）
export const layer桥梁 = '#E8953A';        // 琥珀（原 #FF9500）
export const layer临床 = '#D4685A';        // 赭红（原 #FF3B30）
export const layer前沿 = '#5B8DAB';        // 靛蓝（原 #007AFF）

// ── 功能色 ──
export const indigo = '#4A6785';           // 群青（链接/强调）
export const successGreen = '#5BAF84';
export const warningAmber = '#E8953A';
export const dangerRed = '#D4685A';

// ── 语义别称（保留旧的 export 名以兼容现有代码）──
export const systemBlue = indigo;
export const systemGreen = layer基础;
export const systemOrange = layer桥梁;
export const systemRed = layer临床;
export const systemPurple = '#9B7EC4';     // 改为温紫，匹配速通锚点

// ── 背景体系（覆盖旧名）──
export const systemBackground = jadeWhite;
export const secondarySystemBackground = linenBg;
export const tertiarySystemBackground = paperWhite;
export const systemGroupedBackground = linenBg;
export const secondaryGroupedBackground = jadeWhite;

// ── 文字体系（覆盖旧名）──
export const label = inkBlack;
export const secondaryLabel = ochreGray;
export const tertiaryLabel = clayGray;
export const quaternaryLabel = '#D4CBC0';

// ── Tab bar 毛玻璃 ──
export const tabBarBackground = 'rgba(255,252,248,0.88)';
export const tabBarBorder = 'rgba(139,126,116,0.12)';

// ── 分隔线 ──
export const separator = 'rgba(139,126,116,0.18)';
export const opaqueSeparator = '#D4CBC0';

// ── 填充 ──
export const systemFill = 'rgba(139,126,116,0.16)';
export const secondarySystemFill = 'rgba(139,126,116,0.10)';
export const tertiarySystemFill = 'rgba(139,126,116,0.06)';
export const quaternarySystemFill = 'rgba(139,126,116,0.04)';

// ── AI 助手 ──
export const aiPurple = '#9B7EC4';
export const aiBubbleUser = indigo;
export const aiBubbleAssistant = linenBg;

// ── 临床分类（Q6）──
export const q6症状 = warningAmber;
export const q6体征 = dangerRed;
export const q6检查异常 = indigo;
export const q6治疗 = successGreen;

export const tintColor = copper;
export const destructiveColor = dangerRed;
export const successColor = successGreen;
export const warningColor = warningAmber;
```

### 0.2 阴影系统升级 — 写入 `src/theme/shadows.ts`

当前阴影过于均匀，需要分层级：

```ts
import { Platform } from 'react-native';

interface Shadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

const iosShadow = (color: string, opacity: number, radius: number, y: number): Shadow => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: y },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation: Platform.OS === 'android' ? Math.round(radius * 1.5) : 0,
});

export const shadows = {
  xs: iosShadow('#3C3228', 0.03, 2, 1),   // 极轻（列表项）
  sm: iosShadow('#3C3228', 0.05, 6, 3),    // 轻（卡片）
  md: iosShadow('#3C3228', 0.08, 12, 6),   // 中（浮层）
  lg: iosShadow('#3C3228', 0.14, 20, 10),  // 重（弹窗）
  xl: iosShadow('#3C3228', 0.20, 28, 14),  // 极重（Hero 卡片）
};

// 铜色光晕 — 用于 FAB 和主按钮
export const copperGlow = (): Shadow => ({
  shadowColor: '#C8865D',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.30,
  shadowRadius: 14,
  elevation: 8,
});

// 靛蓝光晕 — 用于链接/次要按钮
export const indigoGlow = (): Shadow => ({
  shadowColor: '#4A6785',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.22,
  shadowRadius: 10,
  elevation: 6,
});
```

### 0.3 医学品牌装饰元素 — 新建 `src/theme/decorations.ts`

```ts
// 品牌装饰 — 医学节点网络视觉元素
// 用于页面背景、空状态、加载状态的 SVG 和动画参数

// ── 器官极简图标（HTML Entity 映射）──
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

// ── 标题区装饰圆环（SVG viewBox 参数）──
export const DECORATIVE_RINGS = [
  { cx: 0.3, cy: 0.25, r: 0.45, opacity: 0.08, strokeWidth: 1 },
  { cx: 0.75, cy: 0.6, r: 0.30, opacity: 0.05, strokeWidth: 0.8 },
  { cx: 0.15, cy: 0.7, r: 0.20, opacity: 0.06, strokeWidth: 0.6 },
];

// ── ECG 波形路径数据（用于趋势图）──
export const ECG_WAVEFORM_PATH = 'M0,20 L10,20 L15,5 L20,35 L25,20 L35,20 L40,8 L45,20 L55,20 L60,14 L65,20 L75,20 L80,30 L85,20 L95,20 L100,15 L105,20 L115,20 L120,20';

// ── 六边形网格参数（用于背景纹理）──
export const HEX_GRID = {
  size: 18,
  strokeWidth: 0.4,
  strokeColor: 'rgba(200,134,93,0.08)',
};

// ── 脉冲动画参数 ──
export const PULSE_ANIMATION = {
  duration: 3000,
  scaleMin: 0.96,
  scaleMax: 1.04,
  opacityMin: 0.6,
  opacityMax: 1.0,
};

// ── 拉丁文系统名映射 ──
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
};
```

---

## Part 1: Tab 架构重构

### 1.1 修改 `app/(tabs)/_layout.tsx`

从 3 Tab 改为 4 Tab：

```tsx
// Tab layout — 4 tabs: 仪表盘 / 知识网络 / 临床推理 / 我的
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { copper, ochreGray, tabBarBackground, tabBarBorder } from '../../src/theme/colors';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: '#FAF7F2' },
      headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#1C1C2A' },
      headerShadowVisible: false,
      tabBarActiveTintColor: copper,
      tabBarInactiveTintColor: ochreGray,
      tabBarStyle: {
        backgroundColor: tabBarBackground,
        borderTopWidth: 0.5,
        borderTopColor: tabBarBorder,
        position: 'absolute' as const,
        height: 88, // iOS-style with safe area
        paddingBottom: 28,
        paddingTop: 8,
      },
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.3,
      },
      tabBarIconStyle: { marginTop: 0 },
    }}>
      <Tabs.Screen
        name="dashboard"     // 原 skeleton → dashboard
        options={{
          title: '仪表盘',
          tabBarIcon: ({ color }) => <Ionicons name="pulse-outline" size={24} color={color} />,
          headerTitle: '学习驾驶舱',
        }}
      />
      <Tabs.Screen
        name="network"       // 原 graph → 提升为 Tab
        options={{
          title: '知识网络',
          tabBarIcon: ({ color }) => <Ionicons name="git-network-outline" size={24} color={color} />,
          headerTitle: '知识网络',
        }}
      />
      <Tabs.Screen
        name="clinical"      // 原 anchors → clinical
        options={{
          title: '临床推理',
          tabBarIcon: ({ color }) => <Ionicons name="fitness-outline" size={24} color={color} />,
          headerTitle: '临床推理',
        }}
      />
      <Tabs.Screen
        name="profile"       // 新增
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
          headerTitle: '我的',
        }}
      />
    </Tabs>
  );
}
```

### 1.2 Tab 文件重组

需要新建/移动的文件：

| 原路径 | 新路径 | 说明 |
|--------|--------|------|
| `app/(tabs)/skeleton.tsx` | `app/(tabs)/dashboard.tsx` | 骨架→仪表盘 |
| `app/(tabs)/today.tsx` | 删除 | 内容并入仪表盘 |
| `app/(tabs)/anchors.tsx` | `app/(tabs)/clinical.tsx` | 锚点→临床推理 |
| 不存在 | `app/(tabs)/network.tsx` | 知识网络提升为 Tab |
| 不存在 | `app/(tabs)/profile.tsx` | 全新个人中心 |

---

## Part 2: 页面详细设计

### 2.1 仪表盘 `app/(tabs)/dashboard.tsx`

**布局结构（从上到下）：**

```
1. 问候语 + 日期
2. 学习体征卡片（3个指标：知识节点数、连续学习天数、系统覆盖率）
   — 下方嵌入 ECG 波形 SVG 作为趋势装饰线
3. 系统概览（横向滑动的器官图标环，每个带完成度圆弧）
4. 今日待办卡片列表（4张以内）
5. 底部统计标签行（本周新增/本周复习/总学习时长）
6. FAB 新建卡片（铜色圆形 + 呼吸光晕）
```

**关键实现细节：**

- 问候语区：`largeTitle` 字体，后面跟一句拉丁文医学格言（如 "Primum non nocere"）
- 学习体征卡片：白色圆角卡片，3 列数字 → ECG 线 → 微文案"较昨日 +3"
- 系统概览：水平 ScrollView，每个系统 = 器官 emoji + 名称 + 环形进度条（SVG circle stroke-dasharray）
- 今日待办：如果无待办，显示预设名言卡（"今日无事，补一张过去的卡片 / 或者翻开《生理学》第 8 章"）
- 背景：右上角一个大的淡色装饰圆环

**代码结构：**

```tsx
// app/(tabs)/dashboard.tsx
export default function DashboardScreen() {
  // 计算统计数据
  const stats = useMemo(() => ({
    totalNodes: ...,      // 已填卡片总数
    streakDays: ...,      // 连续学习天数
    coverage: ...,        // 系统覆盖率 %
    weeklyNew: ...,       // 本周新增
  }), [recentCards]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 1. 问候区 */}
        <GreetingHeader />

        {/* 2. 学习体征卡片 */}
        <VitalSignsCard stats={stats} />

        {/* 3. 系统概览横滚 */}
        <SystemOverviewRow systems={SYSTEMS} />

        {/* 4. 今日待办 */}
        <TodayTasksSection cards={recentCards.slice(0, 4)} />

        {/* 5. 本周统计 */}
        <WeeklyStatsRow stats={stats} />
      </ScrollView>

      {/* FAB */}
      <CopperFAB onPress={handleNewCard} />
    </View>
  );
}
```

### 2.2 知识网络 `app/(tabs)/network.tsx`

**布局结构：**

```
1. 顶部统计栏（3项：节点/连线/已填）— 毛玻璃半透明卡片
2. 全屏图谱区（WebView canvas）
   — 背景添加极淡的六边形网格纹理
   — 节点按系统聚类着色
   — 中心脉冲效果
3. 底部选中节点详情卡片（滑动弹出）
   — 仅在点击节点时显示
   — 包含：节点名、系统、层级、3 个快捷操作按钮（查看/编辑/关联）
4. 图例悬浮标签
```

**关键实现细节：**

- 图谱背景：canvas 先绘制六边形网格纹理，再画力导向图
- 节点着色：每个系统一个颜色（从暖铜色系衍生 11 色），已填=实心+阴影，未填=空心虚线
- 中心脉冲：呼吸系统或其他选中系统的节点有呼吸光晕动画
- 选中卡片：从底部滑入的半透明毛玻璃卡片，200ms spring 动画

**GraphView 组件改造：**

```tsx
// 更新 src/components/GraphView.tsx
// 1. 使用新的色板生成系统颜色
// 2. 背景添加 hex grid 纹理
// 3. 已填节点使用铜色光晕
// 4. 支持 onNodePress 回调，回传节点信息给父组件
```

### 2.3 临床推理 `app/(tabs)/clinical.tsx`

**布局结构（完全重排）：**

```
1. 顶部引言："从临床现象出发，反向追溯疾病本质"
2. 3 列大分类卡片（症状/体征/检查异常）
   — 横向排列，每张占屏幕 1/3
   — 带对应图标、数量、选中态铜色边框
   — 替代旧的 Segment 控制器
3. 下方锚点卡片列表
   — 横向布局：左侧彩色竖线(4px宽) + 锚点名 + 右侧快速鉴别标签组
   — 标签组：2-3 个关联系统名，用小胶囊展示
```

**关键实现细节：**

- 3 分类大卡片：不是 tab/segment，是 3 张并排的卡片，选中的那张有铜色左边框
- 锚点卡片：每张卡左侧有 4px 宽的竖线，颜色对应该分类（症状=琥珀、体征=赭红、检查=靛蓝）
- 快速鉴别标签：锚点名下方一行 2-3 个小胶囊，显示该症状常见的鉴别诊断方向

**AnchorGrid 改造：**

```tsx
// 更新 src/components/AnchorGrid.tsx
// 旧：简单文字网格
// 新：横向卡片布局，左侧色带 + 右侧快速鉴别标签
// 每张卡片结构：
// ┌──┬──────────────────┐
// │  │ 呼吸困难           │
// │▐▐│ COPD · HF · PE   │
// │  │ 呼吸 心血管 血管   │
// └──┴──────────────────┘
```

### 2.4 我的 `app/(tabs)/profile.tsx`

**全新页面，布局结构：**

```
1. 头像区（emoji 医学生头像 + 学习阶段标签 + 坚持天数）
2. 本周学习热力图（7 天 × 每日卡片数，GitHub 贡献图风格）
3. 系统覆盖度列表（11 个系统，每个一条横向进度条 + 器官图标 + 百分比）
4. 层级分布（4 层饼图或横向堆叠条）
5. 设置入口行（API 配置 / 数据导出 / 关于）
```

**关键实现细节：**

- 热力图：7 个圆角方块横向排列，颜色从浅麻布到深铜色，标注当日卡片数量
- 覆盖度进度条：使用 `react-native` 原生 View 实现，左侧器官 emoji + 系统名 + 右侧百分比数字
- 层级分布：横向堆叠 4 色条（绿橙红蓝），每段宽度与节点数成比例
- 设置入口：列表行样式，右侧 chevron，点击进入对应页面

---

## Part 3: 共享组件更新

### 3.1 CardView 标题区改造

当前 CardView 的 header 是 `systemBlue` 纯色背景，改为铜色渐变 + 毛玻璃：

```tsx
// 新的 header 样式：
// background: 从 copper (#C8865D) 到 copperDark (#A0643D) 的渐变
// 使用 react-native 的 LinearGradient（或纯 View 模拟）
// 如果不想加依赖，用两个叠加的半透明 View 模拟渐变
```

### 3.2 SkeletonTree 升级

保持功能不变，但视觉升级：

- 层级头部：左侧圆点增大到 12px，带同色微光晕
- 已填节点：`#5BAF84` 填充圆点 + 文字加粗变墨色
- 速通节点：温紫色 `#9B7EC4` 微菱形 + 斜体
- 折叠动画：`LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)`
- 空层提示："该层暂无节点 — 从系统总入口添加第一个"

### 3.3 FAB 组件统一

所有 FAB 统一为铜色圆形 + 呼吸光晕：

```tsx
// 铜色 FAB:
// - 背景 #C8865D
// - 阴影铜色光晕
// - 可选：呼吸动画（scale 1.0 → 1.04 → 1.0，3s loop）
// - 位置：bottom: 100, right: 20
```

---

## Part 4: 页面路由保留

保留不再作为 Tab 的旧页面作为 Stack 页面：

| 路由 | 保留 | 说明 |
|------|------|------|
| `app/(tabs)/today.tsx` | 删除 | 内容合并到仪表盘 |
| `app/skeleton/[system].tsx` | 保留 | 系统详情页 |
| `app/card/[id].tsx` | 保留 | 卡片阅读页 |
| `app/card/edit/[id].tsx` | 保留 | 卡片编辑页 |
| `app/anchor/[id].tsx` | 保留 | 锚点详情页 |
| `app/anchor/edit/[id].tsx` | 保留 | 锚点编辑页 |
| `app/graph.tsx` | 保留 | 兼容旧路由，重定向到 network tab |
| `app/overview.tsx` | 保留 | 学习总入口 |
| `app/index.tsx` | 修改 | 重定向目标改为 `/(tabs)/dashboard` |

---

## Part 5: 实施顺序

按依赖关系排列，每一步完成后验证编译无报错：

### Phase 1: 设计令牌（无破坏性改动）
1. 重写 `src/theme/colors.ts` — 保留旧 export 名，添加新色值
2. 重写 `src/theme/shadows.ts` — 升级阴影层级
3. 新建 `src/theme/decorations.ts` — 医学品牌元素

### Phase 2: Tab 架构
4. 新建 `app/(tabs)/dashboard.tsx` — 仪表盘页面
5. 新建 `app/(tabs)/network.tsx` — 知识网络 Tab
6. 重写 `app/(tabs)/clinical.tsx` — 临床推理（替换 anchors）
7. 新建 `app/(tabs)/profile.tsx` — 个人中心
8. 重写 `app/(tabs)/_layout.tsx` — 4 Tab 布局
9. 修改 `app/index.tsx` — 重定向到 dashboard

### Phase 3: 组件升级
10. 更新 `src/components/GraphView.tsx` — 新色板 + 节点交互 + hex 背景
11. 更新 `src/components/SkeletonTree.tsx` — 视觉升级
12. 更新 `src/components/CardView.tsx` — header 铜色渐变
13. 更新 `src/components/AnchorGrid.tsx` — 横向卡片布局
14. 更新 `src/components/AIChatFAB.tsx` — 铜色风格

### Phase 4: 旧页面清理
15. 删除 `app/(tabs)/today.tsx`
16. 删除 `app/(tabs)/skeleton.tsx`
17. 删除 `app/(tabs)/anchors.tsx`
18. 更新 `app/graph.tsx` — 重定向到 network tab
19. 更新 `app/_layout.tsx` — 清理 Stack 路由

---

## Part 6: 验收标准

改造完成后，以下条件全部满足：

- [ ] `npx tsc --noEmit` 无报错
- [ ] 4 个 Tab 正常切换，图标和标题正确
- [ ] 仪表盘显示学习体征、系统概览、今日待办
- [ ] 知识网络可交互，节点颜色按系统聚类
- [ ] 临床推理分类卡片切换正常
- [ ] 个人中心热力图和覆盖度显示正确
- [ ] 所有旧路由（card/anchor/skeleton/overview）仍然可访问
- [ ] AI 聊天 FAB 正常工作
- [ ] 已有卡片数据不丢失
