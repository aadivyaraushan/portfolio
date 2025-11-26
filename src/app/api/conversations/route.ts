import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  console.log(' [GET /api/conversations] Fetching conversations...');

  // Debug environment variables
  console.log(' [GET /api/conversations] Environment check:');
  console.log(
    '  - NEXT_PUBLIC_SUPABASE_URL:',
    process.env.NEXT_PUBLIC_SUPABASE_URL ? ' Set' : ' Missing'
  );
  console.log(
    '  - SUPABASE_SERVICE_ROLE_KEY:',
    process.env.SUPABASE_SERVICE_ROLE_KEY ? ' Set' : ' Missing'
  );
  console.log(
    '  - URL length:',
    process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0
  );
  console.log(
    '  - Key length:',
    process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
  );

  try {
    const supabase = getSupabaseAdmin();
    console.log(' [GET /api/conversations] Supabase admin client initialized');

    // Try a basic table existence check
    console.log(' [GET /api/conversations] Testing table access...');
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .from('threads')
        .select('*')
        .limit(1);

      if (tableError) {
        console.error(
          ' [GET /api/conversations] Table access failed:',
          tableError
        );
        console.error(
          ' [GET /api/conversations] Table error details:',
          JSON.stringify(tableError, null, 2)
        );
      } else {
        console.log(
          ' [GET /api/conversations] Table access passed, found:',
          tableInfo?.length || 0,
          'rows'
        );
      }
    } catch (tableTestError) {
      console.error(
        ' [GET /api/conversations] Table test exception:',
        tableTestError
      );
    }

    console.log(' [GET /api/conversations] Fetching threads...');
    const { data: threads, error: threadError } = await supabase
      .from('threads')
      .select('*')
      .order('index', { ascending: true });

    if (threadError) {
      console.error(
        '❌ [GET /api/conversations] Thread fetch error:',
        threadError
      );
      console.error(
        '❌ [GET /api/conversations] Full error details:',
        JSON.stringify(threadError, null, 2)
      );
      console.error(
        '❌ [GET /api/conversations] Error code:',
        threadError.code
      );
      console.error(
        '❌ [GET /api/conversations] Error details:',
        threadError.details
      );
      console.error(
        '❌ [GET /api/conversations] Error hint:',
        threadError.hint
      );
      return NextResponse.json(
        {
          error: threadError.message,
          details: threadError.details,
          code: threadError.code,
          hint: threadError.hint,
        },
        { status: 500 }
      );
    }

    console.log(
      ` [GET /api/conversations] Found ${threads?.length || 0} threads`
    );

    const conversations = [];
    for (const thread of threads) {
      console.log(
        ` [GET /api/conversations] Fetching messages for thread ${thread.id}...`
      );
      const { data: messages, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true });

      if (messageError) {
        console.error(
          ` [GET /api/conversations] Message fetch error for thread ${thread.id}:`,
          messageError
        );
        continue;
      }

      console.log(
        ` [GET /api/conversations] Thread ${thread.id} has ${
          messages?.length || 0
        } messages`
      );

      conversations.push({
        id: thread.id,
        title: (thread.title ?? '').toLowerCase(),
        preview: (thread.preview ?? '').toLowerCase(),
        pinned: thread.pinned ?? false,
        icon: thread.icon ?? undefined,
        messages: (messages ?? []).map((msg) => ({
          id: msg.id,
          text: msg.text,
          time: new Date(msg.created_at ?? msg.time ?? Date.now()),
        })),
      });
    }

    console.log(
      ` [GET /api/conversations] Successfully processed ${conversations.length} conversations`
    );
    return NextResponse.json(conversations);
  } catch (error) {
    console.error(' [GET /api/conversations] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
