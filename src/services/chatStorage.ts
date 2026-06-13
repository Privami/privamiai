import RNFS from "react-native-fs";

import type { ChatMessage } from "./aiService";

export type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
  tokensPerSecond: number[];
};

export type ChatsStore = {
  chats: ChatSession[];
  activeChatId: string | null;
};

const CHATS_DIR = `${RNFS.DocumentDirectoryPath}/chat-history`;
const STORE_FILE = `${CHATS_DIR}/store.json`;

const EMPTY_STORE: ChatsStore = {
  chats: [],
  activeChatId: null,
};

async function ensureChatsDirectory(): Promise<void> {
  const exists = await RNFS.exists(CHATS_DIR);
  if (!exists) {
    await RNFS.mkdir(CHATS_DIR);
  }
}

export function generateChatId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function titleFromFirstMessage(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "Novo chat";
  }
  if (trimmed.length <= 42) {
    return trimmed;
  }
  return `${trimmed.slice(0, 42)}…`;
}

export async function loadChatsStore(): Promise<ChatsStore> {
  await ensureChatsDirectory();

  const exists = await RNFS.exists(STORE_FILE);
  if (!exists) {
    return { ...EMPTY_STORE };
  }

  try {
    const raw = await RNFS.readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as ChatsStore;

    return {
      chats: Array.isArray(parsed.chats)
        ? parsed.chats.map(normalizeChatSession)
        : [],
      activeChatId:
        typeof parsed.activeChatId === "string" ? parsed.activeChatId : null,
    };
  } catch (error) {
    console.error("Failed to load chat history:", error);
    return { ...EMPTY_STORE };
  }
}

export async function saveChatsStore(store: ChatsStore): Promise<void> {
  await ensureChatsDirectory();
  const payload: ChatsStore = {
    chats: store.chats.map(normalizeChatSession),
    activeChatId: store.activeChatId,
  };
  await RNFS.writeFile(STORE_FILE, JSON.stringify(payload), "utf8");
}

function normalizeChatSession(chat: ChatSession): ChatSession {
  return {
    id: chat.id,
    title: chat.title || "Novo chat",
    messages: Array.isArray(chat.messages) ? chat.messages : [],
    updatedAt: chat.updatedAt ?? Date.now(),
    tokensPerSecond: Array.isArray(chat.tokensPerSecond)
      ? chat.tokensPerSecond
      : [],
  };
}
