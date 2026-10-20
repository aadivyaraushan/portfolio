'use client';

import type { Thread } from '@/lib/threads/types';
import ThreadAvatar from '@/components/messages/shared/ThreadAvatar';
import { ListTime } from '@/components/messages/shared/LocalTime';

type ConversationListProps = {
  threads: Thread[];
  activeId: string | null;
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
};

const lastMessage = (thread: Thread) => thread.messages.at(-1);

function previewText(thread: Thread) {
  const last = lastMessage(thread);
  if (!last) return thread.tagline;
  const firstLine = last.text.replace(/\s+/g, ' ').trim();
  if (firstLine) return firstLine;
  return last.attachment ? `Attachment: ${last.attachment.name}` : thread.tagline;
}

export default function ConversationList({ threads, activeId, query, onQueryChange, onSelect }: ConversationListProps) {
  const pinned = threads.filter((t) => t.pinned);
  const rest = threads.filter((t) => !t.pinned);
  const searching = query.trim().length > 0;

  return (
    <nav className='conversations' aria-label='Conversations'>
      <header className='conversations__header'>
        <h1>Aadivya</h1>
      </header>

      <div className='search'>
        <svg className='search__icon' viewBox='0 0 16 16' aria-hidden='true'>
          <path d='M6.9 1.5a5.4 5.4 0 0 1 4.3 8.7l3.3 3.3-1 1-3.3-3.3A5.4 5.4 0 1 1 6.9 1.5Zm0 1.4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z' />
        </svg>
        <input
          type='search'
          className='search__input'
          placeholder='Search'
          aria-label='Search conversations'
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>

      <div className='conversations__scroll'>
        {pinned.length > 0 && !searching ? (
          <ul className='pinned'>
            {pinned.map((thread) => (
              <li key={thread.id}>
                <button
                  type='button'
                  className='pinned__item'
                  aria-current={thread.id === activeId ? 'true' : undefined}
                  onClick={() => onSelect(thread.id)}
                >
                  <ThreadAvatar thread={thread} size={60} />
                  <span className='pinned__name'>{thread.title}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <ul className='rows'>
          {(searching ? threads : rest).map((thread) => {
            const last = lastMessage(thread);
            return (
              <li key={thread.id}>
                <button
                  type='button'
                  className='row'
                  aria-current={thread.id === activeId ? 'true' : undefined}
                  onClick={() => onSelect(thread.id)}
                >
                  <ThreadAvatar thread={thread} size={44} />
                  <span className='row__body'>
                    <span className='row__top'>
                      <span className='row__title'>{thread.title}</span>
                      {last ? (
                        <span className='row__time'>
                          <ListTime iso={last.sentAt} />
                        </span>
                      ) : null}
                    </span>
                    <span className='row__preview'>{previewText(thread)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {searching && threads.length === 0 ? <p className='conversations__empty'>No Results</p> : null}
      </div>
    </nav>
  );
}
