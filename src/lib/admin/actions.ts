'use server';

// Every admin edit on the main page goes through these server actions.
// Each one checks the session cookie first, so a visitor cannot call them.
// After a write, revalidateHome() rebuilds the cached page. The same response then
// carries the new page data back to the admin's browser, so the edit shows at once.

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isAdmin } from '@/lib/admin/server/requireAdmin';
import { attachmentKind, parseMessageText, parseThreadDetails, uploadPath, UPLOAD_RULE } from '@/lib/admin/inputs';
import { resolveEmoji } from '@/lib/threads/server/emoji';
import { revalidateHome } from '@/lib/threads/server/revalidateHome';

export type AdminResult<T = null> = { ok: true; value: T } | { ok: false; error: string };

const BUCKET = 'chat-attachments';
const SIGNED_OUT = 'Your admin session ended. Sign in again at /admin.';

async function signedIn(action: string, detail: Record<string, unknown>) {
  if (await isAdmin()) {
    console.info(`[admin] ${action}`, detail);
    return true;
  }
  console.warn(`[admin] ${action} refused: no valid session`);
  return false;
}

function failed(action: string, error: { message: string } | null | undefined, detail: Record<string, unknown>) {
  console.error(`[admin] ${action} failed`, { ...detail, error: error?.message });
  return { ok: false as const, error: `Could not save: ${error?.message ?? 'unknown error'}` };
}

const isId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length < 200;

const done = <T>(value: T): AdminResult<T> => {
  revalidateHome();
  return { ok: true, value };
};

export async function createUpload(input: {
  threadId: string;
  fileName: string;
  contentType: string;
  size: number;
}): Promise<AdminResult<{ signedUrl: string; path: string }>> {
  if (!(await signedIn('createUpload', { threadId: input?.threadId, type: input?.contentType, size: input?.size }))) {
    return { ok: false, error: SIGNED_OUT };
  }
  if (!isId(input.threadId) || typeof input.fileName !== 'string') return { ok: false, error: 'Missing file details.' };
  if (!attachmentKind(input.contentType, input.size)) return { ok: false, error: UPLOAD_RULE };

  const path = uploadPath(input.threadId, input.fileName, Date.now());
  const { data, error } = await getSupabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return failed('createUpload', error, { path });
  return { ok: true, value: { signedUrl: data.signedUrl, path } };
}

export async function addMessage(input: {
  threadId: string;
  text: string;
  attachment?: { path: string; contentType: string; size: number } | null;
}): Promise<AdminResult> {
  const file = input?.attachment ?? null;
  if (!(await signedIn('addMessage', { threadId: input?.threadId, chars: input?.text?.length, file: file?.path }))) {
    return { ok: false, error: SIGNED_OUT };
  }
  if (!isId(input.threadId)) return { ok: false, error: 'Missing conversation.' };
  const text = parseMessageText(input.text, Boolean(file));
  if (!text.ok) return text;

  let attachment: { attachment_url: string; attachment_type: 'image' | 'file' } | null = null;
  if (file) {
    const kind = attachmentKind(file.contentType, file.size);
    // The file must be one this conversation's upload created, not any URL.
    if (!kind || typeof file.path !== 'string' || !file.path.startsWith(`${input.threadId}/`)) {
      return { ok: false, error: UPLOAD_RULE };
    }
    const { data } = getSupabaseAdmin().storage.from(BUCKET).getPublicUrl(file.path);
    attachment = { attachment_url: data.publicUrl, attachment_type: kind };
  }

  const { error } = await getSupabaseAdmin()
    .from('messages')
    .insert({ thread_id: input.threadId, text: text.value, ...attachment });
  if (error) return failed('addMessage', error, { threadId: input.threadId });
  return done(null);
}

export async function editMessage(input: { id: string; text: string }): Promise<AdminResult> {
  if (!(await signedIn('editMessage', { id: input?.id, chars: input?.text?.length }))) return { ok: false, error: SIGNED_OUT };
  if (!isId(input.id)) return { ok: false, error: 'Missing message.' };
  const supabase = getSupabaseAdmin();
  // A message with a file may have no caption, so look up whether it has one.
  const { data: rows, error: readError } = await supabase
    .from('messages')
    .select('attachment_url')
    .eq('id', input.id)
    .limit(1);
  if (readError) return failed('editMessage', readError, { id: input.id });
  if (!rows?.length) return { ok: false, error: 'This message no longer exists.' };
  const text = parseMessageText(input.text, Boolean(rows[0].attachment_url));
  if (!text.ok) return text;
  const { error } = await supabase.from('messages').update({ text: text.value }).eq('id', input.id);
  if (error) return failed('editMessage', error, { id: input.id });
  return done(null);
}

export async function deleteMessage(input: { id: string }): Promise<AdminResult> {
  if (!(await signedIn('deleteMessage', { id: input?.id }))) return { ok: false, error: SIGNED_OUT };
  if (!isId(input.id)) return { ok: false, error: 'Missing message.' };
  const { error } = await getSupabaseAdmin().from('messages').delete().eq('id', input.id);
  if (error) return failed('deleteMessage', error, { id: input.id });
  return done(null);
}

export async function createThread(input: { title: string; tagline: string }): Promise<AdminResult<{ id: string }>> {
  if (!(await signedIn('createThread', { title: input?.title }))) return { ok: false, error: SIGNED_OUT };
  const supabase = getSupabaseAdmin();
  const { data: rows, error: readError } = await supabase.from('threads').select('index');
  if (readError) return failed('createThread', readError, {});
  const order = Math.max(-1, ...(rows ?? []).map((r) => Number(r.index) || 0)) + 1;

  const details = parseThreadDetails({ ...input, pinned: false, icon: '', order }, () => true);
  if (!details.ok) return details;
  const { data, error } = await supabase
    .from('threads')
    .insert({ title: details.value.title, preview: details.value.tagline, pinned: false, icon: null, index: order })
    .select('id')
    .single();
  if (error || !data) return failed('createThread', error, { title: details.value.title });
  return done({ id: String(data.id) });
}

export async function updateThread(input: {
  id: string;
  title: string;
  tagline: string;
  pinned: boolean;
  icon: string;
  order: number;
}): Promise<AdminResult> {
  if (!(await signedIn('updateThread', { id: input?.id }))) return { ok: false, error: SIGNED_OUT };
  if (!isId(input.id)) return { ok: false, error: 'Missing conversation.' };
  const details = parseThreadDetails(input, (name) => resolveEmoji(name) !== null);
  if (!details.ok) return details;
  const { title, tagline, pinned, icon, order } = details.value;
  const { error } = await getSupabaseAdmin()
    .from('threads')
    .update({ title, preview: tagline, pinned, icon, index: order })
    .eq('id', input.id);
  if (error) return failed('updateThread', error, { id: input.id });
  return done(null);
}

/** Deletes the conversation and its messages. Uploaded files stay in storage. */
export async function deleteThread(input: { id: string }): Promise<AdminResult> {
  if (!(await signedIn('deleteThread', { id: input?.id }))) return { ok: false, error: SIGNED_OUT };
  if (!isId(input.id)) return { ok: false, error: 'Missing conversation.' };
  const supabase = getSupabaseAdmin();
  const { error: messagesError } = await supabase.from('messages').delete().eq('thread_id', input.id);
  if (messagesError) return failed('deleteThread', messagesError, { id: input.id });
  const { error } = await supabase.from('threads').delete().eq('id', input.id);
  if (error) return failed('deleteThread', error, { id: input.id });
  return done(null);
}
