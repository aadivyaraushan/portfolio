'use client';

import { useMemo, useState } from 'react';
import { Emoji } from 'react-apple-emojis';
import { Conversation, formatAgo } from '@/lib/conversationStore';
import {
  normalizeEmojiName,
  pastelColorFor,
  sortConversations,
} from '@/lib/conversationUi';
import { trackEvent } from '@/lib/analytics';

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
  const [searchQuery, setSearchQuery] = useState('');

  const sortedConversations = useMemo(
    () => sortConversations(conversations),
    [conversations]
  );

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return sortedConversations;
    }
    
    const query = searchQuery.toLowerCase();
    return sortedConversations.filter((conversation) => {
      const titleMatch = conversation.title.toLowerCase().includes(query);
      const previewMatch = conversation.preview?.toLowerCase().includes(query);
      return titleMatch || previewMatch;
    });
  }, [sortedConversations, searchQuery]);

  return (
    <aside
      className='sidebar'
      onClick={(e) => {
        // Prevent clicks inside the sidebar from closing the mobile overlay backdrop
        e.stopPropagation();
      }}
    >
      <div className='sidebar-header'>
        <span className='handle'>aadivya</span>
      </div>

      <div className='search'>
        <input 
          className='search-input' 
          placeholder='search' 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className='section-label'>messages</div>

      <div className='conversation-list'>
        {filteredConversations.map((conversation) => (
          <button
            type='button'
            key={conversation.id}
            className={`conversation ${
              conversation.id === activeId ? 'active' : ''
            }`}
            onClick={() => {
              trackEvent('conversation_selected', {
                id: conversation.id,
                title: conversation.title,
                pinned: Boolean(conversation.pinned),
              });
              onSelect(conversation.id);
            }}
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
        {!filteredConversations.length && !loading ? (
          <div style={{ padding: '12px 18px', color: '#888' }}>
            {searchQuery.trim() 
              ? `no conversations matching "${searchQuery}"`
              : error ?? 'no conversations found'}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export default ChatSidebar;
