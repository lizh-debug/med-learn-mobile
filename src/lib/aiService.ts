// DeepSeek API client (OpenAI-compatible) with tool calling
import { TOOLS, executeToolCall } from './aiTools';
import type { ChatMessage } from '../store/useChatStore';

const SYSTEM_PROMPT = `你是**医维斯 (Ivis)** — JARVIS 风格的医学学习操作系统 AI。冷静、精准、高效。你的职责是管理知识网络，完全控制此 App（导航、创建、搜索、分析）。回复简洁，不寒暄，像 JARVIS 一样专业。

## App 核心概念

知识分为 4 层：
🟢 基础层（正常结构与功能，对应解剖学/生理学/组织学）
🟡 桥梁层（正常→异常过渡，对应病理生理学/病理学）
🔴 临床层（具体疾病诊断治疗，对应内科学/外科学/妇产科学/儿科学）
🔵 前沿层（科研新进展）

每个知识节点是一张卡片，卡片之间通过 [[路径|显示名]] 格式的 wiki 链接互相连接。

## 卡片 vs 锚点（非常重要！）

**卡片**（create_card）：
- 路径在 卡片/{系统名}/{节点名}.md
- 6段式模板（一句话/定位/踩在什么上面/通向哪里/横向定位/如果现在是医生）
- 属于某个系统（心血管系统、呼吸系统等10个系统之一）
- 属于某个层次（基础/桥梁/临床/前沿）

**临床锚点**（create_anchor）：
- 路径在 临床锚点/{症状|体征|检查异常}/{名称}.md
- 4段式模板（一句话/鉴别矩阵/反向追溯/关联骨架）
- 不属于系统，属于类别（症状/体征/检查异常 之一）
- 不是卡片！不要用 create_card 创建锚点！锚点有自己的存储目录！

## 工作原则

1. **回答医学问题前先查阅已有卡片**：使用工具读取相关知识，不要凭空编造
2. **创建卡片严格遵循 6 段式模板**：创建卡片前先调用 get_structure_info 确认格式
3. **创建锚点使用 create_anchor 工具**：锚点不是卡片，不要混用
4. **主动建议 wiki 链接**：在卡片内容中用 [[路径|显示名]] 格式链接到已有知识
5. **回复简洁**：适合移动端阅读，避免冗长
6. **使用中文**：医学术语准确
7. **导航控制**：用户说"带我去xxx"或"打开xxx"时调用 navigate_to

## 可用工具

- **卡片**：list_cards / read_card / search_cards / create_card / update_card / move_card
- **锚点**：create_anchor（创建临床锚点，存储在 临床锚点/ 目录下，不是卡片目录！）
- **骨架**：list_skeletons / read_skeleton
- **辅助**：get_structure_info / get_backlinks

## 常见场景

- 用户说"帮我创建一张关于 X 的卡片"或"帮我写一张XX卡片"→ 用 create_card
- 用户说"帮我创建一个临床锚点"或"添加一个锚点"或"创建一个关于XX症状的锚点"→ 用 create_anchor，必须提供 category（症状/体征/检查异常）
- 用户说"帮我补充这张卡片"→ 先 read_card 读取当前内容，再 update_card 修改指定段落
- 用户说"把这张卡片复制到X系统"→ 用 move_card
- 用户问医学问题→ 先 search_cards 查已有知识，没有则用医学知识回答

## 表格格式注意
Markdown 表格必须在表头和表体之间加分隔行：
| 类型 | 特征 | 病因 |
|------|------|------|
| A型  | xxx  | yyy  |
否则表格不会被渲染。`;

interface APICallParams {
  endpoint: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string; tool_calls?: any; tool_call_id?: string }>;
  toolChoice?: 'auto' | 'none';
}

function sanitizeString(s: string): string {
  // Strip C1 control chars (U+0080-U+009F) that JSON.stringify escapes as \uXXXX,
  // which some JSON parsers (including DeepSeek) may reject or mishandle.
  // Also strip lone surrogates (U+D800-U+DFFF) that produce malformed \u escapes.
  // Regex uses explicit \u escapes for correctness across editors.
  return s.replace(/[-\uD800-\uDFFF]/g, '');
}

function sanitizeMessages(msgs: Array<{ role: string; content: string; tool_calls?: any; tool_call_id?: string }>) {
  for (const m of msgs) {
    if (typeof m.content === 'string') m.content = sanitizeString(m.content);
  }
  return msgs;
}

