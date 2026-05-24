// Loads preset data on first launch.
// Native: writes real files via expo-file-system
// Web: loads into in-memory store

import { Platform } from 'react-native';
import { PRESET_FILES } from './presetDataContent';
import { memWrite } from './fileStore';

let copied = false;

export async function loadPresets(platform: 'web' | 'native'): Promise<void> {
  if (copied) return;

  if (platform === 'web') {
    // Load all presets into in-memory store
    for (const file of PRESET_FILES) {
      memWrite(file.path, file.content);
    }
  } else {
    // Native: write real files
    const fs = await import('expo-file-system');
    const dataDir = new fs.Directory(fs.Paths.document, 'data');

    if (!dataDir.exists) {
      dataDir.create();
    }

    for (const file of PRESET_FILES) {
      try {
        const parts = file.path.replace(/\\/g, '/').split('/');
        const destFile = new fs.File(fs.Paths.document, 'data', ...parts);
        const parentDir = destFile.parentDirectory;
        if (!parentDir.exists) {
          parentDir.create();
        }
        destFile.write(file.content);
      } catch {
        // Skip individual errors
      }
    }
  }

  copied = true;
}

/**
 * Reinitialize — force reload presets.
 */
export function reset(): void {
  copied = false;
}
