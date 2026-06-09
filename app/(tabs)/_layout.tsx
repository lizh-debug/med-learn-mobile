// Tab layout — 4 Tab：仪表盘 / 知识网络 / 临床推理 / 我的
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { copper, ochreGray } from '../../src/theme/colors';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: '#080B12' },
      headerTitleStyle: { fontSize: 17, fontWeight: '600', color: '#E8EDF5' },
      headerShadowVisible: false,
      tabBarActiveTintColor: copper,
      tabBarInactiveTintColor: ochreGray,
      tabBarStyle: {
        backgroundColor: 'rgba(10,14,23,0.70)',
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(0,229,255,0.08)',
        position: 'absolute' as const,
        height: 88,
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
        name="dashboard"
        options={{
          title: '仪表盘',
          tabBarIcon: ({ color }) => <Ionicons name="pulse-outline" size={24} color={color} />,
          headerTitle: '模块化学习',
        }}
      />
      <Tabs.Screen
        name="network"
        options={{
          title: '知识网络',
          tabBarIcon: ({ color }) => <Ionicons name="git-network-outline" size={24} color={color} />,
          headerTitle: '知识网络',
        }}
      />
      <Tabs.Screen
        name="clinical"
        options={{
          title: '临床推理',
          tabBarIcon: ({ color }) => <Ionicons name="fitness-outline" size={24} color={color} />,
          headerTitle: '临床推理',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
          headerTitle: '我的',
        }}
      />

      {/* 隐藏旧 Tab 页面 */}
      <Tabs.Screen name="skeleton" options={{ href: null }} />
      <Tabs.Screen name="today" options={{ href: null }} />
      <Tabs.Screen name="anchors" options={{ href: null }} />
    </Tabs>
  );
}
