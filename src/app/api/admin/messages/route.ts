import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

type MessageRow = {
  id: string;
  text: string;
  created_at?: string | null;
  time?: string | null;
};

const revive = (row: MessageRow) => ({
  id: row.id,
  text: row.text,
  time: new Date(row.created_at ?? row.time ?? Date.now()),
});

export async function POST(req: Request) {
  const authError = requireAdminAuth(req);
  if (authError) return authError;

  const body = await req.json();
  const { threadId, text } = body ?? {};
  if (!threadId || !text) {
    return NextResponse.json({ error: 'threadId and text are required' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({ thread_id: threadId, text })
    .select('*')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'failed to append message' }, { status: 500 });
  }

  return NextResponse.json({ message: revive(data) });
}
