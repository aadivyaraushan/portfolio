// Checks for what the admin types. Both the browser (for a quick message) and the
// server actions (which must not trust the browser) use them.

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export const MAX_MESSAGE_CHARS = 20_000;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const UPLOAD_RULE = 'Attach an image or a PDF, up to 20 MB.';

export type ThreadDetails = { title: string; tagline: string; pinned: boolean; icon: string | null; order: number };

export function parseMessageText(text: unknown, hasFile: boolean): Parsed<string> {
  if (typeof text !== 'string') return { ok: false, error: 'Type a message or attach a file.' };
  const value = text.trim();
  if (!value && !hasFile) return { ok: false, error: 'Type a message or attach a file.' };
  if (value.length > MAX_MESSAGE_CHARS) return { ok: false, error: `Keep a message under ${MAX_MESSAGE_CHARS} characters.` };
  return { ok: true, value };
}

export function parseThreadDetails(input: unknown, iconExists: (name: string) => boolean): Parsed<ThreadDetails> {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Missing conversation details.' };
  const { title, tagline, pinned, icon, order } = input as Record<string, unknown>;
  if (typeof title !== 'string' || !title.trim()) return { ok: false, error: 'Title cannot be empty.' };
  if (title.trim().length > 80) return { ok: false, error: 'Keep the title under 80 characters.' };
  if (typeof tagline !== 'string' || tagline.trim().length > 120) {
    return { ok: false, error: 'Keep the tagline under 120 characters.' };
  }
  if (typeof pinned !== 'boolean') return { ok: false, error: 'Pinned must be on or off.' };
  if (typeof order !== 'number' || !Number.isInteger(order)) return { ok: false, error: 'Order must be a whole number.' };
  const iconName = typeof icon === 'string' ? icon.trim() : '';
  if (iconName && !iconExists(iconName)) {
    return { ok: false, error: `No Apple emoji is named "${iconName}". Use a name like "Rocket".` };
  }
  return { ok: true, value: { title: title.trim(), tagline: tagline.trim(), pinned, icon: iconName || null, order } };
}

/** "<thread>/<time>/<safe file name>": the real name stays, so the file bubble can show it. */
export function uploadPath(threadId: string, fileName: string, nowMs: number) {
  const base = fileName.split(/[\\/]/).at(-1) ?? '';
  const safe =
    base
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/-+(\.)/g, '$1')
      .replace(/^[-.]+|[-.]+$/g, '')
      .replace(/-{2,}/g, '-') || 'file';
  return `${threadId}/${nowMs}/${safe}`;
}

// SVG is left out on purpose: it can carry scripts. HEIC too: most browsers cannot show it,
// and without it in the list an iPhone converts the photo to JPEG.
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif']);

export function attachmentKind(contentType: string, size: number): 'image' | 'file' | null {
  if (!(size > 0) || size > MAX_UPLOAD_BYTES) return null;
  if (IMAGE_TYPES.has(contentType)) return 'image';
  if (contentType === 'application/pdf') return 'file';
  return null;
}
