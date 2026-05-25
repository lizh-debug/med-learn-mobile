// Root layout for expo-router
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ensureInit } from '../src/lib/fileStore';
import { getAIConfig } from '../src/lib/apiKeyStore';
import { useChatStore } from '../src/store/useChatStore';
import AIChatFAB from '../src/components/AIChatFAB';
import AIChatPanel from '../src/components/AIChatPanel';

export default function RootLayout() {
  useEffect(() => {
    ensureInit().catch(console.error);
    loadAPIConfig();
  }, []);

  async function loadAPIConfig() {
    const cfg = await getAIConfig();
    if (cfg.apiKey) {
      useChatStore.getState().setAPIConfig(cfg.apiKey, cfg.endpoint, cfg.model);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
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
      <AIChatFAB />
      <AIChatPanel />
    </View>
  );
}
