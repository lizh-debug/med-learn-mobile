// AI Tool definitions (OpenAI function-calling format) + execution
// Bridges to fileStore for reading/writing markdown cards
import {
  readFile, readNode, writeFile, deleteFile, listDirRecursive,
  searchNodes, scanBacklinks, ensureInit,
} from './fileStore';
import { serializeMarkdown, parseFrontmatter } from './markdownParser';
import { SYSTEMS, LAYERS } from '../store/useAppStore';

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_structure_info',
      description: '获取 App 的数据结构说明：知识系统列表、卡片 Markdown 模板格式、wiki 链接语法。创建卡片前必须先调用此工具了解格式。',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_cards',
      description: '列出所有卡片文件路径，可按系统目录过滤',
      parameters: {
        type: 'object',
        properties: {
          directory: { type: 'string', description: '可选，过滤目录，如 "卡片/心血管系统"' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'read_card',
      description: '读取一张卡片的完整内容（frontmatter + body），需要卡片路径',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '卡片路径，如 "卡片/心血管系统/急性心肌梗死"' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_cards',
      description: '在所有卡片中全文搜索关键词',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_card',
      description: '创建一张新卡片。需要填写系统名、知识层次、标题、以及完整的 6 段式 body（Markdown 格式）。',
      parameters: {
        type: 'object',
        properties: {
          system: { type: 'string', description: `所属系统，必须是以下之一：${SYSTEMS.join('、')}` },
          layer: { type: 'string', description: `知识层次，必须是：基础、桥梁、临床、前沿 之一` },
          title: { type: 'string', description: '卡片标题（知识节点名称）' },
          body: { type: 'string', description: '完整的 6 段式卡片 body，从 ## 1. 一句话 到 ## 6. 如果现在是医生。注意 wiki 链接格式为 [[路径|显示名]]' },
        },
        required: ['system', 'layer', 'title', 'body'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_card',
      description: '编辑已有卡片的指定段落。传入段落编号和新的 Markdown 内容。',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '卡片路径' },
          sections: {
            type: 'object',
            description: '要更新的段落。key 为段落编号(如 "1" 到 "6")，value 为新的 Markdown 内容。',
            additionalProperties: { type: 'string' },
          },
        },
        required: ['path', 'sections'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_skeletons',
      description: '列出所有系统的骨架文件',
      parameters: {
        type: 'object', properties: {}, required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'read_skeleton',
      description: '读取某个系统的骨架文件，查看该系统的知识节点结构',
      parameters: {
        type: 'object',
        properties: {
          system: { type: 'string', description: '系统名称，如 "心血管系统"' },
        },
        required: ['system'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_backlinks',
      description: '获取某个知识标题的反向链接——哪些卡片链接到了这个标题',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '知识节点标题' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_anchor',
      description: '创建一个临床锚点（症状/体征/检查异常）。锚点有4段式结构：一句话概括、鉴别矩阵表格、反向追溯、关联骨架。',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: '锚点类别：症状、体征、检查异常 之一' },
          name: { type: 'string', description: '锚点名称，如"呼吸困难"、"双下肢水肿"' },
          oneLiner: { type: 'string', description: '一句话概括该锚点的临床意义' },
          matrix: { type: 'string', description: '鉴别矩阵 Markdown 表格，格式如 | 类型 | 特征 | 病因 |\\n|------|------|------|\\n| A | xxx | yyy |' },
          backtrace: { type: 'string', description: '反向追溯：哪些疾病会导致这个锚点' },
          skeletonLinks: { type: 'string', description: '关联到哪些系统的骨架知识，每行一个 [[链接]]' },
        },
        required: ['category', 'name', 'oneLiner', 'matrix'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'move_card',
      description: '复制或迁移卡片到另一个系统。可选择保留原卡片（复制）或删除原卡片（剪切）。',
      parameters: {
        type: 'object',
        properties: {
          sourcePath: { type: 'string', description: '源卡片路径，如 "卡片/心血管系统/心脏大体解剖"' },
          targetSystem: { type: 'string', description: '目标系统名，如 "呼吸系统"' },
          mode: { type: 'string', description: 'copy（复制，保留原卡片）或 move（剪切，删除原卡片）', enum: ['copy', 'move'] },
        },
        required: ['sourcePath', 'targetSystem', 'mode'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'navigate_to',
      description: '导航到 App 内的任意页面。用户说"带我去xxx"时调用。',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: '目标：dashboard(仪表盘), network(知识网络), clinical(临床推理), profile(我的), skeleton/{系统名}(系统骨架), card/{路径}(卡片详情), anchor/{路径}(锚点详情), graph(知识图谱), overview(学习总入口)' },
        },
        required: ['target'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_card',
      description: '删除一张卡片（不可恢复）。用户确认后执行。',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '卡片路径' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_learning_stats',
      description: '获取用户的学习统计数据：总卡片数、已填数、各系统覆盖度、连续天数。',
      parameters: {
        type: 'object', properties: {}, required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'explain_concept',
      description: '搜索知识库中与某个医学概念相关的所有卡片和锚点，综合生成解释。包含病因、机制、临床表现、治疗要点。',
      parameters: {
        type: 'object',
        properties: {
          concept: { type: 'string', description: '医学概念名称，如"心力衰竭"、"急性心肌梗死"' },
        },
        required: ['concept'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'suggest_study_plan',
      description: '分析用户的知识空白区域，建议接下来应该学习/填写哪些卡片。扫描骨架中尚未创建卡片的节点。',
      parameters: {
        type: 'object',
        properties: {
          system: { type: 'string', description: '可选，指定某个系统。不填则分析所有系统。' },
        },
        required: [],
      },
    },
  },
];

export { TOOLS };

// ---- Tool execution ----

function clipResult(raw: string, maxLen = 8000): string {
  if (raw.length <= maxLen) return raw;
  return raw.slice(0, maxLen) + `\n... (内容过长，已截断，共 ${raw.length} 字符)`;
}

export async function executeToolCall(name: string, rawArgs: string): Promise<string> {
  await ensureInit();
  let args: Record<string, any>;
  try { args = JSON.parse(rawArgs); } catch { args = {}; }

  let result: string;
  switch (name) {
    case 'get_structure_info': result = getStructureInfo(); break;
    case 'list_cards': result = await listCards(args.directory); break;
    case 'read_card': result = await readCard(args.path); break;
    case 'search_cards': result = await searchCards(args.query); break;
    case 'create_card': result = await createCard(args); break;
    case 'update_card': result = await updateCard(args.path, args.sections || {}); break;
    case 'list_skeletons': result = await listSkeletons(); break;
    case 'read_skeleton': result = await readSkeleton(args.system); break;
    case 'get_backlinks': result = await getBacklinks(args.title); break;
    case 'create_anchor': result = await createAnchor(args); break;
    case 'move_card': result = await moveCard(args); break;
    case 'navigate_to': result = navigateTo(args.target); break;
    case 'delete_card': result = await deleteCardAction(args.path); break;
    case 'get_learning_stats': result = await getLearningStats(); break;
    case 'explain_concept': result = await explainConcept(args.concept); break;
    case 'suggest_study_plan': result = await suggestStudyPlan(args.system); break;
    default: result = `未知工具: ${name}`;
  }
  return clipResult(result);
}

function getStructureInfo(): string {
  return `## App 数据结构

### 知识系统（10个）
${SYSTEMS.join('、')}

### 知识层次（4层）
🟢 基础层 — 正常结构与功能
🟡 桥梁层 — 正常→异常的过渡
🔴 临床层 — 具体疾病的诊断治疗
🔵 前沿层 — 科研新进展

### 卡片（create_card 创建）
路径格式：卡片/{系统名}/{节点名}.md
卡片属于某个系统+层次，使用6段式模板。

### 临床锚点（create_anchor 创建 — 注意！不是卡片！）
路径格式：临床锚点/{症状|体征|检查异常}/{名称}.md
锚点不属于系统，属于类别（症状/体征/检查异常），使用4段式模板。
锚点存储在 临床锚点/ 目录下，与卡片完全分开！
创建锚点必须使用 create_anchor，不要用 create_card！

### 卡片 6段式模板
## 1. 一句话 — 知识点的本质概括
## 2. 定位 — 系统：{系统名}　　层：[{层}]
## 3. 踩在什么上面 — 前置知识，每行一条 [[wiki链接]]
## 4. 通向哪里 — 后续知识，每行一条 [[wiki链接]]
## 5. 横向定位 — 对应哪门课、考试核心
## 6. 如果现在是医生 — 症状/体征/检查/治疗

### 锚点 4段式模板
## 1. 一句话 — 临床意义概括
## 2. 鉴别矩阵 — Markdown 表格（必须有分隔行 |---|---|）
## 3. 反向追溯 — 哪些疾病导致此锚点
## 4. 关联骨架 — wiki 链接到相关系统知识

### Wiki 链接格式
\`\`\`
[[卡片/心血管系统/心脏大体解剖|心脏大体解剖]]
[[临床锚点/症状/呼吸困难|呼吸困难]]
\`\`\`
`;
}

async function listCards(dir?: string): Promise<string> {
  const searchDir = dir || '卡片';
  try {
    const files = listDirRecursive(searchDir);
    if (files.length === 0) return `目录 "${searchDir}" 下没有卡片`;
    return files.slice(0, 50).map((f) => `- ${f}`).join('\n')
      + (files.length > 50 ? `\n... 共 ${files.length} 张卡片（只显示前50条）` : `\n共 ${files.length} 张卡片`);
  } catch (e: any) { return `错误：${e.message || e}`; }
}

async function readCard(p: string): Promise<string> {
  try {
    const node = await readNode(p);
    return `路径: ${node.path}\nFrontmatter: ${JSON.stringify(node.frontmatter, null, 2)}\n\nBody:\n${node.body}`;
  } catch (e: any) { return `错误：${e.message || e}`; }
}

async function searchCards(query: string): Promise<string> {
  try {
    const results = await searchNodes(query);
    if (results.length === 0) return `未找到与 "${query}" 相关的卡片`;
    return results.map((r) => `### ${r.title}\n路径: ${r.path}\n片段: ${r.snippet}`).join('\n\n');
  } catch (e: any) { return `错误：${e.message || e}`; }
}

async function createCard(args: Record<string, any>): Promise<string> {
  const { system, layer, title, body } = args;
  if (!system || !layer || !title || !body) return '错误：缺少必填字段 system/layer/title/body';

  if (!SYSTEMS.includes(system)) return `错误：系统 "${system}" 不在可用列表中：${SYSTEMS.join('、')}`;
  if (!LAYERS.includes(layer)) return `错误：层次 "${layer}" 不在可用列表中：${LAYERS.join('、')}`;

  const today = new Date().toISOString().slice(0, 10);
  const frontmatter: Record<string, unknown> = {
    birthplace: title,
    system,
    layer,
    projections: [],
    filled: today,
  };

  const content = serializeMarkdown(frontmatter, body);
  const filePath = `卡片/${system}/${title}`;

  try {
    await writeFile(filePath, content);

    // Auto-register in skeleton
    try {
      await registerInSkeleton(system, layer, title);
    } catch { /* skeleton registration is best-effort */ }

    return `✅ 卡片创建成功！\n- 路径: ${filePath}\n- 系统: ${system}\n- 层次: ${layer}\n- 日期: ${today}`;
  } catch (e: any) {
    return `创建失败：${e.message || e}`;
  }
}

async function updateCard(p: string, sections: Record<string, string>): Promise<string> {
  try {
    const content = await readFile(p);
    const { frontmatter, body } = parseFrontmatter(content);
    let newBody = body;

    const secMap: Record<string, string> = {
      '1': '1. 一句话',
      '2': '2. 定位',
      '3': '3. 踩在什么上面',
      '4': '4. 通向哪里',
      '5': '5. 横向定位',
      '6': '6. 如果现在是医生',
    };

    for (const [num, newContent] of Object.entries(sections)) {
      const prefix = secMap[num];
      if (!prefix) continue;

      // Replace or append the section
      const regex = new RegExp(`## ${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^#]*`, 's');
      const replacement = `## ${prefix}\n${newContent}`;

      if (regex.test(newBody)) {
        newBody = newBody.replace(regex, replacement);
      } else {
        newBody += `\n\n## ${prefix}\n${newContent}`;
      }
    }

    const result = serializeMarkdown(frontmatter, newBody);
    await writeFile(p, result);
    return `✅ 卡片已更新：${p}（修改段落：${Object.keys(sections).join(', ')}）`;
  } catch (e: any) {
    return `更新失败：${e.message || e}`;
  }
}

async function listSkeletons(): Promise<string> {
  try {
    const files = listDirRecursive('骨架');
    if (files.length === 0) return '没有骨架文件';
    return files.map((f) => `- ${f}`).join('\n') + `\n共 ${files.length} 个系统骨架`;
  } catch (e: any) { return `错误：${e.message || e}`; }
}

async function readSkeleton(sys: string): Promise<string> {
  try {
    const content = await readFile(`骨架/${sys}`);
    return content;
  } catch (e: any) { return `错误：${e.message || e}`; }
}

async function getBacklinks(title: string): Promise<string> {
  try {
    const links = await scanBacklinks(title);
    if (links.length === 0) return `没有卡片链接到 "${title}"`;
    return links.map((l) => `- ${l}`).join('\n') + `\n共 ${links.length} 个反向链接`;
  } catch (e: any) { return `错误：${e.message || e}`; }
}

// ---- Anchor creation ----
async function createAnchor(args: Record<string, any>): Promise<string> {
  const { category, name, oneLiner, matrix, backtrace, skeletonLinks } = args;
  const validCategories = ['症状', '体征', '检查异常'];
  if (!validCategories.includes(category)) {
    return `错误：锚点类别必须是 ${validCategories.join('、')} 之一，收到 "${category}"`;
  }
  if (!name || !oneLiner || !matrix) {
    return '错误：缺少必填字段 category/name/oneLiner/matrix';
  }

  const body = [
    `## 1. 一句话`,
    oneLiner,
    '',
    `## 2. 鉴别矩阵`,
    matrix,
    '',
    `## 3. 反向追溯`,
    backtrace || '（待补充）',
    '',
    `## 4. 关联骨架`,
    skeletonLinks || '（待补充）',
  ].join('\n');

  const frontmatter = {
    birthplace: name,
    category,
    created: new Date().toISOString().slice(0, 10),
  };

  const content = serializeMarkdown(frontmatter, body);
  const filePath = `临床锚点/${category}/${name}`;

  try {
    await writeFile(filePath, content);
    return `✅ 临床锚点创建成功！\n- 路径: ${filePath}\n- 类别: ${category}\n- 名称: ${name}`;
  } catch (e: any) {
    return `创建失败：${e.message || e}`;
  }
}

// ---- Card migration ----
async function moveCard(args: Record<string, any>): Promise<string> {
  const { sourcePath, targetSystem, mode } = args;
  if (!sourcePath || !targetSystem || !mode) {
    return '错误：缺少必填字段 sourcePath/targetSystem/mode';
  }
  if (mode !== 'copy' && mode !== 'move') {
    return '错误：mode 必须是 copy 或 move';
  }

  try {
    // Read the source card
    const content = await readFile(sourcePath);
    const { frontmatter, body } = parseFrontmatter(content);

    // Extract title from path or frontmatter
    const pathParts = sourcePath.replace(/\.md$/, '').split('/');
    const title = pathParts[pathParts.length - 1] || frontmatter.birthplace;
    const newPath = `卡片/${targetSystem}/${title}`;

    // Update frontmatter with new system
    const newFm = { ...frontmatter, system: targetSystem };
    if (frontmatter.projections && Array.isArray(frontmatter.projections)) {
      // Keep projections but note the migration
      newFm.projections = frontmatter.projections;
    }

    const newContent = serializeMarkdown(newFm, body);

    // Check if target already exists
    try {
      await readFile(newPath);
      return `错误：目标路径已存在 "${newPath}"，无法覆盖`;
    } catch { /* target doesn't exist, good */ }

    await writeFile(newPath, newContent);

    // If move mode, delete the original
    if (mode === 'move') {
      try {
        await deleteFile(sourcePath);
      } catch (e: any) {
        return `⚠️ 卡片已复制到 ${newPath}，但删除原文件失败：${e.message || e}`;
      }
    }

    const action = mode === 'move' ? '迁移' : '复制';
    return `✅ 卡片已${action}！\n- 源路径: ${sourcePath}\n- 目标路径: ${newPath}\n${mode === 'move' ? '- 原文件已删除' : '- 原文件已保留'}`;
  } catch (e: any) {
    return `${mode === 'move' ? '迁移' : '复制'}失败：${e.message || e}`;
  }
}

// ── Navigation ──
function navigateTo(target: string): string {
  // Store the navigation target; _layout.tsx watches this
  try {
    // Use the app store to trigger navigation
    const { useAppStore } = require('../store/useAppStore');
    useAppStore.getState().setPendingNavigation?.(target);
    if (useAppStore.getState().setPendingNavigation) {
      return `✅ 正在导航到: ${target}`;
    }
    return `导航功能已触发: ${target}（请确认 App 已更新以支持此功能）`;
  } catch {
    return `导航目标: ${target}（导航功能需要重新加载 App）`;
  }
}

// ── Delete card ──
async function deleteCardAction(p: string): Promise<string> {
  try {
    await deleteFile(p);
    return `✅ 卡片已删除: ${p}`;
  } catch (e: any) {
    return `删除失败：${e.message || e}`;
  }
}

// ── Learning stats ──
async function getLearningStats(): Promise<string> {
  try {
    const files = listDirRecursive('卡片');
    const sysCount: Record<string, number> = {};
    let filledCount = 0;
    for (const f of files) {
      const sys = f.split('/')[1] || '';
      sysCount[sys] = (sysCount[sys] || 0) + 1;
      try {
        const node = await readNode(f);
        if (node.frontmatter.filled) filledCount++;
      } catch { /* skip */ }
    }
    const systems = Object.entries(sysCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `- ${name}: ${count} 张卡片`)
      .join('\n');
    return `## 学习统计\n\n总卡片: ${files.length}\n已填写: ${filledCount}\n覆盖系统: ${Object.keys(sysCount).length}/${SYSTEMS.length}\n\n### 系统分布\n${systems || '暂无数据'}`;
  } catch (e: any) {
    return `获取统计失败：${e.message || e}`;
  }
}

// ── Explain concept ──
async function explainConcept(concept: string): Promise<string> {
  if (!concept) return '错误：请提供要解释的医学概念';
  try {
    const results = await searchNodes(concept);
    if (results.length === 0) return `知识库中未找到与 "${concept}" 相关的内容。建议先创建相关卡片。`;

    const parts: string[] = [`## 概念解释: ${concept}\n`];
    for (const r of results.slice(0, 5)) {
      const node = await readNode(r.path);
      // Extract key sections
      const oneLiner = node.body.match(/## 1\. 一句话\n([\s\S]*?)(?=\n## |$)/)?.[1]?.trim() || '';
      const clinical = node.body.match(/## 6\. 如果现在是医生\n([\s\S]*?)(?=\n## |$)/)?.[1]?.trim() || '';
      parts.push(`### ${r.title}`);
      if (oneLiner) parts.push(`**核心**: ${oneLiner}`);
      if (clinical) parts.push(`**临床**: ${clinical}`);
      parts.push(`📄 ${r.path}\n`);
    }
    return parts.join('\n');
  } catch (e: any) {
    return `解释失败：${e.message || e}`;
  }
}

// ── Suggest study plan ──
async function suggestStudyPlan(system?: string): Promise<string> {
  try {
    const targetSystems = system ? [system] : [...SYSTEMS];
    const suggestions: string[] = [];

    for (const sys of targetSystems) {
      try {
        const skelContent = await readFile(`骨架/${sys}.md`);
        const bodyOnly = skelContent.replace(/^---[\s\S]*?---\n?/, '');
        const links = bodyOnly.match(/\[\[([^\]]+)\]\]/g) || [];
        const existingFiles = listDirRecursive(`卡片/${sys}`);
        const existingTitles = new Set(existingFiles.map(f => f.split('/').pop()?.replace('.md', '') || ''));

        const missing: string[] = [];
        for (const link of links) {
          const inner = link.slice(2, -2);
          const display = inner.includes('|') ? inner.split('|')[1] : inner.split('/').pop() || inner;
          if (!existingTitles.has(display) && !existingFiles.some(f => f.includes(display))) {
            missing.push(display);
          }
        }
        if (missing.length > 0) {
          suggestions.push(`### ${sys}（${missing.length} 个待填节点）`);
          suggestions.push(...missing.slice(0, 5).map(n => `- [ ] ${n}`));
          if (missing.length > 5) suggestions.push(`  ...及其他 ${missing.length - 5} 个节点`);
          suggestions.push('');
        }
      } catch { /* skip system with no skeleton */ }
    }

    if (suggestions.length === 0) return '✅ 所有系统的骨架节点都已创建卡片！你的知识网络非常完整。';
    return `## 📋 学习建议\n\n以下骨架节点尚未创建卡片，建议优先填写：\n\n${suggestions.join('\n')}`;
  } catch (e: any) {
    return `分析失败：${e.message || e}`;
  }
}

// ---- Skeleton auto-registration ----
async function registerInSkeleton(sys: string, lyr: string, nodeTitle: string) {
  const skelPath = `骨架/${sys}.md`;
  const skelContent = await readFile(skelPath);

  const layerPrefix: Record<string, string> = {
    '基础': '## 🟢 基础层',
    '桥梁': '## 🟡 桥梁层',
    '临床': '## 🔴 临床层',
    '前沿': '## 🔵 前沿层',
  };
  const targetHeader = layerPrefix[lyr];
  if (!targetHeader) return;

  const newLine = `- [[卡片/${sys}/${nodeTitle}|${nodeTitle}]]\n`;

  const lines = skelContent.split('\n');
  let targetIdx = -1;
  let nextHeaderIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith(targetHeader)) {
      targetIdx = i;
    } else if (targetIdx >= 0 && t.startsWith('## ') && i > targetIdx) {
      nextHeaderIdx = i;
      break;
    }
  }
  if (targetIdx < 0) return;

  const insertEnd = nextHeaderIdx > 0 ? nextHeaderIdx : lines.length;
  let lastNodeIdx = -1;
  for (let i = targetIdx + 1; i < insertEnd; i++) {
    if (lines[i].includes('[[') || lines[i].includes('→')) lastNodeIdx = i;
  }
  const insertAt = lastNodeIdx > 0 ? lastNodeIdx + 1 : targetIdx + 1;
  if (skelContent.includes(`卡片/${sys}/${nodeTitle}`)) return;

  lines.splice(insertAt, 0, newLine);
  await writeFile(skelPath, lines.join('\n'));
}
