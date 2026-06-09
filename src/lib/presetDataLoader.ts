// Loads preset data on first launch.
// Uses dynamic import so Metro/webpack splits presets into a separate chunk
// — reduces main bundle size and correctly resolves baseUrl paths.

import { memWrite } from './fileStore';

let copied = false;

export async function loadPresets(platform: 'web' | 'native'): Promise<void> {
  if (copied) return;

  // Dynamic import — Metro/webpack creates a separate chunk, loaded on demand.
  // Path resolution (including baseUrl) is handled automatically by the bundler.
  const mod = await import('./presetDataContent');
  const files = mod.PRESET_FILES;

  if (platform === 'web') {
    for (const file of files) {
      memWrite(file.path, file.content);
    }
  } else {
    const fs = await import('expo-file-system');
    const dataDir = new fs.Directory(fs.Paths.document, 'data');

    if (!dataDir.exists) {
      dataDir.create();
    }

    for (const file of files) {
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
