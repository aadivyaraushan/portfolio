import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

type Params = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_req: NextRequest, { params }: Params) {
  const authError = requireAdminAuth(_req);
  if (authError) return authError;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from('messages').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const authError = requireAdminAuth(req);
  if (authError) return authError;

  const { id } = await params;
  const body = await req.json();
  const { text } = body ?? {};
  if (!id || !text || !text.trim()) {
    return NextResponse.json({ error: 'id and text are required' }, { status: 400 });
  }
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('messages')
    .update({ text })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'failed to update message' }, { status: 500 });
  }
  return NextResponse.json({
    message: {
      id: data.id,
      text: data.text,
      time: new Date(data.created_at ?? Date.now()),
    },
  });
}
