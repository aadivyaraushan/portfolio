import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const revive = (row: any) => ({
  id: row.id,
  text: row.text,
  time: new Date(row.created_at ?? row.time ?? Date.now()),
});

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: threads, error: threadError } = await supabaseAdmin
    .from('threads')
    .select('*')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (threadError) {
    return NextResponse.json({ error: threadError.message }, { status: 500 });
  }

  const threadIds = threads?.map((t) => t.id) ?? [];
  const { data: messages, error: messageError } = await supabaseAdmin
    .from('messages')
    .select('*')
    .in('thread_id', threadIds)
    .order('created_at', { ascending: true });

  if (messageError) {
    return NextResponse.json({ error: messageError.message }, { status: 500 });
  }

  const grouped: Record<string, any[]> = {};
  (messages ?? []).forEach((m) => {
    if (!grouped[m.thread_id]) grouped[m.thread_id] = [];
    grouped[m.thread_id].push(revive(m));
  });

  const conversations = (threads ?? []).map((thread) => ({
    id: thread.id,
    title: (thread.title ?? '').toLowerCase(),
    preview: (thread.preview ?? '').toLowerCase(),
    pinned: thread.pinned ?? false,
    icon: thread.icon ?? undefined,
    messages: grouped[thread.id] ?? [],
  }));

  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { title, preview, pinned, seed, icon } = body ?? {};
  if (!title || !preview) {
    return NextResponse.json({ error: 'title and preview are required' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: thread, error: threadError } = await supabaseAdmin
    .from('threads')
    .insert({ title, preview, pinned: !!pinned, icon: icon ?? null })
    .select('*')
    .maybeSingle();

  if (threadError || !thread) {
    return NextResponse.json({ error: threadError?.message ?? 'failed to create thread' }, { status: 500 });
  }

  let seededMessages: any[] = [];
  if (seed && typeof seed === 'string' && seed.trim().length) {
    const { data: message, error: seedError } = await supabaseAdmin
      .from('messages')
      .insert({ thread_id: thread.id, text: seed.trim() })
      .select('*')
      .maybeSingle();
    if (seedError) {
      return NextResponse.json({ error: seedError.message }, { status: 500 });
    }
    if (message) seededMessages = [revive(message)];
  }

  return NextResponse.json({
    conversation: {
      id: thread.id,
      title: (thread.title ?? '').toLowerCase(),
      preview: (thread.preview ?? '').toLowerCase(),
      pinned: thread.pinned ?? false,
      icon: thread.icon ?? undefined,
      messages: seededMessages,
    },
  });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, preview, title, pinned, icon } = body ?? {};
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }
  if (
    (!preview || !preview.trim()) &&
    (!title || !title.trim()) &&
    typeof pinned !== 'boolean'
  ) {
    return NextResponse.json({ error: 'preview, title, or pinned is required' }, { status: 400 });
  }
  const supabaseAdmin = getSupabaseAdmin();
  const payload: Record<string, string | boolean | null> = {};
  if (preview && preview.trim()) payload.preview = preview;
  if (title && title.trim()) payload.title = title;
  if (typeof pinned === 'boolean') payload.pinned = pinned;
  if (typeof icon === 'string') payload.icon = icon.trim() || null;

  const { data, error } = await supabaseAdmin
    .from('threads')
    .update(payload)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'failed to update preview' }, { status: 500 });
  }

  return NextResponse.json({
    conversation: {
      id: data.id,
      title: (data.title ?? '').toLowerCase(),
      preview: (data.preview ?? '').toLowerCase(),
      pinned: data.pinned ?? false,
      icon: data.icon ?? undefined,
    },
  });
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { id } = body ?? {};
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error: msgError } = await supabaseAdmin.from('messages').delete().eq('thread_id', id);
  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  const { error: threadError } = await supabaseAdmin.from('threads').delete().eq('id', id);
  if (threadError) {
    return NextResponse.json({ error: threadError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
