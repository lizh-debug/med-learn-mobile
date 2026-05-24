// System skeleton detail page - shows a single system in full screen
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import SkeletonTree from '../../src/components/SkeletonTree';

export default function SystemDetailScreen() {
  const { system } = useLocalSearchParams<{ system: string }>();
  return <SkeletonTree systemName={decodeURIComponent(system || '心血管系统')} />;
}
