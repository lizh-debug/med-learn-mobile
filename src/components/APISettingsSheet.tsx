// API settings bottom sheet — API Key, endpoint, model
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  TouchableOpacity, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { getAIConfig, saveAIConfig, clearAIConfig } from '../lib/apiKeyStore';
import { useChatStore } from '../store/useChatStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function APISettingsSheet({ visible, onClose }: Props) {
  const setAPIConfig = useChatStore((s) => s.setAPIConfig);
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('https://api.deepseek.com/v1');
  const [model, setModel] = useState('deepseek-chat');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (visible) loadConfig();
  }, [visible]);

  async function loadConfig() {
    const cfg = await getAIConfig();
    setApiKey(cfg.apiKey);
    setEndpoint(cfg.endpoint);
    setModel(cfg.model);
  }

  async function handleSave() {
    if (!apiKey.trim()) {
      Alert.alert('提示', '请输入 API Key');
      return;
    }
    const cfg = { apiKey: apiKey.trim(), endpoint: endpoint.trim() || 'https://api.deepseek.com/v1', model: model.trim() || 'deepseek-chat' };
    await saveAIConfig(cfg);
    setAPIConfig(cfg.apiKey, cfg.endpoint, cfg.model);
    onClose();
  }

  async function handleTest() {
    if (!apiKey.trim()) { Alert.alert('提示', '请先输入 API Key'); return; }
    setTesting(true);
    try {
      const url = (endpoint.trim() || 'https://api.deepseek.com/v1').replace(/\/$/, '') + '/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.trim()}` },
        body: JSON.stringify({ model: model.trim() || 'deepseek-chat', messages: [{ role: 'user', content: '你好' }], max_tokens: 20 }),
      });
      if (res.ok) {
        Alert.alert('✅ 连接成功', 'API Key 有效');
      } else {
        const txt = await res.text().catch(() => '');
        Alert.alert('❌ 连接失败', `状态码 ${res.status}\n${txt.slice(0, 200)}`);
      }
    } catch (e: any) {
      Alert.alert('❌ 网络错误', e.message || '无法连接');
    } finally { setTesting(false); }
  }

  async function handleClear() {
    await clearAIConfig();
    setApiKey('');
    setAPIConfig('', endpoint, model);
    onClose();
  }

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={styles.sheet}>
        <ScrollView>
          <Text style={styles.title}>AI 设置</Text>

          <Text style={styles.label}>API Key</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-..."
            placeholderTextColor="#c7c9cd"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            前往 platform.deepseek.com 注册获取 Key。{'\n'}新用户有免费额度，API 费用极低（约 ¥1/百万 token）。
          </Text>

          <Text style={styles.label}>API 端点</Text>
          <TextInput
            style={styles.input}
            value={endpoint}
            onChangeText={setEndpoint}
            placeholder="https://api.deepseek.com/v1"
            placeholderTextColor="#c7c9cd"
            autoCapitalize="none"
          />

          <Text style={styles.label}>模型</Text>
          <TextInput
            style={styles.input}
            value={model}
            onChangeText={setModel}
            placeholder="deepseek-chat"
            placeholderTextColor="#c7c9cd"
          />

          <View style={styles.btns}>
            <TouchableOpacity style={styles.testBtn} onPress={handleTest} disabled={testing}>
              {testing ? <ActivityIndicator size="small" color="#7c3aed" /> : <Text style={styles.testBtnText}>测试连接</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>保存</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
            <Text style={styles.clearBtnText}>清除配置</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10000, justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, maxHeight: '80%',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 4, marginTop: 12 },
  hint: { fontSize: 11, color: '#9ca3af', lineHeight: 16, marginBottom: 4 },
  input: {
    backgroundColor: '#f3f4f6', borderRadius: 10, padding: 12,
    fontSize: 14, color: '#111',
  },
  btns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  testBtn: {
    flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  testBtnText: { fontSize: 15, fontWeight: '600', color: '#7c3aed' },
  saveBtn: {
    flex: 1, backgroundColor: '#7c3aed', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  clearBtn: { marginTop: 16, alignItems: 'center' },
  clearBtnText: { fontSize: 14, color: '#ef4444' },
});
