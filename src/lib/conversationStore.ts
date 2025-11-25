'use client';

export type Message = {
  id: string;
  text: string;
  time: Date;
};

export type Conversation = {
  id: string;
  title: string;
  preview: string;
  pinned?: boolean;
  icon?: string;
  messages: Message[];
};

export function formatAgo(dateish: Date | string): string {
  const date = dateish instanceof Date ? dateish : new Date(dateish);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

export async function fetchConversations(): Promise<Conversation[]> {
  const response = await fetch('/api/conversations');
  if (!response.ok) {
    throw new Error('Failed to fetch conversations');
  }
  return response.json();
}

export async function appendMessage(
  threadId: string,
  text: string
): Promise<Message | null> {
  try {
    const response = await fetch('/api/conversations/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, text }),
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function deleteMessage(threadId: string, messageId: string) {
  try {
    await fetch(`/api/conversations/messages/${threadId}/${messageId}`, {
      method: 'DELETE',
    });
  } catch {
    // Silently fail
  }
}

type CreateThreadInput = {
  title: string;
  preview: string;
  pinned?: boolean;
  seed?: string;
};

export async function createThread(
  input: CreateThreadInput
): Promise<Conversation | null> {
  try {
    const response = await fetch('/api/conversations/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}
