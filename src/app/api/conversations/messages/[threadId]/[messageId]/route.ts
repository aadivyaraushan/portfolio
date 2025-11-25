import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function DELETE(
  req: Request,
  { params }: { params: { threadId: string; messageId: string } }
) {
  console.log(
    ` [DELETE /api/conversations/messages/${params.threadId}/${params.messageId}] Deleting message...`
  );

  try {
    const { threadId, messageId } = params;
    console.log(
      ` [DELETE /api/conversations/messages] Deleting message ${messageId} from thread ${threadId}`
    );

    if (!threadId || !messageId) {
      console.error(
        ' [DELETE /api/conversations/messages] Missing required params:',
        { threadId, messageId }
      );
      return NextResponse.json(
        { error: 'threadId and messageId are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    console.log(
      ' [DELETE /api/conversations/messages] Supabase admin client initialized'
    );

    console.log(
      ' [DELETE /api/conversations/messages] Executing delete operation...'
    );

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('thread_id', threadId);

    if (error) {
      console.error(
        ' [DELETE /api/conversations/messages] Database error:',
        error
      );
      return NextResponse.json(
        { error: 'Failed to delete message' },
        { status: 500 }
      );
    }

    console.log(
      ` [DELETE /api/conversations/messages] Successfully deleted message ${messageId}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      ' [DELETE /api/conversations/messages] Unexpected error:',
      error
    );
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}