async function callDeepSeek(params: APICallParams): Promise<any> {
  const { endpoint, apiKey, model, messages } = params;
  const url = endpoint.replace(/\/$/, '') + '/chat/completions';

  sanitizeMessages(messages);

  const body: any = { model, messages, tools: TOOLS, tool_choice: params.toolChoice || 'auto' };

  const bodyJson = JSON.stringify(body);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
  };
  // Only send auth header when using a direct key (proxy mode has no key)
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: bodyJson,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    if (res.status === 401) throw new Error('API Key 无效，请在设置中重新配置');
    if (res.status === 429) throw new Error('API 调用频率过高，请稍后重试');
    if (res.status >= 500) throw new Error('DeepSeek 服务器繁忙，请稍后重试');
    throw new Error(`API 错误 (${res.status}): ${errText.slice(0, 200)}`);
  }

  return res.json();
}

export interface ChatResult {
  message: ChatMessage;
}

export async function chat(
  messages: ChatMessage[],
  apiKey: string,
  endpoint: string = 'https://api.deepseek.com/v1',
  model: string = 'deepseek-chat',
  onStatus?: (id: string, status: ChatMessage['status'], text?: string) => void,
): Promise<ChatResult> {
  // Build API message list
  const apiMessages: Array<{ role: string; content: string; tool_calls?: any; tool_call_id?: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: m.role as string,
      content: m.content,
    })),
  ];

  let iteration = 0;
  const MAX_ITERATIONS = 10;
  let lastContent = '';

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    const data = await callDeepSeek({ endpoint, apiKey, model, messages: apiMessages });
    const choice = data.choices?.[0];
    if (!choice) throw new Error('API 返回数据异常');

    const msg = choice.message;

    // If the model wants to call tools
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      // Append assistant message with tool_calls
      apiMessages.push({
        role: 'assistant',
        content: msg.content || '',
        tool_calls: msg.tool_calls,
      });

      for (const tc of msg.tool_calls) {
        const toolName = tc.function?.name || tc.name;
        const toolArgs = tc.function?.arguments || tc.arguments || '{}';

        if (onStatus) {
          const label = toolLabel(toolName, toolArgs);
          onStatus('tool_call', 'calling_tool', label);
        }

        // Execute and append tool result
        const result = await executeToolCall(toolName, typeof toolArgs === 'string' ? toolArgs : JSON.stringify(toolArgs));

        apiMessages.push({
          role: 'tool',
          content: result,
          tool_call_id: tc.id,
        });
      }
      continue; // Loop again with tool results
    }

    // Final text response
    lastContent = msg.content || '';
    break;
  }

  // If loop exhausted without a text answer, force one final synthesis call
  if (!lastContent) {
    try {
      const data = await callDeepSeek({ endpoint, apiKey, model, messages: apiMessages, toolChoice: 'none' });
      lastContent = data.choices?.[0]?.message?.content || '';
    } catch { /* best-effort */ }
  }

  return {
    message: {
      id: `ai_${Date.now()}`,
      role: 'assistant',
      content: lastContent || '抱歉，我无法完成这个请求',
      status: 'done',
    },
  };
}

function toolLabel(name: string, args: string): string {
  try {
    const a = JSON.parse(args);
    switch (name) {
      case 'search_cards': return `正在搜索：${a.query || ''}`;
      case 'read_card': return `正在读取卡片：${a.path || ''}`;
      case 'create_card': return `正在创建卡片：${a.title || ''}`;
      case 'update_card': return `正在更新卡片：${a.path || ''}`;
      case 'list_cards': return `正在列出卡片${a.directory ? '：' + a.directory : ''}`;
      case 'read_skeleton': return `正在读取骨架：${a.system || ''}`;
      case 'get_backlinks': return `正在查找反向链接：${a.title || ''}`;
      case 'list_skeletons': return '正在列出所有骨架';
      case 'get_structure_info': return '正在获取 App 结构信息';
      case 'create_anchor': return `正在创建锚点：${a.name || ''}`;
      case 'move_card': return `正在${a.mode === 'move' ? '迁移' : '复制'}卡片：${a.sourcePath || ''}`;
      default: return `正在执行：${name}`;
    }
  } catch {
    return `正在执行：${name}`;
  }
}
