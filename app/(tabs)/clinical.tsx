// Tab 3: 临床推理 — 从症状出发，反向追溯疾病本质
//
// 布局（完全重排，不再使用分段控制器）：
//  1. 顶部引言
//  2. 3 列大分类卡片（症状/体征/检查异常）— 横向并排，选中态铜色边框
//  3. 锚点卡片列表 — 横向布局：左侧彩色竖线 + 锚点名 + 快速鉴别标签组
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppStore, ANCHOR_CATEGORIES } from '../../src/store/useAppStore';
import { listDir } from '../../src/lib/fileStore';
import {
  copper, copperBg, copperLight, paperWhite, jadeWhite,
  inkColor, ochreGray, clayGray, warmBorder,
  q6症状, q6体征, q6检查异常, q6治疗,
} from '../../src/theme/colors';
import { spacing, radius } from '../../src/theme/spacing';
import { shadows, copperGlow } from '../../src/theme/shadows';

const { width: SCREEN_W } = Dimensions.get('window');

type Category = '症状' | '体征' | '检查异常';
const CATEGORIES: Category[] = ['症状', '体征', '检查异常'];

const CATEGORY_CONFIG: Record<Category, {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
  subtitle: string;
}> = {
  '症状': {
    icon: 'body-outline',
    color: q6症状,
    description: '常见症状',
    subtitle: '从症状反查疾病',
  },
  '体征': {
    icon: 'fitness-outline',
    color: q6体征,
    description: '体征线索',
    subtitle: '从查体定位系统',
  },
  '检查异常': {
    icon: 'flask-outline',
    color: q6检查异常,
    description: '检查异常',
    subtitle: '从化验倒推病生',
  },
};

