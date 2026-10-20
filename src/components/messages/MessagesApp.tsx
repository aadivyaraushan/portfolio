'use client';

import './messages.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Thread } from '@/lib/threads/types';
import { orderThreads, searchThreads } from '@/lib/threads/ordering';
import { sendContact } from '@/lib/threads/sendContact';
import { trackEvent } from '@/lib/analytics';
import ConversationList from '@/components/messages/list/ConversationList';
import ThreadView from '@/components/messages/thread/ThreadView';
import type { VisitorMessage } from '@/components/messages/thread/types';
import { useAdminSession } from '@/components/messages/admin/useAdminSession';

const EMAIL_KEY = 'messages:visitor-email';

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function MessagesApp({ threads }: { threads: Thread[] }) {
  const ordered = useMemo(() => orderThreads(threads), [threads]);
  const [activeId, setActiveId] = useState<string | null>(ordered[0]?.id ?? null);
  // Phones show one pane at a time. Start on the first thread so content comes first.
  const [view, setView] = useState<'list' | 'thread'>('thread');
  const [query, setQuery] = useState('');
  const [email, setEmail] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<Record<string, VisitorMessage[]>>({});
  const { ui: adminUi, signOut } = useAdminSession();
  const [composing, setComposing] = useState(false);

  // If the open thread is gone (the admin deleted it), show the first one.
  const active = ordered.find((t) => t.id === activeId) ?? ordered[0] ?? null;
  const shown = useMemo(() => searchThreads(ordered, query), [ordered, query]);

  useEffect(() => {
    trackEvent('visit', { conversationsCount: threads.length });
    try {
      setEmail((current) => current || localStorage.getItem(EMAIL_KEY) || '');
    } catch {
      // Storage can be blocked (private mode). The visitor types the email again.
    }
  }, [threads.length]);

  useEffect(() => {
    if (!active) return;
    trackEvent('conversation_viewed', { id: active.id, title: active.title, pinned: active.pinned });
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- once for each opened thread

  const select = (id: string) => {
    const thread = ordered.find((t) => t.id === id);
    if (thread) trackEvent('conversation_selected', { id, title: thread.title, pinned: thread.pinned });
    setActiveId(id);
    setComposing(false);
    setView('thread');
  };

  const updateVisitorMessage = (threadId: string, id: string, patch: Partial<VisitorMessage>) =>
    setSent((all) => ({
      ...all,
      [threadId]: (all[threadId] ?? []).map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));

  const deliver = useCallback(
    async (thread: Thread, message: VisitorMessage, botField: string) => {
      const result = await sendContact({ text: message.text, threadTitle: thread.title, email, botField });
      updateVisitorMessage(thread.id, message.id, {
        delivery: result.status,
        retryAfter: result.status === 'rate-limited' ? result.retryAfter : null,
      });
    },
    [email],
  );

  const handleSend = (text: string, botField: string) => {
    if (!active) return;
    const message: VisitorMessage = {
      id: newId(),
      text,
      sentAt: new Date().toISOString(),
      delivery: 'sending',
      retryAfter: null,
    };
    setSent((all) => ({ ...all, [active.id]: [...(all[active.id] ?? []), message] }));
    setDrafts((all) => ({ ...all, [active.id]: '' }));
    try {
      localStorage.setItem(EMAIL_KEY, email.trim());
    } catch {
      // See above: storage is a convenience only.
    }
    return deliver(active, message, botField);
  };

  const handleRetry = (messageId: string) => {
    if (!active) return;
    const message = sent[active.id]?.find((m) => m.id === messageId);
    if (!message) return;
    updateVisitorMessage(active.id, messageId, { delivery: 'sending', retryAfter: null });
    return deliver(active, message, '');
  };

  return (
    <main className='messages-app' data-view={view}>
      <ConversationList
        threads={shown}
        activeId={activeId}
        query={query}
        onQueryChange={setQuery}
        onSelect={select}
        headerActions={
          adminUi ? (
            <adminUi.AdminListActions
              onNew={() => {
                setComposing(true);
                setView('thread');
              }}
              onSignOut={() => {
                setComposing(false);
                void signOut();
              }}
            />
          ) : null
        }
      />
      {adminUi && composing ? (
        <adminUi.NewThreadPane
          onCreated={(id) => {
            setActiveId(id);
            setComposing(false);
          }}
          onCancel={() => {
            setComposing(false);
            setView('list');
          }}
        />
      ) : active ? (
        <ThreadView
          key={active.id}
          thread={active}
          visitorMessages={sent[active.id] ?? []}
          draft={drafts[active.id] ?? ''}
          onDraftChange={(value) => setDrafts((all) => ({ ...all, [active.id]: value }))}
          email={email}
          onEmailChange={setEmail}
          onSend={handleSend}
          onRetry={handleRetry}
          onBack={() => setView('list')}
          adminUi={adminUi}
          onDeleted={() => {
            setActiveId(null);
            setView('list');
          }}
        />
      ) : (
        <section className='thread thread--empty' aria-label='Conversation'>
          <p className='thread__empty'>No conversations yet.</p>
        </section>
      )}
    </main>
  );
}
