// Search engine for v2 modular learning app

import { listDirRecursive, readFile } from './fileStore';

export interface SearchResult {
  path: string;
  title: string;
  snippet: string;
  matchType: 'title' | 'content' | 'link';
}

/**
 * Full-text search across all .md files.
 */
export async function search(query: string): Promise<SearchResult[]> {
  const allFiles = listDirRecursive('');
  if (!allFiles.length) return [];

  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  for (const filePath of allFiles) {
    try {
      const content = await readFile(filePath);

      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : filePath.split('/').pop()?.replace('.md', '') || '';
      const lowerTitle = title.toLowerCase();

      if (lowerTitle.includes(lowerQuery)) {
        results.push({
          path: filePath,
          title,
          snippet: title,
          matchType: 'title',
        });
        continue;
      }

      const lowerContent = content.toLowerCase();
      if (lowerContent.includes(lowerQuery)) {
        const idx = lowerContent.indexOf(lowerQuery);
        const start = Math.max(0, idx - 40);
        const end = Math.min(content.length, idx + query.length + 60);
        const snippet = (start > 0 ? '...' : '') +
          content.slice(start, end).replace(/\n/g, ' ').replace(/\s+/g, ' ') +
          (end < content.length ? '...' : '');

        results.push({
          path: filePath,
          title,
          snippet,
          matchType: 'content',
        });
      }
    } catch {
      // skip unreadable files
    }
  }

  results.sort((a, b) => {
    if (a.matchType === 'title' && b.matchType !== 'title') return -1;
    if (a.matchType !== 'title' && b.matchType === 'title') return 1;
    return a.path.localeCompare(b.path);
  });

  return results;
}

/**
 * Get all available card names for autocomplete.
 */
export async function getAllCardNames(): Promise<Array<{ path: string; title: string }>> {
  const allFiles = listDirRecursive('');
  const cards: Array<{ path: string; title: string }> = [];

  for (const filePath of allFiles) {
    try {
      const content = await readFile(filePath);
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : filePath.split('/').pop()?.replace('.md', '') || '';
      cards.push({ path: filePath, title });
    } catch {
      // skip
    }
  }

  return cards;
}

/**
 * Return file icon/type based on path.
 */
export function getFileType(path: string): 'card' | 'skeleton' | 'anchor' | 'template' | 'other' {
  if (path.startsWith('卡片/')) return 'card';
  if (path.startsWith('骨架/')) return 'skeleton';
  if (path.startsWith('临床锚点/')) return 'anchor';
  if (path.includes('模板')) return 'template';
  return 'other';
}
