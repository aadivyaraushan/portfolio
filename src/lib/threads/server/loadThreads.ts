import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { resolveEmoji } from '@/lib/threads/server/emoji';
import type { Attachment, Thread } from '@/lib/threads/types';

type ThreadRow = {
  id: string;
  title: string | null;
  preview: string | null;
  pinned: boolean | null;
  icon: string | null;
  index?: number | null;
};

type MessageRow = {
  id: string;
  thread_id: string;
  text: string | null;
  created_at: string | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
};

/** Where rows come from. Tests pass a fake; the page uses Supabase. */
export type ThreadsSource = {
  fetchThreadRows: () => Promise<ThreadRow[]>;
  fetchMessageRows: () => Promise<MessageRow[]>;
};

export function supabaseThreadsSource(): ThreadsSource {
  const supabase = getSupabaseAdmin();
  return {
    async fetchThreadRows() {
      const { data, error } = await supabase
        .from('threads')
        .select('id, title, preview, pinned, icon, index')
        .order('index', { ascending: true });
      if (error) throw new Error(`threads query failed: ${error.message}`);
      return data ?? [];
    },
    async fetchMessageRows() {
      const { data, error } = await supabase
        .from('messages')
        .select('id, thread_id, text, created_at, attachment_url, attachment_type')
        .order('created_at', { ascending: true });
      if (error) throw new Error(`messages query failed: ${error.message}`);
      return data ?? [];
    },
  };
}

const titleCase = (value: string) => value.replace(/\b\w/g, (c) => c.toUpperCase());

// Admin uploads get names like "v9087eb5c3p-1764149390534.pdf". Show "Resume.pdf" instead.
// A bad URL must not take down the whole page, so it falls back to the thread name.
function fileNameFromUrl(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').at(-1) ?? '');
  } catch (error) {
    console.warn('[threads] unreadable attachment url', { url, error: String(error) });
    return '';
  }
}

function attachmentName(url: string, threadTitle: string) {
  const file = fileNameFromUrl(url);
  const extension = file.includes('.') ? file.split('.').at(-1) : '';
  const looksGenerated = /-\d{10,}\.[a-z0-9]+$/i.test(file) || !file;
  if (!looksGenerated) return file;
  return extension ? `${titleCase(threadTitle)}.${extension}` : titleCase(threadTitle);
}

function toAttachment(row: MessageRow, threadTitle: string): Attachment | null {
  if (!row.attachment_url) return null;
  return {
    url: row.attachment_url,
    kind: row.attachment_type === 'image' ? 'image' : 'file',
    name: attachmentName(row.attachment_url, threadTitle),
  };
}

const byTime = (a: MessageRow, b: MessageRow) =>
  Date.parse(a.created_at ?? '') - Date.parse(b.created_at ?? '');

/**
 * Loads every thread with its messages in two parallel queries
 * (the old API made one query for each thread, one after the other).
 */
export async function loadThreads(source: ThreadsSource = supabaseThreadsSource()): Promise<Thread[]> {
  const startedAt = Date.now();
  const [threadRows, messageRows] = await Promise.all([
    source.fetchThreadRows(),
    source.fetchMessageRows(),
  ]);

  const messagesByThread = new Map<string, MessageRow[]>();
  for (const row of messageRows) {
    messagesByThread.set(row.thread_id, [...(messagesByThread.get(row.thread_id) ?? []), row]);
  }

  const threads = threadRows.map((row): Thread => {
    const title = row.title ?? '';
    return {
      id: row.id,
      title,
      tagline: row.preview ?? '',
      pinned: Boolean(row.pinned),
      icon: resolveEmoji(row.icon),
      iconName: row.icon ?? '',
      order: row.index ?? 0,
      messages: (messagesByThread.get(row.id) ?? []).sort(byTime).map((m) => ({
        id: m.id,
        text: m.text ?? '',
        sentAt: new Date(m.created_at ?? 0).toISOString(),
        attachment: toAttachment(m, title),
      })),
    };
  });

  console.info('[threads] loaded', {
    threads: threads.length,
    messages: messageRows.length,
    ms: Date.now() - startedAt,
  });
  return threads;
}
