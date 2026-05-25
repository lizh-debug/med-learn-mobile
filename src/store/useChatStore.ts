// Chat state — Zustand store
import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  status?: 'thinking' | 'calling_tool' | 'done' | 'error';
  statusText?: string;
}

interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  isPanelOpen: boolean;
  apiKey: string;
  endpoint: string;
  model: string;

  addMessage: (msg: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  openPanel: () => void;
  closePanel: () => void;
  clearMessages: () => void;
  setAPIConfig: (key: string, endpoint: string, model: string) => void;
  updateMessageStatus: (id: string, status: ChatMessage['status'], statusText?: string) => void;
}

let msgCounter = 0;

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  isPanelOpen: false,
  apiKey: '',
  endpoint: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setLoading: (loading) => set({ isLoading: loading }),
  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
  clearMessages: () => set({ messages: [] }),
  setAPIConfig: (key, endpoint, model) => set({ apiKey: key, endpoint, model }),
  updateMessageStatus: (id, status, statusText) => set((s) => ({
    messages: s.messages.map((m) =>
      m.id === id ? { ...m, status, statusText } : m
    ),
  })),
}));

export function genId(): string {
  msgCounter++;
  return `msg_${Date.now()}_${msgCounter}`;
}
