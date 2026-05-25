// DeepSeek API client (OpenAI-compatible) with tool calling
import { TOOLS, executeToolCall } from './aiTools';
import type { ChatMessage } from '../store/useChatStore';

const SYSTEM_PROMPT = `你是一个医学学习助手，集成在「模块化学习」App 中。这个 App 帮助医学生将知识拆解为知识节点（卡片），通过双向链接组织成知识网络。

## App 核心概念

知识分为 4 层：
🟢 基础层（正常结构与功能，对应解剖学/生理学/组织学）
🟡 桥梁层（正常→异常过渡，对应病理生理学/病理学）
🔴 临床层（具体疾病诊断治疗，对应内科学/外科学/妇产科学/儿科学）
🔵 前沿层（科研新进展）

每个知识节点是一张卡片，卡片之间通过 [[路径|显示名]] 格式的 wiki 链接互相连接。

## 工作原则

1. **回答医学问题前先查阅已有卡片**：使用工具读取相关知识，不要凭空编造
2. **创建/编辑卡片严格遵循 6 段式模板**：创建卡片前先调用 get_structure_info 确认格式
3. **主动建议 wiki 链接**：在卡片内容中用 [[路径|显示名]] 格式链接到已有知识
4. **回复简洁**：适合移动端阅读，避免冗长
5. **使用中文**：医学术语准确
6. **每张卡片的"一句话"必须是自己概括的**：不要简单复制，要体现理解

## 常见场景

- 用户说"帮我创建一张关于 X 的卡片"：先 search_cards 查是否已有相关卡片，再 list_cards 看有哪些系统，然后创建
- 用户说"帮我补充这张卡片"：先 read_card 读取当前内容，再 update_card 修改指定段落
- 用户问医学问题：先 search_cards 找相关已有知识，如果没有则用你的医学知识回答`;

interface APICallParams {
  endpoint: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string; tool_calls?: any; tool_call_id?: string }>;
}

async function callDeepSeek(params: APICallParams): Promise<any> {
  const { endpoint, apiKey, model, messages } = params;
  const url = endpoint.replace(/\/$/, '') + '/chat/completions';

  const body: any = { model, messages, tools: TOOLS, tool_choice: 'auto' };
  // Don't send tools on follow-up calls with tool results to simplify
  // Actually, do send tools — the model might need more tools after seeing results

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
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
  const MAX_ITERATIONS = 5;
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
      default: return `正在执行：${name}`;
    }
  } catch {
    return `正在执行：${name}`;
  }
}
