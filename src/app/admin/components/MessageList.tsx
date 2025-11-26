import { Message } from '../types';
import { formatAgo } from '../../../lib/conversationStore';

type MessageListProps = {
  messages: Message[];
  messageEdits: Record<string, string>;
  onChange: (messageId: string, value: string) => void;
  onSave: (messageId: string) => void;
  onDelete: (messageId: string) => void;
};

type MessageRowProps = {
  message: Message;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
};

function MessageRow({ message, value, onChange, onSave, onDelete }: MessageRowProps) {
  return (
    <div className="admin-msg-row">
      <div style={{ flex: '1 1 auto' }}>
        <textarea
          className="admin-textarea"
          style={{ minHeight: '60px' }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {message.attachment_url && (
          <div className="admin-attachment" style={{ marginTop: '8px' }}>
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
                  backgroundColor: '#f0f0f0',
                  borderRadius: '6px',
                  color: '#333',
                  textDecoration: 'none',
                  fontSize: '13px',
                  border: '1px solid #e0e0e0',
                }}
              >
                <svg
                  width="16"
                  height="16"
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
        <div className="admin-msg-meta">{formatAgo(message.time)}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          type="button"
          className="admin-send"
          onClick={onSave}
          disabled={!value.trim()}
        >
          save
        </button>
        <button
          type="button"
          className="admin-delete"
          onClick={onDelete}
          aria-label="delete message"
        >
          delete
        </button>
      </div>
    </div>
  );
}

function MessageList({ messages, messageEdits, onChange, onSave, onDelete }: MessageListProps) {
  return (
    <div className="admin-messages">
      {messages.slice().reverse().map((message) => (
        <MessageRow
          key={message.id}
          message={message}
          value={messageEdits[message.id] ?? message.text}
          onChange={(val) => onChange(message.id, val)}
          onSave={() => onSave(message.id)}
          onDelete={() => onDelete(message.id)}
        />
      ))}
    </div>
  );
}

export default MessageList;
