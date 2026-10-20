import { loadThreads, type ThreadsSource } from '@/lib/threads/server/loadThreads';

function sourceWith(threads: unknown[], messages: unknown[]): ThreadsSource & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async fetchThreadRows() {
      calls.push('threads');
      return threads as never;
    },
    async fetchMessageRows() {
      calls.push('messages');
      return messages as never;
    },
  };
}

describe('loadThreads', () => {
  it('makes exactly two queries, whatever the number of threads', async () => {
    const source = sourceWith(
      [
        { id: 't1', title: 'About Me', preview: 'Identities', pinned: true, icon: 'ROCKET', index: 0 },
        { id: 't2', title: 'Now', preview: null, pinned: null, icon: null, index: 1 },
      ],
      [],
    );
    await loadThreads(source);
    expect(source.calls.sort()).toEqual(['messages', 'threads']);
  });

  it('puts each message in its thread, oldest first, and keeps the thread order', async () => {
    const source = sourceWith(
      [
        { id: 't1', title: 'About Me', preview: 'Identities', pinned: true, icon: 'ROCKET', index: 0 },
        { id: 't2', title: 'Now', preview: null, pinned: null, icon: null, index: 1 },
      ],
      [
        { id: 'm2', thread_id: 't1', text: 'second', created_at: '2025-11-26T10:00:00Z' },
        { id: 'm1', thread_id: 't1', text: 'first', created_at: '2025-11-17T10:00:00Z' },
        { id: 'm3', thread_id: 't2', text: 'now', created_at: '2025-12-04T10:00:00Z' },
        { id: 'orphan', thread_id: 'gone', text: 'x', created_at: '2025-12-04T10:00:00Z' },
      ],
    );
    const threads = await loadThreads(source);
    expect(threads.map((t) => t.id)).toEqual(['t1', 't2']);
    expect(threads[0].messages.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(threads[0]).toMatchObject({
      title: 'About Me',
      tagline: 'Identities',
      pinned: true,
      icon: { alt: '🚀', src: expect.stringContaining('rocket_1f680.png') },
      // The raw values the admin details form starts from.
      iconName: 'ROCKET',
      order: 0,
    });
    expect(threads[1]).toMatchObject({ tagline: '', pinned: false, icon: null, iconName: '', order: 1 });
    expect(threads[1].messages[0]).toEqual({
      id: 'm3',
      text: 'now',
      sentAt: '2025-12-04T10:00:00.000Z',
      attachment: null,
    });
  });

  it('gives an uploaded file a readable name from the thread title', async () => {
    const source = sourceWith(
      [{ id: 't1', title: 'Resume', preview: '', pinned: false, icon: null, index: 0 }],
      [
        {
          id: 'm1',
          thread_id: 't1',
          text: 'Resume:',
          created_at: '2025-11-26T10:00:00Z',
          attachment_url: 'https://x.supabase.co/storage/v1/object/public/a/t1/v9087eb5c3p-1764149390534.pdf',
          attachment_type: 'file',
        },
      ],
    );
    const [thread] = await loadThreads(source);
    expect(thread.messages[0].attachment).toEqual({
      url: 'https://x.supabase.co/storage/v1/object/public/a/t1/v9087eb5c3p-1764149390534.pdf',
      kind: 'file',
      name: 'Resume.pdf',
    });
  });

  it('fails loudly when a query fails, so the cache keeps the last good page', async () => {
    const source: ThreadsSource = {
      fetchThreadRows: async () => {
        throw new Error('supabase offline');
      },
      fetchMessageRows: async () => [],
    };
    await expect(loadThreads(source)).rejects.toThrow('supabase offline');
  });

  it('still loads when an attachment URL is malformed, and names the file from the thread', async () => {
    const source = sourceWith(
      [{ id: 't1', title: 'Resume', preview: null, pinned: false, icon: null, index: 0 }],
      [
        { id: 'm1', thread_id: 't1', text: 'a', created_at: '2025-11-01T00:00:00Z', attachment_url: 'not a url', attachment_type: 'file' },
        { id: 'm2', thread_id: 't1', text: 'b', created_at: '2025-11-02T00:00:00Z', attachment_url: 'https://x.test/files/bad%E0%A4%A.pdf', attachment_type: 'file' },
      ],
    );
    const [thread] = await loadThreads(source);
    expect(thread.messages.map((m) => m.attachment?.name)).toEqual(['Resume', 'Resume']);
  });
});
