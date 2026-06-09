// Anchor grid — 临床锚点网格（横向卡片布局，左侧色带 + 快速鉴别标签）
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { copper, copperBg, jadeWhite, inkColor, ochreGray, clayGray, warmBorder, q6症状, q6体征, q6检查异常 } from '../theme/colors';
import { shadows } from '../theme/shadows';
import { spacing, radius } from '../theme/spacing';

interface Props {
  anchors: string[];
  category: string; // "症状" | "体征" | "检查异常"
}

function getCategoryColor(cat: string): string {
  if (cat === '症状') return q6症状;
  if (cat === '体征') return q6体征;
  return q6检查异常;
}

function getCategoryIcon(cat: string): keyof typeof Ionicons.glyphMap {
  if (cat === '症状') return 'body-outline';
  if (cat === '体征') return 'fitness-outline';
  return 'flask-outline';
}

// 快速鉴别：根据锚点名推测关联系统（简易映射）
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
  return map[anchorName] || [];
}

export default React.memo(function AnchorGrid({ anchors, category }: Props) {
  const router = useRouter();
  const stripeColor = getCategoryColor(category);
  const icon = getCategoryIcon(category);

  function handlePress(name: string) {
    const path = `临床锚点/${category}/${name}.md`;
    router.push(`/anchor/${encodeURIComponent(path)}`);
  }

  function handleAdd() {
    router.push(`/anchor/edit/new?category=${encodeURIComponent(category)}`);
  }

  return (
    <View style={styles.grid}>
      {anchors.map((name) => {
        const relatedSystems = getRelatedSystems(name);
        return (
          <TouchableOpacity
            key={name}
            style={styles.card}
            onPress={() => handlePress(name)}
            activeOpacity={0.6}
          >
            {/* 左侧色带 */}
            <View style={[styles.stripe, { backgroundColor: stripeColor }]} />
            {/* 内容 */}
            <View style={styles.cardBody}>
              <View style={styles.cardHeader}>
                <Ionicons name={icon} size={14} color={stripeColor} />
                <Text style={styles.cardText}>{name}</Text>
              </View>
              {relatedSystems.length > 0 && (
                <View style={styles.tagRow}>
                  {relatedSystems.map((sys, si) => (
                    <View key={si} style={styles.tag}>
                      <Text style={styles.tagText}>{sys}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={14} color={clayGray} style={{ marginRight: spacing.sm }} />
          </TouchableOpacity>
        );
      })}
      {/* 新增按钮 */}
      <TouchableOpacity style={styles.addCard} onPress={handleAdd} activeOpacity={0.7}>
        <Ionicons name="add-circle-outline" size={24} color={copper} />
        <Text style={styles.addText}>新增锚点</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  grid: {
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: jadeWhite,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: warmBorder,
    ...shadows.xs,
  },
  stripe: {
    width: 4,
    alignSelf: 'stretch',
  },
  cardBody: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardText: {
    fontSize: 16,
    fontWeight: '700',
    color: inkColor,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: copperBg,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    color: ochreGray,
  },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: copperBg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: copper,
    borderStyle: 'dashed',
    paddingVertical: spacing.lg,
  },
  addText: {
    fontSize: 15,
    fontWeight: '600',
    color: copper,
  },
});
