import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  console.log(' [POST /api/conversations/messages] Creating new message...');

  try {
    const { threadId, text } = await req.json();
    console.log(
      ` [POST /api/conversations/messages] Request data: threadId=${threadId}, textLength=${
        text?.length || 0
      }`
    );

    if (!threadId || !text) {
      console.error(
        ' [POST /api/conversations/messages] Missing required fields:',
        { threadId, text }
      );
      return NextResponse.json(
        { error: 'threadId and text are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    console.log(
      ' [POST /api/conversations/messages] Supabase admin client initialized'
    );

    const now = new Date();
    console.log(
      ' [POST /api/conversations/messages] Inserting message into database...'
    );

    const { data, error } = await supabase
      .from('messages')
      .insert({ thread_id: threadId, text })
      .select('*')
      .maybeSingle();

    if (error || !data) {
      console.error(
        ' [POST /api/conversations/messages] Database error:',
        error
      );
      return NextResponse.json(
        { error: 'Failed to create message' },
        { status: 500 }
      );
    }

    console.log(
      ` [POST /api/conversations/messages] Successfully created message with ID: ${data.id}`
    );

    return NextResponse.json({
      id: data.id,
      text: data.text,
      attachment_url: data.attachment_url,
      attachment_type: (data.attachment_type as 'image' | 'file') ?? null,
      time: now,
    });
  } catch (error) {
    console.error(
      ' [POST /api/conversations/messages] Unexpected error:',
      error
    );
    return NextResponse.json(
      { error: 'Failed to append message' },
      { status: 500 }
    );
  }
}
