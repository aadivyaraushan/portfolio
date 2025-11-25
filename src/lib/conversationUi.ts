import { Conversation, Message } from '@/lib/conversationStore';

export const pastelColorFor = (seed: string) => {
  if (!seed) return 'hsl(210, 60%, 82%)';
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash) % 10);
  const lightness = 78 + (Math.abs(hash >> 3) % 8);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export const normalizeEmojiName = (name?: string) =>
  name ? name.trim().toLowerCase().replace(/\s+/g, '-') : '';

export const sortConversations = (conversations: Conversation[]) => {
  const withTimes = conversations.map((conv) => {
    const last = conv.messages[conv.messages.length - 1];
    return {
      ...conv,
      lastTime: last?.time ? new Date(last.time) : new Date(0),
    };
  });
  return withTimes.sort((a, b) => {
    if (a.pinned && b.pinned) {
      return a.title.localeCompare(b.title);
    }
    if (!a.pinned && !b.pinned) {
      return new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime();
    }
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });
};

export const annotateMessages = (conversation: Conversation | null) => {
  if (!conversation) return [];
  const msgs = conversation.messages.map((m) => ({
    ...m,
    showTime: false,
  }));
  if (!msgs.length) return msgs;
  for (let i = 1; i < msgs.length; i += 1) {
    const prev = msgs[i - 1];
    const curr = msgs[i];
    const diff = new Date(curr.time).getTime() - new Date(prev.time).getTime();
    if (diff > 60 * 60 * 1000) {
      msgs[i - 1].showTime = true;
    }
  }
  msgs[msgs.length - 1].showTime = true;
  return msgs as Array<
    Message & {
      showTime: boolean;
    }
  >;
};
