// CardPopover — Obsidian-style floating card preview on single tap
// Shows title, one-liner, system/layer, and a "open" button.
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Modal, Pressable, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { readNode } from '../lib/fileStore';

interface Props {
  visible: boolean;
  cardPath: string;
  displayName: string;
  onClose: () => void;
}

export default function CardPopover({ visible, cardPath, displayName, onClose }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ title: string; oneLiner: string; system: string; layer: string } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!visible || !cardPath) return;
    setLoading(true);
    setNotFound(false);
    loadCard();
  }, [visible, cardPath]);

  async function loadCard() {
    try {
      const node = await readNode(cardPath);
      const title = node.body.match(/^#\s+(.+)$/m)?.[1] || displayName;
      const oneLiner = node.body.match(/## 1\. 一句话\n([\s\S]*?)(?=\n## |$)/)?.[1]?.trim() || '';
      const system = (node.frontmatter.system as string) || '';
      const layer = (node.frontmatter.layer as string) || '';
      setData({ title, oneLiner, system, layer });
    } catch {
      setNotFound(true);
    }
    setLoading(false);
  }

  function handleOpen() {
    onClose();
    setTimeout(() => {
      router.push(`/card/${encodeURIComponent(cardPath)}`);
    }, 150);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.popover} onPress={e => e.stopPropagation()}>
          {loading ? (
            <ActivityIndicator size="small" color="#C8A45C" />
          ) : notFound ? (
            <View style={styles.notFound}>
              <Text style={styles.notFoundIcon}>📭</Text>
              <Text style={styles.notFoundText}>卡片尚未填写</Text>
              <TouchableOpacity style={styles.createBtn} onPress={handleOpen}>
                <Text style={styles.createBtnText}>创建卡片</Text>
              </TouchableOpacity>
            </View>
          ) : data ? (
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>{data.title}</Text>
              {data.system ? (
                <View style={styles.meta}>
                  <Text style={styles.metaText}>{data.system} · {data.layer}层</Text>
                </View>
              ) : null}
              {data.oneLiner ? (
                <Text style={styles.oneLiner} numberOfLines={4}>{data.oneLiner}</Text>
              ) : (
                <Text style={styles.emptyHint}>暂无摘要内容</Text>
              )}
              <TouchableOpacity style={styles.openBtn} onPress={handleOpen} activeOpacity={0.7}>
                <Ionicons name="open-outline" size={14} color="#080B10" />
                <Text style={styles.openBtnText}>打开完整卡片</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
    padding: 40,
  },
  popover: {
    backgroundColor: '#161B22',
    borderRadius: 16,
    padding: 20,
    maxHeight: 320,
    width: '100%',
    borderWidth: 0.5, borderColor: 'rgba(200,164,92,0.20)',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  scroll: { maxHeight: 260 },
  title: { fontSize: 18, fontWeight: '700', color: '#E8EDF5', marginBottom: 8 },
  meta: { flexDirection: 'row', marginBottom: 12 },
  metaText: { fontSize: 12, color: '#C8A45C', fontWeight: '600' },
  oneLiner: { fontSize: 14, color: '#8E9DB5', lineHeight: 20, marginBottom: 16 },
  emptyHint: { fontSize: 13, color: '#5A6980', fontStyle: 'italic', marginBottom: 16 },
  openBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#C8A45C', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16,
  },
  openBtnText: { fontSize: 14, fontWeight: '700', color: '#080B10' },
  notFound: { alignItems: 'center', paddingVertical: 20 },
  notFoundIcon: { fontSize: 32, marginBottom: 8 },
  notFoundText: { fontSize: 15, color: '#5A6980', marginBottom: 16 },
  createBtn: {
    backgroundColor: '#C8A45C', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 20,
  },
  createBtnText: { fontSize: 14, fontWeight: '700', color: '#080B10' },
});
