import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

type Message = {
  id: string;
  text: string;
  time: Date;
};

export async function POST(req: Request) {
  console.log(' [POST /api/conversations/threads] Creating new thread...');

  try {
    const { title, preview, pinned, seed } = await req.json();
    console.log(
      ` [POST /api/conversations/threads] Request data: title=${title}, previewLength=${
        preview?.length || 0
      }, pinned=${pinned}, seedLength=${seed?.length || 0}`
    );

    if (!title || !preview) {
      console.error(
        ' [POST /api/conversations/threads] Missing required fields:',
        { title, preview }
      );
      return NextResponse.json(
        { error: 'title and preview are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    console.log(
      ' [POST /api/conversations/threads] Supabase admin client initialized'
    );

    console.log(
      ' [POST /api/conversations/threads] Inserting thread into database...'
    );

    const { data: insertedThread, error: threadError } = await supabase
      .from('threads')
      .insert({ title, preview, pinned: !!pinned })
      .select('*')
      .maybeSingle();

    if (threadError || !insertedThread) {
      console.error(
        ' [POST /api/conversations/threads] Thread creation error:',
        threadError
      );
      return NextResponse.json(
        { error: 'Failed to create thread' },
        { status: 500 }
      );
    }

    console.log(
      ` [POST /api/conversations/threads] Successfully created thread with ID: ${insertedThread.id}`
    );

    let messages: Message[] = [];
    if (seed && seed.trim().length) {
      console.log(
        ' [POST /api/conversations/threads] Adding seed message to thread...'
      );

      const { data: message } = await supabase
        .from('messages')
        .insert({ thread_id: insertedThread.id, text: seed.trim() })
        .select('*')
        .maybeSingle();

      if (message) {
        console.log(
          ` [POST /api/conversations/threads] Successfully created seed message with ID: ${message.id}`
        );
        messages = [
          {
            id: message.id,
            text: message.text,
            time: new Date(message.created_at ?? Date.now()),
          },
        ];
      } else {
        console.warn(
          ' [POST /api/conversations/threads] Failed to create seed message'
        );
      }
    } else {
      console.log(
        ' [POST /api/conversations/threads] No seed message provided'
      );
    }

    const response = {
      id: insertedThread.id,
      title: (insertedThread.title ?? '').toLowerCase(),
      preview: (insertedThread.preview ?? '').toLowerCase(),
      pinned: insertedThread.pinned ?? false,
      messages,
    };

    console.log(
      ` [POST /api/conversations/threads] Thread creation complete, returning ${messages.length} messages`
    );
    return NextResponse.json(response);
  } catch (error) {
    console.error(
      ' [POST /api/conversations/threads] Unexpected error:',
      error
    );
    return NextResponse.json(
      { error: 'Failed to create thread' },
      { status: 500 }
    );
  }
}
