// Anchor edit screen
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import AnchorEditor from '../../../src/components/AnchorEditor';

export default function AnchorEditScreen() {
  const params = useLocalSearchParams<{ id: string; category?: string }>();
  const isNew = params.id === 'new';
  const filePath = isNew ? '' : decodeURIComponent(params.id || '');
  const category = params.category || '症状';

  return <AnchorEditor filePath={filePath} isNew={isNew} category={category} />;
}
