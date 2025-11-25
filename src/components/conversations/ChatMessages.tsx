'use client';

import { formatAgo } from '@/lib/conversationStore';
import { annotateMessages } from '@/lib/conversationUi';

type AnnotatedMessage = ReturnType<typeof annotateMessages>[number];

type ChatMessagesProps = {
  messages: AnnotatedMessage[];
  loading: boolean;
};

const ChatMessages = ({
  messages,
  loading,
}: ChatMessagesProps) => (
  <div className='messages-layout'>
    <div className='messages-scroll'>
      {messages.map((message, idx) => (
        <div
          key={message.id}
          className='message-row'
          style={{ animationDelay: `${Math.min(idx * 60, 420)}ms` }}
        >
          <div>
            <div
              className='message-bubble'
              dangerouslySetInnerHTML={{
                __html: message.text.replace(
                  /(https?:\/\/[^\s]+)/g,
                  '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
                ),
              }}
            />
            {message.showTime ? (
              <div className='message-meta'>{formatAgo(message.time)}</div>
            ) : null}
          </div>
        </div>
      ))}
      {!messages.length && !loading ? (
        <div
          className='message-row'
          style={{ justifyContent: 'center', color: '#777' }}
        >
          start this thread from the admin page
        </div>
      ) : null}
    </div>
  </div>
);

export default ChatMessages;
