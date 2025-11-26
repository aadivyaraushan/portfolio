'use client';

import { Emoji } from 'react-apple-emojis';
import { Conversation } from '@/lib/conversationStore';
import { normalizeEmojiName, pastelColorFor } from '@/lib/conversationUi';

type ChatHeaderProps = {
  conversation: Conversation;
  onOpenSidebar?: () => void;
};

const ChatHeader = ({ conversation, onOpenSidebar }: ChatHeaderProps) => (
  <div className='thread-header'>
    {onOpenSidebar ? (
      <button
        type='button'
        className='icon-btn'
        aria-label='open conversations list'
        style={{ marginRight: 8, display: 'inline-flex' }}
        onClick={onOpenSidebar}
      >
        ☰
      </button>
    ) : null}

    <div className='thread-title'>
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
      <div>
        <div className='name'>{conversation.title}</div>
        <div className='handle'>{conversation.preview}</div>
      </div>
    </div>
  </div>
);

export default ChatHeader;
