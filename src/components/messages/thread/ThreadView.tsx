'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Thread } from '@/lib/threads/types';
import ThreadAvatar from '@/components/messages/shared/ThreadAvatar';
import Composer from '@/components/messages/thread/Composer';
import Timeline from '@/components/messages/thread/Timeline';
import type { ShownMessage, VisitorMessage } from '@/components/messages/thread/types';
import type { AdminUi } from '@/components/messages/admin/loadAdminUi';

type ThreadViewProps = {
  thread: Thread;
  visitorMessages: VisitorMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  onSend: (text: string, botField: string) => void;
  onRetry: (messageId: string) => void;
  onBack: () => void;
  /** The loaded admin components, or null for a visitor. */
  adminUi?: AdminUi | null;
  /** Called after the admin deletes this conversation. */
  onDeleted?: () => void;
};

export default function ThreadView({
  thread,
  visitorMessages,
  draft,
  onDraftChange,
  email,
  onEmailChange,
  onSend,
  onRetry,
  onBack,
  adminUi = null,
  onDeleted,
}: ThreadViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showDetails, setShowDetails] = useState(false);

  const messages = useMemo<ShownMessage[]>(
    () =>
      [
        ...thread.messages.map((m) => ({ ...m, from: 'me' as const })),
        ...visitorMessages.map((m) => ({ ...m, from: 'visitor' as const, attachment: null })),
      ].sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt)),
    [thread.messages, visitorMessages],
  );

  // On open: show the end of the thread, like iMessage. If the last message is taller
  // than the screen, show its start instead, so the visitor reads it from the top.
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const groups = scroller.querySelectorAll<HTMLElement>('.timeline > li');
    const lastMine = [...groups].reverse().find((el) => el.dataset.from === 'me');
    const visible = scroller.clientHeight;
    if (lastMine && lastMine.offsetHeight > visible * 0.7) {
      const stamp = lastMine.previousElementSibling as HTMLElement | null;
      const anchor = stamp?.classList.contains('stamp') ? stamp : lastMine;
      const header = scroller.querySelector<HTMLElement>('.thread-header');
      scroller.scrollTop = anchor.offsetTop - (header?.offsetHeight ?? 0) - 8;
    } else {
      scroller.scrollTop = scroller.scrollHeight;
    }
  }, [thread.id]);

  // When the visitor sends, or the admin posts, follow the new bubble down.
  const visitorCount = visitorMessages.length;
  const ownCount = thread.messages.length;
  const seenOwnCount = useRef(ownCount);
  useLayoutEffect(() => {
    const posted = ownCount > seenOwnCount.current;
    seenOwnCount.current = ownCount;
    if (!visitorCount && !posted) return;
    const scroller = scrollRef.current;
    scroller?.scrollTo?.({ top: scroller.scrollHeight, behavior: 'smooth' });
  }, [visitorCount, ownCount]);

  return (
    <section className='thread' aria-label='Conversation'>
      <div className='thread__scroll' ref={scrollRef}>
        <header className='thread-header'>
          <button type='button' className='thread-header__back' aria-label='All conversations' onClick={onBack}>
            <svg viewBox='0 0 12 20' aria-hidden='true'>
              <path d='M10 2 2 10l8 8' />
            </svg>
          </button>
          <div className='thread-header__who'>
            <ThreadAvatar thread={thread} size={44} />
            <h2 className='thread-header__name'>{thread.title}</h2>
            {thread.tagline ? <p className='thread-header__tagline'>{thread.tagline}</p> : null}
          </div>
          {adminUi ? (
            <button
              type='button'
              className='thread-header__info'
              aria-label='Conversation Details'
              onClick={() => setShowDetails(true)}
            >
              <svg viewBox='0 0 24 24' aria-hidden='true'>
                <circle cx='12' cy='12' r='9.5' />
                <path d='M12 10.5v6.5' strokeLinecap='round' />
                <circle className='dot' cx='12' cy='7.4' r='1.2' />
              </svg>
            </button>
          ) : null}
        </header>
        <div className='thread__body'>
          {messages.length ? (
            <Timeline messages={messages} onRetry={onRetry} AdminMessage={adminUi?.AdminMessage} />
          ) : (
            <p className='thread__empty'>No messages yet.</p>
          )}
        </div>
      </div>
      {adminUi ? (
        <adminUi.AdminComposer threadId={thread.id} />
      ) : (
        <Composer
          draft={draft}
          onDraftChange={onDraftChange}
          email={email}
          onEmailChange={onEmailChange}
          onSend={onSend}
        />
      )}
      {adminUi && showDetails ? (
        <adminUi.DetailsSheet
          thread={thread}
          onClose={() => setShowDetails(false)}
          onDeleted={() => {
            setShowDetails(false);
            onDeleted?.();
          }}
        />
      ) : null}
    </section>
  );
}
