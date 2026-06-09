// Root layout for expo-router
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ensureInit } from '../src/lib/fileStore';
import { getAIConfig } from '../src/lib/apiKeyStore';
import { getDefaultKey } from '../src/lib/defaultKey';
import { useChatStore } from '../src/store/useChatStore';
import { useAppStore } from '../src/store/useAppStore';
import { copper } from '../src/theme/colors';
import IvisOrb from '../src/components/IvisOrb';
import IvisHUD from '../src/components/IvisHUD';
import AIChatPanel from '../src/components/AIChatPanel';

export default function RootLayout() {
  const router = useRouter();
  const pendingNav = useAppStore((s) => s.pendingNavigation);
  const setPendingNav = useAppStore((s) => s.setPendingNavigation);

  // Inject liquid glass CSS globally on web
  useEffect(() => {
    if (typeof document !== 'undefined' && !document.getElementById('ivis-glass-css')) {
      const style = document.createElement('style');
      style.id = 'ivis-glass-css';
      style.textContent = `
        [data-testid="glass"], [data-testid="glass-heavy"] {
          backdrop-filter: blur(18px) saturate(1.3);
          -webkit-backdrop-filter: blur(18px) saturate(1.3);
        }
        [data-testid="glass-heavy"] {
          backdrop-filter: blur(34px) saturate(1.6);
          -webkit-backdrop-filter: blur(34px) saturate(1.6);
        }
        html, body, #root { background: #0D1117 !important; }
        /* Fixed decorative layer behind content for glass to blur */
        #root::before {
          content: '';
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(circle 400px at 25% 30%, rgba(200,164,92,0.06) 0%, transparent 60%),
            radial-gradient(circle 300px at 75% 65%, rgba(200,164,92,0.04) 0%, transparent 50%),
            radial-gradient(circle 600px at 50% 50%, rgba(13,17,23,0.9) 0%, transparent 70%);
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    ensureInit().catch(console.error);
    loadAPIConfig();
  }, []);

  // Watch for AI-requested navigation
  useEffect(() => {
    if (!pendingNav) return;
    const target = pendingNav;
    setPendingNav(null); // consume immediately

    if (target === 'dashboard' || target === '仪表盘') {
      router.push('/(tabs)/dashboard');
    } else if (target === 'network' || target === '知识网络') {
      router.push('/(tabs)/network');
    } else if (target === 'clinical' || target === '临床推理') {
      router.push('/(tabs)/clinical');
    } else if (target === 'profile' || target === '我的') {
      router.push('/(tabs)/profile');
    } else if (target === 'graph' || target === '知识图谱') {
      router.push('/graph');
    } else if (target === 'overview' || target === '学习总入口') {
      router.push('/overview');
    } else if (target.startsWith('skeleton/')) {
      router.push(`/skeleton/${encodeURIComponent(target.replace('skeleton/', ''))}`);
    } else if (target.startsWith('card/')) {
      router.push(`/card/${encodeURIComponent(target.replace('card/', ''))}`);
    } else if (target.startsWith('anchor/')) {
      router.push(`/anchor/${encodeURIComponent(target.replace('anchor/', ''))}`);
    } else if (target.startsWith('/')) {
      router.push(target as any);
    }
  }, [pendingNav]);

  async function loadAPIConfig() {
    const cfg = await getAIConfig();
    const proxyUrl = process.env.EXPO_PUBLIC_AI_PROXY_URL as string | undefined;
    const defaultKey = proxyUrl ? '' : getDefaultKey();
    const defaultEndpoint = proxyUrl || cfg.endpoint || (process.env.EXPO_PUBLIC_DEEPSEEK_ENDPOINT as string) || 'https://api.deepseek.com/v1';
    const defaultModel = (process.env.EXPO_PUBLIC_DEEPSEEK_MODEL as string) || 'deepseek-chat';

    const apiKey = cfg.apiKey || defaultKey;
    const endpoint = cfg.endpoint || defaultEndpoint;
    const model = cfg.model || defaultModel;

    const isProxy = !!proxyUrl;
    if (isProxy || apiKey) {
      useChatStore.getState().setAPIConfig(apiKey, endpoint, model);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: '#080B12' },
        headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#E8EDF5' },
        headerShadowVisible: false,
        headerTintColor: copper,
        headerBackTitleStyle: { fontSize: 17 },
      }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="skeleton/[system]"
          options={{
            headerShown: true,
            title: '系统骨架',
            headerBackTitle: '返回',
          }}
        />
        <Stack.Screen
          name="card/[id]"
          options={{
            headerShown: true,
            title: '卡片',
            headerBackTitle: '返回',
          }}
        />
        <Stack.Screen
          name="card/edit/[id]"
          options={{
            headerShown: true,
            title: '编辑卡片',
            headerBackTitle: '返回',
          }}
        />
        <Stack.Screen
          name="anchor/[id]"
          options={{
            headerShown: true,
            title: '临床锚点',
            headerBackTitle: '返回',
          }}
        />
        <Stack.Screen
          name="anchor/edit/[id]"
          options={{
            headerShown: true,
            title: '编辑锚点',
            headerBackTitle: '返回',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="graph"
          options={{
            headerShown: true,
            title: '知识图谱',
            headerBackTitle: '返回',
          }}
        />
        <Stack.Screen
          name="overview"
          options={{
            headerShown: true,
            title: '学习总入口',
            headerBackTitle: '返回',
          }}
        />
      </Stack>
      <IvisHUD />
      <IvisOrb />
      <AIChatPanel />
    </View>
  );
}
