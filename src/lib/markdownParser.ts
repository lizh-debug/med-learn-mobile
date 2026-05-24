// Markdown parsing utilities for v2 modular learning app

export interface Frontmatter {
  birthplace?: string;
  projections?: string[];
  filled?: string;
  anchor_type?: string;
  system?: string;
  [key: string]: unknown;
}

export interface WikiLink {
  raw: string;       // original text: [[path|display]] or [[path]]
  path: string;      // file path (e.g., "卡片/心血管系统/急性心肌梗死")
  display: string;   // display text
}

export interface ParsedNode {
  text: string;          // display text
  isWikiLink: boolean;   // is a [[link]]
  linkPath?: string;     // resolved path if wiki link
  isSpeedAnchor?: boolean; // is a 📖 anchor
}

/**
 * Parse YAML frontmatter from markdown content.
 * Expects ---\nkey: value\n--- at the top.
 */
export function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const yamlBlock = match[1];
  const body = content.slice(match[0].length);
  const frontmatter: Frontmatter = {};

  for (const line of yamlBlock.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value: unknown = line.slice(colonIdx + 1).trim();

    // Handle quoted strings
    if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    // Handle lists like [item1, item2]
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }

    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

/**
 * Serialize frontmatter + body back to markdown string.
 */
export function serializeMarkdown(frontmatter: Frontmatter, body: string): string {
  const lines: string[] = ['---'];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.join(', ')}]`);
    } else {
      lines.push(`${key}: "${value}"`);
    }
  }
  lines.push('---');
  lines.push('');
  lines.push(body);
  return lines.join('\n');
}

/**
 * Extract all [[wiki links]] from content.
 * Supports [[path]] and [[path|display name]]
 */
export function extractWikiLinks(content: string): WikiLink[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const links: WikiLink[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const raw = match[0];
    const inner = match[1];
    const pipeIdx = inner.indexOf('|');

    if (pipeIdx !== -1) {
      links.push({
        raw,
        path: inner.slice(0, pipeIdx).trim(),
        display: inner.slice(pipeIdx + 1).trim(),
      });
    } else {
      links.push({
        raw,
        path: inner.trim(),
        display: inner.trim().split('/').pop() || inner.trim(),
      });
    }
  }

  return links;
}

/**
 * Parse a line of text into ParsedNodes.
 * Handles mixed wiki links + plain text.
 */
export function parseLine(line: string): ParsedNode[] {
  const nodes: ParsedNode[] = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    // Add plain text before this link
    if (match.index > lastIndex) {
      const text = line.slice(lastIndex, match.index).trim();
      if (text) {
        nodes.push({ text, isWikiLink: false });
      }
    }

    const inner = match[1];
    const pipeIdx = inner.indexOf('|');
    const path = pipeIdx !== -1 ? inner.slice(0, pipeIdx).trim() : inner.trim();
    const display = pipeIdx !== -1 ? inner.slice(pipeIdx + 1).trim() : path.split('/').pop() || path;

    // Check if this is a speed anchor 📖
    const isSpeedAnchor = display.includes('📖') || path.includes('📖');

    nodes.push({
      text: display,
      isWikiLink: true,
      linkPath: path,
      isSpeedAnchor,
    });

    lastIndex = regex.lastIndex;
  }

  // Remaining plain text
  if (lastIndex < line.length) {
    const text = line.slice(lastIndex).trim();
    if (text) {
      nodes.push({ text, isWikiLink: false });
    }
  }

  return nodes;
}

/**
 * Check if a string looks like a wiki link line item (starts with "- [[" or "- [[]]")
 */
export function isWikiLinkLine(line: string): boolean {
  return /^-\s*\[\[/.test(line.trim());
}

/**
 * Extract display name from a wiki link line.
 * e.g., "- [[卡片/心血管系统/心脏解剖|心脏解剖]]" -> "心脏解剖"
 * e.g., "- [[卡片/心血管系统/心脏解剖]]" -> "心脏解剖"
 */
export function extractNodeName(line: string): string | null {
  const match = line.match(/\[\[([^\]]+)\]\]/);
  if (!match) return null;
  const inner = match[1];
  const pipeIdx = inner.indexOf('|');
  if (pipeIdx !== -1) return inner.slice(pipeIdx + 1).trim();
  return inner.split('/').pop()?.trim() || inner.trim();
}

/**
 * Trim ``` markers from a string (used for card body display).
 */
export function stripCodeBlockMarkers(text: string): string {
  return text.replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '').trim();
}
