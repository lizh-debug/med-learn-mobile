// Tab layout for the 3 main tabs
import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: '#fff' },
      headerTitleStyle: { fontWeight: '700', color: '#111' },
      tabBarActiveTintColor: '#2563eb',
      tabBarInactiveTintColor: '#9ca3af',
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 0.5,
        borderTopColor: '#e5e7eb',
      },
    }}>
      <Tabs.Screen
        name="skeleton"
        options={{
          title: '骨架',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🦴</Text>,
          headerTitle: '系统骨架',
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: '今天',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📝</Text>,
          headerTitle: '今天学了什么？',
        }}
      />
      <Tabs.Screen
        name="anchors"
        options={{
          title: '锚点',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>⚓</Text>,
          headerTitle: '临床锚点',
        }}
      />
    </Tabs>
  );
}
