export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  actionCommand?: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number;
}

function storageKey(walletAddress: string) {
  return `lily_chats_${walletAddress.toLowerCase()}`;
}

export async function getStoredChats(walletAddress: string): Promise<Chat[]> {
  try {
    const raw = localStorage.getItem(storageKey(walletAddress));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveChat(walletAddress: string, chat: Chat): Promise<void> {
  const chats = await getStoredChats(walletAddress);
  const idx = chats.findIndex((c) => c.id === chat.id);
  if (idx >= 0) {
    chats[idx] = chat;
  } else {
    chats.push(chat);
  }
  localStorage.setItem(storageKey(walletAddress), JSON.stringify(chats));
}

export async function deleteChat(walletAddress: string, chatId: string): Promise<void> {
  const chats = await getStoredChats(walletAddress);
  localStorage.setItem(
    storageKey(walletAddress),
    JSON.stringify(chats.filter((c) => c.id !== chatId)),
  );
}

export function generateChatTitle(firstMessage: string): string {
  const preview = firstMessage.slice(0, 40).trim();
  return preview.length < firstMessage.length ? `${preview}...` : preview;
}
