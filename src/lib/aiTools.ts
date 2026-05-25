// AI Tool definitions (OpenAI function-calling format) + execution
// Bridges to fileStore for reading/writing markdown cards
import {
  readFile, readNode, writeFile, listDirRecursive,
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
];

export { TOOLS };

// ---- Tool execution ----

export async function executeToolCall(name: string, rawArgs: string): Promise<string> {
  await ensureInit();
  let args: Record<string, any>;
  try { args = JSON.parse(rawArgs); } catch { args = {}; }

  switch (name) {
    case 'get_structure_info': return getStructureInfo();
    case 'list_cards': return listCards(args.directory);
    case 'read_card': return readCard(args.path);
    case 'search_cards': return searchCards(args.query);
    case 'create_card': return createCard(args);
    case 'update_card': return updateCard(args.path, args.sections || {});
    case 'list_skeletons': return listSkeletons();
    case 'read_skeleton': return readSkeleton(args.system);
    case 'get_backlinks': return getBacklinks(args.title);
    default: return `未知工具: ${name}`;
  }
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

### 卡片 Markdown 模板（6段式）
每张卡片是一个 .md 文件，路径格式：卡片/{系统名}/{节点名}.md

Frontmatter 字段：
- birthplace: 标题
- system: 所属系统
- layer: 基础/桥梁/临床/前沿
- projections: 投影列表（跨系统关联）
- filled: 填写日期 YYYY-MM-DD

Body 结构：
## 1. 一句话 — 知识点的本质概括
## 2. 定位 — 系统：{系统名}　　层：[{层}]
课程：{课程名}
## 3. 踩在什么上面（纵向向下）— 前置知识，每行一条 wiki 链接
## 4. 通向哪里（纵向向上）— 后续知识，每行一条 wiki 链接
## 5. 横向定位 — 对应哪门课、在课本哪里（考试核心）
- 在《课本名》中…
- 前承：...
- 后启：...
- 考试核心：...
## 6. 如果现在是医生（临床反向）
- 症状：...
- 体征：...
- 检查：...
- 治疗：...

### Wiki 链接格式
\`\`\`
[[卡片/心血管系统/心脏大体解剖|心脏大体解剖]]
\`\`\`
路径指向卡片文件，| 后是显示名。

### 锚点
格式：\`\`\`临床锚点/{症状|体征|检查异常}/{名称}.md\`\`\`
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
