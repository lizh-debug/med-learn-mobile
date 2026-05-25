// API Key persistence — platform-adaptive
// Web: localStorage   Native: expo-file-system
import { Platform } from 'react-native';

const KEY = 'ml:ai_config';
const DEFAULT_ENDPOINT = 'https://api.deepseek.com/v1';
const DEFAULT_MODEL = 'deepseek-chat';

export interface AIConfig {
  apiKey: string;
  endpoint: string;
  model: string;
}

async function readNative(): Promise<AIConfig | null> {
  try {
    const fs = await import('expo-file-system');
    const p = fs.Paths;
    const ND = fs.Directory;
    const NF = fs.File;
    const configDir = new ND(p.document, 'config');
    const configFile = new NF(p.document, 'config', 'ai-config.json');
    if (!configFile.exists) return null;
    const raw = await configFile.text();
    return JSON.parse(raw);
  } catch { return null; }
}

async function writeNative(config: AIConfig): Promise<void> {
  const fs = await import('expo-file-system');
  const p = fs.Paths;
  const ND = fs.Directory;
  const NF = fs.File;
  const configDir = new ND(p.document, 'config');
  if (!configDir.exists) configDir.create();
  const configFile = new NF(p.document, 'config', 'ai-config.json');
  configFile.write(JSON.stringify(config));
}

export async function getAIConfig(): Promise<AIConfig> {
  if (Platform.OS !== 'web') {
    const cfg = await readNative();
    if (cfg) return cfg;
  } else {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
  }
  return { apiKey: '', endpoint: DEFAULT_ENDPOINT, model: DEFAULT_MODEL };
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
  if (Platform.OS !== 'web') {
    await writeNative(config);
  } else {
    try { localStorage.setItem(KEY, JSON.stringify(config)); } catch { /* ignore */ }
  }
}

export async function clearAIConfig(): Promise<void> {
  if (Platform.OS !== 'web') {
    try {
      const fs = await import('expo-file-system');
      const p = fs.Paths;
      const NF = fs.File;
      const configFile = new NF(p.document, 'config', 'ai-config.json');
      if (configFile.exists) configFile.delete();
    } catch { /* ignore */ }
  } else {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }
}
