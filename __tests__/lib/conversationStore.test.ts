import type { Conversation, Message } from '../../src/lib/conversationStore';

describe('conversationStore utilities', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('formatAgo provides friendly time strings', async () => {
    const { formatAgo } = await import('../../src/lib/conversationStore');
    expect(formatAgo(new Date(Date.now() - 30 * 1000))).toBe('just now');
    expect(formatAgo(new Date(Date.now() - 10 * 60 * 1000))).toBe('10m');
    expect(formatAgo(new Date(Date.now() - 4 * 60 * 60 * 1000))).toBe('4h');
  });

  it('fetchConversations returns API data', async () => {
    const payload: Conversation[] = [
      {
        id: '1',
        title: 'Thread',
        preview: 'Preview',
        pinned: true,
        messages: [{ id: 'm1', text: 'Hello', time: new Date().toISOString() } as Message],
      },
    ];
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(payload),
    });

    const { fetchConversations } = await import('../../src/lib/conversationStore');
    const conversations = await fetchConversations();

    expect(global.fetch).toHaveBeenCalledWith('/api/conversations');
    expect(conversations).toEqual(payload);
  });

  it('fetchConversations throws on non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
    const { fetchConversations } = await import('../../src/lib/conversationStore');
    await expect(fetchConversations()).rejects.toThrow('Failed to fetch conversations');
  });

  it('appendMessage posts to the messages endpoint', async () => {
    const payload: Message = { id: 'm2', text: 'New', time: new Date() };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(payload),
    });

    const { appendMessage } = await import('../../src/lib/conversationStore');
    const result = await appendMessage('thread-1', 'New');

    expect(global.fetch).toHaveBeenCalledWith('/api/conversations/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: 'thread-1', text: 'New' }),
    });
    expect(result).toEqual(payload);
  });

  it('deleteMessage hits the delete route', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({});
    const { deleteMessage } = await import('../../src/lib/conversationStore');
    await deleteMessage('thread-1', 'msg-1');
    expect(global.fetch).toHaveBeenCalledWith('/api/conversations/messages/thread-1/msg-1', {
      method: 'DELETE',
    });
  });

  it('createThread posts a new thread payload', async () => {
    const payload: Conversation = {
      id: 't2',
      title: 'Hello',
      preview: 'World',
      pinned: true,
      messages: [],
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(payload),
    });

    const { createThread } = await import('../../src/lib/conversationStore');
    const convo = await createThread({
      title: 'Hello',
      preview: 'World',
      pinned: true,
      seed: 'Seed message',
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/conversations/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Hello',
        preview: 'World',
        pinned: true,
        seed: 'Seed message',
      }),
    });
    expect(convo).toEqual(payload);
  });
});
