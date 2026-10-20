// Pure planning step for apply-thread-copy.mjs: decides, for each thread, which message
// row to keep (and rewrite), which rows to delete, and whether the thread's title or
// tagline changes. No I/O, so a test can cover it.

export type CopyEntry = { title: string; tagline?: string; text: string };
export type CopyFile = Record<string, CopyEntry>;

type ThreadRow = { id: string; title: string | null; preview?: string | null };
type MessageRow = { id: string; thread_id: string; text: string | null; created_at: string | null; attachment_url?: string | null };

export type ThreadPlan = {
  threadId: string;
  title: string;
  keepId: string | null;
  deleteIds: string[];
  text: string;
  // Fields to write to the threads row, or null when the title and tagline already match.
  threadUpdate: { title?: string; preview?: string } | null;
  changed: boolean;
};

export type CopyPlan = { threads: ThreadPlan[]; missingInDb: string[]; notInCopy: string[] };

export function planThreadCopy(threads: ThreadRow[], messages: MessageRow[], copy: CopyFile): CopyPlan {
  const plans = threads
    .filter((t) => copy[t.id])
    .map((thread): ThreadPlan => {
      const rows = messages
        .filter((m) => m.thread_id === thread.id)
        .sort((a, b) => Date.parse(a.created_at ?? '') - Date.parse(b.created_at ?? ''));
      // Keep the row with the attachment (so the file stays), else the newest row
      // (so the thread keeps its place in the "last activity" order).
      // One row can hold only one file, so a thread with more files needs a manual edit.
      const withFiles = rows.filter((m) => m.attachment_url);
      if (withFiles.length > 1) {
        throw new Error(`"${thread.title}" has ${withFiles.length} attachments. Merge it by hand so no file is deleted.`);
      }
      const keep = withFiles[0] ?? rows.at(-1) ?? null;
      const entry = copy[thread.id];
      const text = entry.text;
      const deleteIds = rows.filter((m) => m !== keep).map((m) => m.id);
      const threadUpdate = {
        ...(entry.title !== thread.title ? { title: entry.title } : {}),
        ...(entry.tagline !== undefined && entry.tagline !== thread.preview ? { preview: entry.tagline } : {}),
      };
      const renamed = Object.keys(threadUpdate).length > 0;
      return {
        threadId: thread.id,
        title: thread.title ?? '',
        keepId: keep?.id ?? null,
        deleteIds,
        text,
        threadUpdate: renamed ? threadUpdate : null,
        changed: renamed || deleteIds.length > 0 || keep?.text !== text,
      };
    });
  const ids = new Set(threads.map((t) => t.id));
  return {
    threads: plans,
    missingInDb: Object.keys(copy).filter((id) => !ids.has(id)),
    notInCopy: threads.filter((t) => !copy[t.id]).map((t) => t.title ?? t.id),
  };
}
