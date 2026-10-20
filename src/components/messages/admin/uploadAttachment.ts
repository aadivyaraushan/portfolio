import { createUpload } from '@/lib/admin/actions';
import { attachmentKind, UPLOAD_RULE } from '@/lib/admin/inputs';

export type UploadedFile = { path: string; contentType: string; size: number };

/**
 * Sends a file straight from the browser to Supabase Storage with a one-time signed URL.
 * The file never passes through our server, so the 4.5 MB server limit does not apply.
 */
export async function uploadAttachment(threadId: string, file: File): Promise<{ ok: true; value: UploadedFile } | { ok: false; error: string }> {
  if (!attachmentKind(file.type, file.size)) return { ok: false, error: UPLOAD_RULE };
  const ticket = await createUpload({ threadId, fileName: file.name, contentType: file.type, size: file.size });
  if (!ticket.ok) return ticket;

  // Same request shape as supabase-js uploadToSignedUrl.
  const body = new FormData();
  body.append('cacheControl', '3600');
  body.append('', file);
  const res = await fetch(ticket.value.signedUrl, { method: 'PUT', body, headers: { 'x-upsert': 'false' } });
  if (!res.ok) {
    console.error('[admin] upload failed', { status: res.status, path: ticket.value.path });
    return { ok: false, error: `The upload failed (status ${res.status}). Try again.` };
  }
  console.info('[admin] uploaded', { path: ticket.value.path, size: file.size });
  return { ok: true, value: { path: ticket.value.path, contentType: file.type, size: file.size } };
}
