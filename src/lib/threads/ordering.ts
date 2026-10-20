import type { Thread } from '@/lib/threads/types';

const lastActivity = (thread: Thread) => {
  const last = thread.messages.at(-1);
  return last ? Date.parse(last.sentAt) : 0;
};

/** Pinned threads keep the admin's order; the rest show the newest message first. */
export function orderThreads(threads: Thread[]) {
  const pinned = threads.filter((t) => t.pinned);
  const rest = threads
    .filter((t) => !t.pinned)
    .sort((a, b) => lastActivity(b) - lastActivity(a));
  return [...pinned, ...rest];
}

export function searchThreads(threads: Thread[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return threads;
  return threads.filter(
    (t) =>
      t.title.toLowerCase().includes(needle) ||
      t.tagline.toLowerCase().includes(needle) ||
      t.messages.some((m) => m.text.toLowerCase().includes(needle)),
  );
}
