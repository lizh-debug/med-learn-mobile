// Card read view
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import CardView from '../../src/components/CardView';

export default function CardScreen() {
  const { id, isSpeedAnchor, speedContent } = useLocalSearchParams<{ id: string; isSpeedAnchor?: string; speedContent?: string }>();
  const filePath = decodeURIComponent(id || '');

  return (
    <CardView
      filePath={filePath}
      isSpeedAnchor={isSpeedAnchor === '1'}
      speedContent={speedContent ? decodeURIComponent(speedContent) : undefined}
    />
  );
}
