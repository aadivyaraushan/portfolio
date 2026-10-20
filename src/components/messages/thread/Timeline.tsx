import { buildTimeline } from '@/lib/threads/timeline';
import { StampTime } from '@/components/messages/shared/LocalTime';
import AttachmentBubble from '@/components/messages/thread/AttachmentBubble';
import MessageText from '@/components/messages/thread/MessageText';
import type { ShownMessage } from '@/components/messages/thread/types';
import type { AdminUi } from '@/components/messages/admin/loadAdminUi';

type TimelineProps = {
  messages: ShownMessage[];
  onRetry: (id: string) => void;
  /** Given only to a signed-in admin: wraps each of the owner's messages with edit controls. */
  AdminMessage?: AdminUi['AdminMessage'];
};

function Delivery({ message, isLatestVisitor }: { message: ShownMessage; isLatestVisitor: boolean }) {
  if (message.from !== 'visitor') return null;
  if (message.delivery === 'failed' || message.delivery === 'rate-limited') {
    return (
      <p className='delivery delivery--failed'>
        <span>Not Delivered</span>
        {message.delivery === 'rate-limited' && message.retryAfter ? (
          <span className='delivery__wait'>Try again in {message.retryAfter}s</span>
        ) : null}
      </p>
    );
  }
  if (!isLatestVisitor) return null;
  return <p className='delivery'>{message.delivery === 'sending' ? 'Sending…' : 'Delivered'}</p>;
}

export default function Timeline({ messages, onRetry, AdminMessage }: TimelineProps) {
  const latestVisitorId = messages.filter((m) => m.from === 'visitor').at(-1)?.id;

  return (
    <ol className='timeline'>
      {buildTimeline(messages).map((item) => {
        if (item.kind === 'stamp') {
          return (
            <li key={item.key} className='stamp'>
              <StampTime iso={item.sentAt} />
            </li>
          );
        }
        const { message, tail, showSender } = item;
        const failed = message.from === 'visitor' && (message.delivery === 'failed' || message.delivery === 'rate-limited');
        const bubbleTail = tail && !message.attachment;
        const content = (
          <>
            {message.text ? (
              <div className='msg__line'>
                {failed ? (
                  <button type='button' className='msg__retry' aria-label='Try again' onClick={() => onRetry(message.id)}>
                    !
                  </button>
                ) : null}
                <p className={`bubble${bubbleTail ? ' bubble--tail' : ''}`} data-testid='bubble'>
                  <MessageText text={message.text} />
                </p>
              </div>
            ) : null}
            {message.attachment ? <AttachmentBubble attachment={message.attachment} /> : null}
          </>
        );
        return (
          <li
            key={item.key}
            className={`msg${tail ? ' msg--group-end' : ''}`}
            data-from={message.from}
            data-delivery={message.from === 'visitor' ? message.delivery : undefined}
          >
            {showSender ? <span className='msg__sender'>Aadivya</span> : null}
            {AdminMessage && message.from === 'me' ? <AdminMessage message={message}>{content}</AdminMessage> : content}
            <Delivery message={message} isLatestVisitor={message.id === latestVisitorId} />
          </li>
        );
      })}
    </ol>
  );
}