export default function ClinicalScreen() {
  const router = useRouter();
  const anchorCategory = useAppStore((s) => s.anchorCategory);
  const setAnchorCategory = useAppStore((s) => s.setAnchorCategory);
  const [anchors, setAnchors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [hasFocused, setHasFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocused) { setHasFocused(true); loadAnchors(); }
    }, [hasFocused])
  );

  function loadAnchors() {
    setLoading(true);
    const result: Record<string, string[]> = {};
    for (const cat of CATEGORIES) {
      const files = listDir(`临床锚点/${cat}`);
      result[cat] = files
        .map(f => f.split('/').pop()?.replace('.md', '') || '')
        .filter(Boolean);
      if (result[cat].length === 0) {
        result[cat] = [...ANCHOR_CATEGORIES[cat]];
      }
    }
    setAnchors(result);
    setLoading(false);
  }

  const refreshKey = useAppStore((s) => s.skeletonRefreshKey);
  useFocusEffect(
    useCallback(() => { loadAnchors(); }, [refreshKey])
  );

  const currentAnchors = anchors[anchorCategory] || ANCHOR_CATEGORIES[anchorCategory];
  const currentConfig = CATEGORY_CONFIG[anchorCategory];

  function handleNewAnchor() {
    router.push(`/anchor/edit/new?category=${encodeURIComponent(anchorCategory)}`);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={copper} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 顶部引言 */}
      <View style={styles.introBlock}>
        <Text style={styles.introTitle}>临床推理</Text>
        <Text style={styles.introSubtitle}>从临床现象出发，反向追溯疾病本质</Text>
      </View>

      {/* 3 列大分类卡片 */}
      <View style={styles.categoriesRow}>
        {CATEGORIES.map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const active = anchorCategory === cat;
          const count = (anchors[cat] || []).length;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryCard,
                active && { borderColor: cfg.color, backgroundColor: active ? copperBg : jadeWhite },
              ]}
              onPress={() => setAnchorCategory(cat)}
              activeOpacity={0.7}
            >
              <View style={[styles.categoryIconWrap, { backgroundColor: active ? cfg.color + '18' : 'transparent' }]}>
                <Ionicons name={cfg.icon} size={26} color={active ? cfg.color : ochreGray} />
              </View>
              <Text style={[styles.categoryName, active && { color: cfg.color }]}>{cat}</Text>
              <Text style={styles.categoryDesc}>{cfg.description}</Text>
              <Text style={styles.categoryCount}>{count} 项</Text>
              {active && <View style={[styles.categoryIndicator, { backgroundColor: cfg.color }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 当前分类描述 */}
      <View style={styles.currentLabel}>
        <Ionicons name={currentConfig.icon} size={14} color={currentConfig.color} />
        <Text style={[styles.currentLabelText, { color: currentConfig.color }]}>{currentConfig.subtitle}</Text>
      </View>

      {/* 锚点卡片列表 */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {currentAnchors.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={36} color={clayGray} />
            <Text style={styles.emptyTitle}>尚无{anchorCategory}锚点</Text>
            <Text style={styles.emptyHint}>创建第一个临床锚点，开始构建推理网络</Text>
          </View>
        ) : (
          currentAnchors.map((name, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.anchorCard} testID="glass"
              activeOpacity={0.6}
              onPress={() => router.push(`/anchor/${encodeURIComponent(`临床锚点/${anchorCategory}/${name}`)}`)}
            >
              <View style={[styles.anchorStripe, { backgroundColor: currentConfig.color }]} />
              <View style={styles.anchorBody}>
                <Text style={styles.anchorName}>{name}</Text>
                <Text style={styles.anchorCategory}>{anchorCategory}</Text>
              </View>
              <View style={styles.anchorTags}>
                {/* 快速鉴别标签 — 模拟相关系统 */}
                {getRelatedSystems(name).slice(0, 3).map((sys, si) => (
                  <View key={si} style={styles.anchorTag}>
                    <Text style={styles.anchorTagText}>{sys}</Text>
                  </View>
                ))}
              </View>
              <Ionicons name="chevron-forward" size={14} color={clayGray} />
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 130 }} />
      </ScrollView>

      {/* FAB — 新增锚点 */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={handleNewAnchor}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

// 简易：根据锚点名推测相关系统（用于显示快速鉴别标签）
function getRelatedSystems(anchorName: string): string[] {
  const map: Record<string, string[]> = {
    '胸痛': ['心血管', '呼吸', '消化'],
    '呼吸困难': ['呼吸', '心血管', '血液'],
    '腹痛': ['消化', '泌尿', '生殖'],
    '头痛': ['神经', '心血管', '内分泌'],
    '发热': ['免疫', '血液', '呼吸'],
    '晕厥': ['心血管', '神经', '内分泌'],
    '出血': ['血液', '消化', '生殖'],
    '关节痛': ['运动', '免疫', '内分泌'],
    '恶心呕吐': ['消化', '神经', '内分泌'],
    '腹泻': ['消化', '免疫', '内分泌'],
    '意识障碍': ['神经', '内分泌', '心血管'],
    '背痛': ['运动', '泌尿', '心血管'],
    '心脏杂音': ['心血管', '呼吸', '血液'],
    '高血压': ['心血管', '泌尿', '内分泌'],
    '肺部啰音': ['呼吸', '心血管', '免疫'],
    '淋巴结肿大': ['免疫', '血液', '呼吸'],
    '水肿': ['心血管', '泌尿', '消化'],
    '腹部压痛': ['消化', '泌尿', '生殖'],
    '黄疸': ['消化', '血液', '免疫'],
    '甲状腺肿大': ['内分泌', '免疫', '心血管'],
    '贫血貌': ['血液', '消化', '泌尿'],
    '紫癜与瘀斑': ['血液', '免疫', '消化'],
    '低血压与休克': ['心血管', '血液', '内分泌'],
    '心电图异常': ['心血管', '呼吸', '内分泌'],
    '血常规异常': ['血液', '免疫', '消化'],
    '肝功能异常': ['消化', '血液', '内分泌'],
    '肾功能异常': ['泌尿', '心血管', '内分泌'],
    '血气分析异常': ['呼吸', '泌尿', '心血管'],
    '血糖异常': ['内分泌', '心血管', '神经'],
    '甲状腺功能异常': ['内分泌', '生殖', '心血管'],
  };
  return map[anchorName] || ['待关联'];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: paperWhite },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: paperWhite },

  // ── Intro ──
  introBlock: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: inkColor,
    letterSpacing: 0.5,
  },
  introSubtitle: {
    fontSize: 14,
    color: ochreGray,
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // ── 3 列分类卡片 ──
  categoriesRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  categoryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: jadeWhite,
    borderWidth: 1.5,
    borderColor: warmBorder,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.xs,
  },
  categoryIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: inkColor,
    marginBottom: 2,
  },
  categoryDesc: {
    fontSize: 11,
    color: clayGray,
    marginBottom: 5,
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: '700',
    color: ochreGray,
  },
  categoryIndicator: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 3,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },

  // ── Current label ──
  currentLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  currentLabelText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
  },

  // ── Anchor cards ──
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },

  emptyState: {
    alignItems: 'center', paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 17, fontWeight: '700', color: ochreGray, marginTop: 12,
  },
  emptyHint: {
    fontSize: 13, color: clayGray, marginTop: 4, textAlign: 'center',
  },

  anchorCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: jadeWhite,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 0.5, borderColor: warmBorder,
    ...shadows.xs,
  },
  anchorStripe: {
    width: 4, alignSelf: 'stretch',
  },
  anchorBody: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  anchorName: {
    fontSize: 16, fontWeight: '700', color: inkColor,
  },
  anchorCategory: {
    fontSize: 11, color: clayGray, marginTop: 2,
  },
  anchorTags: {
    flexDirection: 'row', gap: 4,
    marginRight: spacing.sm,
  },
  anchorTag: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: copperBg,
  },
  anchorTagText: {
    fontSize: 10, fontWeight: '600', color: ochreGray,
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: copper,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    ...copperGlow(),
  },
});
