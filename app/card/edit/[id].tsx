// Card edit screen - for creating and editing cards
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import CardEditor from '../../../src/components/CardEditor';
import { useAppStore } from '../../../src/store/useAppStore';

export default function CardEditScreen() {
  const params = useLocalSearchParams<{
    id: string;
    prefillTitle?: string;
    prefillSystem?: string;
    prefillLayer?: string;
    prefillContent?: string;
    cardPath?: string;
  }>();

  const editingCardPath = useAppStore((s) => s.editingCardPath);

  // Store-based navigation takes priority (from CardView edit button)
  // Falls back to query param, then route param for backward compat
  // cardPath is only used as existingPath when NOT creating a new card
  const isNew = params.id === 'new' || params.id === 'existing';
  const existingPath = editingCardPath
    || (!isNew ? params.cardPath : undefined)
    || ((!isNew && params.id) ? params.id : undefined);

  return (
    <CardEditor
      existingPath={existingPath}
      prefillTitle={params.prefillTitle}
      prefillSystem={params.prefillSystem}
      prefillLayer={params.prefillLayer}
      prefillContent={params.prefillContent}
    />
  );
}
