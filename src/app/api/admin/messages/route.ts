import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

type MessageRow = {
  id: string;
  text: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  created_at?: string | null;
  time?: string | null;
};

const revive = (row: MessageRow) => ({
  id: row.id,
  text: row.text,
  attachment_url: row.attachment_url,
  attachment_type: (row.attachment_type as 'image' | 'file') ?? null,
  time: new Date(row.created_at ?? row.time ?? Date.now()),
});

export async function POST(req: Request) {
  const authError = requireAdminAuth(req);
  if (authError) return authError;

  const body = await req.json();
  const { threadId, text, attachment_url, attachment_type } = body ?? {};
  if (!threadId || (!text && !attachment_url)) {
    return NextResponse.json({ error: 'threadId and either text or attachment are required' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({
      thread_id: threadId,
      text: text || '',
      attachment_url: attachment_url || null,
      attachment_type: attachment_type || null,
    })
    .select('*')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'failed to append message' }, { status: 500 });
  }

  return NextResponse.json({ message: revive(data) });
}
