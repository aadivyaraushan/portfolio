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
            {message.attachment_url && (
              <div className="message-attachment" style={{ marginTop: '8px' }}>
                {message.attachment_type === 'image' ? (
                  <img
                    src={message.attachment_url}
                    alt="attachment"
                    style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '4px' }}
                  />
                ) : (
                  <a
                    href={message.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(0,0,0,0.05)',
                      borderRadius: '6px',
                      color: 'inherit',
                      textDecoration: 'none',
                      fontSize: '0.9em',
                      border: '1px solid rgba(0,0,0,0.1)',
                      marginTop: '4px',
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span>view attachment</span>
                  </a>
                )}
              </div>
            )}
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
