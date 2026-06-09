// System skeleton detail page - shows a single system in full screen
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import SkeletonTree from '../../src/components/SkeletonTree';

export default function SystemDetailScreen() {
  const { system } = useLocalSearchParams<{ system: string }>();
  return (
    <View style={styles.page}>
      <SkeletonTree systemName={decodeURIComponent(system || '心血管系统')} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#080B12' },
});
