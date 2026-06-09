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
  isListening: boolean;
  currentContext: string;
  apiKey: string;
  endpoint: string;
  model: string;

  addMessage: (msg: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  openPanel: () => void;
  closePanel: () => void;
  clearMessages: () => void;
  setListening: (listening: boolean) => void;
  setContext: (context: string) => void;
  setAPIConfig: (key: string, endpoint: string, model: string) => void;
  updateMessageStatus: (id: string, status: ChatMessage['status'], statusText?: string) => void;
}

const STORAGE_KEY = 'ml:chat_messages';
const MAX_STORED_MSGS = 40;

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.slice(-MAX_STORED_MSGS);
  } catch { /* ignore corrupt data */ }
  return [];
}

function saveMessages(msgs: ChatMessage[]) {
  try {
    // Keep only recent messages to avoid storage bloat
    const trimmed = msgs.slice(-MAX_STORED_MSGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* storage full or unavailable */ }
}

let msgCounter = 0;

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: loadMessages(),
  isLoading: false,
  isPanelOpen: false,
  isListening: false,
  currentContext: 'DASHBOARD',
  apiKey: '',
  endpoint: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',

  addMessage: (msg) => {
    set((s) => ({ messages: [...s.messages, msg] }));
    saveMessages(get().messages);
  },
  setLoading: (loading) => set({ isLoading: loading }),
  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
  clearMessages: () => {
    set({ messages: [] });
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  },
  setListening: (listening) => set({ isListening: listening }),
  setContext: (context) => set({ currentContext: context }),
  setAPIConfig: (key, endpoint, model) => set({ apiKey: key, endpoint, model }),
  updateMessageStatus: (id, status, statusText) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, status, statusText } : m
      ),
    }));
    saveMessages(get().messages);
  },
}));

export function genId(): string {
  msgCounter++;
  return `msg_${Date.now()}_${msgCounter}`;
}
