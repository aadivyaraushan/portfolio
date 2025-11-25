'use client';

import { useMemo } from 'react';
import { Emoji } from 'react-apple-emojis';
import { Conversation, formatAgo } from '@/lib/conversationStore';
import {
  normalizeEmojiName,
  pastelColorFor,
  sortConversations,
} from '@/lib/conversationUi';

type ChatSidebarProps = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  error: string | null;
};

function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  loading,
  error,
}: ChatSidebarProps) {
  const sortedConversations = useMemo(
    () => sortConversations(conversations),
    [conversations]
  );

  return (
    <aside className='sidebar'>
      <div className='sidebar-header'>
        <span className='handle'>aadivyaaaaaar</span>
        <button className='icon-btn' aria-label='new chat'>
          ✏️
        </button>
      </div>

      <div className='search'>
        <input className='search-input' placeholder='search' />
      </div>

      <div className='section-label'>messages</div>

      <div className='conversation-list'>
        {sortedConversations.map((conversation) => (
          <button
            type='button'
            key={conversation.id}
            className={`conversation ${
              conversation.id === activeId ? 'active' : ''
            }`}
            onClick={() => onSelect(conversation.id)}
            aria-pressed={conversation.id === activeId}
          >
            <div
              className='avatar'
              style={{
                backgroundColor: pastelColorFor(
                  conversation.id || conversation.title
                ),
              }}
            >
              {conversation.icon ? (
                <Emoji
                  name={normalizeEmojiName(conversation.icon)}
                  width={20}
                  height={20}
                />
              ) : (
                conversation.title.slice(0, 2)
              )}
            </div>
            <div className='conversation-body'>
              <div className='conversation-title'>{conversation.title}</div>
              <div className='conversation-sub'>{conversation.preview}</div>
            </div>
            <span
              className={`pill ${conversation.pinned ? 'pill-pinned' : ''}`}
            >
              {conversation.pinned
                ? 'pinned'
                : formatAgo(conversation.messages.at(-1)?.time ?? new Date())}
            </span>
          </button>
        ))}
        {!sortedConversations.length && !loading ? (
          <div style={{ padding: '12px 18px', color: '#888' }}>
            {error ?? 'no conversations found'}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export default ChatSidebar;
