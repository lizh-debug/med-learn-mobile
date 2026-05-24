// File system layer — platform-adaptive
// Native: expo-file-system   Web: localStorage (persistent)
// All paths auto-normalize to include .md suffix

import { Platform } from 'react-native';
import { parseFrontmatter, extractWikiLinks } from './markdownParser';
import { loadPresets } from './presetDataLoader';

const isNative = () => Platform.OS !== 'web';

/** Normalize path: always ends with .md */
function n(path: string): string {
  let p = path.replace(/\\/g, '/');
  if (!p.endsWith('.md')) p += '.md';
  return p;
}

// ============== Web: localStorage ==============
const LS_PREFIX = 'ml:';
const LS_INDEX = 'ml:_index';

function lsKey(path: string) { return LS_PREFIX + path; }

function lsGet(path: string): string | undefined {
  try { return localStorage.getItem(lsKey(path)) ?? undefined; } catch { return undefined; }
}
function lsSet(path: string, content: string) {
  try {
    localStorage.setItem(lsKey(path), content);
    // Update index
    const idx = lsGetIndex();
    if (!idx.includes(path)) { idx.push(path); lsSaveIndex(idx); }
  } catch { /* quota exceeded or private mode */ }
}

function lsGetIndex(): string[] {
  try {
    const raw = localStorage.getItem(LS_INDEX);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function lsSaveIndex(paths: string[]) {
  try { localStorage.setItem(LS_INDEX, JSON.stringify(paths)); } catch {}
}
function lsDelete(path: string) {
  try {
    localStorage.removeItem(lsKey(path));
    const idx = lsGetIndex().filter(p => p !== path);
    lsSaveIndex(idx);
  } catch {}
}

// ============== Native store ==============
let nativeReady = false;
let NP: typeof import('expo-file-system').Paths | null = null;
let NF: typeof import('expo-file-system').File | null = null;
let ND: typeof import('expo-file-system').Directory | null = null;

async function ensureNative() {
  if (nativeReady) return;
  const fs = await import('expo-file-system');
  NP = fs.Paths; NF = fs.File; ND = fs.Directory;
  nativeReady = true;
}

// ---- Init ----
let initialized = false;
const PRESET_VERSION = '8';

export async function ensureInit(): Promise<void> {
  if (initialized) return;
  if (isNative()) {
    await ensureNative();
    const d = new ND!(NP!.document, 'data');
    if (!d.exists) await loadPresets('native');
  } else {
    // Web: load presets if no data or version changed
    const storedVersion = (() => { try { return localStorage.getItem('ml:_version'); } catch { return null; } })();
    if (lsGetIndex().length === 0 || storedVersion !== PRESET_VERSION) {
      // Only overwrite preset files, never user data
      await loadPresets('web');
      try { localStorage.setItem('ml:_version', PRESET_VERSION); } catch {}
    }
  }
  initialized = true;
}

// ---- Read ----
export async function readFile(filePath: string): Promise<string> {
  const p = n(filePath);
  if (isNative()) {
    await ensureNative();
    const f = new NF!(NP!.document, 'data', ...p.split('/'));
    if (!f.exists) throw new Error(`File not found: ${filePath}`);
    return await f.text();
  }
  const c = lsGet(p);
  if (c === undefined) throw new Error(`File not found: ${filePath}`);
  return c;
}

export async function readNode(filePath: string) {
  const content = await readFile(filePath);
  const { frontmatter, body } = parseFrontmatter(content);
  return { frontmatter, body, path: filePath };
}

// ---- Write ----
export async function writeFile(filePath: string, content: string): Promise<void> {
  const p = n(filePath);
  if (isNative()) {
    await ensureNative();
    const parts = p.split('/');
    const f = new NF!(NP!.document, 'data', ...parts);
    const parent = f.parentDirectory;
    if (!parent.exists) parent.create();
    f.write(content);
    return;
  }
  lsSet(p, content);
}

// ---- List ----
export function listDir(dir: string): string[] {
  const raw = dir.replace(/\\/g, '/');
  const prefix = raw.endsWith('/') ? raw : raw + '/';

  if (isNative() && nativeReady) {
    const parts = prefix.replace(/\/$/, '').split('/').filter(Boolean);
    const d = parts.length > 0
      ? new ND!(NP!.document, 'data', ...parts)
      : new ND!(NP!.document, 'data');
    if (!d.exists) return [];
    return d.list()
      .filter((e: any) => e instanceof (NF as any) && e.name.endsWith('.md'))
      .map(e => prefix + e.name);
  }

  const results: string[] = [];
  for (const key of lsGetIndex()) {
    if (key.startsWith(prefix) && key.endsWith('.md')) {
      const rest = key.slice(prefix.length);
      if (!rest.includes('/')) results.push(key);
    }
  }
  return results;
}

export function listDirRecursive(dir: string): string[] {
  const raw = dir.replace(/\\/g, '/');
  const rootPrefix = raw ? (raw.endsWith('/') ? raw : raw + '/') : '';

  if (isNative() && nativeReady) {
    const parts = raw ? raw.split('/').filter(Boolean) : [];
    const d = parts.length > 0
      ? new ND!(NP!.document, 'data', ...parts)
      : new ND!(NP!.document, 'data');
    if (!d.exists) return [];

    const results: string[] = [];
    const FileCtor = NF as any;
    const DirCtor = ND as any;
    function walk(d: any, cur: string) {
      for (const e of d.list()) {
        if (e instanceof FileCtor && e.name.endsWith('.md')) results.push(cur + e.name);
        else if (e instanceof DirCtor) walk(e, cur + e.name + '/');
      }
    }
    walk(d, rootPrefix);
    return results;
  }

  // Web: all files in index matching prefix
  return lsGetIndex().filter(key => key.startsWith(rootPrefix) && key.endsWith('.md'));
}

// ---- Exists / Delete ----
export function fileExists(filePath: string): boolean {
  const p = n(filePath);
  if (isNative() && nativeReady) {
    return new NF!(NP!.document, 'data', ...p.split('/')).exists;
  }
  return lsGet(p) !== undefined;
}

export async function deleteFile(filePath: string): Promise<void> {
  const p = n(filePath);
  if (isNative() && nativeReady) {
    new NF!(NP!.document, 'data', ...p.split('/')).delete();
    return;
  }
  lsDelete(p);
}

// ---- memWrite: used by preset loader to inject files ----
export function memWrite(relativePath: string, content: string): void {
  if (isNative()) return; // native uses file system directly
  lsSet(n(relativePath), content);
}

// ---- Backlinks ----
export async function scanBacklinks(targetTitle: string): Promise<string[]> {
  const allCards = listDirRecursive('卡片');
  const backlinks: string[] = [];
  for (const cardPath of allCards) {
    try {
      const content = await readFile(cardPath);
      const links = extractWikiLinks(content);
      if (links.some(l => l.display === targetTitle || l.path.endsWith('/' + targetTitle))) {
        backlinks.push(cardPath);
      }
    } catch { /* skip */ }
  }
  return backlinks;
}

// ---- Search ----
export async function searchNodes(query: string) {
  const allFiles = listDirRecursive('');
  const results: Array<{ path: string; title: string; snippet: string }> = [];
  const lowerQuery = query.toLowerCase();

  for (const filePath of allFiles) {
    try {
      const content = await readFile(filePath);
      if (!content.toLowerCase().includes(lowerQuery)) continue;
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : filePath.split('/').pop()?.replace('.md', '') || '';
      const idx = content.toLowerCase().indexOf(lowerQuery);
      const start = Math.max(0, idx - 30);
      const end = Math.min(content.length, idx + query.length + 50);
      const snippet = (start > 0 ? '...' : '') + content.slice(start, end).replace(/\n/g, ' ') + (end < content.length ? '...' : '');
      results.push({ path: filePath, title, snippet });
    } catch { /* skip */ }
  }
  return results;
}
